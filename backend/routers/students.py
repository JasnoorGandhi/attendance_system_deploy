import os
import shutil
from datetime import datetime
from typing import List

from fastapi import (APIRouter, Depends, HTTPException,
                     UploadFile, File, Form, status)

from auth import require_admin, hash_password
from database import get_connection
from models import StudentResponse, StudentEnrollRequest, StudentUpdateRequest
from ml.embeddings import (enroll_student_embeddings,
                            remove_student_embeddings,
                            update_student_embeddings)

router = APIRouter(prefix="/students", tags=["students"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "storage", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── GET /students — list all students ────────────────────────────────────────
@router.get("", response_model=List[StudentResponse])
def list_students(admin=Depends(require_admin)):
    conn     = get_connection()
    students = conn.execute(
        "SELECT * FROM students ORDER BY student_id"
    ).fetchall()
    conn.close()
    return [dict(s) for s in students]


# ── GET /students/{student_id} — get one student ─────────────────────────────
@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: str, admin=Depends(require_admin)):
    conn    = get_connection()
    student = conn.execute(
        "SELECT * FROM students WHERE student_id = ?", (student_id,)
    ).fetchone()
    conn.close()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return dict(student)


# ── POST /students/enroll — enroll new student ────────────────────────────────
@router.post("/enroll", response_model=StudentResponse,
             status_code=status.HTTP_201_CREATED)
async def enroll_student(
    student_id: str  = Form(...),
    name:       str  = Form(...),
    branch:     str  = Form(...),
    year:       int  = Form(...),
    photos:     List[UploadFile] = File(...),
    admin=Depends(require_admin)
):
    """
    Enrolls a new student.

    Accepts multipart form data:
        student_id  : e.g. "2023CS018"
        name        : full name
        branch      : e.g. "CSE"
        year        : 1-4
        photos      : 10-20 image files (JPG/PNG)

    Steps:
        1. Validate student_id is unique
        2. Save uploaded photos to storage/uploads/{student_id}/
        3. Compute dlib embeddings from photos
        4. Insert student row into SQLite
        5. Create login credentials for the student
        6. Save embeddings to embeddings.pkl
    """
    conn = get_connection()

    # Check for duplicate
    existing = conn.execute(
        "SELECT id FROM students WHERE student_id = ?", (student_id,)
    ).fetchone()
    if existing:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"Student {student_id} is already enrolled"
        )

    # Assign next label (max existing label + 1)
    max_label = conn.execute(
        "SELECT MAX(label) as m FROM students"
    ).fetchone()["m"]
    label = (max_label + 1) if max_label is not None else 0

    # Save uploaded photos
    student_upload_dir = os.path.join(UPLOAD_DIR, student_id)
    os.makedirs(student_upload_dir, exist_ok=True)

    image_paths = []
    for photo in photos:
        if not photo.content_type.startswith("image/"):
            continue
        dest = os.path.join(student_upload_dir, photo.filename)
        with open(dest, "wb") as f:
            shutil.copyfileobj(photo.file, f)
        image_paths.append(dest)

    if len(image_paths) < 5:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail="Please upload at least 5 face photos for reliable recognition"
        )

    # Compute embeddings
    student_info = {
        "student_id": student_id,
        "name":       name,
        "branch":     branch,
        "year":       str(year)
    }

    try:
        n_embeddings = enroll_student_embeddings(
            student_info, image_paths, label, max_images=15
        )
    except ValueError as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))

    # Insert into students table
    enrolled_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn.execute("""
        INSERT INTO students
            (student_id, name, branch, year, label, enrolled_at, photo_path)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (student_id, name, branch, year, label, enrolled_at,
          student_upload_dir))

    # Create student login account
    # Default password = student_id (admin should tell student to change it)
    conn.execute("""
        INSERT INTO users (username, password, role, student_id)
        VALUES (?, ?, 'student', ?)
        ON CONFLICT (username) DO NOTHING
    """, (student_id, hash_password(student_id), student_id))

    conn.commit()

    student_row = conn.execute(
        "SELECT * FROM students WHERE student_id = ?", (student_id,)
    ).fetchone()
    conn.close()

    return dict(student_row)


# ── DELETE /students/{student_id} — remove student ───────────────────────────
@router.delete("/{student_id}")
def remove_student(student_id: str, admin=Depends(require_admin)):
    """
    Removes a student completely:
        - Deletes from students table (cascades to attendance + users)
        - Removes their embeddings from embeddings.pkl
        - Removes their uploaded photos from storage
    """
    conn    = get_connection()
    student = conn.execute(
        "SELECT * FROM students WHERE student_id = ?", (student_id,)
    ).fetchone()

    if not student:
        conn.close()
        raise HTTPException(status_code=404, detail="Student not found")

    label = student["label"]

    # Remove from DB (cascade handles attendance + users)
    conn.execute("DELETE FROM students WHERE student_id = ?", (student_id,))
    conn.commit()
    conn.close()

    # Remove embeddings from pkl
    remove_student_embeddings(label)

    # Remove uploaded photos
    student_upload_dir = os.path.join(UPLOAD_DIR, student_id)
    if os.path.exists(student_upload_dir):
        shutil.rmtree(student_upload_dir)

    return {"message": f"Student {student_id} removed successfully"}


# ── PUT /students/{student_id} — update student info or re-enroll ─────────────
@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id:  str,
    name:        str  = Form(None),
    branch:      str  = Form(None),
    year:        int  = Form(None),
    photos:      List[UploadFile] = File(None),
    admin=Depends(require_admin)
):
    """
    Updates student info and/or re-computes embeddings.

    If photos are provided → re-enroll (recompute embeddings).
    If only name/branch/year → update info only, keep existing embeddings.
    """
    conn    = get_connection()
    student = conn.execute(
        "SELECT * FROM students WHERE student_id = ?", (student_id,)
    ).fetchone()

    if not student:
        conn.close()
        raise HTTPException(status_code=404, detail="Student not found")

    student = dict(student)

    # Update fields
    new_name   = name   or student["name"]
    new_branch = branch or student["branch"]
    new_year   = year   or student["year"]

    conn.execute("""
        UPDATE students SET name = ?, branch = ?, year = ?
        WHERE student_id = ?
    """, (new_name, new_branch, new_year, student_id))
    conn.commit()

    # Re-enroll if new photos provided
    if photos:
        student_upload_dir = os.path.join(UPLOAD_DIR, student_id)
        os.makedirs(student_upload_dir, exist_ok=True)

        image_paths = []
        for photo in photos:
            if not photo.content_type.startswith("image/"):
                continue
            dest = os.path.join(student_upload_dir, photo.filename)
            with open(dest, "wb") as f:
                shutil.copyfileobj(photo.file, f)
            image_paths.append(dest)

        if image_paths:
            student_info = {
                "student_id": student_id,
                "name":       new_name,
                "branch":     new_branch,
                "year":       str(new_year)
            }
            try:
                update_student_embeddings(
                    student["label"], student_info, image_paths
                )
            except ValueError as e:
                conn.close()
                raise HTTPException(status_code=400, detail=str(e))

    updated = conn.execute(
        "SELECT * FROM students WHERE student_id = ?", (student_id,)
    ).fetchone()
    conn.close()

    return dict(updated)
