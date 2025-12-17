import os
import shutil
import sqlite3
import uvicorn
import time
import aiofiles
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, Request, HTTPException, Depends
from fastapi.responses import HTMLResponse, RedirectResponse, FileResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# --- CONFIGURATION ---
APP_NAME = "Drop"
HOST_IP = "0.0.0.0" # Để các máy trong mạng LAN truy cập được
PORT = 8000
UPLOAD_DIR = "uploads"
DB_FILE = "metadata.db"
SECRET_PASS = "0797042389gia" # Password yêu cầu

# Tạo thư mục upload nếu chưa có
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- DATABASE SETUP (Metadata) ---
def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS files
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  filename TEXT, 
                  filepath TEXT, 
                  size INTEGER, 
                  upload_time REAL)''')
    conn.commit()
    conn.close()

init_db()

# --- APP & TEMPLATES ---
app = FastAPI()

app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

# --- MIDDLEWARE / DEPENDENCIES ---
def verify_token(request: Request):
    # Check header hoặc query param (cho link download)
    token = request.headers.get("auth-token") or request.query_params.get("token")
    if token != SECRET_PASS:
        raise HTTPException(status_code=401, detail="Unauthorized: Sai mật khẩu")
    return True

class LoginRequest(BaseModel):
    password: str

@app.get("/")
async def get_ui():
    return FileResponse("static/index.html")

@app.post("/api/login")
async def login(req: LoginRequest):
    if req.password == SECRET_PASS:
        return {"success": True}
    return {"success": False}

@app.get("/health")
async def health_check():
    """Health check endpoint for Docker"""
    return {"status": "healthy"}

@app.post("/api/upload")
async def upload_files(files: List[UploadFile] = File(...), authorized: bool = Depends(verify_token)):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    for file in files:
        # Xử lý tên file tránh trùng (đơn giản nhất: thêm timestamp)
        timestamp = int(time.time())
        safe_filename = f"{timestamp}_{file.filename}"
        file_location = os.path.join(UPLOAD_DIR, safe_filename)
        
        # Save to Disk
        async with aiofiles.open(file_location, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
        
        # Save Metadata
        size = os.path.getsize(file_location)
        c.execute("INSERT INTO files (filename, filepath, size, upload_time) VALUES (?, ?, ?, ?)",
                  (file.filename, file_location, size, time.time()))
    
    conn.commit()
    conn.close()
    return {"message": "Uploaded successfully"}

@app.get("/api/files")
async def list_files(authorized: bool = Depends(verify_token)):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM files ORDER BY upload_time DESC")
    rows = c.fetchall()
    conn.close()
    return rows

@app.get("/api/download/{file_id}")
async def download_file(file_id: int, inline: bool = False, authorized: bool = Depends(verify_token)):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM files WHERE id=?", (file_id,))
    row = c.fetchone()
    conn.close()
    
    if row and os.path.exists(row['filepath']):
        disposition = "inline" if inline else "attachment"
        return FileResponse(row['filepath'], filename=row['filename'], content_disposition_type=disposition)
    raise HTTPException(status_code=404, detail="File not found")

if __name__ == "__main__":
    print(f"Server starting on http://{HOST_IP}:{PORT}")
    print(f"Password required: {SECRET_PASS}")
    uvicorn.run(app, host=HOST_IP, port=PORT)