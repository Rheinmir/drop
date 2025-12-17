import os
import shutil
import sqlite3
import uvicorn
import time
import aiofiles
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, Request, HTTPException, Depends
from fastapi.responses import HTMLResponse, RedirectResponse, FileResponse
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
    
    # Create table if not exists
    c.execute('''CREATE TABLE IF NOT EXISTS files
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  filename TEXT, 
                  filepath TEXT, 
                  size INTEGER, 
                  upload_time REAL)''')
    
    # Check if is_pinned column exists
    c.execute("PRAGMA table_info(files)")
    columns = [info[1] for info in c.fetchall()]
    if 'is_pinned' not in columns:
        print("Migrating: Adding is_pinned column...")
        c.execute("ALTER TABLE files ADD COLUMN is_pinned INTEGER DEFAULT 0")
    if 'group_name' not in columns:
        print("Migrating: Adding group_name column...")
        c.execute("ALTER TABLE files ADD COLUMN group_name TEXT")
    if 'tags' not in columns:
        print("Migrating: Adding tags column...")
        c.execute("ALTER TABLE files ADD COLUMN tags TEXT")
        
    # Analytics Tables
    c.execute('''CREATE TABLE IF NOT EXISTS traffic_stats
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  type TEXT, 
                  size INTEGER, 
                  timestamp REAL)''')
                  
    c.execute('''CREATE TABLE IF NOT EXISTS login_logs
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  ip TEXT, 
                  status TEXT, 
                  timestamp REAL)''')
                  
    conn.commit()
    conn.close()

init_db()

# --- APP & TEMPLATES ---
app = FastAPI()

# --- MIDDLEWARE / DEPENDENCIES ---
def verify_token(request: Request):
    # Check header hoặc query param (cho link download)
    token = request.headers.get("auth-token") or request.query_params.get("token")
    if token != SECRET_PASS:
        raise HTTPException(status_code=401, detail="Unauthorized: Sai mật khẩu")
    return True

class LoginRequest(BaseModel):
    password: str

@app.post("/api/login")
async def login(req: LoginRequest, request: Request):
    client_ip = request.client.host
    status = "failed"
    success = False
    
    if req.password == SECRET_PASS:
        status = "success"
        success = True
        
    # Log login attempt
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("INSERT INTO login_logs (ip, status, timestamp) VALUES (?, ?, ?)", 
                  (client_ip, status, time.time()))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Logging error: {e}")
        
    return {"success": success}

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
        current_time = time.time()
        c.execute("INSERT INTO files (filename, filepath, size, upload_time) VALUES (?, ?, ?, ?)",
                  (file.filename, file_location, size, current_time))
                  
        # Log Traffic (Upload)
        c.execute("INSERT INTO traffic_stats (type, size, timestamp) VALUES (?, ?, ?)",
                  ('upload', size, current_time))
    
    conn.commit()
    conn.close()
    return {"message": "Uploaded successfully"}

@app.get("/api/files")
async def list_files(authorized: bool = Depends(verify_token)):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM files ORDER BY is_pinned DESC, upload_time DESC")
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
        # Log Traffic (Download) - Async background task would be better but this is simple
        try:
            conn_log = sqlite3.connect(DB_FILE)
            c_log = conn_log.cursor()
            c_log.execute("INSERT INTO traffic_stats (type, size, timestamp) VALUES (?, ?, ?)",
                      ('download', row['size'], time.time()))
            conn_log.commit()
            conn_log.close()
        except:
            pass
            
        disposition = "inline" if inline else "attachment"
        return FileResponse(row['filepath'], filename=row['filename'], content_disposition_type=disposition)
    raise HTTPException(status_code=404, detail="File not found")

class RenameRequest(BaseModel):
    new_name: str

@app.put("/api/rename/{file_id}")
async def rename_file(file_id: int, req: RenameRequest, authorized: bool = Depends(verify_token)):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("UPDATE files SET filename=? WHERE id=?", (req.new_name, file_id))
    conn.commit()
    conn.close()
    return {"message": "File renamed successfully", "new_name": req.new_name}

