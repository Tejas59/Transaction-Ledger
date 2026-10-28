import { Router } from 'express';
import { createAccount, getAccountBalance } from '../controllers/account.controller.js';

const router = Router();

// POST /api/v1/accounts - Create a new account
router.post('/', createAccount);

// GET /api/v1/accounts/:accountId/balance - Get current balance
router.get('/:accountId/balance', getAccountBalance);


export default router;