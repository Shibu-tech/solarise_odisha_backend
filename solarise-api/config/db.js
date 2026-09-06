import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
const pool = new pg.Pool({
    connectionString: process.env.DB_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

pool.on('connect', () => {
    console.log('Connected to PostgreSQL (default schema: solarise)');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
export default pool;