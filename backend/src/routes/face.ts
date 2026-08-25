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

// Proxy face detection (fast check)
router.post('/detect', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);

    const faceResponse = await axios.post(`${FACE_SERVICE_URL}/detect`, formData, {
      headers: { ...formData.getHeaders() },
      timeout: 30000
    });

    res.json(faceResponse.data);
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

    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);

    const faceResponse = await axios.post(`${FACE_SERVICE_URL}/enroll`, formData, {
      headers: { ...formData.getHeaders() },
      timeout: 45000
    });

    // Save embedding and photo to voter profile
    if (req.user?.role === 'voter') {
      const base64Image = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      const faceImageBase64 = `data:${mimeType};base64,${base64Image}`;

      await prisma.voter.update({
        where: { id: req.user.id },
        data: { 
          faceEmbedding: faceResponse.data.embedding, 
          faceImageBase64: faceImageBase64,
          isVerified: true 
        }
      });
    }

    res.json({ message: 'Enrollment successful', embedding: faceResponse.data.embedding });
  } catch (error: any) {
    console.error(error);
    if (error.response && error.response.data && error.response.data.detail) {
      res.status(400).json({ detail: error.response.data.detail });
    } else {
      res.status(500).json({ error: 'Failed to communicate with Face Service' });
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

    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);
    formData.append('stored_embedding', JSON.stringify(voter.faceEmbedding));

    const faceResponse = await axios.post(`${FACE_SERVICE_URL}/verify`, formData, {
      headers: { ...formData.getHeaders() },
      timeout: 45000
    });

    if (faceResponse.data.verified) {
      // Audit log
      await prisma.auditLog.create({
        data: {
          actorType: 'voter',
          actorId: req.user.id,
          action: 'face_verified',
          details: { distance: faceResponse.data.distance }
        }
      });
      res.json({ verified: true, message: 'Identity verified' });
    } else {
      res.status(401).json({ verified: false, error: 'Face verification failed' });
    }
  } catch (error: any) {
    console.error(`[Face Verify Error] Target: ${FACE_SERVICE_URL} - Error:`, error.message);
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