class UpdateMetaRequest(BaseModel):
    group_name: str | None = None
    tags: str | None = None

@app.put("/api/meta/{file_id}")
async def update_file_meta(file_id: int, req: UpdateMetaRequest, authorized: bool = Depends(verify_token)):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    updates = []
    params = []
    
    # Allow empty string to clear the value
    if req.group_name is not None:
        updates.append("group_name=?")
        params.append(req.group_name)
    if req.tags is not None:
        updates.append("tags=?")
        params.append(req.tags)
    
    if updates:
        params.append(file_id)
        c.execute(f"UPDATE files SET {', '.join(updates)} WHERE id=?", params)
        conn.commit()
    
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM files WHERE id=?", (file_id,))
    row = c.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    return {"error": "File not found"}

@app.delete("/api/delete/{file_id}")
async def delete_file(file_id: int, authorized: bool = Depends(verify_token)):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM files WHERE id=?", (file_id,))
    row = c.fetchone()
    
    if row:
        # Delete from Disk
        try:
            if os.path.exists(row['filepath']):
                os.remove(row['filepath'])
        except Exception as e:
            print(f"Error deleting file from disk: {e}")

        # Delete from DB
        c.execute("DELETE FROM files WHERE id=?", (file_id,))
        conn.commit()
    
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="File not found")
        
    return {"message": "File deleted successfully"}

@app.post("/api/pin/{file_id}")
async def toggle_pin(file_id: int, authorized: bool = Depends(verify_token)):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT is_pinned FROM files WHERE id=?", (file_id,))
    row = c.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="File not found")
    
    # Handle None as 0
    current_status = row[0] if row[0] is not None else 0
    new_status = 0 if current_status else 1
    
    c.execute("UPDATE files SET is_pinned=? WHERE id=?", (new_status, file_id))
    conn.commit()
    conn.close()
    
    return {"message": "Pin status updated", "is_pinned": new_status, "id": file_id}

@app.get("/api/analytics")
async def get_analytics(authorized: bool = Depends(verify_token)):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # 1. Traffic Data (Last 7 days, aggregated by day)
    seven_days_ago = time.time() - (7 * 24 * 3600)
    c.execute('''SELECT type, size, timestamp FROM traffic_stats WHERE timestamp > ? ORDER BY timestamp ASC''', (seven_days_ago,))
    traffic_rows = c.fetchall()
    
    # Process traffic data into daily buckets
    daily_traffic = {}
    for row in traffic_rows:
        t_type, size, ts = row[0], row[1], row[2]
        day = time.strftime('%Y-%m-%d', time.localtime(ts))
        if day not in daily_traffic:
            daily_traffic[day] = {'upload': 0, 'download': 0, 'date': day}
        daily_traffic[day][t_type] += size

    traffic_chart = sorted(list(daily_traffic.values()), key=lambda x: x['date'])
    
    # 2. Login Logs (Last 20 entries)
    c.execute('''SELECT ip, status, timestamp FROM login_logs ORDER BY timestamp DESC LIMIT 20''')
    login_rows = c.fetchall()
    login_logs = [{'ip': r[0], 'status': r[1], 'time': r[2]} for r in login_rows]
    
    # 3. File Type Distribution (Pie Chart)
    c.execute('''SELECT filename FROM files''')
    files = c.fetchall()
    type_counts = {}
    for f in files:
        ext = f[0].split('.')[-1].lower() if '.' in f[0] else 'unknown'
        type_counts[ext] = type_counts.get(ext, 0) + 1
    
    files_chart = [{'name': k, 'value': v} for k, v in type_counts.items()]
    files_chart.sort(key=lambda x: x['value'], reverse=True)
    
    conn.close()
    
    return {
        "traffic": traffic_chart,
        "logins": login_logs,
        "fileTypes": files_chart
    }

# Mount StaticFiles at root (Must be last to avoid overriding API routes)
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    print(f"Server starting on http://{HOST_IP}:{PORT}")
    print(f"Password required: {SECRET_PASS}")
    uvicorn.run(app, host=HOST_IP, port=PORT)
