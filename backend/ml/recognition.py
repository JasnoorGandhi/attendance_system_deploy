"""
ml/recognition.py

Group photo recognition pipeline — ported directly from Colab notebook.
Handles:
  - recognise_face()       — match one embedding against the database
  - process_group_photo()  — detect all faces in an image, recognise each,
                             return structured predictions + annotated image
"""

import numpy as np
import cv2
import base64
from typing import List, Tuple, Optional

from ml.embeddings import get_all_face_embeddings, load_db

# ── Threshold ─────────────────────────────────────────────────────────────────
# From Colab notebook experimentation:
#   < 0.4  very confident match
#   0.4–0.5 good match
#   0.5–0.6 uncertain
#   > 0.6  reject as unknown
# We use 0.6 for group photos (slightly relaxed vs individual 0.5)
# matching the Canva test that gave 100% accuracy
DEFAULT_THRESHOLD = 0.6


def recognise_face(embedding: np.ndarray,
                   db: dict,
                   threshold: float = DEFAULT_THRESHOLD
                   ) -> Tuple[Optional[dict], float]:
    """
    Compares a query embedding against every stored embedding in the database.
    Returns the closest match if within threshold, otherwise None.

    Exactly as implemented in the Colab notebook:
        distance = euclidean norm in 128-dim space
        best match = minimum distance across all stored embeddings

    Returns:
        (student_dict, distance) if match found
        (None, distance)         if rejected
    """
    best_match    = None
    best_distance = float("inf")

    for label, data in db.items():
        for stored_embedding in data["embeddings"]:
            distance = np.linalg.norm(embedding - stored_embedding)
            if distance < best_distance:
                best_distance = distance
                best_match    = data["student"]

    if best_distance < threshold:
        return best_match, best_distance
    else:
        return None, best_distance


def process_group_photo(img_bgr: np.ndarray,
                        threshold: float = DEFAULT_THRESHOLD
                        ) -> dict:
    """
    Full group photo pipeline — ported from process_group_photo_from_path()
    in the Colab notebook.

    Steps:
        1. Convert BGR → RGB (dlib expects RGB)
        2. Detect all faces using dlib HOG detector
        3. For each face: compute embedding → match against database
        4. Build prediction list
        5. Draw annotated image (green box = recognised, red = unknown)
        6. Return structured result

    Args:
        img_bgr   : OpenCV BGR numpy array (as loaded by cv2.imread)
        threshold : euclidean distance threshold for recognition

    Returns dict:
    {
        "predictions": [
            {
                "student":    {student_id, name, branch, year} or None,
                "distance":   float,
                "status":     "recognised" | "rejected",
                "bbox":       (x, y, w, h)
            },
            ...
        ],
        "annotated_image": base64 string of annotated JPEG,
        "faces_detected":  int,
        "recognised_count": int,
        "rejected_count":   int
    }
    """

    db = load_db()

    # Handle RGBA images (PNG with alpha channel uploaded from browser)
    if len(img_bgr.shape) == 3 and img_bgr.shape[2] == 4:
        img_bgr = cv2.cvtColor(img_bgr, cv2.COLOR_BGRA2BGR)

    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    # Detect all faces + compute embeddings
    face_data = get_all_face_embeddings(img_rgb)

    predictions = []

    for embedding, bbox in face_data:
        student, distance = recognise_face(embedding, db, threshold)

        status = "recognised" if student else "rejected"

        predictions.append({
            "student":  student,
            "distance": round(float(distance), 4),
            "status":   status,
            "bbox":     bbox
        })

    # Draw annotated image
    annotated = _draw_annotations(img_bgr.copy(), predictions)

    # Encode annotated image as base64 for API response
    _, buffer       = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
    annotated_b64   = base64.b64encode(buffer).decode("utf-8")

    recognised_count = sum(1 for p in predictions if p["status"] == "recognised")
    rejected_count   = len(predictions) - recognised_count

    return {
        "predictions":      predictions,
        "annotated_image":  annotated_b64,
        "faces_detected":   len(predictions),
        "recognised_count": recognised_count,
        "rejected_count":   rejected_count
    }


def _draw_annotations(img_bgr: np.ndarray, predictions: list) -> np.ndarray:
    """
    Draws bounding boxes and name labels on the image.
    Green box + name = recognised student
    Red box = unknown / rejected

    Ported from visualise_group_result_from_predictions() in Colab notebook.
    """
    for pred in predictions:
        x, y, w, h = pred["bbox"]

        if pred["status"] == "recognised" and pred["student"]:
            name  = pred["student"]["name"]
            color = (0, 200, 0)    # green in BGR
            label = f"{name.split()[0]} ({pred['distance']:.2f})"
        else:
            color = (0, 0, 220)    # red in BGR
            label = f"Unknown ({pred['distance']:.2f})"

        # Bounding box
        cv2.rectangle(img_bgr, (x, y), (x + w, y + h), color, 2)

        # Label background rectangle
        text_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
        cv2.rectangle(img_bgr,
                      (x, y - 22),
                      (x + text_size[0] + 4, y),
                      color, -1)

        # Label text
        cv2.putText(img_bgr, label,
                    (x + 2, y - 6),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5, (255, 255, 255), 1,
                    cv2.LINE_AA)

    return img_bgr
