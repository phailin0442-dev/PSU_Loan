const express = require("express");
const pool = require("../config/db");
const { requireLogin, requireRole } = require("../middleware/jwtAuth");
const qualificationService = require("../services/qualificationService");
const staffQueueService = require("../services/staffQueueService");
// แก้บัก: route ตรวจเอกสารเรียก recalculateApplicationStatus แต่ไม่เคย import
// ทำให้เกิด "ReferenceError: recalculateApplicationStatus is not defined"
const { recalculateApplicationStatus } = require("../utils/applicationStatus");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Status mapping (Thai label ↔ DB enum codes)
|--------------------------------------------------------------------------
| Frontend เดิมใช้ label ภาษาไทย 3 กลุ่ม ส่วน DB มี application_status_code
| ที่ละเอียดกว่า (workflow หลายขั้นตอน) จึงต้อง map ไปมาให้ตรงกัน
*/

const STATUS_GROUP_TO_APPLICATION_CODES = {
    รอตรวจสอบ: ["DRAFT", "SUBMITTED", "DOCUMENT_REVIEW"],
    ต้องแก้ไข: ["REVISION_REQUIRED"],
    ผ่าน: [
        "DOCUMENT_APPROVED",
        "QUEUE_BOOKED",
        "SIGNED",
        "CENTRAL_SUBMITTED",
        "COMPLETED",
    ],
};

// ใช้ตอนเจ้าหน้าที่กด "อนุมัติ/ตีกลับ" คำร้องทั้งใบ
const STATUS_LABEL_TO_APPLICATION_STATUS = {
    รอตรวจสอบ: "DOCUMENT_REVIEW",
    ต้องแก้ไข: "REVISION_REQUIRED",
    ผ่าน: "DOCUMENT_APPROVED",
};

// ใช้ตอนเจ้าหน้าที่ตรวจเอกสารทีละไฟล์
const STATUS_LABEL_TO_DOCUMENT_REVIEW_STATUS = {
    รอตรวจสอบ: "PENDING",
    ต้องแก้ไข: "REVISION_REQUIRED",
    ผ่าน: "APPROVED",
};

const ALLOWED_MOCK_STATUSES = Object.keys(STATUS_LABEL_TO_APPLICATION_STATUS);

// SQL fragment แปลง application_status (enum) -> label ภาษาไทย ใช้ซ้ำหลายจุด
const APPLICATION_STATUS_LABEL_CASE = `
    CASE
        WHEN a.application_status IN ('DRAFT','SUBMITTED','DOCUMENT_REVIEW')
            THEN 'รอตรวจสอบ'
        WHEN a.application_status = 'REVISION_REQUIRED'
            THEN 'ต้องแก้ไข'
        WHEN a.application_status IN (
            'DOCUMENT_APPROVED','QUEUE_BOOKED','SIGNED','CENTRAL_SUBMITTED','COMPLETED'
        )
            THEN 'ผ่าน'
        WHEN a.application_status = 'CANCELLED'
            THEN 'ยกเลิก'
        ELSE 'รอตรวจสอบ'
    END
`;

/*
|--------------------------------------------------------------------------
| Helper Functions
|--------------------------------------------------------------------------
*/

function parsePositiveInteger(value) {
    const parsedValue = Number(value);

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        return null;
    }

    return parsedValue;
}

/*
|--------------------------------------------------------------------------
| Dashboard เจ้าหน้าที่ — PostgreSQL จริง
|--------------------------------------------------------------------------
| GET /api/staff/dashboard
|--------------------------------------------------------------------------
*/

router.get("/dashboard", async (req, res) => {
    try {
        const summaryQuery = `
            SELECT
                COUNT(*) FILTER (
                    WHERE application_status <> 'CANCELLED'
                )::INTEGER AS total_count,

                COUNT(*) FILTER (
                    WHERE application_status IN (
                        'DRAFT',
                        'SUBMITTED',
                        'DOCUMENT_REVIEW'
                    )
                )::INTEGER AS pending_count,

                COUNT(*) FILTER (
                    WHERE application_status =
                        'REVISION_REQUIRED'
                )::INTEGER AS revision_count,

                COUNT(*) FILTER (
                    WHERE application_status IN (
                        'DOCUMENT_APPROVED',
                        'QUEUE_BOOKED',
                        'SIGNED',
                        'CENTRAL_SUBMITTED',
                        'COMPLETED'
                    )
                )::INTEGER AS approved_count,

                COUNT(*) FILTER (
                    WHERE application_status =
                        'CANCELLED'
                )::INTEGER AS cancelled_count

            FROM psu_loan.applications
        `;

        const recentStudentsQuery = `
            SELECT
                a.application_id AS id,
                sp.student_code AS "studentId",
                CONCAT_WS(
                    ' ',
                    NULLIF(BTRIM(sp.prefix), ''),
                    NULLIF(BTRIM(sp.first_name), ''),
                    NULLIF(BTRIM(sp.last_name), '')
                ) AS "fullName",
                sp.faculty,
                sp.major,
                sp.year_level AS year,
                EXTRACT(
                    YEAR FROM AGE(CURRENT_DATE, sp.birth_date)
                )::INTEGER AS age,
                lt.loan_type_name AS "borrowerType",
                lt.loan_type_code AS "borrowerCode",
                a.semester,
                a.academic_year AS "academicYear",
                a.gpax,
                a.volunteer_hours AS "volunteerHours",
                a.eligibility_status AS "eligibilityStatus",
                a.application_status AS "statusCode",
                ${APPLICATION_STATUS_LABEL_CASE} AS status,
                a.submitted_at AS "submittedAt",
                CASE
                    WHEN a.submitted_at IS NOT NULL
                    THEN TO_CHAR(
                        a.submitted_at AT TIME ZONE 'Asia/Bangkok',
                        'DD/MM/YYYY'
                    )
                    ELSE '-'
                END AS "submittedDate"
            FROM psu_loan.applications AS a
            INNER JOIN psu_loan.student_profiles AS sp
                ON sp.student_id = a.student_id
            INNER JOIN psu_loan.loan_types AS lt
                ON lt.loan_type_id = a.loan_type_id
            ORDER BY
                a.submitted_at DESC NULLS LAST,
                a.created_at DESC
            LIMIT 5
        `;

        const [summaryResult, recentStudentsResult] = await Promise.all([
            pool.query(summaryQuery),
            pool.query(recentStudentsQuery),
        ]);

        const summaryRow = summaryResult.rows[0] || {};

        const summary = {
            totalCount: Number(summaryRow.total_count) || 0,
            pendingCount: Number(summaryRow.pending_count) || 0,
            revisionCount: Number(summaryRow.revision_count) || 0,
            approvedCount: Number(summaryRow.approved_count) || 0,
            cancelledCount: Number(summaryRow.cancelled_count) || 0,
        };

        return res.status(200).json({
            success: true,
            message: "โหลดข้อมูล Dashboard จากฐานข้อมูลสำเร็จ",
            data: {
                summary,
                recentStudents: recentStudentsResult.rows,
                students: recentStudentsResult.rows,
            },
        });
    } catch (error) {
        console.error("GET /api/staff/dashboard database error:", error);

        return res.status(500).json({
            success: false,
            message: "ไม่สามารถโหลดข้อมูล Dashboard ได้",
            error: error.message,
            code: error.code || null,
            detail: error.detail || null,
        });
    }
});

/*
|--------------------------------------------------------------------------
| รายชื่อนักศึกษา — PostgreSQL จริง
|--------------------------------------------------------------------------
| GET /api/staff/students
| GET /api/staff/students?status=รอตรวจสอบ
| GET /api/staff/students?search=6810110001
|--------------------------------------------------------------------------
*/

