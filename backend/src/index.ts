import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

import adminRoutes from './routes/admin';
import voterRoutes from './routes/voter';
import faceRoutes from './routes/face';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/voters', voterRoutes);
app.use('/api/face', faceRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'votesecure-api' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
