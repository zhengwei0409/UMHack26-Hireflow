import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import jobRoutes from './routes/job.routes';
import candidateRoutes from './routes/candidate.routes';
import dashboardRoutes from './routes/dashboard.routes';
import interviewRoutes from './routes/interview.routes';
import investigationRoutes from './routes/investigation.routes';
import biasAuditRoutes from './routes/bias-audit.routes';
import portalRoutes from './routes/portal.routes';
import cvRoutes from './routes/cv.routes';
import telegramRoutes from './routes/telegram.routes';
import configRoutes from './routes/config.routes';

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/candidates', candidateRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/interviews', interviewRoutes);
app.use('/api/v1/candidates', investigationRoutes);
app.use('/api/v1/bias-audit', biasAuditRoutes);
app.use('/api/v1/portal', portalRoutes);
app.use('/api/v1/candidates', cvRoutes);
app.use('/api/v1/telegram', telegramRoutes);
app.use('/api/v1/config', configRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
