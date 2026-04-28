from fastapi import APIRouter, HTTPException, status, Depends
from database import get_connection
from auth import (verify_password, create_token,
                  get_current_user, hash_password)
from models import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    """
    Accepts username + password.
    Returns a JWT token valid for 8 hours.

    Role is embedded in the token — frontend uses it to decide
    which dashboard to show (admin vs student).
    """
    conn = get_connection()
    user = conn.execute(
        "SELECT * FROM users WHERE username = ?", (body.username,)
    ).fetchone()
    conn.close()

    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    token = create_token({
        "sub":        user["username"],
        "role":       user["role"],
        "student_id": user["student_id"]
    })

    return TokenResponse(
        access_token = token,
        role         = user["role"],
        username     = user["username"],
        student_id   = user["student_id"]
    )


@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    """
    JWTs are stateless — logout is handled on the frontend
    by deleting the token from memory.
    This endpoint exists for completeness and audit logging.
    """
    return {"message": f"User {current_user['sub']} logged out successfully"}


@router.post("/change-password")
def change_password(
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Allows any logged-in user to change their own password.
    Body: {"current_password": "...", "new_password": "..."}
    """
    conn = get_connection()
    user = conn.execute(
        "SELECT * FROM users WHERE username = ?", (current_user["sub"],)
    ).fetchone()

    if not user or not verify_password(body.get("current_password", ""), user["password"]):
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )

    new_hashed = hash_password(body.get("new_password", ""))
    conn.execute(
        "UPDATE users SET password = ? WHERE username = ?",
        (new_hashed, current_user["sub"])
    )
    conn.commit()
    conn.close()

    return {"message": "Password updated successfully"}