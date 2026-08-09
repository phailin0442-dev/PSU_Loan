const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = "7d";

/*
|--------------------------------------------------------------------------
| สมัครสมาชิก (นักศึกษา)
|--------------------------------------------------------------------------
| POST /api/auth/register
|--------------------------------------------------------------------------
| Body: { studentCode, firstName, lastName, email, phone, password }
|--------------------------------------------------------------------------
| หมายเหตุ: student_profiles มีคอลัมน์ NOT NULL อีกหลายตัว (citizen_id,
| birth_date, faculty, major, year_level, ที่อยู่) ที่ฟอร์มสมัครสมาชิก
| แบบย่อไม่ได้เก็บ — ใส่ค่า placeholder ไปก่อน แล้วให้ไปกรอกจริงต่อที่
| หน้า "ข้อมูลของฉัน" หลัง login ครั้งแรก (เหมือน pattern ระบบทั่วไปที่
| ให้สมัครไวๆ ก่อน แล้วค่อยกรอกโปรไฟล์ให้ครบทีหลัง)
|--------------------------------------------------------------------------
*/
router.post("/register", async (req, res) => {
    const client = await pool.connect();

    try {
        const { studentCode, firstName, lastName, email, phone, password } =
            req.body;

        if (
            !studentCode ||
            !firstName ||
            !lastName ||
            !email ||
            !phone ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "กรุณากรอกข้อมูลให้ครบทุกช่อง",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        await client.query("BEGIN");

        // เช็คซ้ำก่อน insert จริง (กัน error ดิบจาก DB constraint)
        const duplicateCheck = await client.query(
            `SELECT 1 FROM psu_loan.users WHERE email = $1
             UNION
             SELECT 1 FROM psu_loan.student_profiles WHERE student_code = $2`,
            [normalizedEmail, studentCode]
        );

        if (duplicateCheck.rowCount > 0) {
            await client.query("ROLLBACK");

            return res.status(409).json({
                success: false,
                message: "อีเมลหรือรหัสนักศึกษานี้มีผู้ใช้งานแล้ว",
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const userResult = await client.query(
            `INSERT INTO psu_loan.users (role_id, email, password_hash, is_active)
             SELECT role_id, $1, $2, TRUE FROM psu_loan.roles WHERE role_code = 'STUDENT'
             RETURNING user_id`,
            [normalizedEmail, passwordHash]
        );

        const userId = Number(userResult.rows[0].user_id);

        // placeholder สำหรับฟิลด์ที่ฟอร์มสมัครสมาชิกแบบย่อไม่ได้เก็บ —
        // ต้องให้นักศึกษาไปกรอกจริงที่หน้า "ข้อมูลของฉัน" ภายหลัง
        await client.query(
            `INSERT INTO psu_loan.student_profiles (
                student_id, student_code, citizen_id, prefix, first_name, last_name,
                birth_date, phone, faculty, major, year_level,
                house_no, subdistrict, district, province, postal_code
            ) VALUES ($1, $2, $3, '-', $4, $5, $6, $7, '-', '-', 1, '-', '-', '-', '-', '00000')`,
            [
                userId,
                studentCode,
                // placeholder เลขบัตร ปชช. ที่ไม่ซ้ำกัน (ใช้ user_id เติมหน้า)
                `${String(userId).padStart(13, "0")}`.slice(-13),
                firstName,
                lastName,
                "2000-01-01",
                phone,
            ]
        );

        await client.query("COMMIT");

        const token = jwt.sign(
            { userId, role: "STUDENT", studentId: userId },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return res.status(201).json({
            success: true,
            message: "สมัครสมาชิกสำเร็จ กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วน",
            data: {
                token,
                user: {
                    userId,
                    role: "STUDENT",
                    fullName: `${firstName} ${lastName}`,
                    email: normalizedEmail,
                },
            },
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("POST /api/auth/register error:", error);

        return res.status(500).json({
            success: false,
            message: "สมัครสมาชิกไม่สำเร็จ",
        });
    } finally {
        client.release();
    }
});

/*
|--------------------------------------------------------------------------
| เข้าสู่ระบบ
|--------------------------------------------------------------------------
| POST /api/auth/login
|--------------------------------------------------------------------------
| Body: { identifier, password, role }
| identifier = email หรือรหัสนักศึกษา/รหัสพนักงาน ก็ได้
|--------------------------------------------------------------------------
*/
router.post("/login", async (req, res) => {
    try {
        const { identifier, password, role } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: "กรุณากรอกข้อมูลเข้าสู่ระบบและรหัสผ่าน",
            });
        }

        const normalizedRole = role === "staff" ? "STAFF" : "STUDENT";
        const normalizedIdentifier = identifier.trim().toLowerCase();

        // หาได้ทั้งจาก email หรือรหัสนักศึกษา/รหัสพนักงาน
        const query =
            normalizedRole === "STUDENT"
                ? `SELECT u.user_id, u.password_hash, u.is_active,
                          sp.student_code, CONCAT_WS(' ', sp.prefix, sp.first_name, sp.last_name) AS full_name
                   FROM psu_loan.users u
                   JOIN psu_loan.student_profiles sp ON sp.student_id = u.user_id
                   WHERE LOWER(u.email) = $1 OR LOWER(sp.student_code) = $1`
                : `SELECT u.user_id, u.password_hash, u.is_active,
                          stp.employee_code AS student_code, CONCAT_WS(' ', stp.prefix, stp.first_name, stp.last_name) AS full_name
                   FROM psu_loan.users u
                   JOIN psu_loan.staff_profiles stp ON stp.staff_id = u.user_id
                   WHERE LOWER(u.email) = $1 OR LOWER(stp.employee_code) = $1`;

        const result = await pool.query(query, [normalizedIdentifier]);

        if (result.rowCount === 0) {
            return res.status(401).json({
                success: false,
                message: "ไม่พบบัญชีผู้ใช้งานนี้ หรือรหัสผ่านไม่ถูกต้อง",
            });
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: "บัญชีนี้ถูกระงับการใช้งาน",
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "ไม่พบบัญชีผู้ใช้งานนี้ หรือรหัสผ่านไม่ถูกต้อง",
            });
        }

        const token = jwt.sign(
            {
                userId: Number(user.user_id),
                role: normalizedRole,
                studentId:
                    normalizedRole === "STUDENT"
                        ? Number(user.user_id)
                        : undefined,
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return res.status(200).json({
            success: true,
            message: "เข้าสู่ระบบสำเร็จ",
            data: {
                token,
                user: {
                    userId: Number(user.user_id),
                    role: normalizedRole,
                    fullName: user.full_name,
                    code: user.student_code,
                },
            },
        });
    } catch (error) {
        console.error("POST /api/auth/login error:", error);

        return res.status(500).json({
            success: false,
            message: "เข้าสู่ระบบไม่สำเร็จ",
        });
    }
});

module.exports = router;