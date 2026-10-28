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