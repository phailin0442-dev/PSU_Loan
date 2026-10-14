/**
 * services/qualificationService.js
 * เจ้าหน้าที่: คัดกรองคุณสมบัติผู้กู้ (GPAX / ชั่วโมงจิตอาสา) ตามเกณฑ์ eligibility_rules
 *
 * ต่างจาก staffQueueService (จัดการรอบเวลานัดยื่นเอกสาร) และ document review
 * ใน staff routes เดิม (ตรวจไฟล์เอกสารทีละไฟล์) — ไฟล์นี้ตอบคำถามเดียวคือ
 * "คำร้องนี้ผ่านเกณฑ์คุณสมบัติเบื้องต้นไหม" ก่อนจะเข้าสู่ขั้นตรวจเอกสาร
 *
 * กติกาจาก schema:
 *   - ภาคเรียนที่ 1: ต้องคัดกรองเสมอ (gpax, volunteer_hours ห้ามเป็น NULL)
 *   - ภาคเรียนที่ 2: eligibility_status ถูกบังคับเป็น NOT_REQUIRED อยู่แล้วที่ชั้น DB
 *     (ck_application_semester_data) จึงไม่ต้องคัดกรองซ้ำ
 *   - ผลการคัดกรองแต่ละครั้งบันทึกเป็นประวัติใน eligibility_checks (check_round ไล่ขึ้น)
 *     แล้วค่อยสรุปผลล่าสุดไปอัปเดต applications.eligibility_status
 */
