import dotenv from 'dotenv';
dotenv.config();
import pool from './config/db.js';

async function check() {
  try {
    const res = await pool.query(
      "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE column_name LIKE '%name%' AND table_schema = 'solarise' ORDER BY table_name, column_name"
    );
    console.log('Columns matching name:');
    console.table(res.rows);

    const consumersCols = await pool.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'consumers' AND table_schema = 'solarise' ORDER BY ordinal_position"
    );
    console.log('Consumers columns:');
    console.table(consumersCols.rows);
  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    await pool.end();
  }
}

check();
