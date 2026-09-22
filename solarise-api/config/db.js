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

pool.on('connect', (client) => {
    client.query('SET search_path = solarise, public;', (err) => {
        if (err) {
            console.error('Error setting search_path:', err);
        }
    });
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
export default pool;