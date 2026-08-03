const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

pool.on("connect", async (client) => {
    try {
        await client.query(
            "SET search_path TO psu_loan, public"
        );

        console.log(
            "✅ PostgreSQL client connected with schema psu_loan"
        );
    } catch (error) {
        console.error(
            "❌ Failed to set PostgreSQL schema:",
            error.message
        );
    }
});

async function testDatabaseConnection() {
    let client;

    try {
        client = await pool.connect();

        const result = await client.query(`
            SELECT
                current_database() AS database_name,
                current_schema() AS schema_name,
                NOW() AS connected_at
        `);

        console.log("✅ Connected to PostgreSQL");
        console.log(
            `📦 Database: ${result.rows[0].database_name}`
        );
        console.log(
            `🗂️ Schema: ${result.rows[0].schema_name}`
        );
    } catch (error) {
        console.error(
            "❌ PostgreSQL Connection Error:",
            error.message
        );
    } finally {
        client?.release();
    }
}

testDatabaseConnection();

module.exports = pool;