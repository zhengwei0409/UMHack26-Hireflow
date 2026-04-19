import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import jobRoutes from './routes/job.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/jobs', jobRoutes);
// app.use('/api/v1/candidates', candidateRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
