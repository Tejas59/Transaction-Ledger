import { Request, Response } from 'express';
import { pool, query } from '../db/index.js';

export const createTransaction = async (req: Request, res: Response) => {
    const { account_id, type, amount, description, reference_id } = req.body;

    if (!account_id || typeof account_id !== 'string') {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'account_id is required and must be a valid UUID.',
        });
    }

    if (type !== 'credit' && type !== 'debit') {
        return res.status(400).json({
            error: 'Validation Error',
            message: "type must be either 'credit' or 'debit'.",
        });
    }

    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'amount must be a number greater than 0.',
        });
    }

    if (!reference_id || typeof reference_id !== 'string' || reference_id.trim().length === 0) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'reference_id is required and must not be empty.',
        });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const duplicateCheck = await client.query(
            'SELECT id FROM transactions WHERE account_id = $1 AND reference_id = $2',
            [account_id, reference_id.trim()]
        );

        if (duplicateCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                error: 'Duplicate Transaction',
                message: `A transaction with reference_id '${reference_id}' already exists for this account.`,
            });
        }

        const accountResult = await client.query(
            'SELECT id, balance FROM accounts WHERE id = $1 FOR UPDATE',
            [account_id]
        );

        if (accountResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                error: 'Not Found',
                message: `Account with id '${account_id}' does not exist.`,
            });
        }

        const currentBalance = parseFloat(accountResult.rows[0].balance);
        const parsedAmount = parseFloat(amount.toFixed(2));

        if (type === 'debit' && currentBalance < parsedAmount) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Insufficient Balance',
                message: `Insufficient funds. Current balance is ${currentBalance.toFixed(2)}, cannot debit ${parsedAmount.toFixed(2)}.`,
            });
        }

        const newBalance = type === 'credit'
            ? currentBalance + parsedAmount
            : currentBalance - parsedAmount;

        await client.query(
            'UPDATE accounts SET balance = $1 WHERE id = $2',
            [newBalance, account_id]
        );

        const insertTransactionSql = `
          INSERT INTO transactions (account_id, type, amount, description, reference_id)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, account_id, type, amount, description, reference_id, created_at;
        `;
        const transactionResult = await client.query(insertTransactionSql, [
            account_id,
            type,
            parsedAmount,
            description ? description.trim() : null,
            reference_id.trim(),
        ]);

        await client.query('COMMIT');

        const createdTx = transactionResult.rows[0];
        return res.status(201).json({
            id: createdTx.id,
            account_id: createdTx.account_id,
            type: createdTx.type,
            amount: parseFloat(createdTx.amount),
            description: createdTx.description,
            reference_id: createdTx.reference_id,
            created_at: createdTx.created_at,
            new_balance: parseFloat(newBalance.toFixed(2)),
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction execution failed:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to process transaction.',
        });
    } finally {
        client.release();
    }
};

export const getTransactionHistory = async (req: Request, res: Response) => {
    try {

        const accountId = req.params.accountId

        if (!accountId || typeof accountId !== 'string' || accountId.trim().length === 0) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'account_id is required.',
            });
        }

        const accountCheck = await query('SELECT id FROM accounts WHERE id = $1', [accountId.trim()]);
        if (accountCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: `Account with id '${accountId}' does not exist.`,
            });
        }

        const typeFilter = req.query.type as string | undefined;
        if (typeFilter && typeFilter !== 'credit' && typeFilter !== 'debit') {
            return res.status(400).json({
                error: 'Validation Error',
                message: "Filter 'type' must be either 'credit' or 'debit'.",
            });
        }

        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
        const offset = (page - 1) * limit;

        const queryParams: any[] = [accountId.trim()];
        let whereClause = 'WHERE account_id = $1';

        if (typeFilter) {
            queryParams.push(typeFilter);
            whereClause += ` AND type = $${queryParams.length}`;
        }

        const countSql = `SELECT COUNT(*) AS total FROM transactions ${whereClause};`;
        const countResult = await query(countSql, queryParams);
        const totalRecords = parseInt(countResult.rows[0].total, 10);
        const totalPages = Math.ceil(totalRecords / limit) || 1;

        queryParams.push(limit);
        const limitParamIndex = queryParams.length;

        queryParams.push(offset);
        const offsetParamIndex = queryParams.length;

        const dataSql = `
          SELECT id, account_id, type, amount, description, reference_id, created_at
          FROM transactions
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex};
        `;

        const dataResult = await query(dataSql, queryParams);

        const transactions = dataResult.rows.map((row) => ({
            id: row.id,
            account_id: row.account_id,
            type: row.type,
            amount: parseFloat(row.amount),
            description: row.description,
            reference_id: row.reference_id,
            created_at: row.created_at,
        }));

        return res.status(200).json({
            data: transactions,
            pagination: {
                currentPage: page,
                pageSize: limit,
                totalRecords,
                totalPages,
            },
        });
    } catch (error) {
        console.error('Error fetching transaction history:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve transaction history.',
        });
    }
};
