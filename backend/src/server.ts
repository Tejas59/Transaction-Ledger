import app from './app.js';
import { config } from './config/env.js';
import { initDb } from './db/initDb.js';

const startServer = async () => {
  try {
    await initDb();

    const server = app.listen(config.port, () => {
      console.log(`[Ledger Backend] Listening on port ${config.port} (${config.nodeEnv})`);
      console.log(`[Ledger Backend] Health check: http://localhost:${config.port}/health`);
    });

    process.on('SIGTERM', () => {
      console.log('[Ledger Backend] SIGTERM received, closing server...');
      server.close(() => process.exit(0));
    });
  } catch (error) {
    console.error('[Ledger Backend] Failed to start:', error);
    process.exit(1);
  }
};

startServer();
