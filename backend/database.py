import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "attendance.db")


def get_connection():
    """
    Returns a SQLite connection with row_factory set so
    every row comes back as a dict instead of a tuple.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """
    Creates all tables if they don't already exist.
    Call this once on startup from main.py.

    Tables:
        students   — one row per enrolled student
        users      — login credentials (admin + student accounts)
        attendance — one row per student per session
    """
    conn = get_connection()
    cursor = conn.cursor()

    # ── students ──────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id  TEXT    NOT NULL UNIQUE,
            name        TEXT    NOT NULL,
            branch      TEXT    NOT NULL,
            year        INTEGER NOT NULL,
            label       INTEGER NOT NULL UNIQUE,
            enrolled_at TEXT    NOT NULL,
            photo_path  TEXT
        )
    """)

    # ── users ─────────────────────────────────────────────────────
    # role is either 'admin' or 'student'
    # student_id is NULL for admin accounts
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            username    TEXT    NOT NULL UNIQUE,
            password    TEXT    NOT NULL,
            role        TEXT    NOT NULL DEFAULT 'student',
            student_id  TEXT,
            FOREIGN KEY (student_id) REFERENCES students(student_id)
                ON DELETE CASCADE
        )
    """)

    # ── attendance ────────────────────────────────────────────────
    # status is either 'Present' or 'Absent'
    # confidence stores the dlib euclidean distance (lower = better)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS attendance (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id  TEXT    NOT NULL,
            session     TEXT    NOT NULL,
            status      TEXT    NOT NULL DEFAULT 'Absent',
            confidence  REAL,
            marked_at   TEXT    NOT NULL,
            FOREIGN KEY (student_id) REFERENCES students(student_id)
                ON DELETE CASCADE,
            UNIQUE (student_id, session)
        )
    """)

    # ── seed default admin account ────────────────────────────────
    # password is 'admin123' hashed with bcrypt
    # frontend should prompt admin to change this on first login
    from auth import hash_password
    cursor.execute("""
        INSERT OR IGNORE INTO users (username, password, role, student_id)
        VALUES (?, ?, 'admin', NULL)
    """, ("admin", hash_password("admin123")))

    conn.commit()
    conn.close()
    print("Database initialised ✓")