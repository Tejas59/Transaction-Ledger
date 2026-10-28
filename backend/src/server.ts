import app from './app.js';
import { config } from './config/env.js';
import { initDb } from './db/initDb.js';

const startServer = async () => {
  try {
    // Automatically verify & initialize database tables on startup
    await initDb();

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
  } catch (error) {
    console.error('[Ledger Backend] Failed to start server due to database error:', error);
    process.exit(1);
  }
};

startServer();

