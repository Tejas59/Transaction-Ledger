import { pool } from './index.js';

export const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log('[Database] Checking schema...');
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT chk_positive_balance CHECK (balance >= 0)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
        amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
        description TEXT,
        reference_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_account_reference UNIQUE (account_id, reference_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_account_created
      ON transactions(account_id, created_at DESC);
    `);

    await client.query('COMMIT');
    console.log('[Database] Schema ready.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Database] Schema initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Allows running the schema setup on its own: `npm run db:init`
const isMain = process.argv[1]?.endsWith('initDb.ts') || process.argv[1]?.endsWith('initDb.js');

if (isMain) {
  initDb()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
