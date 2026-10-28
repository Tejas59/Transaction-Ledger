import { z } from 'zod';

/**
 * Validation schema for creating a new Account
 */
export const CreateAccountSchema = z.object({
  name: z
    .string({ required_error: 'Account name is required' })
    .trim()
    .min(1, 'Account name must not be empty')
    .max(100, 'Account name must not exceed 100 characters'),
});

/**
 * Validation schema for creating a new Transaction
 */
export const CreateTransactionSchema = z.object({
  account_id: z
    .string({ required_error: 'account_id is required' })
    .uuid('Invalid account_id format. Must be a valid UUID.'),
  type: z.enum(['credit', 'debit'], {
    errorMap: () => ({ message: "Transaction type must be either 'credit' or 'debit'" }),
  }),
  amount: z
    .number({ required_error: 'amount is required' })
    .positive('Amount must be greater than 0'),
  description: z
    .string()
    .trim()
    .max(255, 'Description cannot exceed 255 characters')
    .optional()
    .nullable(),
  reference_id: z
    .string({ required_error: 'reference_id is required' })
    .trim()
    .min(1, 'reference_id must not be empty'),
});

/**
 * Validation schema for pagination query parameters
 */
export const PaginationQuerySchema = z.object({
  type: z.enum(['credit', 'debit']).optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, 'Page must be a positive integer'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
});

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type PaginationQueryInput = z.infer<typeof PaginationQuerySchema>;

