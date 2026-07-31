import os
import io
from datetime import datetime
from typing import List, Optional

import cv2
import numpy as np
from fastapi import (APIRouter, Depends, HTTPException,
                     UploadFile, File, Form)

from auth import require_admin
from database import get_connection
from models import AttendanceRecord, SessionSummary, UploadResponse
from ml.recognition import process_group_photo

router = APIRouter(prefix="/attendance", tags=["attendance"])


# ── POST /attendance/upload — upload group photo → mark attendance ─────────────
@router.post("/upload", response_model=UploadResponse)
async def upload_group_photo(
    photo:         UploadFile = File(...),
    session_label: str        = Form(None),
    threshold:     float      = Form(0.6),
    admin=Depends(require_admin)
):
    """
    Core attendance marking endpoint.

    Accepts a group photo, runs the full dlib recognition pipeline,
    and writes Present/Absent for every student in the database.

    Steps:
        1. Read uploaded image into numpy array
        2. Run process_group_photo() — detects all faces, recognises each
        3. Collect recognised student IDs
        4. For every student in DB:
               if recognised → mark Present with confidence score
               else          → mark Absent
        5. Guard against double-marking the same session
        6. Return structured response with annotated image

    Args:
        photo         : group photo file (JPG/PNG)
        session_label : e.g. "2024-01-15" or "2024-01-15_Lab1"
                        defaults to today's date if not provided
        threshold     : dlib distance threshold (default 0.6 for group photos)
    """
    if session_label is None:
        session_label = datetime.now().strftime("%Y-%m-%d")

    # Check if this session is already recorded
    conn = get_connection()
    existing_session = conn.execute(
        "SELECT id FROM attendance WHERE session = ? LIMIT 1",
        (session_label,)
    ).fetchone()

    if existing_session:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"Session '{session_label}' already recorded. "
                   f"Use a different session_label."
        )

    # Read uploaded image
    contents = await photo.read()
    np_arr   = np.frombuffer(contents, np.uint8)
    img_bgr  = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img_bgr is None:
        conn.close()
        raise HTTPException(status_code=400,
                            detail="Could not decode image file")

    # Run recognition pipeline
    result = process_group_photo(img_bgr, threshold=threshold)

    # Build set of recognised student_ids
    recognised_ids = {}
    for pred in result["predictions"]:
        if pred["status"] == "recognised" and pred["student"]:
            sid      = pred["student"]["student_id"]
            distance = pred["distance"]
            # Keep best (lowest distance) if same student detected twice
            if sid not in recognised_ids or distance < recognised_ids[sid]:
                recognised_ids[sid] = distance

    # Fetch all enrolled students
    all_students = conn.execute(
        "SELECT student_id FROM students"
    ).fetchall()

    marked_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    present_count = 0
    absent_count  = 0

    for row in all_students:
        sid    = row["student_id"]
        status = "Present" if sid in recognised_ids else "Absent"
        conf   = recognised_ids.get(sid)

        conn.execute("""
            INSERT INTO attendance
                (student_id, session, status, confidence, marked_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT (student_id, session)
            DO UPDATE SET status = EXCLUDED.status,
                          confidence = EXCLUDED.confidence,
                          marked_at = EXCLUDED.marked_at
        """, (sid, session_label, status, conf, marked_at))

        if status == "Present":
            present_count += 1
        else:
            absent_count += 1

    conn.commit()
    conn.close()

    # Build recognised list for response
    recognised_list = [
        {
            "student_id": pred["student"]["student_id"],
            "name":       pred["student"]["name"],
            "confidence": pred["distance"]
        }
        for pred in result["predictions"]
        if pred["status"] == "recognised" and pred["student"]
    ]

    return UploadResponse(
        session          = session_label,
        detected         = result["faces_detected"],
        present          = present_count,
        absent           = absent_count,
        recognised       = recognised_list,
        rejected         = result["rejected_count"],
        annotated_image  = result["annotated_image"]
    )


# ── GET /attendance — full attendance sheet ───────────────────────────────────
@router.get("", response_model=List[AttendanceRecord])
def get_all_attendance(
    session: Optional[str] = None,
    admin=Depends(require_admin)
):
    """
    Returns all attendance records.
    Optionally filter by session label using ?session=2024-01-15
    """
    conn = get_connection()

    if session:
        rows = conn.execute("""
            SELECT a.student_id, s.name, a.session,
                   a.status, a.confidence, a.marked_at
            FROM attendance a
            JOIN students s ON a.student_id = s.student_id
            WHERE a.session = ?
            ORDER BY s.name
        """, (session,)).fetchall()
    else:
        rows = conn.execute("""
            SELECT a.student_id, s.name, a.session,
                   a.status, a.confidence, a.marked_at
            FROM attendance a
            JOIN students s ON a.student_id = s.student_id
            ORDER BY a.session, s.name
        """).fetchall()

    conn.close()
    return [dict(r) for r in rows]


# ── GET /attendance/{student_id} — one student's full history ─────────────────
@router.get("/{student_id}", response_model=List[AttendanceRecord])
def get_student_attendance(student_id: str, admin=Depends(require_admin)):
    """
    Returns all attendance records for a specific student.
    """
    conn = get_connection()

    student = conn.execute(
        "SELECT id FROM students WHERE student_id = ?", (student_id,)
    ).fetchone()
    if not student:
        conn.close()
        raise HTTPException(status_code=404, detail="Student not found")

    rows = conn.execute("""
        SELECT a.student_id, s.name, a.session,
               a.status, a.confidence, a.marked_at
        FROM attendance a
        JOIN students s ON a.student_id = s.student_id
        WHERE a.student_id = ?
        ORDER BY a.session
    """, (student_id,)).fetchall()

    conn.close()
    return [dict(r) for r in rows]


# ── GET /attendance/session/{date} — one session's records ───────────────────
@router.get("/session/{session_label}", response_model=List[AttendanceRecord])
def get_session_attendance(session_label: str, admin=Depends(require_admin)):
    """
    Returns all attendance records for a specific session.
    Includes absent students explicitly.
    """
    conn = get_connection()

    rows = conn.execute("""
        SELECT a.student_id, s.name, a.session,
               a.status, a.confidence, a.marked_at
        FROM attendance a
        JOIN students s ON a.student_id = s.student_id
        WHERE a.session = ?
        ORDER BY s.name
    """, (session_label,)).fetchall()

    conn.close()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No records found for session '{session_label}'"
        )

    return [dict(r) for r in rows]
