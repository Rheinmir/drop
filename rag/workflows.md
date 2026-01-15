# Workflows

## Development Setup

1. **Frontend**:
    ```bash
    cd frontend
    npm install
    npm run dev  # Runs on port 3000
    ```
2. **Backend**:
    ```bash
    # Create venv recommended
    pip install -r requirements.txt
    python main.py  # Runs on port 8000
    ```
    *Note: Frontend proxies `/api` requests to `localhost:8000`.*

## Deployment Pipeline (CI/CD)

The project uses Jenkins for automated deployment:

1. **Trigger**: Push to GitHub.
2. **Login**: Authenticate with GHCR using credentials.
3. **Build & Push**:
    - Checks if Docker image for current commit exists.
    - If not, builds leveraging Docker multi-stage build.
    - Pushes image to Registry (`ghcr.io/rheinmir/drop`).
4. **Deploy**:
    - Pulls the specific image version.
    - Stops/Removes old container (`drop-server`).
    - Runs new container:
        - Port mapped: `8000:8000`.
        - Volume mapped: `$(pwd)/data:/app/data`.
        - Restart policy: `unless-stopped`.
5. **Cleanup**: Removes old/dangling images to save space.

## Backup Workflow
- User triggers "Export Data" from UI.
- System generates ZIPs in `uploads/` folder.
- User downloads these ZIPs.
- *Recommendation*: Periodically download backups related to "System Backups" group.

## Restore Workflow
- User triggers "Restore Data" from UI.
- User selects backup ZIP (or multiple split parts).
- System uploads, validates, and swaps the database and files.
- **Warning**: This overwrites current data (though a safety backup is created on the server).
