import os
import shutil
import sqlite3
import uvicorn
import time
import aiofiles
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, Request, HTTPException, Depends
from fastapi.responses import HTMLResponse, RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# --- CONFIGURATION ---
APP_NAME = "Drop"
HOST_IP = "0.0.0.0" # Để các máy trong mạng LAN truy cập được
PORT = 8000
UPLOAD_DIR = "data/uploads"
DB_FILE = "data/metadata.db"
SECRET_PASS = "0797042389gia" # Password yêu cầu

# Create data directory if not exists
os.makedirs("data", exist_ok=True)
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
    return [dict(row) for row in rows]

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
    group_name: Optional[str] = None
    tags: Optional[str] = None

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

import zipfile
from fastapi.responses import HTMLResponse, RedirectResponse, FileResponse, StreamingResponse

# ... (Existing imports)

# ... (Existing main code)

# --- BACKUP & RESTORE ---

# --- BACKUP & RESTORE ---

MAX_SPLIT_SIZE = 500 * 1024 * 1024 # 500MB

@app.post("/api/export")
def export_data(authorized: bool = Depends(verify_token)):
    """Creates a full backup (DB + Uploads), splits if necessary, and adds to file list."""
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    temp_zip_path = os.path.join("data", "temp_full_backup.zip")

    # Clean up old temp file
    if os.path.exists(temp_zip_path):
        os.remove(temp_zip_path)

    try:
        # 1. Create Master ZIP
        with zipfile.ZipFile(temp_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Metadata DB
            if os.path.exists(DB_FILE):
                zipf.write(DB_FILE, arcname="metadata.db")
            
            # Uploads
            if os.path.exists(UPLOAD_DIR):
                for root, dirs, files in os.walk(UPLOAD_DIR):
                    for file in files:
                        file_path = os.path.join(root, file)
                        # Avoid backing up existing backups if they are in the uploads folder?
                        # The uploads folder IS imports/exports? No, UPLOAD_DIR is data/uploads.
                        # We should check if file is a backup zip to avoid recursive bloating, 
                        # but users might want to backup their backups. 
                        # Let's assume standard behavior: backup everything in uploads.
                        arcname = os.path.relpath(file_path, "data")
                        zipf.write(file_path, arcname=arcname)
        
        # 2. Check Size and Split
        file_size = os.path.getsize(temp_zip_path)
        generated_files = []
        
        chunk_num = 1
        
        # If smaller than limit, just move and rename
        if file_size <= MAX_SPLIT_SIZE:
             final_name = f"backup_{timestamp}.zip"
             dest_path = os.path.join(UPLOAD_DIR, final_name)
             shutil.move(temp_zip_path, dest_path)
             generated_files.append((final_name, dest_path, file_size))
        else:
            # Split
            with open(temp_zip_path, 'rb') as src:
                while True:
                    chunk = src.read(MAX_SPLIT_SIZE)
                    if not chunk:
                        break
                    
                    part_name = f"backup_{timestamp}.zip.{chunk_num:03d}"
                    part_path = os.path.join(UPLOAD_DIR, part_name)
                    
                    with open(part_path, 'wb') as dst:
                        dst.write(chunk)
                        
                    generated_files.append((part_name, part_path, len(chunk)))
                    chunk_num += 1
            
            # Remove master zip
            os.remove(temp_zip_path)

        # 3. Add to Database
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        current_time = time.time()
        
        for name, path, fsize in generated_files:
            c.execute("INSERT INTO files (filename, filepath, size, upload_time, group_name, tags) VALUES (?, ?, ?, ?, ?, ?)",
                      (name, path, fsize, current_time, 'System Backups', 'backup'))
        
        conn.commit()
        conn.close()
        
        return {"message": "Export created successfully", "files": [f[0] for f in generated_files]}

    except Exception as e:
        if os.path.exists(temp_zip_path):
            os.remove(temp_zip_path)
        print(f"Export failed: {e}")
        # Assuming we don't want to crash the request but report error
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@app.post("/api/restore")
async def restore_backup(files: List[UploadFile] = File(...), authorized: bool = Depends(verify_token)):
    """Restores the system from a ZIP backup (supports single or split files)."""
    
    # Needs to handle multiple files.
    # Pattern: 
    # 1. Save all uploaded parts to a temp restore dir.
    # 2. Sort them by name to ensure order (001, 002...).
    # 3. Merge into one zip.
    # 4. Extract and restore.

    restore_work_dir = os.path.join("data", "restore_work")
    if os.path.exists(restore_work_dir):
        shutil.rmtree(restore_work_dir)
    os.makedirs(restore_work_dir)
    
    saved_parts = []

    try:
        # 1. Save all parts
        for file in files:
            temp_part_path = os.path.join(restore_work_dir, file.filename)
            async with aiofiles.open(temp_part_path, 'wb') as out_file:
                while content := await file.read(1024 * 1024): # 1MB chunks
                    await out_file.write(content)
            saved_parts.append(temp_part_path)
        
        # 2. Sort parts
        saved_parts.sort() # lexicographical sort should work for .001, .002 etc.
        
        # 3. Merge if multiple
        final_zip_path = os.path.join(restore_work_dir, "full_restore.zip")
        
        if len(saved_parts) == 1 and not saved_parts[0].endswith('.001'):
            # It's a single non-split zip (or just one part named weirdly, but assume standard zip if not 001)
            # Actually, standard flow: just use it.
            final_zip_path = saved_parts[0]
        else:
            # Merge
            with open(final_zip_path, 'wb') as outfile:
                for part in saved_parts:
                    with open(part, 'rb') as infile:
                        shutil.copyfileobj(infile, outfile)
        
        # 4. Verify Zip
        if not zipfile.is_zipfile(final_zip_path):
            raise HTTPException(status_code=400, detail="Reconstructed file is not a valid zip archive")

        # 5. Extract
        extract_dir = os.path.join(restore_work_dir, "extracted")
        os.makedirs(extract_dir)
        
        with zipfile.ZipFile(final_zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)

        # 6. Validate Content
        if not os.path.exists(os.path.join(extract_dir, "metadata.db")):
            raise HTTPException(status_code=400, detail="Invalid backup: metadata.db missing")

        # 7. Swap Data (Critical Section)
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        safety_backup_dir = os.path.join("data", f"safety_backup_{timestamp}")
        os.makedirs(safety_backup_dir)
        
        # Backup current
        if os.path.exists(DB_FILE):
             shutil.move(DB_FILE, os.path.join(safety_backup_dir, "metadata.db"))
        if os.path.exists(UPLOAD_DIR):
             shutil.move(UPLOAD_DIR, os.path.join(safety_backup_dir, "uploads"))
        
        # Move restored
        shutil.move(os.path.join(extract_dir, "metadata.db"), DB_FILE)
        
        if os.path.exists(os.path.join(extract_dir, "uploads")):
             shutil.move(os.path.join(extract_dir, "uploads"), UPLOAD_DIR)
        else:
             os.makedirs(UPLOAD_DIR, exist_ok=True)
             
        # Cleanup
        shutil.rmtree(restore_work_dir)
        
        return {"message": "Restore successful", "safety_backup": safety_backup_dir}

    except Exception as e:
        # Cleanup on fail
        if os.path.exists(restore_work_dir):
            shutil.rmtree(restore_work_dir)
        print(f"Restore Error: {e}")
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")

# Mount StaticFiles at root (Must be last to avoid overriding API routes)
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    print(f"Server starting on http://{HOST_IP}:{PORT}")
    print(f"Password required: {SECRET_PASS}")
    uvicorn.run(app, host=HOST_IP, port=PORT)
