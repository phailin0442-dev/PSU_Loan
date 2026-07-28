const express = require("express");
const cors = require("cors");
const path = require("path");

const pool = require("./config/db");
const homeRoutes = require("./routes/home");
const studentRoutes = require("./routes/student");
const staffRoutes = require("./routes/staff");


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
        const result = await pool.query(
            "SELECT NOW() AS current_time"
        );

        res.status(200).json({
            success: true,
            message: "เชื่อมต่อฐานข้อมูลสำเร็จ",
            databaseTime: result.rows[0].current_time,
        });
    } catch (error) {
        console.error("Database test error:", error);

        res.status(500).json({
            success: false,
            message: "เชื่อมต่อฐานข้อมูลไม่สำเร็จ",
            error: error.message,
        });
    }
});

app.use("/api/home", homeRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/staff", staffRoutes);

app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "ไม่พบ API ที่เรียกใช้งาน",
    });
});

app.use((error, req, res, next) => {
    console.error("Server error:", error);

    res.status(error.status || 500).json({
        success: false,
        message:
            error.message ||
            "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
    });
});

module.exports = app;