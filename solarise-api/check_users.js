import dotenv from 'dotenv';
dotenv.config();
import pool from './config/db.js';

async function checkUsers() {
  try {
    const res = await pool.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'solarise' ORDER BY ordinal_position"
    );
    console.log('Users columns (solarise):');
    console.table(res.rows);
  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    await pool.end();
  }
}

checkUsers();
