const express = require("express");
const pool = require("../config/db");

const router = express.Router();

function parsePositiveInteger(value) {
    const parsedValue = Number(value);

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        return null;
    }

    return parsedValue;
}

/*
|--------------------------------------------------------------------------
| ดูคำร้องนักศึกษาทั้งหมด — PostgreSQL จริง
|--------------------------------------------------------------------------
| GET /api/student
|--------------------------------------------------------------------------
| ใช้ view v_application_overview ที่มีอยู่แล้วใน DatabaseV2.sql
| (join applications + student_profiles + loan_types ให้พร้อมใช้งาน)
*/
router.get("/", async (req, res) => {
    try {
        const query = `
            SELECT *
            FROM psu_loan.v_application_overview
            ORDER BY created_at DESC
        `;

        const result = await pool.query(query);

        res.status(200).json({
            success: true,
            total: result.rowCount,
            data: result.rows,
        });
    } catch (error) {
        console.error("GET /api/student error:", error);

        res.status(500).json({
            success: false,
            message: "ไม่สามารถโหลดข้อมูลนักศึกษาได้",
        });
    }
});

/*
|--------------------------------------------------------------------------
| ดูคำร้องนักศึกษารายคน — PostgreSQL จริง
|--------------------------------------------------------------------------
| GET /api/student/:id
|--------------------------------------------------------------------------
| หมายเหตุ: :id คือ application_id (รหัสคำร้อง) ไม่ใช่ student_id
| เพราะนักศึกษา 1 คน สามารถมีคำร้องได้หลายภาคการศึกษา
*/
router.get("/:id", async (req, res) => {
    const applicationId = parsePositiveInteger(req.params.id);

    if (!applicationId) {
        return res.status(400).json({
            success: false,
            message: "รหัสคำร้องไม่ถูกต้อง",
        });
    }

    try {
        // 1) ข้อมูลคำร้องหลัก (จาก view)
        const overviewQuery = `
            SELECT *
            FROM psu_loan.v_application_overview
            WHERE application_id = $1
        `;
        const overviewResult = await pool.query(overviewQuery, [applicationId]);

        if (overviewResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "ไม่พบข้อมูลนักศึกษา",
            });
        }

        const application = overviewResult.rows[0];

        // 2) รหัสที่ต้องใช้กรองเอกสาร (ดึงจาก applications ดิบ)
        const applicationKeysQuery = `
            SELECT loan_type_id, academic_year, semester
            FROM psu_loan.applications
            WHERE application_id = $1
        `;
        const applicationKeysResult = await pool.query(applicationKeysQuery, [applicationId]);
        const { loan_type_id, academic_year, semester } = applicationKeysResult.rows[0];

        // เช็คว่าช่วงเวลาเปิดรับยื่นกู้ของเทอมนี้เปิดอยู่ไหม (ใช้บล็อกหน้า
        // คัดกรองฝั่งนักศึกษาถ้ายังไม่ถึงกำหนดหรือปิดไปแล้ว)
        const periodResult = await pool.query(
            `SELECT start_date, end_date, is_open
             FROM psu_loan.application_periods
             WHERE academic_year = $1 AND semester = $2`,
            [academic_year, semester]
        );

        let periodOpen = true; // ไม่มีการตั้งค่าไว้เลย = ไม่จำกัด (ปลอดภัยไว้ก่อน)
        let periodMessage = "";

        if (periodResult.rowCount > 0) {
            const period = periodResult.rows[0];
            const today = new Date();
            const startDate = new Date(period.start_date);
            const endDate = new Date(period.end_date);

            if (!period.is_open) {
                periodOpen = false;
                periodMessage = "ยังไม่เปิดให้ยื่นเอกสารในขณะนี้";
            } else if (today < startDate) {
                periodOpen = false;
                periodMessage = `ยังไม่เปิดให้ยื่นเอกสาร (เปิดรับ ${period.start_date} ถึง ${period.end_date})`;
            } else if (today > endDate) {
                periodOpen = false;
                periodMessage = `ปิดรับยื่นเอกสารแล้ว (ปิดรับตั้งแต่ ${period.end_date})`;
            }
        }

        // 3) ผู้ปกครองหลัก (ถ้ามี — ใช้กับผู้กู้อายุต่ำกว่า 20 ปี)
        const guardianQuery = `
            SELECT g.prefix, g.first_name, g.last_name, g.relationship, g.phone
            FROM psu_loan.guardians g
            JOIN psu_loan.applications a ON a.student_id = g.student_id
            WHERE a.application_id = $1 AND g.is_primary = TRUE
        `;
        const guardianResult = await pool.query(guardianQuery, [applicationId]);
        const parent = guardianResult.rows[0] || null;

        // 4) รายการเอกสารที่ต้องใช้ + สถานะปัจจุบัน (ถ้าอัปโหลดแล้ว)
        const documentsQuery = `
            SELECT
                dr.requirement_id AS "requirementId",
                dt.document_code AS "documentCode",
                dt.document_name AS "documentType",
                ad.document_id AS "documentId",
                ad.original_file_name AS "fileName",
                COALESCE(ad.review_status::TEXT, 'ยังไม่อัปโหลด') AS status,
                ad.latest_remark AS note,
                ad.uploaded_at AS "uploadedAt",
                COALESCE(rejection_stats.rejection_count, 0)::INTEGER AS "rejectionCount"
            FROM psu_loan.document_requirements dr
            JOIN psu_loan.document_types dt ON dt.document_type_id = dr.document_type_id
            LEFT JOIN psu_loan.application_documents ad
                ON ad.requirement_id = dr.requirement_id
                AND ad.application_id = $1
                AND ad.is_current = TRUE
            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS rejection_count
                FROM psu_loan.document_review_history drh
                JOIN psu_loan.application_documents all_versions
                    ON all_versions.document_id = drh.document_id
                WHERE all_versions.application_id = $1
                  AND all_versions.requirement_id = dr.requirement_id
                  AND drh.new_status = 'REVISION_REQUIRED'
            ) rejection_stats ON TRUE
            WHERE dr.loan_type_id = $2
              AND dr.academic_year = $3
              AND dr.semester = $4
              AND dr.is_active = TRUE
              AND (dr.min_age IS NULL OR dr.min_age <= $5)
              AND (dr.max_age IS NULL OR dr.max_age >= $5)
            ORDER BY dr.display_order
        `;
        const documentsResult = await pool.query(documentsQuery, [
            applicationId,
            loan_type_id,
            academic_year,
            semester,
            application.age,
        ]);

        // ประวัติการเปลี่ยนสถานะคำร้องทั้งใบ (เขียนอัตโนมัติผ่าน trigger
        // trg_application_status_history ทุกครั้งที่ application_status
        // เปลี่ยน) ใช้แสดงในหน้า "ติดตามสถานะ" ฝั่งนักศึกษา
        const statusHistoryQuery = `
            SELECT
                old_status AS "oldStatus",
                new_status AS "newStatus",
                remark,
                changed_at AS "changedAt"
            FROM psu_loan.application_status_history
            WHERE application_id = $1
            ORDER BY changed_at ASC
        `;
        const statusHistoryResult = await pool.query(statusHistoryQuery, [
            applicationId,
        ]);

        // ประวัติการตรวจ/ตีกลับ "รายไฟล์" แบบละเอียด — ต่างจาก statusHistory
        // ด้านบนที่เก็บแค่สถานะรวมทั้งใบ อันนี้บอกได้ว่า "ไฟล์ไหน" "รอบที่
        // เท่าไหร่" "ใครตรวจ" "เหตุผลอะไร" ดึงข้ามทุกเวอร์ชันของทุกเอกสาร
        // ในคำร้องนี้มารวมกันเรียงตามเวลา
        const documentReviewHistoryQuery = `
            SELECT
                drh.review_round AS "round",
                drh.old_status AS "oldStatus",
                drh.new_status AS "newStatus",
                drh.remark AS reason,
                drh.reviewed_at AS "reviewedAt",
                CONCAT_WS(' ', sf.prefix, sf.first_name, sf.last_name) AS "reviewedByName",
                dt.document_name AS "documentName",
                ad.version_no AS "versionNo"
            FROM psu_loan.document_review_history drh
            JOIN psu_loan.application_documents ad ON ad.document_id = drh.document_id
            JOIN psu_loan.document_requirements dr ON dr.requirement_id = ad.requirement_id
            JOIN psu_loan.document_types dt ON dt.document_type_id = dr.document_type_id
            LEFT JOIN psu_loan.staff_profiles sf ON sf.staff_id = drh.reviewed_by
            WHERE ad.application_id = $1
            ORDER BY drh.reviewed_at ASC
        `;
        const documentReviewHistoryResult = await pool.query(
            documentReviewHistoryQuery,
            [applicationId]
        );

        res.status(200).json({
            success: true,
            data: {
                ...application,
                parent,
                requiredDocuments: documentsResult.rows,
                statusHistory: statusHistoryResult.rows,
                documentReviewHistory: documentReviewHistoryResult.rows,
                periodOpen,
                periodMessage,
            },
        });
    } catch (error) {
        console.error("GET /api/student/:id error:", error);

        res.status(500).json({
            success: false,
            message: "ไม่สามารถโหลดข้อมูลนักศึกษาได้",
        });
    }
});

