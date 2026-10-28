import { Request, Response } from 'express';
import { query } from '../db/index.js';

export const createAccount = async (req: Request, res: Response) => {
    try {
        const { name } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Account name is required and must not be empty.',
            });
        }

        const sql = `
          INSERT INTO accounts (name, balance)
          VALUES ($1, 0.00)
          RETURNING id, name, balance, created_at;
        `;

        const result = await query(sql, [name.trim()]);
        const createdAccount = result.rows[0];

        return res.status(201).json({
            id: createdAccount.id,
            name: createdAccount.name,
            balance: parseFloat(createdAccount.balance),
            created_at: createdAccount.created_at,
        });
    } catch (error) {
        console.error('Error creating account:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create account.',
        });
    }
};

export const getAccountBalance = async (req: Request, res: Response) => {
    try {

        const accountId = req.params.accountId

        if (!accountId || typeof accountId !== 'string' || accountId.trim().length === 0) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'account_id is required and must not be empty.',
            });
        }

     
        const sql = `
          SELECT 
            a.id AS account_id,
            COALESCE(
              SUM(
                CASE 
                  WHEN t.type = 'credit' THEN t.amount 
                  WHEN t.type = 'debit' THEN -t.amount 
                  ELSE 0 
                END
              ), 
              0.00
            ) AS balance
          FROM accounts a
          LEFT JOIN transactions t ON a.id = t.account_id
          WHERE a.id = $1
          GROUP BY a.id;
        `;

        const result = await query(sql, [accountId.trim()]);

        
        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: `Account with id '${accountId}' does not exist.`,
            });
        }

        const accountData = result.rows[0];

        return res.status(200).json({
            account_id: accountData.account_id,
            balance: parseFloat(parseFloat(accountData.balance).toFixed(2)),
        });
    } catch (error) {
        console.error('Error fetching account balance:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve account balance.',
        });
    }
};
