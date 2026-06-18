import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.send('Admin panel - coming soon');
});

export default router;
