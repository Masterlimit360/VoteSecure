import os
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
# Note: DeepFace is imported, but we mock the actual ML logic for the skeleton
# from deepface import DeepFace

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

@app.post("/enroll")
async def enroll(file: UploadFile):
    """
    Takes a face image, generates embedding via DeepFace, returns embedding.
    """
    try:
        temp_path = f"temp/{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(await file.read())
        
        # MOCK IMPLEMENTATION: In reality, we'd call DeepFace.represent() here
        # embedding = DeepFace.represent(img_path=temp_path, model_name="Facenet")[0]["embedding"]
        mock_embedding = [0.1, 0.2, 0.3, 0.4] # Mock 512-d vector
        
        # Clean up
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        return {"embedding": mock_embedding, "message": "Enrollment successful"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/verify")
async def verify(file: UploadFile, stored_embedding: list):
    """
    Takes a live capture + stored embedding, returns match score.
    """
    try:
        temp_path = f"temp/{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(await file.read())
        
        # MOCK IMPLEMENTATION: In reality, we'd call DeepFace.verify() here
        # result = DeepFace.verify(img1_path=temp_path, img2_path=stored_image_or_embedding, model_name="Facenet")
        
        # Clean up
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        return {"verified": True, "distance": 0.25, "message": "Verification successful"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
