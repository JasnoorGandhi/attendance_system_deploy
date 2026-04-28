"""
main.py — FastAPI application entry point

Run with:
    uvicorn main:app --reload --port 8000

API docs available at:
    http://localhost:8000/docs      (Swagger UI)
    http://localhost:8000/redoc     (ReDoc)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import auth, students, attendance, reports, student

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title       = "Attendance System API",
    description = "Face recognition based attendance system using dlib embeddings",
    version     = "1.0.0"
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allows the React frontend (localhost:3000) to call this backend
# In production, replace "*" with your actual frontend domain
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],
    allow_credentials = False,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Database initialisation ───────────────────────────────────────────────────
@app.on_event("startup")
def startup():
    """
    Runs once when the server starts.
    Creates all SQLite tables if they don't exist.
    Seeds the default admin account.
    """
    init_db()
    print("Server ready ✓")
    print("Docs: http://localhost:8000/docs")


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(students.router)
app.include_router(attendance.router)
app.include_router(reports.router)
app.include_router(student.router)


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/", tags=["health"])
def root():
    return {
        "status":  "running",
        "version": "1.0.0",
        "docs":    "http://localhost:8000/docs"
    }


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}