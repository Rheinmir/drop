# Business Logic & Features

## 1. Authentication
- **Mechanism:** Simple shared secret token.
- **Validation:** `verify_token` dependency checks for `auth-token` header or `token` query parameter (for downloads).
- **Endpoint:** POST `/api/login` verifies password against environment variable `SECRET_PASS`.

## 2. File Operations
- **Upload (`/api/upload`)**:
    - Appends timestamp to filename to prevent collisions.
    - Saves file to `data/uploads/`.
    - Inserts metadata into `files` table.
    - Logs traffic statistics.
- **List (`/api/files`)**: Returns all files sorted by `is_pinned` (descending) and `upload_time` (descending).
- **Download (`/api/download/{id}`)**: 
    - Supports `inline` (view) or `attachment` (download) disposition.
    - Logs download traffic.
- **Delete (`/api/delete/{id}`)**: Removes file from both disk and database.
- **Rename/Meta**: Updates filename, group, or tags in the database.

## 3. Pinned Files
- Files can be "pinned" to stay at the top of the list.
- Implemented via `is_pinned` integer column (0 or 1) in `files` table.

## 4. Analytics
- **Data Sources**:
    - `traffic_stats`: Tracks upload/download sizes and timestamps.
    - `login_logs`: Tracks IP and status of login attempts.
- **Visualization**:
    - Daily traffic chart (Upload vs Download).
    - File type distribution (Pie chart).
    - Recent login history table.

## 5. Backup & Restore
### Export (`/api/export`)
1. Creates a master ZIP of `metadata.db` and `uploads/`.
2. Checks file size against 500MB limit.
    - If < 500MB: Moves single ZIP to `uploads/`.
    - If > 500MB: Splits into chunks (`.001`, `.002`...) and moves them to `uploads/`.
3. Registers the backup files in the database under group `System Backups`.

### Restore (`/api/restore`)
1. Accepts one or multiple file parts.
2. Saves parts to `restore_work/`.
3. Merges parts (if split) into a single ZIP.
4. Validates ZIP integrity and content (must contain `metadata.db`).
5. **Safety Backup**: Moves current `metadata.db` and `uploads/` to `data/safety_backup_{timestamp}/`.
6. **Swap**: Replaces current data with extracted backup data.
