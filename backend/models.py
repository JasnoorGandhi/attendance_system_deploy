from pydantic import BaseModel
from typing import Optional, List


# ── Auth ──────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    role:         str
    username:     str
    student_id:   Optional[str] = None


# ── Students ──────────────────────────────────────────────────────────────────
class StudentEnrollRequest(BaseModel):
    student_id: str
    name:       str
    branch:     str
    year:       int


class StudentUpdateRequest(BaseModel):
    name:   Optional[str] = None
    branch: Optional[str] = None
    year:   Optional[int] = None


class StudentResponse(BaseModel):
    id:          int
    student_id:  str
    name:        str
    branch:      str
    year:        int
    label:       int
    enrolled_at: str
    photo_path:  Optional[str] = None


# ── Attendance ────────────────────────────────────────────────────────────────
class AttendanceRecord(BaseModel):
    student_id:  str
    name:        str
    session:     str
    status:      str
    confidence:  Optional[float] = None
    marked_at:   str


class SessionSummary(BaseModel):
    session:       str
    total:         int
    present:       int
    absent:        int
    present_pct:   float


class UploadResponse(BaseModel):
    session:     str
    detected:    int
    present:     int
    absent:      int
    recognised:  List[dict]
    rejected:    int
    annotated_image: Optional[str] = None   # base64 encoded


# ── Reports ───────────────────────────────────────────────────────────────────
class StudentSummary(BaseModel):
    student_id:     str
    name:           str
    branch:         str
    year:           int
    total_sessions: int
    present:        int
    absent:         int
    percentage:     float
    below_75:       bool


class ReportSummary(BaseModel):
    total_students:   int
    total_sessions:   int
    overall_present:  float
    below_75_count:   int
    students:         List[StudentSummary]


# ── Student self-service ──────────────────────────────────────────────────────
class MyProfile(BaseModel):
    student_id:  str
    name:        str
    branch:      str
    year:        int
    enrolled_at: str


class MyAttendanceRecord(BaseModel):
    session:    str
    status:     str
    confidence: Optional[float] = None
    marked_at:  str