"""
ml/embeddings.py

Direct port of the dlib embedding pipeline from the Colab notebook.
Handles:
  - Loading dlib models (detector, shape predictor, face rec model)
  - Computing 128-dim face embeddings from an image
  - Loading / saving the embeddings .pkl database
  - Enrolling a new student (computing + storing their embeddings)
  - Removing a student from the database
"""

import os
import pickle
import numpy as np
import cv2
import dlib
# Check if cv2 is imported at the top of embeddings.py

# ── Paths ─────────────────────────────────────────────────────────────────────
STORAGE_DIR        = os.path.join(os.path.dirname(__file__), "..", "storage")
EMBEDDINGS_PATH    = os.path.join(STORAGE_DIR, "embeddings.pkl")
SHAPE_PRED_PATH    = os.path.join(STORAGE_DIR, "shape_predictor_68_face_landmarks.dat")
FACE_REC_PATH      = os.path.join(STORAGE_DIR, "dlib_face_recognition_resnet_model_v1.dat")

# ── Load dlib models once at import time ──────────────────────────────────────
# These are heavy — load once, reuse across all requests
print("Loading dlib models...")

detector       = dlib.get_frontal_face_detector()
shape_predictor = dlib.shape_predictor(SHAPE_PRED_PATH)
face_rec_model  = dlib.face_recognition_model_v1(FACE_REC_PATH)

print("dlib models loaded ✓")


# ── Embedding computation ─────────────────────────────────────────────────────

def get_embedding(img_rgb: np.ndarray):
    """
    Takes a full RGB image (numpy array).
    Returns a 128-dim numpy embedding vector, or None if no face found.

    Exactly as implemented in the Colab notebook:
      1. Detect faces using dlib HOG detector
      2. Take the largest detected face
      3. Find 68 facial landmarks
      4. Compute 128-dim embedding via ResNet
    """
    img_rgb    = _ensure_rgb(img_rgb)
    img_rgb    = np.ascontiguousarray(img_rgb)
    detections = detector(img_rgb, 1)

    if len(detections) == 0:
        return None

    # Take the largest detected face
    detection = max(detections, key=lambda d: d.width() * d.height())

    # 68 facial landmarks for alignment
    shape     = shape_predictor(img_rgb, detection)

    # 128-dim embedding
    embedding = face_rec_model.compute_face_descriptor(img_rgb, shape)

    return np.array(embedding)


def _ensure_rgb(img: np.ndarray) -> np.ndarray:
    if img is None:
        return img
    if len(img.shape) == 2:
        return cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
    if img.shape[2] == 4:
        return cv2.cvtColor(img, cv2.COLOR_RGBA2RGB)
    return img


def get_all_face_embeddings(img_rgb: np.ndarray):
    print(f"DEBUG get_all_face_embeddings — shape: {img_rgb.shape}, dtype: {img_rgb.dtype}")
    img_rgb    = _ensure_rgb(img_rgb)
    img_rgb    = np.ascontiguousarray(img_rgb)   
    print(f"DEBUG after _ensure_rgb — shape: {img_rgb.shape}, dtype: {img_rgb.dtype}")
    detections = detector(img_rgb, 1)
    
    results = []
    for detection in detections:
        shape     = shape_predictor(img_rgb, detection)
        embedding = face_rec_model.compute_face_descriptor(img_rgb, shape)
        x = detection.left()
        y = detection.top()
        w = detection.right()  - detection.left()
        h = detection.bottom() - detection.top()
        results.append((np.array(embedding), (x, y, w, h)))

    return results


# ── Database load / save ──────────────────────────────────────────────────────
def load_db() -> dict:
    """
    Loads the embeddings .pkl file from storage/.
    Returns empty dict if file doesn't exist yet.

    Database structure (same as Colab notebook):
    {
        label (int): {
            "embeddings": [np.array, np.array, ...],
            "student": {
                "student_id": "2023CS001",
                "name": "Angelina Jolie",
                "branch": "CSE",
                "year": "2"
            }
        },
        ...
    }
    """
    if not os.path.exists(EMBEDDINGS_PATH):
        return {}
    with open(EMBEDDINGS_PATH, "rb") as f:
        return pickle.load(f)


def save_db(db: dict):
    """Saves the embedding database back to storage/embeddings.pkl"""
    os.makedirs(STORAGE_DIR, exist_ok=True)
    with open(EMBEDDINGS_PATH, "wb") as f:
        pickle.dump(db, f)


# ── Enroll / Remove ───────────────────────────────────────────────────────────
def enroll_student_embeddings(student_info: dict,
                               image_paths: list,
                               label: int,
                               max_images: int = 15) -> int:
    """
    Computes embeddings for a new student from their enrollment photos
    and adds them to the database.

    student_info : {"student_id", "name", "branch", "year"}
    image_paths  : list of absolute file paths to enrollment photos
    label        : integer label assigned in SQLite students table
    max_images   : cap at this many images (default 15, matching Colab)

    Returns the number of embeddings successfully stored.
    """
    db         = load_db()
    embeddings = []

    for img_path in image_paths[:max_images]:
        img_bgr = cv2.imread(img_path)
        if img_bgr is None:
            continue

        # dlib expects RGB — OpenCV loads BGR
        img_rgb   = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        embedding = get_embedding(img_rgb)

        if embedding is None:
            continue

        embeddings.append(embedding)

    if len(embeddings) == 0:
        raise ValueError(
            f"No valid face embeddings found in the provided images "
            f"for student {student_info['student_id']}."
        )

    db[label] = {
        "embeddings": embeddings,
        "student":    student_info
    }

    save_db(db)
    return len(embeddings)


def remove_student_embeddings(label: int):
    """
    Removes a student's embeddings from the database by their label.
    Does nothing if label not found.
    """
    db = load_db()
    if label in db:
        del db[label]
        save_db(db)


def update_student_embeddings(label: int,
                               student_info: dict,
                               image_paths: list,
                               max_images: int = 15) -> int:
    """
    Replaces a student's stored embeddings with newly computed ones.
    Used when a student's appearance has changed significantly.

    Returns the number of new embeddings stored.
    """
    db         = load_db()
    embeddings = []

    for img_path in image_paths[:max_images]:
        img_bgr = cv2.imread(img_path)
        if img_bgr is None:
            continue

        img_rgb   = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        embedding = get_embedding(img_rgb)

        if embedding is None:
            continue

        embeddings.append(embedding)

    if len(embeddings) == 0:
        raise ValueError("No valid face embeddings found in the new images.")

    db[label] = {
        "embeddings": embeddings,
        "student":    student_info
    }

    save_db(db)
    return len(embeddings)
