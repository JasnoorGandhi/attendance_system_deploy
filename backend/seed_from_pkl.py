# backend/seed_from_pkl.py
# Run once: python seed_from_pkl.py

import pickle
import sqlite3
from datetime import datetime

DB_PATH  = "attendance.db"
PKL_PATH = "storage/embeddings.pkl"

with open(PKL_PATH, "rb") as f:
    db = pickle.load(f)

conn = sqlite3.connect(DB_PATH)

for label, data in db.items():
    s   = data["student"]
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Insert into students table
    conn.execute("""
        INSERT OR IGNORE INTO students
            (student_id, name, branch, year, label, enrolled_at, photo_path)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (s["student_id"], s["name"], s["branch"],
          int(s["year"]), label, now, ""))

    # Create student login (password = student_id)
    from auth import hash_password
    conn.execute("""
        INSERT OR IGNORE INTO users
            (username, password, role, student_id)
        VALUES (?, ?, 'student', ?)
    """, (s["student_id"], hash_password(s["student_id"]), s["student_id"]))

conn.commit()
conn.close()
print(f"Seeded {len(db)} students into SQLite ✓")