const pool = require("../config/db");
//ตัวสร้างข้อความแจ้งปัญหา
function httpError(status, message, code = "BAD_REQUEST") {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    return error;
}
//ตัวเช็กเลขคำร้อง
function parsePositiveInteger(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/* ---------- อ่านเกณฑ์ ---------- */
//ไปหยิบเกณฑ์จากฐานข้อมูล
async function getEligibilityRule({ loanTypeId, academicYear, semester }) {
    const result = await pool.query(
        `SELECT eligibility_rule_id, loan_type_id, academic_year, semester,
                min_gpax, min_volunteer_hours, is_screening_required
           FROM psu_loan.eligibility_rules
          WHERE loan_type_id = $1 AND academic_year = $2 AND semester = $3 AND is_active = TRUE`,
        [loanTypeId, academicYear, semester]
    );
    return result.rows[0] || null;
}

/* ---------- ตรวจคุณสมบัติ ---------- */

async function runEligibilityCheck({ applicationId, staffId, remark }) {
    const appId = parsePositiveInteger(applicationId);
    if (!appId) throw httpError(400, "รหัสคำร้องไม่ถูกต้อง");

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const appResult = await client.query(
            `SELECT application_id, loan_type_id, academic_year, semester,
                    gpax, volunteer_hours, eligibility_status, application_status
               FROM psu_loan.applications
              WHERE application_id = $1
              FOR UPDATE`,
            [appId]
        );
        if (appResult.rowCount === 0) throw httpError(404, "ไม่พบคำร้องนี้", "APPLICATION_NOT_FOUND");
        const app = appResult.rows[0];

        if (app.semester === 2) { // // เทอม 2 ไม่ต้องคัดกรอง
            throw httpError(409, "คำร้องภาคเรียนที่ 2 ไม่ต้องคัดกรองคุณสมบัติ", "NOT_REQUIRED");
        }
        if (!["SUBMITTED", "ELIGIBILITY_REVIEW", "ELIGIBILITY_FAILED"].includes(app.application_status)) {
            throw httpError(409, "คำร้องนี้อยู่ในสถานะที่คัดกรองคุณสมบัติไม่ได้", "INVALID_STATUS");
        }

        const rule = await getEligibilityRule({
            loanTypeId: app.loan_type_id,
            academicYear: app.academic_year,
            semester: app.semester,
        });
        if (!rule) {
            throw httpError(409, "ไม่พบเกณฑ์คัดกรองของปีการศึกษา/ภาคเรียนนี้ กรุณาตั้งค่าเกณฑ์ก่อน", "RULE_NOT_FOUND");
        }

        let gpaxPassed = true;
        let volunteerPassed = true;
        let result;

        if (!rule.is_screening_required) {
            result = "NOT_REQUIRED";
        } else {
            //// GPAX ต้องมีค่า และมากกว่าหรือเท่ากับขั้นต่ำ
            gpaxPassed = app.gpax !== null && Number(app.gpax) >= Number(rule.min_gpax);
            //ชั่วโมงจิตอาสาต้องมีค่า และมากกว่าหรือเท่ากับขั้นต่ำ
            volunteerPassed = app.volunteer_hours !== null && Number(app.volunteer_hours) >= Number(rule.min_volunteer_hours);
            result = gpaxPassed && volunteerPassed ? "PASSED" : "FAILED";
        }

        const roundResult = await client.query(
            // หาว่าเคยตรวจกี่ครั้งแล้ว แล้วบวก 1
            `SELECT COALESCE(MAX(check_round), 0) + 1 AS next_round
               FROM psu_loan.eligibility_checks WHERE application_id = $1`,
            [appId]
        );
        const nextRound = roundResult.rows[0].next_round;

        await client.query(
            `INSERT INTO psu_loan.eligibility_checks
                (application_id, check_round, gpax_passed, volunteer_passed, result, remark, checked_by)
             VALUES ($1, $2, $3, $4, $5::psu_loan.eligibility_result_code, $6, $7)`,
            [appId, nextRound, gpaxPassed, volunteerPassed, result, remark || null, staffId]
        );
        // ผ่าน หรือ ไม่ต้องคัดกรอง → "รอตรวจเอกสาร" · ไม่ผ่าน → "ไม่ผ่านคัดกรอง"
        const nextApplicationStatus =
            result === "PASSED" || result === "NOT_REQUIRED" ? "DOCUMENT_REVIEW" : "ELIGIBILITY_FAILED";

        await client.query(
            `UPDATE psu_loan.applications
                SET eligibility_rule_id = $1, eligibility_status = $2::psu_loan.eligibility_result_code,
                    application_status = $3::psu_loan.application_status_code,
                    reviewed_at = CURRENT_TIMESTAMP
              WHERE application_id = $4`,
            [rule.eligibility_rule_id, result, nextApplicationStatus, appId]
        );

        await client.query("COMMIT"); //ทุกขั้นสำเร็จ ยืนยันบันทึกทั้งหมด

        return {
            applicationId: appId,
            checkRound: nextRound, //ตรวจครั้งที่เท่าไหร่
            gpaxPassed,
            volunteerPassed,
            result,//ผลรวม
            applicationStatus: nextApplicationStatus,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

/* ---------- ประวัติการคัดกรอง ---------- */

async function getEligibilityHistory({ applicationId }) {
    const appId = parsePositiveInteger(applicationId);
    if (!appId) throw httpError(400, "รหัสคำร้องไม่ถูกต้อง");

    const result = await pool.query(
        //ดึงประวัติทุกรอบ พร้อมชื่อเจ้าหน้าที่ที่ตรวจ
        `SELECT ec.check_round AS "round", ec.gpax_passed AS "gpaxPassed",
                ec.volunteer_passed AS "volunteerPassed", ec.result, ec.remark,
                ec.checked_at AS "checkedAt",
                CONCAT_WS(' ', sp.prefix, sp.first_name, sp.last_name) AS "checkedByName"
           FROM psu_loan.eligibility_checks ec
           LEFT JOIN psu_loan.staff_profiles sp ON sp.staff_id = ec.checked_by
          WHERE ec.application_id = $1
          ORDER BY ec.check_round ASC`,
        [appId]
    );
    return result.rows; //ส่งรายการประวิติกลับ
}

module.exports = { getEligibilityRule, runEligibilityCheck, getEligibilityHistory };