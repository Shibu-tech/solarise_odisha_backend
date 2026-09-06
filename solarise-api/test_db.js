import pool from './config/db.js';

async function testPool() {
  try {
    const res = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM consumers) as consumers_count,
        (SELECT COUNT(*) FROM projects) as projects_count,
        (SELECT COUNT(*) FROM documents) as documents_count,
        current_schema() as current_schema;
    `);
    console.log('ACTIVE SOLARISE SCHEMA STATS:');
    console.table(res.rows);
  } catch (err) {
    console.error('POOL TEST ERROR:', err);
  } finally {
    await pool.end();
  }
}

testPool();
