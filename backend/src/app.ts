import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env.js';

const app: Application = express();


app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json());


app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'transaction-ledger-api',
  });
});

export default app;

