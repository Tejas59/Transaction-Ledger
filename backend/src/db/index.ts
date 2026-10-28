import pg from 'pg';
import { config } from '../config/env.js';

const { Pool } = pg;


export const pool = new Pool({
    connectionString: config.databaseUrl,
});


export const query = (text: string, params?: any[]) => {
    return pool.query(text, params);
};