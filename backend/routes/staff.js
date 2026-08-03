const express = require("express");
const pool = require("../config/db");

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
            ORDER BY a.submitted_at DESC NULLS LAST, a.created_at DESC
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

        await client.query(
            `UPDATE psu_loan.applications
             SET application_status = $1::psu_loan.application_status_code
             WHERE application_id = $2`,
            [newApplicationStatus, applicationId]
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
| แสดง timeline ข้ามทุกเวอร์ชันของเอกสารประเภทนี้ในคำร้องนี้ เรียงตาม
| เวลา จะเห็นว่าตีกลับไปกี่ครั้ง แต่ละครั้งไฟล์เวอร์ชันไหน เหตุผลอะไร
| ใครตรวจ — ใช้ตอบโจทย์ "ตีกลับได้ไม่อั้น พร้อมเก็บว่าครั้งที่เท่าไหร่
| เหตุผลอะไร" โดยตรง
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
| มีไว้แทนการให้พิมพ์ staffId เอง (เดาไม่ได้ว่าเลขอะไร เพราะ staff_id
| ผูกกับ users.user_id ที่เดินเลขต่อเนื่องข้าม role) เมื่อทำระบบ auth
| จริงแล้ว endpoint นี้ไม่จำเป็นอีกต่อไป (จะรู้ตัวเองจาก token แทน)
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

module.exports = router;