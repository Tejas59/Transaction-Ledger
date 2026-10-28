import app from './app.js';
import { config } from './config/env.js';

const server = app.listen(config.port, () => {
  console.log(`[Ledger Backend] Server is running on port ${config.port} (${config.nodeEnv})`);
  console.log(`[Ledger Backend] Healthcheck available at http://localhost:${config.port}/health`);
});

process.on('SIGTERM', () => {
  console.log('[Ledger Backend] SIGTERM received. Closing HTTP server...');
  server.close(() => {
    console.log('[Ledger Backend] Server closed.');
    process.exit(0);
  });
});

