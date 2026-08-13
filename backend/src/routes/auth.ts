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

export default router;