/*
|--------------------------------------------------------------------------
| สร้างคำร้องกู้ยืมใหม่
|--------------------------------------------------------------------------
| POST /api/student/applications
|--------------------------------------------------------------------------
| Body: { studentUserId, loanTypeCode, academicYear, semester, gpax, volunteerHours }
|--------------------------------------------------------------------------
| หมายเหตุสำคัญ: ตาราง applications มี CHECK constraint
| ck_application_semester_data บังคับว่า
|   - เทอม 1 ต้องมี gpax + volunteer_hours ครบ (ห้าม NULL)
|   - เทอม 2 ต้องเป็น NULL ทั้งคู่ + eligibility_status = NOT_REQUIRED
| เพราะงั้น endpoint นี้จึงรวม "คัดกรองคุณสมบัติ" กับ "สร้างคำร้อง" ไว้
| เป็นขั้นตอนเดียวกันสำหรับเทอม 1 (ตาม schema ที่ออกแบบไว้แต่แรก)
|--------------------------------------------------------------------------
*/
router.post("/applications", async (req, res) => {
    try {
        const {
            studentUserId,
            loanTypeCode,
            academicYear,
            semester,
            gpax,
            volunteerHours,
        } = req.body;

        const parsedStudentUserId = parsePositiveInteger(studentUserId);
        const parsedSemester = parsePositiveInteger(semester);

        if (
            !parsedStudentUserId ||
            !loanTypeCode ||
            !academicYear ||
            (parsedSemester !== 1 && parsedSemester !== 2)
        ) {
            return res.status(400).json({
                success: false,
                message: "กรุณาระบุประเภทผู้กู้ ปีการศึกษา และภาคเรียนให้ถูกต้อง",
            });
        }

        // เช็คว่านักศึกษาคนนี้มีอยู่จริง
        const studentResult = await pool.query(
            `SELECT student_id, birth_date FROM psu_loan.student_profiles WHERE student_id = $1`,
            [parsedStudentUserId]
        );

        if (studentResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "ไม่พบข้อมูลนักศึกษา กรุณากรอกข้อมูลส่วนตัวก่อน",
            });
        }

        // เช็คว่ายื่นคำร้องเทอม/ปีนี้ไปแล้วหรือยัง (UNIQUE constraint)
        const existingResult = await pool.query(
            `SELECT application_id FROM psu_loan.applications
             WHERE student_id = $1 AND academic_year = $2 AND semester = $3`,
            [parsedStudentUserId, academicYear, parsedSemester]
        );

        if (existingResult.rowCount > 0) {
            return res.status(409).json({
                success: false,
                message: "มีคำร้องของภาคการศึกษานี้อยู่แล้ว",
                data: { applicationId: existingResult.rows[0].application_id },
            });
        }

        // เช็คช่วงเวลาเปิดรับยื่นกู้ (ตารางเดียวกับที่ใช้บล็อกหน้าคัดกรอง)
        const periodResult = await pool.query(
            `SELECT start_date, end_date, is_open
             FROM psu_loan.application_periods
             WHERE academic_year = $1 AND semester = $2`,
            [academicYear, parsedSemester]
        );

        if (periodResult.rowCount > 0) {
            const period = periodResult.rows[0];
            const today = new Date();

            if (
                !period.is_open ||
                today < new Date(period.start_date) ||
                today > new Date(period.end_date)
            ) {
                return res.status(403).json({
                    success: false,
                    message: "ยังไม่เปิดให้ยื่นเอกสารสำหรับภาคการศึกษานี้",
                });
            }
        }

        // หา loan_type_id จาก code
        const loanTypeResult = await pool.query(
            `SELECT loan_type_id FROM psu_loan.loan_types WHERE loan_type_code = $1`,
            [loanTypeCode]
        );

        if (loanTypeResult.rowCount === 0) {
            return res.status(400).json({
                success: false,
                message: "ไม่พบประเภทผู้กู้นี้ในระบบ",
            });
        }

        const loanTypeId = loanTypeResult.rows[0].loan_type_id;

        let finalGpax = null;
        let finalVolunteerHours = null;
        let eligibilityStatus = "NOT_REQUIRED";
        let applicationStatus = "DOCUMENT_REVIEW";
        let eligibilityRuleId = null;

        if (parsedSemester === 1) {
            const parsedGpax = Number(gpax);
            const parsedHours = Number(volunteerHours);

            if (
                gpax === undefined ||
                gpax === null ||
                gpax === "" ||
                Number.isNaN(parsedGpax) ||
                volunteerHours === undefined ||
                volunteerHours === null ||
                volunteerHours === "" ||
                Number.isNaN(parsedHours)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "เทอม 1 ต้องกรอก GPAX และชั่วโมงจิตอาสาให้ครบ",
                });
            }

            // เทียบกับเกณฑ์จริงจาก eligibility_rules (เก็บ rule_id ไว้ผูก
            // กับคำร้อง แต่ไม่ใช้ค่า threshold จากตารางนี้มาตัดสินผ่าน/ไม่
            // ผ่านโดยตรงแล้ว เพราะข้อมูลที่ seed ไว้เคยผิดมาก่อน — ใช้เกณฑ์
            // ที่ตายตัวตามนี้แทน (ยืนยันจากอาจารย์แล้ว):
            //   - GPAX ต้อง "มากกว่า" 1.80 (ไม่ใช่มากกว่าหรือเท่ากับ) ทุก
            //     ประเภทผู้กู้เหมือนกันหมด
            //   - ผู้กู้รายใหม่ (NEW): ชั่วโมงจิตอาสาต้อง "มากกว่า" 1 ชั่วโมง
            //   - ผู้กู้ต่อเนื่อง 2 ประเภท (CONTINUING_SPECIAL,
            //     CONTINUING_YEAR): ชั่วโมงจิตอาสาต้อง "มากกว่าหรือเท่ากับ"
            //     36 ชั่วโมง
            const ruleResult = await pool.query(
                `SELECT eligibility_rule_id
                 FROM psu_loan.eligibility_rules
                 WHERE loan_type_id = $1 AND academic_year = $2 AND semester = $3`,
                [loanTypeId, academicYear, parsedSemester]
            );

            finalGpax = parsedGpax;
            finalVolunteerHours = parsedHours;
            eligibilityRuleId = ruleResult.rows[0]?.eligibility_rule_id || null;

            const MIN_GPAX = 1.8;
            const minVolunteerHours = loanTypeCode === "NEW" ? 1 : 36;

            const gpaxPassed = parsedGpax > MIN_GPAX;
            const hoursPassed =
                loanTypeCode === "NEW"
                    ? parsedHours > minVolunteerHours
                    : parsedHours >= minVolunteerHours;

            const passed = gpaxPassed && hoursPassed;

            eligibilityStatus = passed ? "PASSED" : "FAILED";
            applicationStatus = passed
                ? "DOCUMENT_REVIEW"
                : "ELIGIBILITY_FAILED";
        }

        const insertResult = await pool.query(
            `INSERT INTO psu_loan.applications
                (student_id, loan_type_id, eligibility_rule_id, academic_year,
                 semester, gpax, volunteer_hours, eligibility_status,
                 application_status, submitted_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8::psu_loan.eligibility_result_code,
                     $9::psu_loan.application_status_code, CURRENT_TIMESTAMP)
             RETURNING application_id`,
            [
                parsedStudentUserId,
                loanTypeId,
                eligibilityRuleId,
                academicYear,
                parsedSemester,
                finalGpax,
                finalVolunteerHours,
                eligibilityStatus,
                applicationStatus,
            ]
        );

        return res.status(201).json({
            success: true,
            message:
                applicationStatus === "ELIGIBILITY_FAILED"
                    ? "สร้างคำร้องสำเร็จ แต่ไม่ผ่านเกณฑ์คัดกรองคุณสมบัติ"
                    : "สร้างคำร้องกู้ยืมสำเร็จ",
            data: {
                applicationId: insertResult.rows[0].application_id,
                eligibilityStatus,
                applicationStatus,
            },
        });
    } catch (error) {
        console.error("POST /api/student/applications error:", error);

        return res.status(500).json({
            success: false,
            message: "ไม่สามารถสร้างคำร้องกู้ยืมได้",
        });
    }
});

