import { Response } from 'express';

export class ApiError extends Error {
  constructor(
    public status: number,
    public error: string,
    message: string,
  ) {
    super(message);
  }
}

const PG_UNIQUE_VIOLATION = '23505';

export const sendError = (res: Response, err: unknown, fallbackMessage: string) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.error, message: err.message });
  }

  if ((err as { code?: string })?.code === PG_UNIQUE_VIOLATION) {
    return res.status(409).json({
      error: 'Duplicate Transaction',
      message: 'This reference_id has already been used for the account.',
    });
  }

  console.error(fallbackMessage, err);
  return res.status(500).json({ error: 'Internal Server Error', message: fallbackMessage });
};
