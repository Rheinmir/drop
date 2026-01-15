# Architecture Documentation

## Overview
Drop (Ocean Edition) is a monolithic containerized application designed for file management and sharing. It integrates a React frontend directly into a Python FastAPI backend, deployed as a single Docker container.

## High-Level Diagram

```mermaid
graph TD
    User[User Browser] <-->|HTTP/HTTPS| Container[Docker Container]
    
    subgraph Container [Docker Container :8000]
        FastAPI[FastAPI Server]
        Static[Static Files \n(React Built App)]
        DB[(SQLite DB)]
         FS[File System \n(Uploads)]
        
        FastAPI -->|Serves| Static
        FastAPI -->|Read/Write| DB
        FastAPI -->|Read/Write| FS
    end
```

## Tech Stack

### Frontend
- **Framework:** React 18+ (bundled with Vite)
- **Language:** TypeScript
- **Styling:** CSS Modules / Global CSS (Ocean Theme)
- **State Management:** React Hooks
- **Build Artifact:** Static HTML/JS/CSS files in `frontend/dist` -> `static/`

### Backend
- **Framework:** FastAPI (Python 3.11)
- **Server:** Uvicorn
- **Database:** SQLite (`data/metadata.db`)
- **Authentication:** Token-based (Simple shared secret)

### Infrastructure
- **Containerization:** Docker (Multi-stage build)
- **CI/CD:** Jenkins (Pipeline)
- **Registry:** GHCR (GitHub Container Registry)

## Directory Structure Logic

- `/frontend`: Source code for the React application.
- `/data`: persistent storage volume.
    - `metadata.db`: SQLite database file.
    - `uploads/`: Actual file storage.
- `/static`: output directory of frontend build, served by FastAPI at root `/`.
- `main.py`: Entry point for the backend application.

## Key Architectural Decisions

1. **Monolithic Container**: The frontend is built and copied into the backend image. This simplifies deployment to a single container without needing a separate Nginx or frontend server.
2. **SQLite**: Chosen for simplicity and zero-configuration. Suitable for single-instance deployments.
3. **Direct File System**: Files are stored directly on the disk (mapped to a volume), enabling simple backup/restore by zipping folders.
