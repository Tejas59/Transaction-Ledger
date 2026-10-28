import { Request, Response } from 'express';
import { withTransaction } from '../db/index.js';
import { ApiError, sendError } from '../utils/errors.js';
import {
  optionalText,
  requireAmount,
  requireText,
  requireUuid,
  validationError,
} from '../utils/validators.js';

export const transferMoney = async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const sourceId = requireUuid(body.source_account_id, 'source_account_id');
    const destinationId = requireUuid(body.destination_account_id, 'destination_account_id');
    if (sourceId === destinationId) {
      throw validationError('Source and destination accounts must be different.');
    }
    const amount = requireAmount(body.amount);
    const referenceId = requireText(body.reference_id, 'reference_id', 248);
    const description = optionalText(body.description, 'description');

    const result = await withTransaction(async (client) => {
      // Lock both rows in a fixed (id) order so opposite transfers cannot deadlock
      const locked = await client.query(
        'SELECT id, balance FROM accounts WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE',
        [[sourceId, destinationId]],
      );
      if (locked.rows.length !== 2) {
        throw new ApiError(404, 'Not Found', 'One or both accounts do not exist.');
      }
      const source = locked.rows.find((row) => row.id === sourceId);

      const debited = await client.query(
        'UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING balance',
        [amount, sourceId],
      );
      if (debited.rows.length === 0) {
        throw new ApiError(
          400,
          'Insufficient Balance',
          `Insufficient funds in source account. Current balance is ${source.balance}, transfer requires ${amount}.`,
        );
      }
      const credited = await client.query(
        'UPDATE accounts SET balance = balance + $1 WHERE id = $2 RETURNING balance',
        [amount, destinationId],
      );

      const insertEntry = `INSERT INTO transactions (account_id, type, amount, description, reference_id)
                           VALUES ($1, $2, $3, $4, $5)
                           RETURNING created_at`;
      const debitEntry = await client.query(insertEntry, [
        sourceId,
        'debit',
        amount,
        description ?? `Transfer to ${destinationId}`,
        referenceId,
      ]);
      await client.query(insertEntry, [
        destinationId,
        'credit',
        amount,
        description ?? `Transfer from ${sourceId}`,
        `${referenceId}-CREDIT`,
      ]);

      return {
        sourceBalance: debited.rows[0].balance,
        destinationBalance: credited.rows[0].balance,
        createdAt: debitEntry.rows[0].created_at,
      };
    });

    return res.status(201).json({
      message: 'Transfer completed successfully.',
      source_account_id: sourceId,
      destination_account_id: destinationId,
      amount: Number(amount),
      source_new_balance: Number(result.sourceBalance),
      destination_new_balance: Number(result.destinationBalance),
      reference_id: referenceId,
      created_at: result.createdAt,
    });
  } catch (error) {
    return sendError(res, error, 'Failed to process money transfer.');
  }
};
