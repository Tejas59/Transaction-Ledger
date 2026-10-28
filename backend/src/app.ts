import express, { Application, ErrorRequestHandler, Request, Response } from 'express';
import accountRoutes from './routes/account.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import transferRoutes from './routes/transfer.routes.js';

const app: Application = express();

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'transaction-ledger-api',
  });
});

app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/transfers', transferRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found', message: 'Route not found.' });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Request body is not valid JSON.',
    });
  }
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal Server Error', message: 'Something went wrong.' });
};
app.use(errorHandler);

export default app;
