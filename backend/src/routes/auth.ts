import { Router } from 'express';
import prisma from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

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
