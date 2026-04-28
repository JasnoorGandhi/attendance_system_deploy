import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from auth import require_admin
from database import get_connection
from models import ReportSummary, StudentSummary

router = APIRouter(prefix="/reports", tags=["reports"])


# ── GET /reports/summary — overall stats ─────────────────────────────────────
@router.get("/summary", response_model=ReportSummary)
def get_summary(admin=Depends(require_admin)):
    """
    Returns aggregate attendance statistics for all students.
    Used for the admin dashboard cards and bar chart.
    """
    conn = get_connection()

    # Total unique sessions
    total_sessions = conn.execute(
        "SELECT COUNT(DISTINCT session) as c FROM attendance"
    ).fetchone()["c"]

    # Per-student stats
    rows = conn.execute("""
        SELECT
            s.student_id,
            s.name,
            s.branch,
            s.year,
            COUNT(a.id)                                       AS total,
            SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present,
            SUM(CASE WHEN a.status = 'Absent'  THEN 1 ELSE 0 END) AS absent
        FROM students s
        LEFT JOIN attendance a ON s.student_id = a.student_id
        GROUP BY s.student_id
        ORDER BY s.name
    """).fetchall()

    conn.close()

    students    = []
    below_75    = 0
    total_pres  = 0
    total_rec   = 0

    for r in rows:
        total   = r["total"] or 0
        present = r["present"] or 0
        absent  = r["absent"] or 0
        pct     = (present / total * 100) if total > 0 else 0.0
        is_low  = pct < 75.0

        if is_low:
            below_75 += 1

        total_pres += present
        total_rec  += total

        students.append(StudentSummary(
            student_id     = r["student_id"],
            name           = r["name"],
            branch         = r["branch"],
            year           = r["year"],
            total_sessions = total,
            present        = present,
            absent         = absent,
            percentage     = round(pct, 1),
            below_75       = is_low
        ))

    overall_pct = (total_pres / total_rec * 100) if total_rec > 0 else 0.0

    return ReportSummary(
        total_students  = len(students),
        total_sessions  = total_sessions,
        overall_present = round(overall_pct, 1),
        below_75_count  = below_75,
        students        = students
    )


# ── GET /reports/student/{student_id} — individual report ────────────────────
@router.get("/student/{student_id}", response_model=StudentSummary)
def get_student_report(student_id: str, admin=Depends(require_admin)):
    """
    Returns attendance stats for one specific student.
    Used for individual student report page.
    """
    conn = get_connection()

    row = conn.execute("""
        SELECT
            s.student_id,
            s.name,
            s.branch,
            s.year,
            COUNT(a.id)                                            AS total,
            SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present,
            SUM(CASE WHEN a.status = 'Absent'  THEN 1 ELSE 0 END) AS absent
        FROM students s
        LEFT JOIN attendance a ON s.student_id = a.student_id
        WHERE s.student_id = ?
        GROUP BY s.student_id
    """, (student_id,)).fetchone()
    conn.close()

    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Student not found")

    total   = row["total"] or 0
    present = row["present"] or 0
    absent  = row["absent"] or 0
    pct     = (present / total * 100) if total > 0 else 0.0

    return StudentSummary(
        student_id     = row["student_id"],
        name           = row["name"],
        branch         = row["branch"],
        year           = row["year"],
        total_sessions = total,
        present        = present,
        absent         = absent,
        percentage     = round(pct, 1),
        below_75       = pct < 75.0
    )


# ── GET /reports/export — download attendance CSV ────────────────────────────
@router.get("/export")
def export_attendance(admin=Depends(require_admin)):
    """
    Returns the full attendance sheet as a downloadable CSV.
    Columns: student_id, name, branch, year, session, status,
             confidence, marked_at
    """
    conn = get_connection()

    rows = conn.execute("""
        SELECT
            a.student_id,
            s.name,
            s.branch,
            s.year,
            a.session,
            a.status,
            a.confidence,
            a.marked_at
        FROM attendance a
        JOIN students s ON a.student_id = s.student_id
        ORDER BY a.session, s.name
    """).fetchall()
    conn.close()

    # Write CSV to in-memory buffer
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "student_id", "name", "branch", "year",
        "session", "status", "confidence", "marked_at"
    ])
    for r in rows:
        writer.writerow([
            r["student_id"], r["name"], r["branch"], r["year"],
            r["session"], r["status"],
            f"{r['confidence']:.4f}" if r["confidence"] else "",
            r["marked_at"]
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=attendance.csv"
        }
    )