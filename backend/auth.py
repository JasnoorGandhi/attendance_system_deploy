from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# ── Configuration ─────────────────────────────────────────────────────────────
# Change SECRET_KEY to a long random string in production
# Generate one with: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY  = "change_this_to_a_long_random_secret_in_production"
ALGORITHM   = "HS256"
TOKEN_EXPIRE_HOURS = 8

# ── Password hashing ──────────────────────────────────────────────────────────
pwd_context    = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme  = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT helpers ───────────────────────────────────────────────────────────────
def create_token(data: dict) -> str:
    """
    Creates a signed JWT that expires after TOKEN_EXPIRE_HOURS.
    data should contain at least {"sub": username, "role": role}.
    """
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decodes and validates a JWT.
    Raises HTTPException 401 if invalid or expired.
    """
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )


# ── Dependency injectors ──────────────────────────────────────────────────────
def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    FastAPI dependency — injects the decoded token payload.
    Use this in any route that requires a logged-in user.

    Returns dict with keys: sub (username), role, student_id (if student)
    """
    return decode_token(token)


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """
    FastAPI dependency — injects current user only if they are admin.
    Raises 403 if a student tries to access an admin-only endpoint.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def require_student(current_user: dict = Depends(get_current_user)) -> dict:
    """
    FastAPI dependency — injects current user only if they are a student.
    Raises 403 if an admin tries to access a student-only endpoint.
    """
    if current_user.get("role") != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access required"
        )
    return current_user