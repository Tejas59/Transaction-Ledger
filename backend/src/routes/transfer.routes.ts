import { Router } from 'express';
import { transferMoney } from '../controllers/transfer.controller.js';

const router = Router();

router.post('/', transferMoney);

export default router;
