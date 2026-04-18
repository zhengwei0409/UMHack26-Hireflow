import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// Routes (uncomment as you build each module)
// app.use('/api/v1/auth', require('./routes/auth.routes'));
// app.use('/api/v1/jobs', require('./routes/jobs.routes'));
// app.use('/api/v1/candidates', require('./routes/candidates.routes'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
