import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken, requireVoter, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(verifyToken, requireVoter);

// List active elections for voting
router.get('/elections', async (req, res) => {
  try {
    const now = new Date();
    // In a real app we would check status="active" and times
    const activeElections = await prisma.election.findMany({
      where: {
        startTime: { lte: now },
        endTime: { gte: now }
      },
      include: { candidates: true }
    });
    res.json(activeElections);
  } catch (error) {
    res.status(500).json({ error: 'Server error listing elections' });
  }
});

// Cast a vote
router.post('/votes', async (req: AuthRequest, res) => {
  try {
    const voterId = req.user.id;
    const { electionId, candidateId } = req.body;

    // Check if voter already voted
    const existingVote = await prisma.vote.findUnique({
      where: {
        electionId_voterId: {
          electionId: parseInt(electionId),
          voterId: parseInt(voterId)
        }
      }
    });

    if (existingVote) {
      return res.status(400).json({ error: 'You have already voted in this election.' });
    }

    // Record the vote
    const vote = await prisma.vote.create({
      data: {
        electionId: parseInt(electionId),
        voterId: parseInt(voterId),
        candidateId: parseInt(candidateId)
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorType: 'voter',
        actorId: voterId,
        action: 'cast_vote',
        details: { electionId }
      }
    });

    res.status(201).json({ message: 'Vote cast successfully!', voteId: vote.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error casting vote' });
  }
});

export default router;
