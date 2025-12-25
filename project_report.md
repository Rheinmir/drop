# Project Report: Drop - Ocean Edition

## 1. Tổng Quan Dự Án (Project Overview)
**Tên dự án:** Drop - Ocean Edition  
**Mô tả:** Hệ thống quản lý file (File Management System) tập trung, hỗ trợ upload, quản lý, phân tích và backup dữ liệu. Ứng dụng được xây dựng theo mô hình Monolithic Containerized, nơi Frontend được nhúng trực tiếp vào Backend để phục vụ như một đơn vị duy nhất.

---

## 2. Kiến Trúc Hệ Thống (System Architecture)

Dự án hoạt động trên mô hình Client-Server đơn giản hóa, đóng gói trong Docker Container:

```
[User Browser]  <-->  [Docker Container (Port 8000)]
                            |
                     [FastAPI Server (Python)]
                            |
            -----------------------------------
            |               |                 |
      [Static Files]   [API Endpoints]   [Data Storage]
      (React App)      (/api/*)          (SQLite + Disk)
```

---

## 3. Phân Tách Các Layer (Layer Breakdown)

### A. Frontend Layer (Giao Diện Người Dùng)
Lớp này chịu trách nhiệm hiển thị giao diện và tương tác với người dùng.
*   **Công nghệ:** TypeScript, React 19, Vite, Lucide React (Icons), Recharts (Biểu đồ).
*   **Vị trí:** Thư mục `/frontend`.
*   **Quy trình Build:** Code được đóng gói (build) thành các file tĩnh (HTML/CSS/JS) nằm trong `dist` (được copy thành `static` trong container) thông qua Node.js.
*   **Thành phần chính:**
    *   `App.tsx` & `components/Dashboard.tsx`: Dashboard chính quản lý file.
    *   `translations.ts`: Hỗ trợ đa ngôn ngữ (i18n).
    *   `vite.config.ts`: Cấu hình bundle.

### B. Backend Layer (Xử Lý Logic)
Lớp trung tâm điều phối mọi hoạt động, từ xác thực đến xử lý file.
*   **Công nghệ:** Python 3.11, FastAPI, Uvicorn.
*   **Vị trí:** `main.py` (File chính), `exe.py`.
*   **Chức năng chính:**
    *   **API Service:** Cung cấp các endpoint RESTful cho frontend (`/login`, `/upload`, `/api/files`, v.v.).
    *   **Static File Serving:** Phục vụ ứng dụng React (đã build) tại root path `/`. Điều này giúp ứng dụng chạy như một SPA (Single Page Application) mà không cần Nginx riêng biệt.
    *   **Authentication:** Cơ chế xác thực token đơn giản dựa trên password cứng (`SECRET_PASS`).
    *   **Logic Nghiệp vụ:** Xử lý upload, đổi tên, xóa, pin file, và tạo backup ZIP.

### C. Data Layer (Lưu Trữ Dữ Liệu)
Lớp chịu trách nhiệm lưu trữ bền vững trạng thái và file của hệ thống.
*   **Công nghệ:** SQLite (Metadata), File System (Physical Files).
*   **Thành phần:**
    *   `data/metadata.db`: SQLite database chứa thông tin chi tiết về file (tên gốc, tags, ngày tạo, kích thước).
    *   `uploads/`: Thư mục chứa các file vật lý được người dùng tải lên.
    *   `static/`: Chứa file frontend đã build (chỉ đọc).

### D. Infrastructure/DevOps Layer (Hạ Tầng & Vận Hành)
Lớp đảm bảo ứng dụng có thể build, chạy và deploy tự động, nhất quán.
*   **Docker (`Dockerfile`):**
    *   Sử dụng **Multi-stage Build**:
        1.  **Stage Builder:** Dùng Node image để build Frontend (`npm run build`).
        2.  **Stage Runner:** Dùng Python Slim image, copy kết quả build từ Stage 1 sang folder `static`, cài đặt dependencies Python và chạy server.
*   **CI/CD (`Jenkinsfile`):**
    *   Tự động hóa quy trình: Lấy code -> Build Docker Image -> Kiểm tra Image -> Deploy (stop container cũ, chạy container mới) -> Dọn dẹp.
*   **Môi trường:** Thiết lập biến môi trường như `PYTHONDONTWRITEBYTECODE` để tối ưu Python trong container.

---

## 4. Các Tính Năng Chính (Key Features)
1.  **File Management:** File upload, download, đổi tên, xóa.
2.  **Dashboard Analytics:** Biểu đồ phân tích dung lượng/số lượng file (sử dụng Recharts).
3.  **Backup & Restore:**
    *   `export_data`: Tạo file ZIP backup toàn bộ dữ liệu (Database + File Uploads).
    *   `restore_backup`: Khôi phục hệ thống từ file backup.
4.  **Health Check:** Endpoint `/health` phục vụ Docker healthcheck để đảm bảo server luôn sẵn sàng.
5.  **Grouping & Tagging:** Phân loại file theo nhóm và gắn thẻ để dễ quản lý.
