import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import accountRoutes from "./routes/account.routes.js"

const app: Application = express();


app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json());


app.use("/api/v1/accounts",accountRoutes)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'transaction-ledger-api',
  });
});

export default app;

