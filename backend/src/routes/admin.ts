import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(verifyToken, requireAdmin);

// Create an election
router.post('/elections', async (req: AuthRequest, res) => {
  try {
    const { title, start_time, end_time } = req.body;
    const adminId = req.user.id;

    const election = await prisma.election.create({
      data: {
        title,
        startTime: new Date(start_time),
        endTime: new Date(end_time),
        createdBy: adminId
      }
    });

    res.status(201).json(election);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error creating election' });
  }
});

// List elections
router.get('/elections', async (req, res) => {
  try {
    const elections = await prisma.election.findMany({
      include: { candidates: true }
    });
    res.json(elections);
  } catch (error) {
    res.status(500).json({ error: 'Server error listing elections' });
  }
});

// Add candidate to election
router.post('/elections/:id/candidates', async (req, res) => {
  try {
    const electionId = parseInt(req.params.id);
    const { name, bio, photoUrl } = req.body;

    const candidate = await prisma.candidate.create({
      data: {
        electionId,
        name,
        bio,
        photoUrl
      }
    });

    res.status(201).json(candidate);
  } catch (error) {
    res.status(500).json({ error: 'Server error adding candidate' });
  }
});

// View results
router.get('/elections/:id/results', async (req, res) => {
  try {
    const electionId = parseInt(req.params.id);
    
    // Group votes by candidate
    const results = await prisma.vote.groupBy({
      by: ['candidateId'],
      where: { electionId },
      _count: {
        id: true
      }
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching results' });
  }
});

export default router;
