require("dotenv").config();

const app = require("./app");
const pool = require("./config/db");

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await pool.query("SELECT NOW()");

        app.listen(PORT, () => {
            console.log(`Backend running at http://localhost:${PORT}`);
            console.log("PostgreSQL connected");
        });
    } catch (error) {
        console.error("ไม่สามารถเปิด Backend ได้");
        console.error(error.message);
        process.exit(1);
    }
}

startServer();