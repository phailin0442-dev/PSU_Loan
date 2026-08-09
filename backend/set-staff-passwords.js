/*
|--------------------------------------------------------------------------
| ตั้งรหัสผ่านจริงให้เจ้าหน้าที่ 2 คนที่เพิ่งสร้างใหม่
|--------------------------------------------------------------------------
| รันครั้งเดียวหลังรัน reset_staff_accounts.sql เสร็จแล้ว:
|
|   node set-staff-passwords.js
|
| หลังรันเสร็จ login ได้ด้วย:
|   staff01@psu.ac.th หรือ STF001 / รหัสผ่าน: staff123
|   staff02@psu.ac.th หรือ STF002 / รหัสผ่าน: staff123
|--------------------------------------------------------------------------
*/

require("dotenv").config();
const bcrypt = require("bcrypt");
const pool = require("./config/db");

const STAFF_PASSWORD = "staff123";

async function run() {
    const passwordHash = await bcrypt.hash(STAFF_PASSWORD, 10);

    const result = await pool.query(
        `UPDATE psu_loan.users
         SET password_hash = $1
         WHERE email IN ('staff01@psu.ac.th', 'staff02@psu.ac.th')
         RETURNING email`,
        [passwordHash]
    );

    console.log(`ตั้งรหัสผ่านสำเร็จ ${result.rowCount} บัญชี:`);
    result.rows.forEach((row) => console.log(`  - ${row.email}`));
    console.log(`\nรหัสผ่านสำหรับทั้ง 2 บัญชี: ${STAFF_PASSWORD}`);

    await pool.end();
}

run().catch((error) => {
    console.error("เกิดข้อผิดพลาด:", error.message);
    process.exit(1);
});