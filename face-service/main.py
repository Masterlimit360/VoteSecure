import os
import json
import numpy as np
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

os.makedirs("temp", exist_ok=True)

@app.get("/")
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "face-service", "ready": True}

@app.post("/detect")
async def detect(file: UploadFile):
    """
    Quickly checks if a face exists in the image.
    Used for real-time auto-capture feedback.
    """
    try:
        temp_path = f"temp/{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(await file.read())
        
        # We use MTCNN to check if a face exists
        faces = DeepFace.extract_faces(img_path=temp_path, detector_backend="mtcnn", enforce_detection=True)
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        return {"detected": True, "faces_count": len(faces)}
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return {"detected": False, "error": str(e)}

@app.post("/represent")
@app.post("/enroll")
async def enroll(file: UploadFile):
    """
    Takes a face image, generates embedding via DeepFace, returns embedding.
    """
    temp_path = f"temp/{file.filename}"
    try:
        with open(temp_path, "wb") as f:
            f.write(await file.read())
        
        # Call DeepFace to represent the face as a vector embedding
        # We use Facenet as it is highly accurate and relatively lightweight
        # Using opencv as the detector backend because it's the most reliable for webcam images
        # enforce_detection=False prevents crashes; we check manually instead
        representation = DeepFace.represent(
            img_path=temp_path,
            model_name="Facenet",
            detector_backend="opencv",
            enforce_detection=False
        )
        
        if not representation or len(representation) == 0:
            raise HTTPException(status_code=400, detail="No face detected in the image. Please try again.")
        
        embedding = representation[0]["embedding"]
        
        # Clean up
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        return {"embedding": embedding, "message": "Embedding extracted successfully"}
    except HTTPException:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=400, detail=f"Failed to detect face or process image: {str(e)}")

@app.post("/verify")
async def verify(file: UploadFile, stored_embedding: str = Form(...)):
    """
    Takes a live capture + stored embedding, returns match score.
    """
    temp_path = f"temp/{file.filename}"
    try:
        with open(temp_path, "wb") as f:
            f.write(await file.read())
        
        # Parse the JSON string array back into a python list
        reference_embedding = json.loads(stored_embedding)
        
        # Extract embedding from live image using opencv (most reliable for webcam)
        representation = DeepFace.represent(
            img_path=temp_path,
            model_name="Facenet",
            detector_backend="opencv",
            enforce_detection=False
        )
        
        if not representation or len(representation) == 0:
            raise HTTPException(status_code=400, detail="No face detected in the live image.")
        
        live_embedding = representation[0]["embedding"]
        
        # Compute cosine distance (Facenet threshold ~0.40 for Cosine, relaxed to 0.45 for webcam variance)
        distance = cosine(reference_embedding, live_embedding)
        verified = bool(distance <= 0.45)
        
        # Clean up
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        return {"verified": verified, "distance": float(distance), "message": "Verification completed"}
    except HTTPException:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=400, detail=f"Failed to process verification: {str(e)}")
