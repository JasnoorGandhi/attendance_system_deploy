from typing import List

from fastapi import APIRouter, Depends, HTTPException

from auth import require_student
from database import get_connection
from models import MyProfile, MyAttendanceRecord

router = APIRouter(prefix="/student", tags=["student"])


# ── GET /student/me — own profile ────────────────────────────────────────────
@router.get("/me", response_model=MyProfile)
def get_my_profile(current_user: dict = Depends(require_student)):
    """
    Returns the logged-in student's own profile.
    student_id is extracted from the JWT token — student
    cannot query another student's profile.
    """
    student_id = current_user.get("student_id")
    if not student_id:
        raise HTTPException(status_code=400, detail="No student_id in token")

    conn    = get_connection()
    student = conn.execute(
        "SELECT * FROM students WHERE student_id = ?", (student_id,)
    ).fetchone()
    conn.close()

    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")

    return MyProfile(
        student_id  = student["student_id"],
        name        = student["name"],
        branch      = student["branch"],
        year        = student["year"],
        enrolled_at = student["enrolled_at"]
    )


# ── GET /student/me/attendance — own attendance history ──────────────────────
@router.get("/me/attendance", response_model=List[MyAttendanceRecord])
def get_my_attendance(current_user: dict = Depends(require_student)):
    """
    Returns the logged-in student's full session-by-session
    attendance history, ordered by session date.

    student_id comes from JWT — student cannot access
    another student's records by manipulating the request.
    """
    student_id = current_user.get("student_id")
    if not student_id:
        raise HTTPException(status_code=400, detail="No student_id in token")

    conn = get_connection()

    # Verify student exists
    student = conn.execute(
        "SELECT id FROM students WHERE student_id = ?", (student_id,)
    ).fetchone()
    if not student:
        conn.close()
        raise HTTPException(status_code=404, detail="Student record not found")

    rows = conn.execute("""
        SELECT session, status, confidence, marked_at
        FROM attendance
        WHERE student_id = ?
        ORDER BY session ASC
    """, (student_id,)).fetchall()

    conn.close()

    return [
        MyAttendanceRecord(
            session    = r["session"],
            status     = r["status"],
            confidence = r["confidence"],
            marked_at  = r["marked_at"]
        )
        for r in rows
    ]