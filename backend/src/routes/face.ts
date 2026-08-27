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

// Proxy verification to Face Service
router.post('/verify', verifyToken, upload.single('image'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Fetch stored embedding
    const voter = await prisma.voter.findUnique({ where: { id: req.user.id } });
    if (!voter || !voter.faceEmbedding) {
      return res.status(400).json({ error: 'Voter has no face enrolled' });
    }

    const data = await callFaceEndpointWithRetry('/verify', () => {
      const formData = new FormData();
      formData.append('file', req.file!.buffer, req.file!.originalname);
      formData.append('stored_embedding', JSON.stringify(voter.faceEmbedding));
      return formData;
    });

    if (data.verified) {
      // Audit log
      await prisma.auditLog.create({
        data: {
          actorType: 'voter',
          actorId: req.user.id,
          action: 'face_verified',
          details: { distance: data.distance }
        }
      });
      res.json({ verified: true, message: 'Identity verified' });
    } else {
      res.status(401).json({ verified: false, error: 'Face verification failed' });
    }
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
