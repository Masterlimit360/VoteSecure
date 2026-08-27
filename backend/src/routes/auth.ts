import { Router } from 'express';
import prisma from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const FACE_SERVICE_URL = (process.env.FACE_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const upload = multer({ storage: multer.memoryStorage() });

// Cosine Distance Helper for DeepFace vectors
function calculateCosineDistance(vecA: number[], vecB: number[]): number {
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

// Register voter
router.post('/register', async (req, res) => {
  try {
    const { full_name, index_number, email, password, dob } = req.body;

    const existingVoter = await prisma.voter.findFirst({
      where: {
        OR: [{ email }, { indexNumber: index_number }]
      }
    });

    if (existingVoter) {
      return res.status(400).json({ error: 'Email or Index Number already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const voter = await prisma.voter.create({
      data: {
        fullName: full_name,
        indexNumber: index_number,
        email,
        dob,
        passwordHash
      }
    });

    const token = jwt.sign(
      { id: voter.id, role: 'voter', indexNumber: voter.indexNumber },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ message: 'Voter registered successfully.', token, voterId: voter.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login voter
router.post('/login', async (req, res) => {
  try {
    const { index_number, password } = req.body;

    const voter = await prisma.voter.findUnique({
      where: { indexNumber: index_number }
    });

    if (!voter) {
      return res.status(404).json({ error: 'Voter not found' });
    }

    const isValidPassword = await bcrypt.compare(password, voter.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: voter.id, role: 'voter' }, JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({ message: 'Login successful', token, voter: { id: voter.id, fullName: voter.fullName } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Helper function to call Face Service with automatic retry on 429/503/cold-starts
async function callFaceServiceEnrollWithRetry(buffer: Buffer, originalname: string, maxRetries = 2): Promise<any> {
  let lastError: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const formData = new FormData();
      formData.append('file', buffer, originalname || 'scan.jpg');

      const response = await axios.post(`${FACE_SERVICE_URL}/enroll`, formData, {
        headers: { ...formData.getHeaders() },
        timeout: 50000 // 50s to allow cloud service wake-up
      });
      return response.data;
    } catch (err: any) {
      lastError = err;
      const status = err.response?.status;
      const isRateLimitedOrWaking = status === 429 || status === 503 || err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT';

      if (isRateLimitedOrWaking && attempt < maxRetries) {
        const delayMs = (attempt + 1) * 1500;
        console.warn(`[Face Service Retry] Attempt ${attempt + 1} failed (${err.message}). Retrying in ${delayMs}ms...`);
        await new Promise((res) => setTimeout(res, delayMs));
        continue;
      }
      break;
    }
  }
  throw lastError;
}

// Biometric Face Login (1:N face recognition match)
router.post('/face-login', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No face image provided for scanning.' });
    }

    // 1. Send captured frame to Python Face Service to extract the feature embedding vector
    let faceData;
    try {
      faceData = await callFaceServiceEnrollWithRetry(req.file.buffer, req.file.originalname);
    } catch (faceErr: any) {
      console.error('Face Service error during face login:', faceErr.message);
      if (faceErr.response?.status === 429) {
        return res.status(429).json({
          error: 'Face recognition service is currently handling high traffic. Please wait a moment and try again, or sign in using your Voter ID and password.'
        });
      }
      if (faceErr.response?.data?.detail) {
        return res.status(400).json({ error: faceErr.response.data.detail });
      }
      return res.status(503).json({
        error: 'Face recognition service is temporarily unavailable. Please try again or log in using your Voter ID and password.'
      });
    }

    const liveEmbedding = faceData?.embedding;
    if (!liveEmbedding || !Array.isArray(liveEmbedding)) {
      return res.status(400).json({ error: 'Could not extract biometric face features. Please try again.' });
    }

    // 2. Fetch all verified voters who have enrolled facial biometrics
    const enrolledVoters = await prisma.voter.findMany({
      where: {
        isVerified: true,
        faceEmbedding: { not: null as any }
      }
    });

    if (enrolledVoters.length === 0) {
      return res.status(404).json({
        error: 'No enrolled voters found in the system. Please register your account with facial biometrics first.'
      });
    }

    // 3. 1:N Vector Cosine Distance Matching
    let bestMatch: any = null;
    let minDistance = Infinity;

    for (const voter of enrolledVoters) {
      let storedEmbedding: number[] | null = null;
      if (Array.isArray(voter.faceEmbedding)) {
        storedEmbedding = voter.faceEmbedding as any as number[];
      } else if (typeof voter.faceEmbedding === 'string') {
        try {
          storedEmbedding = JSON.parse(voter.faceEmbedding);
        } catch {
          storedEmbedding = null;
        }
      }

      if (storedEmbedding && storedEmbedding.length === liveEmbedding.length) {
        const distance = calculateCosineDistance(liveEmbedding, storedEmbedding);
        if (distance < minDistance) {
          minDistance = distance;
          bestMatch = voter;
        }
      }
    }

    // Facenet cosine distance threshold: <= 0.45 indicates a verified identity match
    const MATCH_THRESHOLD = 0.45;

    if (!bestMatch || minDistance > MATCH_THRESHOLD) {
      return res.status(401).json({
        error: 'Face not recognized. Please ensure your face is well-lit and unobstructed, or log in with your credentials.',
        minDistance: minDistance !== Infinity ? Number(minDistance.toFixed(4)) : null
      });
    }

    // 4. Create authentication token for the matched voter
    const token = jwt.sign(
      { id: bestMatch.id, role: 'voter', indexNumber: bestMatch.indexNumber },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 5. Create audit log
    try {
      await prisma.auditLog.create({
        data: {
          actorType: 'voter',
          actorId: bestMatch.id,
          action: 'face_login',
          details: {
            distance: Number(minDistance.toFixed(4)),
            confidence: Math.round((1 - minDistance) * 100)
          }
        }
      });
    } catch (logErr) {
      console.warn('Failed to save audit log for face login:', logErr);
    }

    res.status(200).json({
      message: 'Face verified successfully! Welcome back.',
      token,
      voter: {
        id: bestMatch.id,
        fullName: bestMatch.fullName,
        indexNumber: bestMatch.indexNumber,
        email: bestMatch.email
      },
      confidence: Math.round((1 - minDistance) * 100)
    });
  } catch (error) {
    console.error('Error during face login:', error);
    res.status(500).json({ error: 'Internal server error during face authentication.' });
  }
});

// Admin Registration — first admin becomes SuperAdmin (auto-approved), subsequent admins are pending
router.post('/admin/register', async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    const existingAdmin = await prisma.admin.findUnique({
      where: { email }
    });
    if (existingAdmin) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Check if this is the first admin — auto-promote to superadmin
    const adminCount = await prisma.admin.count();
    const isFirstAdmin = adminCount === 0;

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await prisma.admin.create({
      data: {
        fullName: full_name,
        email,
        passwordHash,
        role: isFirstAdmin ? 'superadmin' : 'admin',
        isApproved: isFirstAdmin // First admin auto-approved
      }
    });

    if (isFirstAdmin) {
      // First admin gets a token immediately since they're auto-approved as SuperAdmin
      const token = jwt.sign(
        { id: admin.id, role: 'superadmin', email: admin.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      res.status(201).json({
        message: 'SuperAdmin account created! You are the first administrator.',
        token,
        adminId: admin.id,
        role: 'superadmin',
        isApproved: true
      });
    } else {
      // Subsequent admins must wait for approval — no token issued
      res.status(201).json({
        message: 'Admin registration submitted. Your account is pending approval by a SuperAdmin.',
        adminId: admin.id,
        role: 'admin',
        isApproved: false
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during admin registration' });
  }
});

// Admin Login — separate from voter login, uses email instead of index number
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await prisma.admin.findUnique({
      where: { email }
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin account not found' });
    }

    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!admin.isApproved) {
      return res.status(403).json({ error: 'Your account is pending approval by a SuperAdmin. Please check back later.' });
    }

    const token = jwt.sign(
      { id: admin.id, role: admin.role, email: admin.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      admin: { id: admin.id, fullName: admin.fullName, role: admin.role }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during admin login' });
  }
});

export default router;
