# Project Rules & Standards

## Code Style

### General
- **Language**: English is preferred for code comments and documentation, though project reports may be in Vietnamese.
- **Paths**: Always use relative paths safely or configured environment variables for file access.

### Frontend (TypeScript/React)
- **Components**: Functional components with Hooks.
- **Styling**: Use standard CSS imports or modules. Avoid inline styles where possible to maintain the "Ocean" aesthetic consistency.
- **State**: Keep state local unless shared global context is strictly necessary.
- **Naming**: PascalCase for components (`FileGrid.tsx`), camelCase for functions/vars.

### Backend (Python/FastAPI)
- **Type Hinting**: Use `typing` module (`List`, `Optional`, etc.) and Pydantic models for request bodies.
- **Async**: Use `async def` for route handlers, especially file I/O operations using `aiofiles`.
- **Error Handling**: Use `HTTPException` for control flow errors.
- **Database**: Use raw SQL queries via `sqlite3` for simplicity in this specific project (avoid ORM overhead unless complexity grows).

## System Constraints
1. **Docker**: The application must run within the defined Docker container.
2. **Volume Mapping**: All persistent data MUST go into `/data` (including DB and uploads). Anything outside this directory is ephemeral.
3. **Port**: The application listens on port 8000 internally.

## Git & Version Control
- **Commits**: Clear messages describing the change (Fix, Feat, Refactor).
- **Branches**: `main` is the primary branch.

## UI/UX Rules ("Ocean Edition")
- **Palette**: Deep blues, teals, and glassmorphism effects.
- **Interaction**: Smooth transitions, hover effects, and immediate feedback.
- **Responsiveness**: Must work on Mobile, Tablet, and Desktop.

## AI Agent Guidelines
1. **RAG Maintenance**: ANY modification to the codebase (logic, architecture, workflows) MUST be accompanied by an update to the corresponding file in the `rag/` directory. This ensures the context remains the single source of truth.
2. **Session Start**: At the beginning of every new chat or session, the AI MUST read `rag/rules.md` first to align with project standards.