/*
|--------------------------------------------------------------------------
| ข้อมูลส่วนตัว (ไม่ผูกกับคำร้อง) — ใช้ได้ตั้งแต่สมัครสมาชิกเสร็จ
|--------------------------------------------------------------------------
| GET /api/student/profile/:userId
| PUT /api/student/profile/:userId
|--------------------------------------------------------------------------
| ต่างจาก GET /api/student/:id (ที่ :id คือ application_id) — endpoint
| นี้ดึง/แก้ student_profiles ตรงๆ ผ่าน user_id เลย ใช้ได้แม้ยังไม่มี
| คำร้องกู้ยืมสักใบ (เช่นเพิ่ง register ใหม่)
|--------------------------------------------------------------------------
*/

router.get("/profile/:userId", async (req, res) => {
    try {
        const userId = parsePositiveInteger(req.params.userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "รหัสผู้ใช้ไม่ถูกต้อง",
            });
        }

        const result = await pool.query(
            `SELECT
                sp.student_id AS "studentUserId",
                sp.student_code AS "studentId",
                sp.citizen_id AS "citizenId",
                sp.prefix,
                sp.first_name AS "firstName",
                sp.last_name AS "lastName",
                sp.birth_date AS "birthDate",
                sp.phone,
                u.email,
                sp.faculty,
                sp.major,
                sp.year_level AS "yearLevel",
                sp.house_no AS "houseNo",
                sp.subdistrict,
                sp.district,
                sp.province,
                sp.postal_code AS "postalCode",
                sp.loan_type_code AS "loanTypeCode"
             FROM psu_loan.student_profiles sp
             JOIN psu_loan.users u ON u.user_id = sp.student_id
             WHERE sp.student_id = $1`,
            [userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "ไม่พบข้อมูลนักศึกษา",
            });
        }

        return res.status(200).json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error("GET /api/student/profile/:userId error:", error);

        return res.status(500).json({
            success: false,
            message: "ไม่สามารถโหลดข้อมูลส่วนตัวได้",
        });
    }
});

