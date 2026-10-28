import { Request, Response } from 'express';
import { query } from '../db/index.js';
import { ApiError, sendError } from '../utils/errors.js';
import { requireText, requireUuid } from '../utils/validators.js';

export const createAccount = async (req: Request, res: Response) => {
  try {
    const name = requireText(req.body?.name, 'Account name');

    const result = await query(
      `INSERT INTO accounts (name) VALUES ($1) RETURNING id, name, balance, created_at`,
      [name],
    );
    const account = result.rows[0];

    return res.status(201).json({
      id: account.id,
      name: account.name,
      balance: Number(account.balance),
      created_at: account.created_at,
    });
  } catch (error) {
    return sendError(res, error, 'Failed to create account.');
  }
};

// Balance is derived from the ledger entries rather than read from accounts.balance
export const getAccountBalance = async (req: Request, res: Response) => {
  try {
    const accountId = requireUuid(req.params.accountId, 'accountId');

    const result = await query(
      `SELECT a.id AS account_id,
              COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) AS balance
         FROM accounts a
         LEFT JOIN transactions t ON t.account_id = a.id
        WHERE a.id = $1
        GROUP BY a.id`,
      [accountId],
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, 'Not Found', `Account with id '${accountId}' does not exist.`);
    }

    return res.status(200).json({
      account_id: result.rows[0].account_id,
      balance: Number(result.rows[0].balance),
    });
  } catch (error) {
    return sendError(res, error, 'Failed to retrieve account balance.');
  }
};
