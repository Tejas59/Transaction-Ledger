import { Request, Response } from 'express';
import { query, withTransaction } from '../db/index.js';
import { ApiError, sendError } from '../utils/errors.js';
import {
  optionalText,
  requireAmount,
  requireText,
  requireUuid,
  validationError,
} from '../utils/validators.js';

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const accountId = requireUuid(body.account_id, 'account_id');
    const type = body.type;
    if (type !== 'credit' && type !== 'debit') {
      throw validationError("type must be either 'credit' or 'debit'.");
    }
    const amount = requireAmount(body.amount);
    const referenceId = requireText(body.reference_id, 'reference_id');
    const description = optionalText(body.description, 'description');

    const result = await withTransaction(async (client) => {
      const account = await client.query(
        'SELECT balance FROM accounts WHERE id = $1 FOR UPDATE',
        [accountId],
      );
      if (account.rows.length === 0) {
        throw new ApiError(404, 'Not Found', `Account with id '${accountId}' does not exist.`);
      }

      // Unique (account_id, reference_id) rejects a repeated reference_id with a 23505
      const inserted = await client.query(
        `INSERT INTO transactions (account_id, type, amount, description, reference_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, account_id, type, amount, description, reference_id, created_at`,
        [accountId, type, amount, description, referenceId],
      );

      const updated = await client.query(
        type === 'credit'
          ? 'UPDATE accounts SET balance = balance + $1 WHERE id = $2 RETURNING balance'
          : 'UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance',
        [amount, accountId],
      );
      if (updated.rows.length === 0) {
        throw new ApiError(
          400,
          'Insufficient Balance',
          `Insufficient funds. Current balance is ${account.rows[0].balance}, cannot debit ${amount}.`,
        );
      }

      return { transaction: inserted.rows[0], balance: updated.rows[0].balance };
    });

    const { transaction, balance } = result;
    return res.status(201).json({
      id: transaction.id,
      account_id: transaction.account_id,
      type: transaction.type,
      amount: Number(transaction.amount),
      description: transaction.description,
      reference_id: transaction.reference_id,
      created_at: transaction.created_at,
      new_balance: Number(balance),
    });
  } catch (error) {
    return sendError(res, error, 'Failed to process transaction.');
  }
};

export const getTransactionHistory = async (req: Request, res: Response) => {
  try {
    const accountId = requireUuid(req.params.accountId, 'accountId');

    const type = req.query.type;
    if (type !== undefined && type !== 'credit' && type !== 'debit') {
      throw validationError("Filter 'type' must be either 'credit' or 'debit'.");
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));

    const account = await query('SELECT 1 FROM accounts WHERE id = $1', [accountId]);
    if (account.rows.length === 0) {
      throw new ApiError(404, 'Not Found', `Account with id '${accountId}' does not exist.`);
    }

    const filterParams: unknown[] = [accountId];
    let where = 'WHERE account_id = $1';
    if (type) {
      filterParams.push(type);
      where += ' AND type = $2';
    }

    const count = await query(`SELECT COUNT(*) AS total FROM transactions ${where}`, filterParams);
    const totalRecords = parseInt(count.rows[0].total, 10);

    const rows = await query(
      `SELECT id, account_id, type, amount, description, reference_id, created_at
         FROM transactions
         ${where}
        ORDER BY created_at DESC, id
        LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2}`,
      [...filterParams, limit, (page - 1) * limit],
    );

    return res.status(200).json({
      data: rows.rows.map((row) => ({ ...row, amount: Number(row.amount) })),
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalRecords,
        totalPages: Math.max(1, Math.ceil(totalRecords / limit)),
      },
    });
  } catch (error) {
    return sendError(res, error, 'Failed to retrieve transaction history.');
  }
};
