# Project State

## Current Version
**v1.2.0** (2026-01-16)

## Recent Changelog
- **v1.2.0**:
    - Implemented "Auto-Fit" Grid System: Dynamic columns and vertical row stretching for perfect screen fit.
    - Removed internal scrollbars in favor of strict pagination.
    - Added UI Template: `rag/templates/responsive_auto_fit_grid.md`.
- **v1.1.1**:
    - Fixed landscape scrolling issue by locking viewport height on large screens.
    - Added internal scrolling to Dashboard content area.
- **v1.1.0**:
    - Fixed file pin toggle in context menu.
    - Simplified copy link to always use download URL.
    - Improved context menu positioning (React Portal).
- **v1.0.0**: Initial release (Ocean Edition).

## Known Issues
- Large file uploads (>1GB) may experience timeouts depending on network speed (no chunked upload implemented).
- Analytics queries might slow down if `traffic_stats` grows too large (no indexing strategy defined yet in `init_db`).

## Pending Roadmap Items
- Migrate SQLite to PostgreSQL for concurrency.
- Implement background workers (`Celery`) for heavy tasks (e.g. image thumbnails).
- Add user-specific accounts (currently single-password access).
