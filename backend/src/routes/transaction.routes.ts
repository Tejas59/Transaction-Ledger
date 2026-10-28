import { Router } from 'express';
import { createTransaction, getTransactionHistory } from '../controllers/transaction.controller.js';

const router = Router();

router.post('/', createTransaction);
router.get('/:accountId', getTransactionHistory);

export default router;
