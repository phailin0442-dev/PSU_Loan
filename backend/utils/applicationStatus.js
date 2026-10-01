/*
|--------------------------------------------------------------------------
| Helper: recalculateApplicationStatus
|--------------------------------------------------------------------------
| ใช้คำนวณสถานะรวมของคำร้อง (applications.application_status) จากผลรวม
| ของเอกสารทุกไฟล์ที่ "ต้องใช้จริง" ในคำร้องนั้น (ตาม document_requirements
| ที่ active + เข้าเงื่อนไขอายุ) เทียบกับ review_status ปัจจุบันของแต่ละ
| requirement (current version เท่านั้น)
|
| ต้องเรียกฟังก์ชันนี้ทุกจุดที่ทำให้ review_status ของเอกสารสักไฟล์
| เปลี่ยนไป ไม่ว่าจะเป็น:
|   - เจ้าหน้าที่กดอนุมัติ/ตีกลับไฟล์เอง (PATCH .../documents/:documentId)
|   - ระบบ auto-approve ตอนอัปโหลด (เช่น GPAX_EVIDENCE, VOLUNTEER_EVIDENCE)
|
| ก่อนหน้านี้ route อัปโหลดเอกสาร (POST /:applicationId/documents) เซ็ต
| application_status = 'DOCUMENT_REVIEW' ตรงๆ ทุกครั้งโดยไม่เช็คผลรวม
| ทำให้เอกสารที่ auto-approve ตอนอัปโหลด (GPAX/จิตอาสา) ไม่เคยถูกนับรวม
| เข้าสถานะคำร้อง ค้างเป็น "รอตรวจสอบ" แม้เอกสารจะครบและผ่านหมดแล้วจริง
| ฟังก์ชันนี้แก้ปัญหานั้นโดยให้ทุกจุดที่แตะ review_status เรียก logic
| สรุปผลเดียวกันเสมอ
|
| กติกาการสรุปผล (เหมือนเดิมตาม PATCH .../documents/:documentId):
|   - ถ้ามีไฟล์ไหน REVISION_REQUIRED อย่างน้อย 1 ไฟล์ -> REVISION_REQUIRED
|   - ถ้าไม่มี และไฟล์ APPROVED ครบตามจำนวนที่ต้องใช้ (>= required, ต้อง
|     required > 0 ด้วย กัน edge case ไม่มี requirement เลย) -> DOCUMENT_APPROVED
|   - นอกนั้น -> DOCUMENT_REVIEW (ยังไม่ครบ/ยังไม่ได้ตรวจครบ)
|
| หมายเหตุ: ฟังก์ชันนี้รับ "client" ที่อยู่ใน transaction เดียวกับ caller
| (ไม่เปิด transaction ใหม่เอง) เพื่อให้การอัปเดตเอกสาร + สรุปสถานะ
| เป็น atomic operation เดียวกัน ต้องเรียกภายใน BEGIN...COMMIT ของ caller
|--------------------------------------------------------------------------
*/

async function recalculateApplicationStatus(client, applicationId) {
    const summaryResult = await client.query(
        `SELECT
            COUNT(*) FILTER (WHERE ad.review_status = 'REVISION_REQUIRED') AS revision_count,
            COUNT(*) FILTER (WHERE ad.review_status = 'APPROVED') AS approved_count,
            (
                SELECT COUNT(*)
                FROM psu_loan.document_requirements dr
                WHERE dr.loan_type_id = a.loan_type_id
                  AND dr.academic_year = a.academic_year
                  AND dr.semester = a.semester
                  AND dr.is_active = TRUE
                  AND (dr.min_age IS NULL OR dr.min_age <= EXTRACT(YEAR FROM AGE(CURRENT_DATE, sp.birth_date))::INTEGER)
                  AND (dr.max_age IS NULL OR dr.max_age >= EXTRACT(YEAR FROM AGE(CURRENT_DATE, sp.birth_date))::INTEGER)
            ) AS required_count
         FROM psu_loan.applications a
         JOIN psu_loan.student_profiles sp ON sp.student_id = a.student_id
         LEFT JOIN psu_loan.application_documents ad
             ON ad.application_id = a.application_id AND ad.is_current = TRUE
         WHERE a.application_id = $1
         GROUP BY a.loan_type_id, a.academic_year, a.semester, sp.birth_date`,
        [applicationId]
    );

    const summary = summaryResult.rows[0] || {
        revision_count: 0,
        approved_count: 0,
        required_count: 0,
    };

    let newApplicationStatus = "DOCUMENT_REVIEW";

    if (Number(summary.revision_count) > 0) {
        newApplicationStatus = "REVISION_REQUIRED";
    } else if (
        Number(summary.required_count) > 0 &&
        Number(summary.approved_count) >= Number(summary.required_count)
    ) {
        newApplicationStatus = "DOCUMENT_APPROVED";
    }

    // ห้ามเขียนทับสถานะ DRAFT (ยังไม่ submit จริง) ด้วยผลสรุปนี้ — ให้
    // ตรงกับพฤติกรรมเดิมของ route อัปโหลดที่กันคำร้อง DRAFT ไว้ก่อนแล้ว
    const updateResult = await client.query(
        `UPDATE psu_loan.applications
         SET application_status = $1::psu_loan.application_status_code
         WHERE application_id = $2 AND application_status <> 'DRAFT'
         RETURNING application_status`,
        [newApplicationStatus, applicationId]
    );

    return updateResult.rows[0]?.application_status || null;
}

module.exports = { recalculateApplicationStatus };