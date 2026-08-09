/*
|--------------------------------------------------------------------------
| สคริปต์ตั้งรหัสผ่านทดสอบให้นักศึกษาตัวอย่าง 3 คน + เจ้าหน้าที่ที่ seed ไว้
|--------------------------------------------------------------------------
| รันครั้งเดียวในเครื่องนี้ (มี bcrypt + pg ติดตั้งอยู่แล้วจาก package.json)
|
|   node set-demo-passwords.js
|
| หลังรันเสร็จ ทุกคนจะ login ได้ด้วยรหัสผ่าน: password123
| (username = email หรือ รหัสนักศึกษา/รหัสพนักงาน ก็ได้)
|--------------------------------------------------------------------------
*/

require("dotenv").config();
const bcrypt = require("bcrypt");
const pool = require("./config/db");

const DEMO_PASSWORD = "password123";

async function run() {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    const result = await pool.query(
        `UPDATE psu_loan.users
         SET password_hash = $1
         WHERE email IN (
             '6910110001@psu.ac.th',
             '6510110025@psu.ac.th',
             '6610110042@psu.ac.th',
             'staff01@psu.ac.th'
         )
         RETURNING email`,
        [passwordHash]
    );

    console.log(`ตั้งรหัสผ่านสำเร็จ ${result.rowCount} บัญชี:`);
    result.rows.forEach((row) => console.log(`  - ${row.email}`));
    console.log(`\nรหัสผ่านสำหรับทุกบัญชี: ${DEMO_PASSWORD}`);

    await pool.end();
}

run().catch((error) => {
    console.error("เกิดข้อผิดพลาด:", error.message);
    process.exit(1);
});