import { Router } from 'express';
import prisma from '../db';
import { verifyToken, requireAdmin, requireSuperAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// All admin routes require authentication and approved admin role
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

// ===== SuperAdmin-only routes =====

// Get pending admin registrations
router.get('/pending-admins', requireSuperAdmin, async (req, res) => {
  try {
    const pendingAdmins = await prisma.admin.findMany({
      where: { isApproved: false },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isApproved: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(pendingAdmins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching pending admins' });
  }
});

// Approve an admin
router.post('/approve-admin/:id', requireSuperAdmin, async (req, res) => {
  try {
    const adminId = parseInt(req.params.id);

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    if (admin.isApproved) {
      return res.status(400).json({ error: 'Admin is already approved' });
    }

    await prisma.admin.update({
      where: { id: adminId },
      data: { isApproved: true }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorType: 'admin',
        actorId: (req as AuthRequest).user.id,
        action: 'approve_admin',
        details: { approvedAdminId: adminId, approvedAdminEmail: admin.email }
      }
    });

    res.json({ message: `Admin "${admin.fullName}" has been approved.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error approving admin' });
  }
});

// Reject (delete) a pending admin
router.post('/reject-admin/:id', requireSuperAdmin, async (req, res) => {
  try {
    const adminId = parseInt(req.params.id);

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    if (admin.isApproved) {
      return res.status(400).json({ error: 'Cannot reject an already approved admin' });
    }

    await prisma.admin.delete({ where: { id: adminId } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorType: 'admin',
        actorId: (req as AuthRequest).user.id,
        action: 'reject_admin',
        details: { rejectedAdminId: adminId, rejectedAdminEmail: admin.email }
      }
    });

    res.json({ message: `Admin "${admin.fullName}" has been rejected and removed.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error rejecting admin' });
  }
});

export default router;