router.get("/students", async (req, res) => {
    try {
        const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
        const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

        const conditions = [];
        const params = [];

        if (status && status !== "ทั้งหมด") {
            const codes = STATUS_GROUP_TO_APPLICATION_CODES[status];

            if (!codes) {
                return res.status(400).json({
                    success: false,
                    message: "สถานะไม่ถูกต้อง",
                    allowedStatuses: Object.keys(STATUS_GROUP_TO_APPLICATION_CODES),
                });
            }

            params.push(codes);
            conditions.push(
                `a.application_status = ANY($${params.length}::psu_loan.application_status_code[])`
            );
        }

        if (search) {
            params.push(`%${search.toLowerCase()}%`);
            const placeholder = params.length;

            conditions.push(`(
                LOWER(sp.student_code) LIKE $${placeholder}
                OR LOWER(CONCAT_WS(' ', sp.prefix, sp.first_name, sp.last_name)) LIKE $${placeholder}
                OR LOWER(sp.faculty) LIKE $${placeholder}
                OR LOWER(sp.major) LIKE $${placeholder}
                OR LOWER(lt.loan_type_name) LIKE $${placeholder}
                OR LOWER(lt.loan_type_code) LIKE $${placeholder}
            )`);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

        const query = `
            SELECT * FROM (
                SELECT
                    a.application_id AS id,
                    sp.student_code AS "studentId",
                    CONCAT_WS(
                        ' ',
                        NULLIF(BTRIM(sp.prefix), ''),
                        NULLIF(BTRIM(sp.first_name), ''),
                        NULLIF(BTRIM(sp.last_name), '')
                    ) AS "fullName",
                    sp.faculty,
                    sp.major,
                    sp.year_level AS year,
                    EXTRACT(
                        YEAR FROM AGE(CURRENT_DATE, sp.birth_date)
                    )::INTEGER AS age,
                    lt.loan_type_name AS "borrowerType",
                    lt.loan_type_code AS "borrowerCode",
                    a.semester,
                    a.academic_year AS "academicYear",
                    a.gpax,
                    a.volunteer_hours AS "volunteerHours",
                    a.eligibility_status AS "eligibilityStatus",
                    a.application_status AS "statusCode",
                    ${APPLICATION_STATUS_LABEL_CASE} AS status,
                    a.submitted_at AS "submittedAt",
                    CASE
                        WHEN a.submitted_at IS NOT NULL
                        THEN TO_CHAR(a.submitted_at AT TIME ZONE 'Asia/Bangkok', 'DD/MM/YYYY')
                        ELSE '-'
                    END AS "submittedDate",
                    (
                        SELECT COUNT(*)
                        FROM psu_loan.document_requirements dr
                        WHERE dr.loan_type_id = a.loan_type_id
                          AND dr.academic_year = a.academic_year
                          AND dr.semester = a.semester
                          AND dr.is_active = TRUE
                          AND (dr.min_age IS NULL OR dr.min_age <= EXTRACT(YEAR FROM AGE(CURRENT_DATE, sp.birth_date))::INTEGER)
                          AND (dr.max_age IS NULL OR dr.max_age >= EXTRACT(YEAR FROM AGE(CURRENT_DATE, sp.birth_date))::INTEGER)
                    )::INTEGER AS "requiredCount",
                    (
                        SELECT COUNT(*)
                        FROM psu_loan.application_documents ad
                        WHERE ad.application_id = a.application_id AND ad.is_current = TRUE
                    )::INTEGER AS "uploadedCount"
                FROM psu_loan.applications AS a
                INNER JOIN psu_loan.student_profiles AS sp ON sp.student_id = a.student_id
                INNER JOIN psu_loan.loan_types AS lt ON lt.loan_type_id = a.loan_type_id
                ${whereClause}
            ) sub
            -- โชว์เฉพาะคนที่คัดกรอง "ผ่าน" (หรือไม่ต้องคัดกรอง) และอัปโหลด
            -- เอกสารครบ 100% แล้วเท่านั้น — คัดกรองไม่ผ่าน/ยังไม่ตรวจ/
            -- อัปโหลดไม่ครบ ไม่มีอะไรให้เจ้าหน้าที่ตรวจ ไม่ต้องขึ้นในลิสต์นี้
            WHERE sub."eligibilityStatus" IN ('PASSED', 'NOT_REQUIRED')
              AND sub."requiredCount" > 0
              AND sub."uploadedCount" >= sub."requiredCount"
            ORDER BY sub."submittedAt" ASC NULLS LAST
        `;

        const result = await pool.query(query, params);

        return res.status(200).json({
            success: true,
            total: result.rowCount,
            data: result.rows,
        });
    } catch (error) {
        console.error("GET /api/staff/students error:", error);

        return res.status(500).json({
            success: false,
            message: "ไม่สามารถโหลดรายชื่อนักศึกษาได้",
        });
    }
});

/*
|--------------------------------------------------------------------------
| รายละเอียดนักศึกษารายคน — PostgreSQL จริง
|--------------------------------------------------------------------------
| GET /api/staff/students/:id   (:id คือ application_id)
|--------------------------------------------------------------------------
*/

router.get("/students/:id", async (req, res) => {
    try {
        const applicationId = parsePositiveInteger(req.params.id);

        if (!applicationId) {
            return res.status(400).json({
                success: false,
                message: "รหัสคำร้องไม่ถูกต้อง",
            });
        }

        const studentQuery = `
            SELECT
                a.application_id AS id,
                sp.student_id AS "studentUserId",
                sp.student_code AS "studentId",
                sp.citizen_id AS "citizenId",
                CONCAT_WS(' ', sp.prefix, sp.first_name, sp.last_name) AS "fullName",
                sp.faculty,
                sp.major,
                sp.year_level AS year,
                EXTRACT(YEAR FROM AGE(CURRENT_DATE, sp.birth_date))::INTEGER AS age,
                sp.phone,
                u.email,
                lt.loan_type_id AS "loanTypeId",
                lt.loan_type_name AS "borrowerType",
                lt.loan_type_code AS "borrowerCode",
                a.semester,
                a.academic_year AS "academicYear",
                a.gpax,
                a.volunteer_hours AS "volunteerHours",
                a.eligibility_status AS "eligibilityStatus",
                a.application_status AS "statusCode",
                ${APPLICATION_STATUS_LABEL_CASE} AS status,
                a.submitted_at AS "submittedAt"
            FROM psu_loan.applications a
            JOIN psu_loan.student_profiles sp ON sp.student_id = a.student_id
            JOIN psu_loan.users u ON u.user_id = sp.student_id
            JOIN psu_loan.loan_types lt ON lt.loan_type_id = a.loan_type_id
            WHERE a.application_id = $1
        `;

        const studentResult = await pool.query(studentQuery, [applicationId]);

        if (studentResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "ไม่พบข้อมูลคำร้องของนักศึกษา",
            });
        }

        const student = studentResult.rows[0];

        const documentsQuery = `
            SELECT
                dr.requirement_id AS "requirementId",
                dt.document_code AS "documentCode",
                dt.document_name AS "documentType",
                ad.document_id AS id,
                ad.original_file_name AS "fileName",
                COALESCE(ad.review_status::TEXT, 'ยังไม่อัปโหลด') AS status,
                ad.latest_remark AS note,
                ad.file_path AS "filePath",
                ad.mime_type AS "mimeType",
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
            student.loanTypeId,
            student.academicYear,
            student.semester,
            student.age,
        ]);

        return res.status(200).json({
            success: true,
            data: {
                ...student,
                documents: documentsResult.rows,
            },
        });
    } catch (error) {
        console.error("GET /api/staff/students/:id error:", error);

        return res.status(500).json({
            success: false,
            message: "ไม่สามารถโหลดข้อมูลนักศึกษาได้",
        });
    }
});

/*
|--------------------------------------------------------------------------
| อัปเดตสถานะคำร้องทั้งใบ — PostgreSQL จริง
|--------------------------------------------------------------------------
| PATCH /api/staff/students/:id/status
|--------------------------------------------------------------------------
| Body:
| { "status": "ผ่าน", "note": "ตรวจสอบเอกสารครบถ้วนแล้ว" }
|--------------------------------------------------------------------------
| หมายเหตุ: applications ไม่มีคอลัมน์ remark ตรง ๆ แต่มี trigger
| trg_application_status_history บันทึกประวัติการเปลี่ยนสถานะให้อัตโนมัติ
| อยู่แล้วทุกครั้งที่ application_status เปลี่ยน จึงแค่ไปอัปเดต remark
| ของแถวประวัติล่าสุดที่ trigger เพิ่งสร้าง
|--------------------------------------------------------------------------
*/

router.patch("/students/:id/status", async (req, res) => {
    try {
        const applicationId = parsePositiveInteger(req.params.id);

        if (!applicationId) {
            return res.status(400).json({
                success: false,
                message: "รหัสคำร้องไม่ถูกต้อง",
            });
        }

        const status = typeof req.body.status === "string" ? req.body.status.trim() : "";
        const note = typeof req.body.note === "string" ? req.body.note.trim() : "";

        const newApplicationStatus = STATUS_LABEL_TO_APPLICATION_STATUS[status];

        if (!newApplicationStatus) {
            return res.status(400).json({
                success: false,
                message: "สถานะไม่ถูกต้อง",
                allowedStatuses: ALLOWED_MOCK_STATUSES,
            });
        }

        if (status === "ต้องแก้ไข" && !note) {
            return res.status(400).json({
                success: false,
                message: "กรุณาระบุหมายเหตุสำหรับรายการที่ต้องแก้ไข",
            });
        }

        const updateResult = await pool.query(
            `UPDATE psu_loan.applications
             SET application_status = $1::psu_loan.application_status_code
             WHERE application_id = $2
             RETURNING application_id`,
            [newApplicationStatus, applicationId]
        );

        if (updateResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "ไม่พบข้อมูลคำร้องของนักศึกษา",
            });
        }

        if (note) {
            await pool.query(
                `UPDATE psu_loan.application_status_history
                 SET remark = $1
                 WHERE status_history_id = (
                     SELECT status_history_id
                     FROM psu_loan.application_status_history
                     WHERE application_id = $2
                     ORDER BY changed_at DESC
                     LIMIT 1
                 )`,
                [note, applicationId]
            );
        }

        return res.status(200).json({
            success: true,
            message: "บันทึกผลการตรวจสอบเรียบร้อยแล้ว",
        });
    } catch (error) {
        console.error("PATCH /api/staff/students/:id/status error:", error);

        return res.status(500).json({
            success: false,
            message: "ไม่สามารถบันทึกผลการตรวจสอบได้",
        });
    }
});

/*
|--------------------------------------------------------------------------
| อัปเดตสถานะเอกสารรายไฟล์ — PostgreSQL จริง
|--------------------------------------------------------------------------
| PATCH /api/staff/students/:studentId/documents/:documentId
|--------------------------------------------------------------------------
| Body:
| {
|   "status": "ต้องแก้ไข",
|   "note": "ภาพไม่ชัด กรุณาอัปโหลดใหม่",
|   "staffId": 1
| }
|--------------------------------------------------------------------------
| หมายเหตุสำคัญ: document_review_history.reviewed_by เป็น NOT NULL
| แต่ระบบยังไม่มี auth middleware ที่แปะ req.user มาให้ จึงต้องรับ staffId
| จาก body หรือ header "x-staff-id" ไปก่อนชั่วคราว — เมื่อทำระบบ login/JWT
| เสร็จแล้ว ให้เปลี่ยนไปอ่านจาก req.user.staffId แทน แล้วลบส่วนนี้ทิ้ง
|--------------------------------------------------------------------------
*/

router.patch("/students/:studentId/documents/:documentId", async (req, res) => {
    const client = await pool.connect();

    try {
        const applicationId = parsePositiveInteger(req.params.studentId);
        const documentId = parsePositiveInteger(req.params.documentId);

        if (!applicationId || !documentId) {
            return res.status(400).json({
                success: false,
                message: "รหัสคำร้องหรือรหัสเอกสารไม่ถูกต้อง",
            });
        }

        const status = typeof req.body.status === "string" ? req.body.status.trim() : "";
        const note = typeof req.body.note === "string" ? req.body.note.trim() : "";

        const newDocumentStatus = STATUS_LABEL_TO_DOCUMENT_REVIEW_STATUS[status];

        if (!newDocumentStatus) {
            return res.status(400).json({
                success: false,
                message: "สถานะเอกสารไม่ถูกต้อง",
                allowedStatuses: ALLOWED_MOCK_STATUSES,
            });
        }

        if (status === "ต้องแก้ไข" && !note) {
            return res.status(400).json({
                success: false,
                message: "กรุณาระบุเหตุผลที่ต้องแก้ไขเอกสาร",
            });
        }

        // TODO: เปลี่ยนมาอ่านจาก req.user.staffId เมื่อมีระบบ auth แล้ว
        const staffId = parsePositiveInteger(req.body.staffId || req.headers["x-staff-id"]);

        if (!staffId) {
            return res.status(400).json({
                success: false,
                message:
                    "ต้องระบุรหัสเจ้าหน้าที่ผู้ตรวจ (staffId) — จำเป็นชั่วคราวจนกว่าจะมีระบบยืนยันตัวตน",
            });
        }

        await client.query("BEGIN");

        const currentDocumentResult = await client.query(
            `SELECT review_status, requirement_id
             FROM psu_loan.application_documents
             WHERE document_id = $1 AND application_id = $2 AND is_current = TRUE
             FOR UPDATE`,
            [documentId, applicationId]
        );

        if (currentDocumentResult.rowCount === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "ไม่พบเอกสารที่ต้องการตรวจสอบ",
            });
        }

        const oldStatus = currentDocumentResult.rows[0].review_status;
        const requirementId = currentDocumentResult.rows[0].requirement_id;

        await client.query(
            `UPDATE psu_loan.application_documents
             SET review_status = $1::psu_loan.document_review_status_code,
                 latest_remark = $2,
                 reviewed_by = $3,
                 reviewed_at = CURRENT_TIMESTAMP,
                 approved_at = CASE
                     WHEN $1::psu_loan.document_review_status_code = 'APPROVED'
                     THEN CURRENT_TIMESTAMP
                     ELSE approved_at
                 END
             WHERE document_id = $4`,
            [newDocumentStatus, note || null, staffId, documentId]
        );

        // นับ round ข้าม "ทุกเวอร์ชัน" ของ requirement เดียวกันในคำร้องนี้
        // (ไม่ใช่แค่ document_id ปัจจุบัน) เพราะทุกครั้งที่นักศึกษาอัปโหลดใหม่
        // จะได้ document_id ใหม่เสมอ — ถ้านับแค่ document_id เดียว ตัวเลข
        // "ตีกลับครั้งที่" จะรีเซ็ตกลับไปเริ่มที่ 1 ทุกครั้งที่มีการอัปโหลดใหม่
        const roundResult = await client.query(
            `SELECT COALESCE(MAX(drh.review_round), 0) + 1 AS next_round
             FROM psu_loan.document_review_history drh
             JOIN psu_loan.application_documents ad ON ad.document_id = drh.document_id
             WHERE ad.application_id = $1 AND ad.requirement_id = $2`,
            [applicationId, requirementId]
        );
        const nextRound = roundResult.rows[0].next_round;

        await client.query(
            `INSERT INTO psu_loan.document_review_history
                (document_id, review_round, old_status, new_status, remark, reviewed_by)
             VALUES ($1, $2, $3::psu_loan.document_review_status_code,
                     $4::psu_loan.document_review_status_code, $5, $6)`,
            [documentId, nextRound, oldStatus, newDocumentStatus, note || null, staffId]
        );

        // สรุปสถานะคำร้องทั้งใบใหม่ จากผลรวมของเอกสารทุกไฟล์ที่ต้องใช้
        // (ใช้ฟังก์ชันกลางร่วมกับตอนอัปโหลดเอกสาร ใน routes/document.js)
        const newApplicationStatus = await recalculateApplicationStatus(
            client,
            applicationId
        );

        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            message: "บันทึกผลการตรวจเอกสารเรียบร้อยแล้ว",
            data: { applicationStatus: newApplicationStatus },
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("PATCH document status error:", error);

        return res.status(500).json({
            success: false,
            message: "ไม่สามารถบันทึกผลการตรวจเอกสารได้",
        });
    } finally {
        client.release();
    }
});

/*
|--------------------------------------------------------------------------
| ประวัติการตรวจ/ตีกลับเอกสาร ทั้งหมดของ requirement เดียว — PostgreSQL จริง
|--------------------------------------------------------------------------
| GET /api/staff/students/:id/documents/:requirementId/history
|--------------------------------------------------------------------------
*/

router.get("/students/:id/documents/:requirementId/history", async (req, res) => {
    try {
        const applicationId = parsePositiveInteger(req.params.id);
        const requirementId = parsePositiveInteger(req.params.requirementId);

        if (!applicationId || !requirementId) {
            return res.status(400).json({
                success: false,
                message: "รหัสคำร้องหรือรหัสประเภทเอกสารไม่ถูกต้อง",
            });
        }

        const historyQuery = `
            SELECT
                drh.review_round AS "round",
                drh.old_status AS "oldStatus",
                drh.new_status AS "newStatus",
                drh.remark AS reason,
                drh.reviewed_at AS "reviewedAt",
                CONCAT_WS(' ', sf.prefix, sf.first_name, sf.last_name) AS "reviewedByName",
                ad.document_id AS "documentId",
                ad.version_no AS "versionNo",
                ad.original_file_name AS "originalFileName"
            FROM psu_loan.document_review_history drh
            JOIN psu_loan.application_documents ad ON ad.document_id = drh.document_id
            LEFT JOIN psu_loan.staff_profiles sf ON sf.staff_id = drh.reviewed_by
            WHERE ad.application_id = $1 AND ad.requirement_id = $2
            ORDER BY drh.review_round ASC
        `;

        const historyResult = await pool.query(historyQuery, [applicationId, requirementId]);

        const rejectionCount = historyResult.rows.filter(
            (row) => row.newStatus === "REVISION_REQUIRED"
        ).length;

        return res.status(200).json({
            success: true,
            total: historyResult.rowCount,
            rejectionCount,
            data: historyResult.rows,
        });
    } catch (error) {
        console.error("GET document history error:", error);

        return res.status(500).json({
            success: false,
            message: "ไม่สามารถโหลดประวัติการตรวจเอกสารได้",
        });
    }
});

/*
|--------------------------------------------------------------------------
| รายชื่อเจ้าหน้าที่ทั้งหมด — ใช้ทำ dropdown เลือกผู้ตรวจ
|--------------------------------------------------------------------------
| GET /api/staff/list
|--------------------------------------------------------------------------
*/

router.get("/list", async (req, res) => {
    try {
        const query = `
            SELECT
                staff_id AS "staffId",
                employee_code AS "employeeCode",
                CONCAT_WS(' ', prefix, first_name, last_name) AS "fullName",
                position,
                department
            FROM psu_loan.staff_profiles
            ORDER BY staff_id
        `;

        const result = await pool.query(query);

        return res.status(200).json({
            success: true,
            total: result.rowCount,
            data: result.rows,
        });
    } catch (error) {
        console.error("GET /api/staff/list error:", error);

        return res.status(500).json({
            success: false,
            message: "ไม่สามารถโหลดรายชื่อเจ้าหน้าที่ได้",
        });
    }
});

/*
|--------------------------------------------------------------------------
| แก้ไขเนื้อหาหน้าประชาสัมพันธ์ (banner + notice)
|--------------------------------------------------------------------------
| PUT /api/staff/home-content
|--------------------------------------------------------------------------
| Body: { bannerTitle, bannerSubtitle, bannerDescription, notice, staffId }
|--------------------------------------------------------------------------
*/

router.put("/home-content", async (req, res) => {
    try {
        const {
            bannerTitle,
            bannerSubtitle,
            bannerDescription,
            notice,
            staffId,
        } = req.body;

        if (!bannerTitle || !bannerSubtitle) {
            return res.status(400).json({
                success: false,
                message: "กรุณากรอกหัวข้อและคำอธิบายย่อยให้ครบ",
            });
        }

        const parsedStaffId = parsePositiveInteger(staffId);

        // มีแค่แถวเดียวเสมอ (singleton) — ถ้ายังไม่มีแถวเลยให้ insert
        // ถ้ามีแล้วให้ update แถวล่าสุด
        const existing = await pool.query(
            `SELECT content_id FROM psu_loan.home_content ORDER BY content_id DESC LIMIT 1`
        );

        if (existing.rowCount === 0) {
            await pool.query(
                `INSERT INTO psu_loan.home_content
                    (banner_title, banner_subtitle, banner_description, notice, updated_by)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    bannerTitle,
                    bannerSubtitle,
                    bannerDescription || "",
                    notice || "",
                    parsedStaffId,
                ]
            );
        } else {
            await pool.query(
                `UPDATE psu_loan.home_content
                 SET banner_title = $1,
                     banner_subtitle = $2,
                     banner_description = $3,
                     notice = $4,
                     updated_by = $5
                 WHERE content_id = $6`,
                [
                    bannerTitle,
                    bannerSubtitle,
                    bannerDescription || "",
                    notice || "",
                    parsedStaffId,
                    existing.rows[0].content_id,
                ]
            );
        }

        // ข้อความ popup "ยื่นเอกสารไม่สำเร็จ" (ส่งมาเมื่อไหร่ค่อยบันทึก)
        const popup = req.body.queueFailPopup;
        if (popup && typeof popup === "object") {
            const clean = {};
            for (const key of ["title", "noShow", "incomplete", "contact"]) {
                clean[key] = typeof popup[key] === "string" ? popup[key].trim().slice(0, 500) : "";
            }
            try {
                await pool.query(
                    `UPDATE psu_loan.home_content
                     SET queue_fail_popup = $1::jsonb
                     WHERE content_id = (SELECT content_id FROM psu_loan.home_content ORDER BY content_id DESC LIMIT 1)`,
                    [JSON.stringify(clean)]
                );
            } catch (error) {
                if (error.code === "42703") {
                    return res.status(500).json({
                        success: false,
                        message: "บันทึกหน้าหลักแล้ว แต่ยังบันทึกข้อความ popup ไม่ได้ กรุณารันไฟล์ add_queue_fail_popup_column.sql ในฐานข้อมูลก่อน",
                    });
                }
                throw error;
            }
        }

        return res.status(200).json({
            success: true,
            message: "บันทึกเนื้อหาหน้าประชาสัมพันธ์เรียบร้อยแล้ว",
        });
    } catch (error) {
        console.error("PUT /api/staff/home-content error:", error);

        return res.status(500).json({
            success: false,
            message: "ไม่สามารถบันทึกเนื้อหาหน้าประชาสัมพันธ์ได้",
        });
    }
});

