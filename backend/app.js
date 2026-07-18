const express = require("express");
const cors = require("cors");

const pool = require("./config/db");

const app = express();

app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Backend ทำงานแล้ว",
    });
});

app.get("/api/db-test", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW() AS current_time");

        res.status(200).json({
            success: true,
            message: "เชื่อมต่อฐานข้อมูลสำเร็จ",
            databaseTime: result.rows[0].current_time,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "เชื่อมต่อฐานข้อมูลไม่สำเร็จ",
            error: error.message,
        });
    }
});

module.exports = app;