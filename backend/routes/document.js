const express = require("express");
const pool = require("../config/db");
const upload = require("../config/upload");

const router = express.Router();

function parsePositiveInteger(value) {
    const parsedValue = Number(value);

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        return null;
    }

    return parsedValue;
}

// upload.js อนุญาต "image/jpg" ซึ่งไม่ใช่ MIME type มาตรฐาน (ของจริงคือ image/jpeg)
// และคอลัมน์ mime_type ในตาราง application_documents มี CHECK ที่ไม่รู้จัก image/jpg
// เลย normalize ให้ตรงกับ constraint ก่อน insert
function normalizeMimeType(mimetype) {
    if (mimetype === "image/jpg") {
        return "image/jpeg";
    }

    return mimetype;
}

/*
|--------------------------------------------------------------------------
| อัปโหลดเอกสารประกอบคำร้อง — PostgreSQL จริง
|--------------------------------------------------------------------------
| POST /api/student/:applicationId/documents
|--------------------------------------------------------------------------
| multipart/form-data:
|   file          - ไฟล์เอกสาร (pdf/jpg/png, ไม่เกิน 5MB ตาม config/upload.js)
|   requirementId - รหัสรายการเอกสารที่ต้องใช้ (จาก document_requirements)
|   uploadedBy    - รหัสผู้ใช้ที่อัปโหลด (ชั่วคราว จนกว่าจะมีระบบ auth)
|--------------------------------------------------------------------------
| หมายเหตุ: uploaded_by เป็น NOT NULL ในตาราง application_documents
| แต่ระบบยังไม่มี auth middleware ที่แปะ req.user มาให้ จึงรับ uploadedBy
| จาก body ไปก่อน — พอทำ JWT (มี jsonwebtoken/bcrypt อยู่ใน package.json แล้ว)
| เสร็จแล้ว ให้เปลี่ยนไปอ่านจาก req.user.userId แทน แล้วลบการตรวจสอบ
| uploadedBy จาก body ทิ้ง
|--------------------------------------------------------------------------
*/

router.post(
    "/:applicationId/documents",
    upload.single("file"),
    async (req, res) => {
        const client = await pool.connect();

        try {
            const applicationId = parsePositiveInteger(req.params.applicationId);
            const requirementId = parsePositiveInteger(req.body.requirementId);

            // TODO: เปลี่ยนมาอ่านจาก req.user.userId เมื่อมีระบบ auth แล้ว
            const uploadedBy = parsePositiveInteger(req.body.uploadedBy);

            if (!applicationId || !requirementId) {
                return res.status(400).json({
                    success: false,
                    message: "รหัสคำร้องหรือรหัสประเภทเอกสารไม่ถูกต้อง",
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "กรุณาแนบไฟล์เอกสาร",
                });
            }

            if (!uploadedBy) {
                return res.status(400).json({
                    success: false,
                    message:
                        "ต้องระบุ uploadedBy (รหัสผู้ใช้) — จำเป็นชั่วคราวจนกว่าจะมีระบบยืนยันตัวตน",
                });
            }

            const mimeType = normalizeMimeType(req.file.mimetype);

            await client.query("BEGIN");

            const applicationCheck = await client.query(
                `SELECT application_id
                 FROM psu_loan.applications
                 WHERE application_id = $1
                 FOR UPDATE`,
                [applicationId]
            );

            if (applicationCheck.rowCount === 0) {
                await client.query("ROLLBACK");

                return res.status(404).json({
                    success: false,
                    message: "ไม่พบคำร้องนี้",
                });
            }

            // หาเวอร์ชันปัจจุบัน (ถ้าเคยอัปโหลดเอกสารรายการนี้มาก่อน) แล้วปิดไว้
            // ก่อน insert เวอร์ชันใหม่ ตาม unique index uq_application_document_current
            // ที่บังคับให้มีแค่ 1 แถวที่ is_current = TRUE ต่อ requirement ต่อคำร้อง
            const currentDocumentResult = await client.query(
                `SELECT document_id, version_no
                 FROM psu_loan.application_documents
                 WHERE application_id = $1 AND requirement_id = $2 AND is_current = TRUE
                 FOR UPDATE`,
                [applicationId, requirementId]
            );

            let nextVersion = 1;

            if (currentDocumentResult.rowCount > 0) {
                nextVersion = currentDocumentResult.rows[0].version_no + 1;

                await client.query(
                    `UPDATE psu_loan.application_documents
                     SET is_current = FALSE
                     WHERE document_id = $1`,
                    [currentDocumentResult.rows[0].document_id]
                );
            }

            const insertResult = await client.query(
                `INSERT INTO psu_loan.application_documents
                    (application_id, requirement_id, original_file_name, stored_file_name,
                     file_path, mime_type, file_size_bytes, version_no, is_current,
                     review_status, uploaded_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, 'PENDING', $9)
                 RETURNING document_id, version_no, review_status, uploaded_at`,
                [
                    applicationId,
                    requirementId,
                    req.file.originalname,
                    req.file.filename,
                    `/uploads/eligibility/${req.file.filename}`,
                    mimeType,
                    req.file.size,
                    nextVersion,
                    uploadedBy,
                ]
            );

            // อัปโหลดเอกสารใหม่แล้ว ถือว่าต้องรอเจ้าหน้าที่ตรวจใหม่
            // (ยกเว้นคำร้องที่ยังเป็น DRAFT คือยังไม่ได้ submit จริง)
            await client.query(
                `UPDATE psu_loan.applications
                 SET application_status = 'DOCUMENT_REVIEW'::psu_loan.application_status_code
                 WHERE application_id = $1 AND application_status <> 'DRAFT'`,
                [applicationId]
            );

            await client.query("COMMIT");

            return res.status(201).json({
                success: true,
                message: "อัปโหลดเอกสารสำเร็จ",
                data: insertResult.rows[0],
            });
        } catch (error) {
            await client.query("ROLLBACK");
            console.error("POST /api/student/:applicationId/documents error:", error);

            return res.status(500).json({
                success: false,
                message: "ไม่สามารถอัปโหลดเอกสารได้",
            });
        } finally {
            client.release();
        }
    }
);

module.exports = router;