/*
|--------------------------------------------------------------------------
| ช่วงเวลาเปิดรับยื่นกู้
|--------------------------------------------------------------------------
| GET   /api/staff/application-periods              — ดูทั้งหมด
| POST  /api/staff/application-periods              — สร้างเทอมใหม่เท่านั้น (ซ้ำ → 409)
| PUT   /api/staff/application-periods              — (ของเดิม) ทำงานเหมือน POST ไม่เขียนทับแล้ว
| PUT   /api/staff/application-periods/:id          — แก้ไขวันที่ของเทอมที่มีอยู่ (ล็อกปี+เทอม)
| PATCH /api/staff/application-periods/:id/toggle   — เปิด/ปิดด่วน
| PUT   /api/staff/application-periods/:id/queue-dates — กำหนด/แก้/ล้างวันจองคิว
|       ถ้าช่วงใหม่ตัดวันเดิมออก: มีผู้จอง → 409, ไม่มีผู้จอง → ปิดรอบในวันนั้นให้อัตโนมัติ
|--------------------------------------------------------------------------
*/

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isDateOnly(value) {
    if (typeof value !== "string" || !DATE_ONLY_RE.test(value)) return false;
    const d = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// วันนี้ตามเวลาไทย ใช้ใน SQL
const BANGKOK_TODAY_SQL = `(now() AT TIME ZONE 'Asia/Bangkok')::date`;

const PERIOD_COLUMNS = `
    period_id AS "periodId",
    academic_year AS "academicYear",
    semester,
    TO_CHAR(start_date, 'YYYY-MM-DD') AS "startDate",
    TO_CHAR(end_date, 'YYYY-MM-DD') AS "endDate",
    TO_CHAR(queue_start_date, 'YYYY-MM-DD') AS "queueStartDate",
    TO_CHAR(queue_end_date, 'YYYY-MM-DD') AS "queueEndDate",
    is_open AS "isOpen"`;

router.get("/application-periods", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ${PERIOD_COLUMNS}
             FROM psu_loan.application_periods
             ORDER BY academic_year DESC, semester ASC`
        );

        return res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error("GET /api/staff/application-periods error:", error);
        return res.status(500).json({
            success: false,
            message: "ไม่สามารถโหลดช่วงเวลาเปิดรับยื่นกู้ได้",
        });
    }
});

/*
| สร้างเทอมใหม่ — ถ้าปี+เทอมนี้มีอยู่แล้ว ไม่เขียนทับ ตอบ 409 พร้อมวันที่เดิม
| Body: { academicYear, semester, startDate, endDate, isOpen }
*/
async function createApplicationPeriod(req, res) {
    try {
        const academicYear = String(req.body.academicYear ?? "").trim();
        const semester = Number(req.body.semester);
        const { startDate, endDate, isOpen } = req.body;

        if (!/^\d{4}$/.test(academicYear) || ![1, 2].includes(semester)) {
            return res.status(400).json({
                success: false,
                message: "กรุณาระบุปีการศึกษา (4 หลัก) และภาคเรียน (1 หรือ 2) ให้ถูกต้อง",
            });
        }

        if (!isDateOnly(startDate) || !isDateOnly(endDate)) {
            return res.status(400).json({
                success: false,
                message: "กรุณาเลือกวันเปิดและวันปิดรับให้ครบ",
            });
        }

        if (endDate < startDate) {
            return res.status(400).json({
                success: false,
                message: "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม",
            });
        }

        const inserted = await pool.query(
            `INSERT INTO psu_loan.application_periods
                (academic_year, semester, start_date, end_date, is_open)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (academic_year, semester) DO NOTHING
             RETURNING ${PERIOD_COLUMNS}`,
            [academicYear, semester, startDate, endDate, isOpen !== false]
        );

        if (inserted.rowCount === 0) {
            const existing = await pool.query(
                `SELECT ${PERIOD_COLUMNS}
                 FROM psu_loan.application_periods
                 WHERE academic_year = $1 AND semester = $2`,
                [academicYear, semester]
            );
            const p = existing.rows[0];

            return res.status(409).json({
                success: false,
                code: "PERIOD_EXISTS",
                message: `ภาคเรียนที่ ${semester}/${academicYear} มีวันที่อยู่แล้ว (${p?.startDate} ถึง ${p?.endDate}) บันทึกซ้ำไม่ได้ กรุณาใช้การแก้ไขแทน`,
                data: p || null,
            });
        }

        return res.status(201).json({
            success: true,
            message: "เพิ่มช่วงเวลาเปิดรับยื่นกู้เรียบร้อยแล้ว",
            data: inserted.rows[0],
        });
    } catch (error) {
        console.error("POST /api/staff/application-periods error:", error);
        return res.status(500).json({
            success: false,
            message: "ไม่สามารถบันทึกช่วงเวลาเปิดรับยื่นกู้ได้",
        });
    }
}

router.post("/application-periods", createApplicationPeriod);
// เส้นเดิมที่ frontend ใช้อยู่ — เปลี่ยนจาก upsert เป็น "สร้างเท่านั้น" กันเขียนทับ
router.put("/application-periods", createApplicationPeriod);

/*
| แก้ไขวันที่ของเทอมที่มีอยู่ — ปี+เทอมเปลี่ยนไม่ได้
| Body: { startDate, endDate, isOpen? }
*/
router.put("/application-periods/:id", async (req, res) => {
    try {
        const periodId = parsePositiveInteger(req.params.id);
        const { startDate, endDate } = req.body;

        if (!periodId) {
            return res.status(400).json({ success: false, message: "รหัสช่วงเวลาไม่ถูกต้อง" });
        }

        if (!isDateOnly(startDate) || !isDateOnly(endDate)) {
            return res.status(400).json({
                success: false,
                message: "กรุณาเลือกวันเปิดและวันปิดรับให้ครบ",
            });
        }

        if (endDate < startDate) {
            return res.status(400).json({
                success: false,
                message: "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม",
            });
        }

        // isOpen ไม่ส่งมา = คงค่าเดิม
        const isOpen = typeof req.body.isOpen === "boolean" ? req.body.isOpen : null;

        const result = await pool.query(
            `UPDATE psu_loan.application_periods
             SET start_date = $1,
                 end_date = $2,
                 is_open = COALESCE($3, is_open)
             WHERE period_id = $4
             RETURNING ${PERIOD_COLUMNS}`,
            [startDate, endDate, isOpen, periodId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "ไม่พบช่วงเวลานี้" });
        }

        return res.status(200).json({
            success: true,
            message: "แก้ไขช่วงเวลาเปิดรับยื่นกู้เรียบร้อยแล้ว",
            data: result.rows[0],
        });
    } catch (error) {
        console.error("PUT /api/staff/application-periods/:id error:", error);
        return res.status(500).json({
            success: false,
            message: "ไม่สามารถแก้ไขช่วงเวลาเปิดรับยื่นกู้ได้",
        });
    }
});

router.patch("/application-periods/:id/toggle", async (req, res) => {
    try {
        const periodId = parsePositiveInteger(req.params.id);

        if (!periodId) {
            return res.status(400).json({ success: false, message: "รหัสช่วงเวลาไม่ถูกต้อง" });
        }

        const result = await pool.query(
            `UPDATE psu_loan.application_periods
             SET is_open = NOT is_open
             WHERE period_id = $1
             RETURNING is_open AS "isOpen"`,
            [periodId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "ไม่พบช่วงเวลานี้" });
        }

        return res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error("PATCH /api/staff/application-periods/:id/toggle error:", error);
        return res.status(500).json({
            success: false,
            message: "ไม่สามารถเปลี่ยนสถานะช่วงเวลาได้",
        });
    }
});

/*
| Body: { "queueStartDate": "2026-10-20", "queueEndDate": "2026-10-31" }
| ส่ง null ทั้งคู่ = ล้างวันจองคิว
|
| วันที่ "หลุดออก" = อยู่ในช่วงเดิม แต่ไม่อยู่ในช่วงใหม่ (ล้าง = หลุดทั้งช่วง)
| นับเฉพาะวันนี้เป็นต้นไป (วันที่ผ่านแล้วไม่แตะ)
|   - มีผู้จอง (BOOKED / CHECKED_IN) ในวันที่หลุด → 409 ไม่บันทึก
|   - ไม่มีผู้จอง → บันทึก แล้วปิดรอบที่ยังเปิดอยู่ในวันที่หลุด
| ทำใน transaction เดียว กันคนจองแทรกระหว่างเช็กกับบันทึก
*/
router.put("/application-periods/:id/queue-dates", async (req, res) => {
    const periodId = parsePositiveInteger(req.params.id);

    if (!periodId) {
        return res.status(400).json({ success: false, message: "รหัสช่วงเวลาไม่ถูกต้อง" });
    }

    const queueStartDate = req.body.queueStartDate || null;
    const queueEndDate = req.body.queueEndDate || null;

    if (Boolean(queueStartDate) !== Boolean(queueEndDate)) {
        return res.status(400).json({
            success: false,
            message: "กรุณาเลือกวันเปิดและวันปิดจองคิวให้ครบทั้งคู่",
        });
    }

    if (queueStartDate && (!isDateOnly(queueStartDate) || !isDateOnly(queueEndDate))) {
        return res.status(400).json({ success: false, message: "รูปแบบวันที่ไม่ถูกต้อง" });
    }

    if (queueStartDate && queueEndDate < queueStartDate) {
        return res.status(400).json({
            success: false,
            message: "วันปิดจองคิวต้องไม่ก่อนวันเปิดจองคิว",
        });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const periodResult = await client.query(
            `SELECT TO_CHAR(queue_start_date, 'YYYY-MM-DD') AS old_start,
                    TO_CHAR(queue_end_date, 'YYYY-MM-DD') AS old_end
             FROM psu_loan.application_periods
             WHERE period_id = $1
             FOR UPDATE`,
            [periodId]
        );

        if (periodResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "ไม่พบช่วงเวลานี้" });
        }

        const { old_start: oldStart, old_end: oldEnd } = periodResult.rows[0];
        let closedSlots = 0;

        if (oldStart && oldEnd) {
            // เงื่อนไข "วันที่หลุดออก" ใช้ร่วมกันทั้งตอนเช็กผู้จองและตอนปิดรอบ
            const droppedParams = [oldStart, oldEnd, queueStartDate, queueEndDate];
            const droppedWhere = `
                qs.queue_date BETWEEN $1::date AND $2::date
                AND qs.queue_date >= ${BANGKOK_TODAY_SQL}
                AND ($3::date IS NULL OR qs.queue_date < $3::date OR qs.queue_date > $4::date)`;

            // ล็อกรอบในวันที่หลุด กันนักศึกษาจองแทรก
            await client.query(
                `SELECT qs.slot_id FROM psu_loan.queue_slots qs
                 WHERE ${droppedWhere}
                 FOR UPDATE`,
                droppedParams
            );

            const bookedResult = await client.query(
                `SELECT COUNT(qb.booking_id)::int AS booked,
                        COUNT(DISTINCT qs.queue_date)::int AS days
                 FROM psu_loan.queue_slots qs
                 JOIN psu_loan.queue_bookings qb ON qb.slot_id = qs.slot_id
                 WHERE qb.booking_status IN ('BOOKED', 'CHECKED_IN')
                   AND ${droppedWhere}`,
                droppedParams
            );
            const { booked, days } = bookedResult.rows[0];

            if (booked > 0) {
                await client.query("ROLLBACK");
                return res.status(409).json({
                    success: false,
                    code: "DROPPED_DAYS_HAVE_BOOKINGS",
                    message: queueStartDate
                        ? `วันที่จะถูกตัดออกจากช่วงจองมีผู้จองแล้ว ${booked} คน (${days} วัน) เปลี่ยนช่วงวันแบบนี้ไม่ได้ กรุณาเลือกช่วงที่ครอบคลุมวันเหล่านั้น`
                        : `มีผู้จองแล้ว ${booked} คน ล้างวันจองคิวไม่ได้`,
                });
            }

            const closeResult = await client.query(
                `UPDATE psu_loan.queue_slots qs
                 SET slot_status = 'CLOSED'
                 WHERE qs.slot_status = 'OPEN'
                   AND ${droppedWhere}`,
                droppedParams
            );
            closedSlots = closeResult.rowCount;
        }

        await client.query(
            `UPDATE psu_loan.application_periods
             SET queue_start_date = $1,
                 queue_end_date = $2
             WHERE period_id = $3`,
            [queueStartDate, queueEndDate, periodId]
        );

        await client.query("COMMIT");

        const base = queueStartDate ? "บันทึกวันจองคิวเรียบร้อยแล้ว" : "ล้างวันจองคิวเรียบร้อยแล้ว";

        return res.status(200).json({
            success: true,
            message: closedSlots > 0 ? `${base} (ปิดรอบเวลานอกช่วงใหม่ ${closedSlots} รอบ)` : base,
            data: { periodId, closedSlots },
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("PUT /api/staff/application-periods/:id/queue-dates error:", error);
        return res.status(500).json({
            success: false,
            message: "ไม่สามารถบันทึกวันจองคิวได้",
        });
    } finally {
        client.release();
    }
});

/*
|--------------------------------------------------------------------------
| รายงานผลการตรวจสอบเอกสาร (หน้ารายงานเจ้าหน้าที่)
|--------------------------------------------------------------------------
| GET /api/staff/report                         → ภาคเรียนล่าสุด
| GET /api/staff/report?academicYear=2569&semester=1
| GET /api/staff/report?scope=all               → ทุกภาคเรียน
|--------------------------------------------------------------------------
| สถานะต่อคำร้อง 1 ใบ (ไม่นับคำร้องที่ยกเลิก / ไม่ผ่านคัดกรอง):
|   approved = เอกสารผ่านแล้ว (DOCUMENT_APPROVED ขึ้นไป)
|   revise   = ถูกส่งกลับแก้ไข (REVISION_REQUIRED)
|   pending  = ส่งเอกสารครบแล้ว รอเจ้าหน้าที่ตรวจ
|   missing  = ยังส่งเอกสารไม่ครบ
|--------------------------------------------------------------------------
*/

const REPORT_APPROVED_CODES = [
    "DOCUMENT_APPROVED",
    "QUEUE_BOOKED",
    "SIGNED",
    "CENTRAL_SUBMITTED",
    "COMPLETED",
];

function reportStatusOf(row) {
    if (REPORT_APPROVED_CODES.includes(row.application_status)) return "approved";
    if (row.application_status === "REVISION_REQUIRED") return "revise";
    if (row.required_count > 0 && row.uploaded_count >= row.required_count) return "pending";
    return "missing";
}

router.get("/report", async (req, res) => {
    try {
        const termsResult = await pool.query(
            `SELECT DISTINCT academic_year::text AS "academicYear", semester
             FROM psu_loan.applications
             ORDER BY 1 DESC, 2 DESC`
        );
        const terms = termsResult.rows;

        // เลือกภาคเรียน: ส่งมา → ใช้ตามนั้น, scope=all → ทุกภาค, ไม่ส่ง → ภาคล่าสุด
        let term = null;
        if (req.query.scope !== "all") {
            const year = typeof req.query.academicYear === "string" ? req.query.academicYear.trim() : "";
            const semester = parsePositiveInteger(req.query.semester);
            if (year && semester) {
                term = { academicYear: year, semester };
            } else if (terms.length > 0) {
                term = { academicYear: terms[0].academicYear, semester: Number(terms[0].semester) };
            }
        }

        const params = [term?.academicYear ?? null, term?.semester ?? null];

        const rowsResult = await pool.query(
            `WITH base AS (
                SELECT
                    a.application_id,
                    a.application_status,
                    a.submitted_at,
                    a.academic_year,
                    a.semester,
                    a.loan_type_id,
                    sp.student_code,
                    CONCAT_WS(' ',
                        NULLIF(BTRIM(sp.prefix), ''),
                        NULLIF(BTRIM(sp.first_name), ''),
                        NULLIF(BTRIM(sp.last_name), '')
                    ) AS full_name,
                    -- ตัดคำว่า "คณะ" ข้างหน้าออก ให้ "คณะวิทยาศาสตร์" กับ "วิทยาศาสตร์" รวมเป็นคณะเดียวกัน
                    COALESCE(
                        NULLIF(BTRIM(REGEXP_REPLACE(BTRIM(sp.faculty), '^คณะ\s*', '')), ''),
                        'ไม่ระบุคณะ'
                    ) AS faculty,
                    lt.loan_type_name,
                    EXTRACT(YEAR FROM AGE(CURRENT_DATE, sp.birth_date))::int AS age
                FROM psu_loan.applications a
                JOIN psu_loan.student_profiles sp ON sp.student_id = a.student_id
                JOIN psu_loan.loan_types lt ON lt.loan_type_id = a.loan_type_id
                WHERE a.application_status NOT IN ('CANCELLED', 'ELIGIBILITY_FAILED')
                  AND ($1::text IS NULL OR a.academic_year::text = $1::text)
                  AND ($2::int IS NULL OR a.semester = $2::int)
            )
            SELECT
                b.*,
                req.cnt AS required_count,
                up.cnt AS uploaded_count,
                up.last_upload,
                rev.remark AS revise_remark
            FROM base b
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS cnt
                FROM psu_loan.document_requirements dr
                WHERE dr.loan_type_id = b.loan_type_id
                  AND dr.academic_year = b.academic_year
                  AND dr.semester = b.semester
                  AND dr.is_active = TRUE
                  AND (dr.min_age IS NULL OR dr.min_age <= b.age)
                  AND (dr.max_age IS NULL OR dr.max_age >= b.age)
            ) req ON TRUE
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS cnt, MAX(ad.uploaded_at) AS last_upload
                FROM psu_loan.application_documents ad
                WHERE ad.application_id = b.application_id AND ad.is_current = TRUE
            ) up ON TRUE
            LEFT JOIN LATERAL (
                SELECT ad.latest_remark AS remark
                FROM psu_loan.application_documents ad
                WHERE ad.application_id = b.application_id
                  AND ad.is_current = TRUE
                  AND ad.review_status = 'REVISION_REQUIRED'
                  AND NULLIF(BTRIM(ad.latest_remark), '') IS NOT NULL
                ORDER BY ad.reviewed_at DESC NULLS LAST
                LIMIT 1
            ) rev ON TRUE
            ORDER BY COALESCE(up.last_upload, b.submitted_at) DESC NULLS LAST`,
            params
        );

        const rows = rowsResult.rows.map((r) => {
            const status = reportStatusOf(r);
            let note = "-";
            if (status === "revise") note = r.revise_remark || "ส่งกลับแก้ไข";
            if (status === "missing") note = `ส่งแล้ว ${r.uploaded_count}/${r.required_count} รายการ`;
            return {
                applicationId: Number(r.application_id),
                studentCode: r.student_code,
                name: r.full_name,
                faculty: r.faculty,
                loanType: r.loan_type_name,
                term: `${r.semester}/${r.academic_year}`,
                status,
                submittedAt: r.last_upload || r.submitted_at || null,
                uploaded: r.uploaded_count,
                required: r.required_count,
                note,
            };
        });

        // การตีกลับทุกครั้งในภาคที่เลือก แยกตาม "ประเภทเอกสาร" และ "เหตุผล"
        const rejectFrom = `
             FROM psu_loan.document_review_history drh
             JOIN psu_loan.application_documents ad ON ad.document_id = drh.document_id
             JOIN psu_loan.applications a ON a.application_id = ad.application_id
             JOIN psu_loan.document_requirements dr ON dr.requirement_id = ad.requirement_id
             JOIN psu_loan.document_types dt ON dt.document_type_id = dr.document_type_id
             WHERE drh.new_status = 'REVISION_REQUIRED'
               AND a.application_status <> 'CANCELLED'
               AND ($1::text IS NULL OR a.academic_year::text = $1::text)
               AND ($2::int IS NULL OR a.semester = $2::int)`;

        const [rejectedDocumentsResult, rejectReasonsResult] = await Promise.all([
            pool.query(
                `SELECT dt.document_name AS name, COUNT(*)::int AS count
                 ${rejectFrom}
                 GROUP BY dt.document_name
                 ORDER BY count DESC, name`,
                params
            ),
            pool.query(
                `SELECT COALESCE(NULLIF(BTRIM(drh.remark), ''), 'ไม่ระบุเหตุผล') AS name,
                        COUNT(*)::int AS count
                 ${rejectFrom}
                 GROUP BY 1
                 ORDER BY count DESC, name`,
                params
            ),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                terms: terms.map((t) => ({ academicYear: t.academicYear, semester: Number(t.semester) })),
                term,
                rows,
                rejectedDocuments: rejectedDocumentsResult.rows,
                rejectReasons: rejectReasonsResult.rows,
                generatedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error("GET /api/staff/report error:", error);
        return res.status(500).json({
            success: false,
            message: "ไม่สามารถโหลดข้อมูลรายงานได้",
        });
    }
});

/*
|--------------------------------------------------------------------------
| จัดการรอบเวลายื่นเอกสาร (หน้าจัดการคิวเจ้าหน้าที่)
|--------------------------------------------------------------------------
| GET /api/staff/queue-slots?from=YYYY-MM-DD&to=YYYY-MM-DD
| PUT /api/staff/queue-slots
|--------------------------------------------------------------------------
*/

const staffOnly = [requireLogin, requireRole("STAFF", "ADMIN")];

function sendQueueError(res, error, fallbackMessage, logLabel) {
    if (!error.status) console.error(logLabel, error);
    return res.status(error.status || 500).json({
        success: false,
        code: error.code,
        message: error.status ? error.message : fallbackMessage,
    });
}

router.get("/queue-slots", staffOnly, async (req, res) => {
    try {
        const data = await staffQueueService.getSchedule({ from: req.query.from, to: req.query.to });
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return sendQueueError(res, error, "ไม่สามารถโหลดรอบเวลาได้", "GET /api/staff/queue-slots error:");
    }
});

router.put("/queue-slots", staffOnly, async (req, res) => {
    try {
        const data = await staffQueueService.saveSchedule({
            from: req.body.from,
            to: req.body.to,
            days: req.body.days,
            staffId: req.user.userId, // มาจาก token ของเจ้าหน้าที่ที่ login
        });
        return res.status(200).json({ success: true, message: "บันทึกรอบเวลาเรียบร้อยแล้ว", data });
    } catch (error) {
        return sendQueueError(res, error, "ไม่สามารถบันทึกรอบเวลาได้", "PUT /api/staff/queue-slots error:");
    }
});

/*
|--------------------------------------------------------------------------
| หน้าจัดการคิว: ดูคิวรายวัน + บันทึกการมา + ตรวจเอกสารฉบับจริง
|--------------------------------------------------------------------------
| GET   /api/staff/queue-board?periodId=          วันและรอบในช่วงจองของเทอม + ยอดแต่ละสถานะ
| GET   /api/staff/queue-board/slots/:slotId      รายชื่อนักศึกษาในรอบนั้น
| PATCH /api/staff/queue-bookings/:id/attendance  { attended: true | false }
| PATCH /api/staff/queue-bookings/:id/documents   { complete: true | false, remark }
|--------------------------------------------------------------------------
| สถานะ:
|   มา       → queue_bookings.booking_status = CHECKED_IN
|   ไม่มา    → NO_SHOW
|   เอกสารครบ   → booking COMPLETED, signing_records SIGNED, applications → SIGNED
|   เอกสารไม่ครบ → booking COMPLETED, signing_records FAILED (+เหตุผล)
|                 ฝั่งนักศึกษาจะขึ้น "เอกสารส่งไม่สำเร็จ" และ popup ให้ติดต่อเจ้าหน้าที่
|--------------------------------------------------------------------------
*/

const BOARD_TODAY_SQL = `(now() AT TIME ZONE 'Asia/Bangkok')::date`;

function boardError(status, message, code) {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    return error;
}

// แปลง error จาก trigger ของ DB เป็นข้อความที่เจ้าหน้าที่เข้าใจ
function translateQueueDbError(error) {
    const msg = error?.message || "";
    if (/Queue slot \d+ is not open/.test(msg)) {
        return boardError(409, "รอบนี้ถูกปิดอยู่ ระบบจึงบันทึกการมาไม่ได้ กรุณาเปิดรอบนี้ในหน้าตั้งค่าก่อน", "SLOT_CLOSED");
    }
    if (/Queue slot \d+ is full/.test(msg)) {
        return boardError(409, "รอบนี้เต็มแล้ว", "SLOT_FULL");
    }
    return error;
}

router.get("/queue-board", staffOnly, async (req, res) => {
    try {
        const periodsResult = await pool.query(
            `SELECT period_id AS "periodId", academic_year AS "academicYear", semester,
                    TO_CHAR(queue_start_date, 'YYYY-MM-DD') AS "queueStartDate",
                    TO_CHAR(queue_end_date, 'YYYY-MM-DD') AS "queueEndDate",
                    (${BOARD_TODAY_SQL} BETWEEN queue_start_date AND queue_end_date) AS "isCurrent",
                    (queue_start_date > ${BOARD_TODAY_SQL}) AS "isUpcoming"
             FROM psu_loan.application_periods
             WHERE queue_start_date IS NOT NULL AND queue_end_date IS NOT NULL
             ORDER BY queue_start_date DESC`
        );
        const periods = periodsResult.rows;

        // เลือกเทอม: ที่ส่งมา > เทอมที่อยู่ในช่วงจองวันนี้ > เทอมที่ใกล้จะถึง > เทอมล่าสุด
        const requestedId = parsePositiveInteger(req.query.periodId);
        const upcoming = periods.filter((p) => p.isUpcoming).sort((a, b) => a.queueStartDate.localeCompare(b.queueStartDate));
        const period =
            periods.find((p) => Number(p.periodId) === requestedId) ||
            periods.find((p) => p.isCurrent) ||
            upcoming[0] ||
            periods[0] ||
            null;

        let slots = [];
        if (period) {
            const slotsResult = await pool.query(
                `SELECT qs.slot_id AS "slotId",
                        qs.queue_date::text AS date,
                        TO_CHAR(qs.start_time, 'HH24:MI') AS start,
                        TO_CHAR(qs.end_time, 'HH24:MI') AS "end",
                        qs.capacity,
                        qs.slot_status AS status,
                        qs.location,
                        COALESCE(qs.location_detail, '') AS detail,
                        COUNT(qb.booking_id) FILTER (WHERE qb.booking_status = 'BOOKED')::int AS waiting,
                        COUNT(qb.booking_id) FILTER (WHERE qb.booking_status = 'CHECKED_IN')::int AS "checkedIn",
                        COUNT(qb.booking_id) FILTER (WHERE qb.booking_status = 'NO_SHOW')::int AS "noShow",
                        COUNT(qb.booking_id) FILTER (WHERE qb.booking_status = 'COMPLETED' AND sr.signing_status = 'FAILED')::int AS failed,
                        COUNT(qb.booking_id) FILTER (WHERE qb.booking_status = 'COMPLETED' AND COALESCE(sr.signing_status::text, '') <> 'FAILED')::int AS completed
                 FROM psu_loan.queue_slots qs
                 LEFT JOIN psu_loan.queue_bookings qb
                        ON qb.slot_id = qs.slot_id AND qb.booking_status <> 'CANCELLED'
                 LEFT JOIN psu_loan.signing_records sr ON sr.booking_id = qb.booking_id
                 WHERE qs.queue_date BETWEEN $1::date AND $2::date
                   AND qs.slot_status <> 'CANCELLED'
                 GROUP BY qs.slot_id
                 ORDER BY qs.queue_date, qs.start_time`,
                [period.queueStartDate, period.queueEndDate]
            );
            slots = slotsResult.rows.map((s) => ({
                ...s,
                slotId: Number(s.slotId),
                total: s.waiting + s.checkedIn + s.noShow + s.failed + s.completed,
            }));
        }

        const todayResult = await pool.query(`SELECT ${BOARD_TODAY_SQL}::text AS today`);

        return res.status(200).json({
            success: true,
            data: {
                today: todayResult.rows[0].today,
                periods: periods.map((p) => ({
                    periodId: Number(p.periodId),
                    label: `ภาคเรียนที่ ${p.semester}/${p.academicYear}`,
                    queueStartDate: p.queueStartDate,
                    queueEndDate: p.queueEndDate,
                })),
                period: period
                    ? {
                        periodId: Number(period.periodId),
                        label: `ภาคเรียนที่ ${period.semester}/${period.academicYear}`,
                        queueStartDate: period.queueStartDate,
                        queueEndDate: period.queueEndDate,
                    }
                    : null,
                slots,
            },
        });
    } catch (error) {
        return sendQueueError(res, error, "ไม่สามารถโหลดข้อมูลคิวได้", "GET /api/staff/queue-board error:");
    }
});

const BOARD_BOOKING_SELECT = `
    SELECT qb.booking_id AS "bookingId",
           qb.application_id AS "applicationId",
           qb.booking_status AS "bookingStatus",
           qb.booked_at AS "bookedAt",
           qb.checked_in_at AS "checkedInAt",
           sp.student_code AS "studentCode",
           CONCAT_WS(' ', NULLIF(BTRIM(sp.prefix), ''), NULLIF(BTRIM(sp.first_name), ''), NULLIF(BTRIM(sp.last_name), '')) AS name,
           sp.faculty,
           sp.phone,
           lt.loan_type_name AS "loanType",
           a.application_status AS "applicationStatus",
           sr.signing_status AS "signingStatus",
           sr.remark AS "signingRemark",
           sr.verified_at AS "verifiedAt"
    FROM psu_loan.queue_bookings qb
    JOIN psu_loan.applications a ON a.application_id = qb.application_id
    JOIN psu_loan.student_profiles sp ON sp.student_id = a.student_id
    JOIN psu_loan.loan_types lt ON lt.loan_type_id = a.loan_type_id
    LEFT JOIN psu_loan.signing_records sr ON sr.booking_id = qb.booking_id`;

const toBoardBooking = (r) => ({ ...r, bookingId: Number(r.bookingId), applicationId: Number(r.applicationId) });

router.get("/queue-board/slots/:slotId", staffOnly, async (req, res) => {
    try {
        const slotId = parsePositiveInteger(req.params.slotId);
        if (!slotId) throw boardError(400, "รหัสรอบเวลาไม่ถูกต้อง", "BAD_REQUEST");

        const slotResult = await pool.query(
            `SELECT slot_id AS "slotId", queue_date::text AS date,
                    TO_CHAR(start_time, 'HH24:MI') AS start, TO_CHAR(end_time, 'HH24:MI') AS "end",
                    capacity, slot_status AS status, location, COALESCE(location_detail, '') AS detail
             FROM psu_loan.queue_slots WHERE slot_id = $1`,
            [slotId]
        );
        if (slotResult.rowCount === 0) throw boardError(404, "ไม่พบรอบเวลานี้", "SLOT_NOT_FOUND");

        const bookingsResult = await pool.query(
            `${BOARD_BOOKING_SELECT}
             WHERE qb.slot_id = $1 AND qb.booking_status <> 'CANCELLED'
             ORDER BY qb.booked_at`,
            [slotId]
        );

        return res.status(200).json({
            success: true,
            data: {
                slot: { ...slotResult.rows[0], slotId: Number(slotResult.rows[0].slotId) },
                bookings: bookingsResult.rows.map(toBoardBooking),
            },
        });
    } catch (error) {
        return sendQueueError(res, error, "ไม่สามารถโหลดรายชื่อนักศึกษาได้", "GET /api/staff/queue-board/slots/:slotId error:");
    }
});

// โหลดการจอง 1 รายการพร้อมล็อก ใช้ร่วมกันทั้งบันทึกการมาและผลเอกสาร
async function lockBoardBooking(client, bookingId) {
    const result = await client.query(
        `SELECT qb.booking_id, qb.application_id, qb.booking_status,
                qs.queue_date::text AS queue_date,
                (qs.queue_date > ${BOARD_TODAY_SQL}) AS is_future
         FROM psu_loan.queue_bookings qb
         JOIN psu_loan.queue_slots qs ON qs.slot_id = qb.slot_id
         WHERE qb.booking_id = $1
         FOR UPDATE OF qb`,
        [bookingId]
    );
    if (result.rowCount === 0) throw boardError(404, "ไม่พบการจองนี้", "BOOKING_NOT_FOUND");
    return result.rows[0];
}

async function readBoardBooking(client, bookingId) {
    const result = await client.query(`${BOARD_BOOKING_SELECT} WHERE qb.booking_id = $1`, [bookingId]);
    return toBoardBooking(result.rows[0]);
}

router.patch("/queue-bookings/:id/attendance", staffOnly, async (req, res) => {
    const bookingId = parsePositiveInteger(req.params.id);
    if (!bookingId) return res.status(400).json({ success: false, message: "รหัสการจองไม่ถูกต้อง" });
    if (typeof req.body.attended !== "boolean") {
        return res.status(400).json({ success: false, message: "กรุณาระบุว่านักศึกษามาหรือไม่มา" });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const booking = await lockBoardBooking(client, bookingId);

        if (booking.booking_status === "CANCELLED") {
            throw boardError(409, "การจองนี้ถูกยกเลิกแล้ว", "BOOKING_CANCELLED");
        }
        if (booking.booking_status === "COMPLETED") {
            throw boardError(409, "บันทึกผลตรวจเอกสารของนักศึกษาคนนี้ไปแล้ว เปลี่ยนการมาไม่ได้", "ALREADY_COMPLETED");
        }
        if (booking.is_future) {
            throw boardError(409, "ยังไม่ถึงวันนัด บันทึกการมาไม่ได้", "NOT_YET");
        }

        if (req.body.attended) {
            await client.query(
                `UPDATE psu_loan.queue_bookings
                 SET booking_status = 'CHECKED_IN', checked_in_at = COALESCE(checked_in_at, CURRENT_TIMESTAMP)
                 WHERE booking_id = $1`,
                [bookingId]
            );
        } else {
            await client.query(
                `UPDATE psu_loan.queue_bookings
                 SET booking_status = 'NO_SHOW', checked_in_at = NULL
                 WHERE booking_id = $1`,
                [bookingId]
            );
        }

        const data = await readBoardBooking(client, bookingId);
        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            message: req.body.attended ? "บันทึกว่านักศึกษามาแล้ว" : "บันทึกว่านักศึกษาไม่มา",
            data,
        });
    } catch (error) {
        await client.query("ROLLBACK");
        return sendQueueError(res, translateQueueDbError(error), "ไม่สามารถบันทึกการมาได้", "PATCH attendance error:");
    } finally {
        client.release();
    }
});

router.patch("/queue-bookings/:id/documents", staffOnly, async (req, res) => {
    const bookingId = parsePositiveInteger(req.params.id);
    if (!bookingId) return res.status(400).json({ success: false, message: "รหัสการจองไม่ถูกต้อง" });
    if (typeof req.body.complete !== "boolean") {
        return res.status(400).json({ success: false, message: "กรุณาระบุว่าเอกสารครบถ้วนหรือไม่" });
    }

    const complete = req.body.complete;
    const remark = typeof req.body.remark === "string" ? req.body.remark.trim().slice(0, 500) : "";
    if (!complete && !remark) {
        return res.status(400).json({ success: false, message: "กรุณาระบุว่าเอกสารไม่ครบเพราะอะไร" });
    }

    const staffId = req.user.userId;
    const client = await pool.connect();
    try {
        const staff = await client.query(`SELECT 1 FROM psu_loan.staff_profiles WHERE staff_id = $1`, [staffId]);
        if (staff.rowCount === 0) {
            throw boardError(403, "บัญชีนี้ไม่มีข้อมูลเจ้าหน้าที่ในระบบ จึงบันทึกผลตรวจเอกสารไม่ได้", "NOT_STAFF");
        }

        await client.query("BEGIN");
        const booking = await lockBoardBooking(client, bookingId);

        if (!["CHECKED_IN", "COMPLETED"].includes(booking.booking_status)) {
            throw boardError(409, "ต้องบันทึกว่านักศึกษามาก่อน จึงจะตรวจเอกสารได้", "NOT_CHECKED_IN");
        }

        const appResult = await client.query(
            `SELECT application_status FROM psu_loan.applications WHERE application_id = $1 FOR UPDATE`,
            [booking.application_id]
        );
        const appStatus = appResult.rows[0].application_status;

        // ผลตรวจเอกสาร 1 คำร้องมีได้ 1 แถว (unique application_id) → เขียนทับด้วยผลล่าสุด
        await client.query(
            `INSERT INTO psu_loan.signing_records
                (application_id, booking_id, signing_status, original_documents_verified,
                 verified_by, verified_at, signed_at, remark)
             VALUES ($1, $2, $3::psu_loan.signing_status_code, $4, $5, CURRENT_TIMESTAMP,
                     CASE WHEN $4 THEN CURRENT_TIMESTAMP ELSE NULL END, $6)
             ON CONFLICT (application_id) DO UPDATE SET
                booking_id = EXCLUDED.booking_id,
                signing_status = EXCLUDED.signing_status,
                original_documents_verified = EXCLUDED.original_documents_verified,
                verified_by = EXCLUDED.verified_by,
                verified_at = EXCLUDED.verified_at,
                signed_at = EXCLUDED.signed_at,
                remark = EXCLUDED.remark`,
            [booking.application_id, bookingId, complete ? "SIGNED" : "FAILED", complete, staffId, remark || null]
        );

        await client.query(
            `UPDATE psu_loan.queue_bookings SET booking_status = 'COMPLETED' WHERE booking_id = $1`,
            [bookingId]
        );

        // สถานะคำร้อง: ครบ → SIGNED, ไม่ครบ → คงไว้ที่ QUEUE_BOOKED (ถ้าเคยเป็น SIGNED ให้ถอยกลับ)
        let nextStatus = null;
        if (complete && ["DOCUMENT_APPROVED", "QUEUE_BOOKED"].includes(appStatus)) nextStatus = "SIGNED";
        if (!complete && appStatus === "SIGNED") nextStatus = "QUEUE_BOOKED";

        if (nextStatus) {
            await client.query(
                `UPDATE psu_loan.applications
                 SET application_status = $1::psu_loan.application_status_code
                 WHERE application_id = $2`,
                [nextStatus, booking.application_id]
            );
            // ใส่หมายเหตุ + ผู้บันทึก ในแถวประวัติที่ trigger เพิ่งสร้าง
            await client.query(
                `UPDATE psu_loan.application_status_history
                 SET remark = $1, changed_by = $2
                 WHERE status_history_id = (
                     SELECT status_history_id FROM psu_loan.application_status_history
                     WHERE application_id = $3 ORDER BY changed_at DESC, status_history_id DESC LIMIT 1
                 )`,
                [complete ? "ยื่นเอกสารฉบับจริงครบถ้วน" : `เอกสารส่งไม่สำเร็จ: ${remark}`, staffId, booking.application_id]
            );
        }

        const data = await readBoardBooking(client, bookingId);
        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            message: complete ? "บันทึกว่าเอกสารครบถ้วนแล้ว" : "บันทึกว่าเอกสารไม่ครบถ้วนแล้ว",
            data,
        });
    } catch (error) {
        await client.query("ROLLBACK").catch(() => { });
        return sendQueueError(res, translateQueueDbError(error), "ไม่สามารถบันทึกผลตรวจเอกสารได้", "PATCH documents error:");
    } finally {
        client.release();
    }
});

module.exports = router;