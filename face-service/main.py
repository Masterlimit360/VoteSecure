import io
import json
import numpy as np
from PIL import Image
from scipy.spatial.distance import cosine
from fastapi import FastAPI, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from deepface import DeepFace

app = FastAPI(title="VoteSecure Face Service")

# Allow CORS for the frontend/backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper to decode uploaded image bytes into NumPy RGB array in memory
def read_image_to_numpy(contents: bytes) -> np.ndarray:
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        return np.array(image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")

# Warm up the Facenet model on startup so the first request is instant (<100ms)
@app.on_event("startup")
async def warmup_model():
    try:
        dummy_img = np.zeros((160, 160, 3), dtype=np.uint8)
        DeepFace.represent(
            img_path=dummy_img,
            model_name="Facenet",
            detector_backend="skip",
            enforce_detection=False
        )
        print("✓ Facenet model loaded and ready in memory.")
    except Exception as e:
        print(f"Warning during model warmup: {e}")

@app.get("/")
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "face-service", "ready": True}

@app.post("/detect")
async def detect(file: UploadFile):
    """
    Quickly checks if a face exists in the image.
    """
    try:
        contents = await file.read()
        img_array = read_image_to_numpy(contents)
        
        representation = DeepFace.represent(
            img_path=img_array,
            model_name="Facenet",
            detector_backend="skip",
            enforce_detection=False
        )
        return {"detected": bool(representation and len(representation) > 0), "faces_count": len(representation)}
    except Exception as e:
        return {"detected": False, "error": str(e)}

@app.post("/represent")
@app.post("/enroll")
async def enroll(file: UploadFile):
    """
    Takes a face image, generates embedding via DeepFace Facenet in-memory, returns embedding.
    """
    try:
        contents = await file.read()
        img_array = read_image_to_numpy(contents)
        
        representation = DeepFace.represent(
            img_path=img_array,
            model_name="Facenet",
            detector_backend="skip",
            enforce_detection=False
        )
        
        if not representation or len(representation) == 0:
            raise HTTPException(status_code=400, detail="No face representation could be extracted. Please ensure good lighting and look at the camera.")
        
        embedding = representation[0]["embedding"]
        return {"embedding": embedding, "message": "Embedding extracted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Enroll Error]: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to process face embedding: {str(e)}")

@app.post("/verify")
async def verify(file: UploadFile, stored_embedding: str = Form(...)):
    """
    Takes a live capture + stored embedding, returns match score.
    """
    try:
        contents = await file.read()
        img_array = read_image_to_numpy(contents)
        
        reference_embedding = json.loads(stored_embedding)
        
        representation = DeepFace.represent(
            img_path=img_array,
            model_name="Facenet",
            detector_backend="skip",
            enforce_detection=False
        )
        
        if not representation or len(representation) == 0:
            raise HTTPException(status_code=400, detail="No face detected in the live image.")
        
        live_embedding = representation[0]["embedding"]
        
        # Compute cosine distance (Facenet threshold ~0.40 for Cosine, relaxed to 0.45 for webcam variance)
        distance = cosine(reference_embedding, live_embedding)
        verified = bool(distance <= 0.45)
        
        return {"verified": verified, "distance": float(distance), "message": "Verification completed"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Verify Error]: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to process verification: {str(e)}")
