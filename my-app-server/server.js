import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import pool from "./db.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ทดสอบว่า Backend ทำงาน
app.get("/", (req, res) => {
  res.json({
    message: "PSU Loan Backend ทำงานแล้ว",
  });
});

// ทดสอบการเชื่อมต่อ PostgreSQL
app.get("/database-test", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        CURRENT_DATABASE() AS database_name,
        CURRENT_SCHEMA() AS schema_name,
        NOW() AS current_time
    `);

    return res.status(200).json({
      message: "เชื่อมต่อ PostgreSQL สำเร็จ",
      ...result.rows[0],
    });
  } catch (error) {
    console.error("DATABASE TEST ERROR:", error);

    return res.status(500).json({
      message: "เชื่อมต่อ PostgreSQL ไม่สำเร็จ",
      error: error.message,
    });
  }
});

// เข้าสู่ระบบ
app.post("/login", async (req, res) => {
  try {
    const { username, password, role } = req.body ?? {};

    if (!username || !password || !role) {
      return res.status(400).json({
        message: "กรุณากรอกชื่อผู้ใช้ รหัสผ่าน และเลือกประเภทผู้ใช้งาน",
      });
    }

    const requestedRole = String(role).trim().toUpperCase();

    if (!["STUDENT", "STAFF"].includes(requestedRole)) {
      return res.status(400).json({
        message: "ประเภทผู้ใช้งานไม่ถูกต้อง",
      });
    }

    const query = `
      SELECT
        u.user_id,
        u.email,
        u.password_hash,
        u.is_active,

        r.role_id,
        r.role_name,

        sp.student_code,
        sp.citizen_id,
        sp.first_name AS student_first_name,
        sp.last_name AS student_last_name,
        sp.birth_date,
        sp.phone AS student_phone,
        sp.faculty,
        sp.major,

        st.employee_code,
        st.prefix AS staff_prefix,
        st.first_name AS staff_first_name,
        st.last_name AS staff_last_name,
        st.phone AS staff_phone,
        st.position,
        st.department

      FROM users u

      INNER JOIN roles r
        ON r.role_id = u.role_id

      LEFT JOIN student_profiles sp
        ON sp.student_id = u.user_id

      LEFT JOIN staff_profiles st
        ON st.staff_id = u.user_id

      WHERE UPPER(r.role_name) = $2
        AND (
          (
            UPPER(r.role_name) = 'STUDENT'
            AND sp.student_code = $1
          )
          OR
          (
            UPPER(r.role_name) = 'STAFF'
            AND st.employee_code = $1
          )
        )

      LIMIT 1
    `;

    const result = await pool.query(query, [
      String(username).trim(),
      requestedRole,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        message:
          requestedRole === "STAFF"
            ? "ไม่พบรหัสเจ้าหน้าที่ หรือเลือกประเภทผู้ใช้ไม่ถูกต้อง"
            : "ไม่พบรหัสนักศึกษา หรือเลือกประเภทผู้ใช้ไม่ถูกต้อง",
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        message: "บัญชีนี้ถูกระงับการใช้งาน",
      });
    }

    const passwordIsCorrect = await bcrypt.compare(
      String(password),
      user.password_hash
    );

    if (!passwordIsCorrect) {
      return res.status(401).json({
        message: "รหัสผ่านไม่ถูกต้อง",
      });
    }

    const isStaff = user.role_name === "STAFF";

    return res.status(200).json({
      message: "เข้าสู่ระบบสำเร็จ",

      user_id: user.user_id,

      username: isStaff
        ? user.employee_code
        : user.student_code,

      // ส่งให้หน้า React เดิมที่ใช้ R1/R2
      role_id: isStaff ? "R2" : "R1",
      role: user.role_name,

      prefix: isStaff ? user.staff_prefix : null,

      firstname: isStaff
        ? user.staff_first_name
        : user.student_first_name,

      lastname: isStaff
        ? user.staff_last_name
        : user.student_last_name,

      email: user.email,

      citizen_id: isStaff ? null : user.citizen_id,
      birth_date: isStaff ? null : user.birth_date,

      phone_no: isStaff
        ? user.staff_phone
        : user.student_phone,

      faculty: isStaff ? null : user.faculty,
      major: isStaff ? null : user.major,

      position: isStaff ? user.position : null,
      department: isStaff ? user.department : null,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});