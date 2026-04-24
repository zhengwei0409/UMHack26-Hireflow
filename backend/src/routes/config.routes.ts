import { Router } from 'express';
import { getConfigs, updateConfig } from '../controllers/config.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/', requireAuth, getConfigs);
router.post('/', requireAuth, updateConfig);

export default router;
