import { Router } from 'express';
import { createAccount, getAccountBalance } from '../controllers/account.controller.js';

const router = Router();

router.post('/', createAccount);
router.get('/:accountId/balance', getAccountBalance);

export default router;
