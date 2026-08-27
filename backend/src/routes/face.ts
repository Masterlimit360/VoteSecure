import { Router } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import prisma from '../db';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const FACE_SERVICE_URL = (process.env.FACE_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

// Diagnostic endpoint: check Face Service health & connectivity
router.get('/status', async (req, res) => {
  const startTime = Date.now();
  try {
    const response = await axios.get(`${FACE_SERVICE_URL}/health`, { timeout: 15000 });
    const latencyMs = Date.now() - startTime;
    res.json({
      status: 'ok',
      faceServiceReachable: true,
      configuredUrl: FACE_SERVICE_URL,
      latencyMs,
      faceServiceResponse: response.data
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    console.error(`[Face Service Check Failed] Target: ${FACE_SERVICE_URL} - Error: ${error.message}`);
    res.status(503).json({
      status: 'error',
      faceServiceReachable: false,
      configuredUrl: FACE_SERVICE_URL,
      latencyMs,
      error: error.message,
      code: error.code || 'UNKNOWN',
      hint: 'Ensure FACE_SERVICE_URL is set in backend environment to the active face service URL (e.g. https://votesecure-face-service.onrender.com).'
    });
  }
});

// Helper function to call Face Service with automatic retry
async function callFaceEndpointWithRetry(endpoint: string, createFormData: () => FormData, maxRetries = 2): Promise<any> {
  let lastError: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const formData = createFormData();
      const response = await axios.post(`${FACE_SERVICE_URL}${endpoint}`, formData, {
        headers: { ...formData.getHeaders() },
        timeout: 50000
      });
      return response.data;
    } catch (err: any) {
      lastError = err;
      const status = err.response?.status;
      const isRateLimitedOrWaking = status === 429 || status === 503 || err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT';

      if (isRateLimitedOrWaking && attempt < maxRetries) {
        const delayMs = (attempt + 1) * 1500;
        console.warn(`[Face Service Retry ${endpoint}] Attempt ${attempt + 1} failed (${err.message}). Retrying in ${delayMs}ms...`);
        await new Promise((res) => setTimeout(res, delayMs));
        continue;
      }
      break;
    }
  }
  throw lastError;
}

// Proxy face detection (fast check)
router.post('/detect', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const data = await callFaceEndpointWithRetry('/detect', () => {
      const formData = new FormData();
      formData.append('file', req.file!.buffer, req.file!.originalname);
      return formData;
    });

    res.json(data);
  } catch (error: any) {
    console.error(`[Face Detect Error] Target: ${FACE_SERVICE_URL} - Error:`, error.message);
    res.status(500).json({ detected: false, error: 'Failed to communicate with Face Service', detail: error.message });
  }
});

// Proxy enrollment to Face Service
router.post('/enroll', verifyToken, upload.single('image'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const data = await callFaceEndpointWithRetry('/enroll', () => {
      const formData = new FormData();
      formData.append('file', req.file!.buffer, req.file!.originalname);
      return formData;
    });

    // Save embedding and photo to voter profile
    if (req.user?.role === 'voter') {
      const base64Image = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      const faceImageBase64 = `data:${mimeType};base64,${base64Image}`;

      await prisma.voter.update({
        where: { id: req.user.id },
        data: { 
          faceEmbedding: data.embedding, 
          faceImageBase64: faceImageBase64,
          isVerified: true 
        }
      });
    }

    res.json({ message: 'Enrollment successful', embedding: data.embedding });
  } catch (error: any) {
    console.error(error);
    if (error.response?.status === 429) {
      return res.status(429).json({ detail: 'Face recognition service is busy. Please wait a moment and try again.' });
    }
    if (error.response && error.response.data && error.response.data.detail) {
      res.status(400).json({ detail: error.response.data.detail });
    } else {
      res.status(500).json({ error: 'Failed to communicate with Face Service', detail: error.message });
    }
  }
});

// Cosine Distance Helper for DeepFace vectors
export function calculateCosineDistance(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecA.length !== vecB.length) return 1.0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 1.0;
  const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, 1.0 - similarity);
}

