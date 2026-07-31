import os
import psycopg2
import psycopg2.extras

# ── Configuration ─────────────────────────────────────────────────────────────
# Reads DATABASE_URL from environment (set by docker-compose or Render/Railway).
# Local fallback assumes a local Postgres instance for dev without Docker.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://attendx:attendx_dev_password@localhost:5432/attendx"
)


class _CompatConnection:
    """
    Thin wrapper so existing router code written against sqlite3's API
    (conn.execute("... ? ...", params).fetchone()/.fetchall(),
    conn.commit(), conn.close()) keeps working unchanged against
    psycopg2/Postgres. Translates '?' placeholders to '%s' and routes
    execute() through a cursor under the hood.
    """
    def __init__(self, pg_conn):
        self._conn   = pg_conn
        self._cursor = pg_conn.cursor()

    def execute(self, query, params=()):
        query = query.replace("?", "%s")
        self._cursor.execute(query, params)
        return self._cursor

    def commit(self):
        self._conn.commit()

    def close(self):
        self._cursor.close()
        self._conn.close()


def get_connection():
    """
    Returns a connection wrapper exposing the same conn.execute(...)
    interface the routers already use, backed by psycopg2/Postgres.
    Row results behave like dicts (row["column_name"]) via RealDictCursor.
    """
    pg_conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    return _CompatConnection(pg_conn)


def init_db():
    """
    Creates all tables if they don't already exist.
    Call this once on startup from main.py.
    """
    conn   = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id          SERIAL PRIMARY KEY,
            student_id  TEXT    NOT NULL UNIQUE,
            name        TEXT    NOT NULL,
            branch      TEXT    NOT NULL,
            year        INTEGER NOT NULL,
            label       INTEGER NOT NULL UNIQUE,
            enrolled_at TEXT    NOT NULL,
            photo_path  TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id          SERIAL PRIMARY KEY,
            username    TEXT    NOT NULL UNIQUE,
            password    TEXT    NOT NULL,
            role        TEXT    NOT NULL DEFAULT 'student',
            student_id  TEXT,
            FOREIGN KEY (student_id) REFERENCES students(student_id)
                ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS attendance (
            id          SERIAL PRIMARY KEY,
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

    # Seed default admin — password 'admin123' hashed with bcrypt.
    # ON CONFLICT DO NOTHING is Postgres's equivalent of sqlite's INSERT OR IGNORE.
    from auth import hash_password
    cursor.execute("""
        INSERT INTO users (username, password, role, student_id)
        VALUES (%s, %s, 'admin', NULL)
        ON CONFLICT (username) DO NOTHING
    """, ("admin", hash_password("admin123")))

    conn.commit()
    cursor.close()
    conn.close()
    print("Database initialised (PostgreSQL) ✓")
