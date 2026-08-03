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
                ad.uploaded_at AS "uploadedAt"
            FROM psu_loan.document_requirements dr
            JOIN psu_loan.document_types dt ON dt.document_type_id = dr.document_type_id
            LEFT JOIN psu_loan.application_documents ad
                ON ad.requirement_id = dr.requirement_id
                AND ad.application_id = $1
                AND ad.is_current = TRUE
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

        res.status(200).json({
            success: true,
            data: {
                ...application,
                parent,
                requiredDocuments: documentsResult.rows,
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

module.exports = router;