router.put("/profile/:userId", async (req, res) => {
    try {
        const userId = parsePositiveInteger(req.params.userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "รหัสผู้ใช้ไม่ถูกต้อง",
            });
        }

        const {
            citizenId,
            prefix,
            firstName,
            lastName,
            birthDate,
            phone,
            faculty,
            major,
            yearLevel,
            houseNo,
            subdistrict,
            district,
            province,
            postalCode,
            loanTypeCode,
        } = req.body;

        const requiredFields = {
            citizenId,
            prefix,
            firstName,
            lastName,
            birthDate,
            phone,
            faculty,
            major,
            yearLevel,
            houseNo,
            subdistrict,
            district,
            province,
            postalCode,
        };

        const missingFields = Object.entries(requiredFields)
            .filter(([, value]) => value === undefined || value === null || value === "")
            .map(([key]) => key);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: "กรุณากรอกข้อมูลให้ครบทุกช่อง",
                missingFields,
            });
        }

        await pool.query(
            `UPDATE psu_loan.student_profiles
             SET citizen_id = $1,
                 prefix = $2,
                 first_name = $3,
                 last_name = $4,
                 birth_date = $5,
                 phone = $6,
                 faculty = $7,
                 major = $8,
                 year_level = $9,
                 house_no = $10,
                 subdistrict = $11,
                 district = $12,
                 province = $13,
                 postal_code = $14,
                 loan_type_code = $15
             WHERE student_id = $16`,
            [
                citizenId,
                prefix,
                firstName,
                lastName,
                birthDate,
                phone,
                faculty,
                major,
                yearLevel,
                houseNo,
                subdistrict,
                district,
                province,
                postalCode,
                loanTypeCode || null,
                userId,
            ]
        );

        return res.status(200).json({
            success: true,
            message: "บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว",
        });
    } catch (error) {
        console.error("PUT /api/student/profile/:userId error:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "เลขบัตรประชาชนนี้มีผู้ใช้งานแล้ว",
            });
        }

        if (error.code === "23514") {
            return res.status(400).json({
                success: false,
                message:
                    "ข้อมูลไม่ถูกต้องตามรูปแบบที่กำหนด (เช่น เลขบัตรประชาชนต้อง 13 หลัก)",
            });
        }

        return res.status(500).json({
            success: false,
            message: "ไม่สามารถบันทึกข้อมูลส่วนตัวได้",
        });
    }
});

module.exports = router;