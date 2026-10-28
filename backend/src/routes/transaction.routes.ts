import { Router } from 'express';
import { createTransaction, getTransactionHistory } from '../controllers/transaction.controller.js';

const router = Router();

// POST /api/v1/transactions - Add transaction (credit / debit)
router.post('/', createTransaction);


// GET / api / v1 / transactions /: accountId
router.get('/:accountId', getTransactionHistory);



export default router;