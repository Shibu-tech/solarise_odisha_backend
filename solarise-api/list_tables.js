import dotenv from 'dotenv';
dotenv.config();
import pool from './config/db.js';

async function listAllTables() {
  try {
    const res = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'solarise' ORDER BY table_name"
    );
    console.log('All solarise tables:');
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

listAllTables();
