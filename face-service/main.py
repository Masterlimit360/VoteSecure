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

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "face-service"}

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

@app.post("/enroll")
async def enroll(file: UploadFile):
    """
    Takes a face image, generates embedding via DeepFace, returns embedding.
    """
    try:
        temp_path = f"temp/{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(await file.read())
        
        # Call DeepFace to represent the face as a vector embedding
        # We use Facenet as it is highly accurate and relatively lightweight
        # using MTCNN as the detector backend because it's much better in low-light and tricky angles
        representation = DeepFace.represent(img_path=temp_path, model_name="Facenet", detector_backend="mtcnn", enforce_detection=True)
        embedding = representation[0]["embedding"]
        
        # Clean up
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        return {"embedding": embedding, "message": "Enrollment successful"}
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=400, detail=f"Failed to detect face or process image: {str(e)}")

@app.post("/verify")
async def verify(file: UploadFile, stored_embedding: str = Form(...)):
    """
    Takes a live capture + stored embedding, returns match score.
    """
    try:
        temp_path = f"temp/{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(await file.read())
        
        # Parse the JSON string array back into a python list
        reference_embedding = json.loads(stored_embedding)
        
        # Extract embedding from live image using MTCNN
        representation = DeepFace.represent(img_path=temp_path, model_name="Facenet", detector_backend="mtcnn", enforce_detection=True)
        live_embedding = representation[0]["embedding"]
        
        # Compute cosine distance (Facenet threshold is usually around 0.40 for Cosine)
        distance = cosine(reference_embedding, live_embedding)
        verified = bool(distance <= 0.40)
        
        # Clean up
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        return {"verified": verified, "distance": float(distance), "message": "Verification completed"}
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=400, detail=f"Failed to process verification: {str(e)}")