// Proxy verification to Face Service (1:1 Identity Challenge against the signed-in voter)
router.post('/verify', verifyToken, upload.single('image'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // 1. Fetch the currently logged-in voter's baseline facial embedding
    const currentVoter = await prisma.voter.findUnique({ where: { id: req.user.id } });
    if (!currentVoter || !currentVoter.faceEmbedding) {
      return res.status(400).json({ error: 'Voter has no face enrolled. Please complete face enrollment first.' });
    }

    // Parse current voter's stored embedding
    let currentUserEmbedding: number[] | null = null;
    if (Array.isArray(currentVoter.faceEmbedding)) {
      currentUserEmbedding = currentVoter.faceEmbedding as any as number[];
    } else if (typeof currentVoter.faceEmbedding === 'string') {
      try {
        currentUserEmbedding = JSON.parse(currentVoter.faceEmbedding);
      } catch {
        currentUserEmbedding = null;
      }
    }

    if (!currentUserEmbedding || currentUserEmbedding.length === 0) {
      return res.status(400).json({ error: 'Invalid biometric record for current voter. Please re-enroll your face.' });
    }

    // 2. Extract live embedding from the captured image via Python Face Service
    const data = await callFaceEndpointWithRetry('/enroll', () => {
      const formData = new FormData();
      formData.append('file', req.file!.buffer, req.file!.originalname || 'verify.jpg');
      return formData;
    });

    const liveEmbedding: number[] = data.embedding;
    if (!liveEmbedding || !Array.isArray(liveEmbedding)) {
      return res.status(400).json({ error: 'Could not extract facial features from the image. Please ensure good lighting.' });
    }

    // 3. Compute cosine distance specifically against the SIGNED-IN voter's embedding
    const currentVoterDistance = calculateCosineDistance(liveEmbedding, currentUserEmbedding);

    // 4. Also check against other enrolled voters to detect impersonation / wrong account
    const otherVoters = await prisma.voter.findMany({
      where: {
        id: { not: req.user.id },
        isVerified: true,
        faceEmbedding: { not: null as any }
      },
      select: {
        id: true,
        fullName: true,
        faceEmbedding: true
      }
    });

    let bestOtherMatch: any = null;
    let minOtherDistance = Infinity;

    for (const other of otherVoters) {
      let otherEmbedding: number[] | null = null;
      if (Array.isArray(other.faceEmbedding)) {
        otherEmbedding = other.faceEmbedding as any as number[];
      } else if (typeof other.faceEmbedding === 'string') {
        try {
          otherEmbedding = JSON.parse(other.faceEmbedding);
        } catch {
          otherEmbedding = null;
        }
      }

      if (otherEmbedding && otherEmbedding.length === liveEmbedding.length) {
        const dist = calculateCosineDistance(liveEmbedding, otherEmbedding);
        if (dist < minOtherDistance) {
          minOtherDistance = dist;
          bestOtherMatch = other;
        }
      }
    }

    // Facenet Cosine Distance Verification Threshold
    const VERIFY_THRESHOLD = 0.35;

    // Condition A: If the scanned face clearly matches another enrolled voter's face better than the logged-in voter
    if (minOtherDistance <= VERIFY_THRESHOLD && minOtherDistance < currentVoterDistance) {
      return res.status(403).json({
        verified: false,
        error: `Identity Mismatch: The scanned face belongs to another registered voter (${bestOtherMatch.fullName}), but you are currently signed in as ${currentVoter.fullName}. Please sign in to your own account to vote.`,
        confidence: Math.round((1 - currentVoterDistance) * 100)
      });
    }

    // Condition B: The scanned face does not meet the match threshold for the signed-in account
    if (currentVoterDistance > VERIFY_THRESHOLD) {
      return res.status(401).json({
        verified: false,
        error: `Face verification failed: Scanned face does not match the registered identity for ${currentVoter.fullName}. Please ensure good lighting and look directly at the camera.`,
        distance: Number(currentVoterDistance.toFixed(4)),
        confidence: Math.round((1 - currentVoterDistance) * 100)
      });
    }

    // Verified match for the signed-in voter
    await prisma.auditLog.create({
      data: {
        actorType: 'voter',
        actorId: req.user.id,
        action: 'face_verified',
        details: {
          distance: Number(currentVoterDistance.toFixed(4)),
          confidence: Math.round((1 - currentVoterDistance) * 100)
        }
      }
    });

    res.json({
      verified: true,
      message: `Identity verified successfully as ${currentVoter.fullName}`,
      confidence: Math.round((1 - currentVoterDistance) * 100)
    });
  } catch (error: any) {
    console.error(`[Face Verify Error] Target: ${FACE_SERVICE_URL} - Error:`, error.message);
    if (error.response?.status === 429) {
      return res.status(429).json({
        error: 'Face recognition service is currently handling high traffic. Please wait a few seconds and try again.'
      });
    }
    if (error.response && error.response.data && error.response.data.detail) {
      res.status(400).json({ error: error.response.data.detail });
    } else {
      res.status(500).json({
        error: 'Failed to communicate with Face Service',
        detail: error.message,
        targetUrl: FACE_SERVICE_URL
      });
    }
  }
});

export default router;
