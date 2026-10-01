const express = require("express");
const pool = require("../config/db");
const upload = require("../config/upload");
const { recalculateApplicationStatus } = require("../utils/applicationStatus");

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

            // เอกสารหลักฐาน GPAX/ชั่วโมงจิตอาสา ระบบตัดสินผ่าน/ไม่ผ่าน
            // อัตโนมัติไปแล้วตั้งแต่ตอนคัดกรองคุณสมบัติ (ก่อนจะอัปโหลดไฟล์
            // นี้ได้ด้วยซ้ำ) ไม่มีปุ่มให้เจ้าหน้าที่กดอนุมัติแล้ว ถ้าปล่อย
            // เป็น PENDING ไว้เฉยๆ จะค้างตลอดกาล ทำให้สถานะรวมของคำร้อง
            // ไม่มีวันขึ้น "ผ่านครบ" ได้จริง — เลยต้องอนุมัติให้อัตโนมัติ
            // ทันทีที่อัปโหลดเสร็จสำหรับเอกสาร 2 ประเภทนี้เท่านั้น
            const documentCodeResult = await client.query(
                `SELECT dt.document_code
                 FROM psu_loan.document_requirements dr
                 JOIN psu_loan.document_types dt ON dt.document_type_id = dr.document_type_id
                 WHERE dr.requirement_id = $1`,
                [requirementId]
            );

            const documentCode = documentCodeResult.rows[0]?.document_code;
            const isAutoApprovedDocument =
                documentCode === "GPAX_EVIDENCE" ||
                documentCode === "VOLUNTEER_EVIDENCE";

            const initialReviewStatus = isAutoApprovedDocument
                ? "APPROVED"
                : "PENDING";

            const insertResult = await client.query(
                `INSERT INTO psu_loan.application_documents
                    (application_id, requirement_id, original_file_name, stored_file_name,
                     file_path, mime_type, file_size_bytes, version_no, is_current,
                     review_status, uploaded_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $10)
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
                    initialReviewStatus,
                    uploadedBy,
                ]
            );

            // เดิม: เซ็ต application_status = 'DOCUMENT_REVIEW' ตรงๆ ทุก
            // ครั้งที่อัปโหลด โดยไม่เช็คผลรวม ทำให้เอกสารที่ auto-approve
            // ทันทีตอนอัปโหลด (GPAX_EVIDENCE / VOLUNTEER_EVIDENCE) ไม่เคย
            // ถูกนับเข้าสถานะคำร้องเลย — ถ้าไฟล์ที่เหลือผ่านครบไปก่อนหน้า
            // แล้ว คำร้องจะค้างเป็น "รอตรวจสอบ" ตลอดกาลทั้งที่เอกสารครบ
            // และผ่านหมดจริง (ปุ่ม "ตรวจสอบ" ฝั่งเจ้าหน้าที่ไม่ได้ถูกกด
            // อีกรอบเพราะไม่มีอะไรให้ตรวจแล้ว)
            //
            // แก้ใหม่: ใช้ logic สรุปผลเดียวกับตอนเจ้าหน้าที่อนุมัติทีละ
            // ไฟล์ (recalculateApplicationStatus) ทุกครั้งที่มีการอัปโหลด
            // เพื่อให้ไฟล์ auto-approve ถูกนับรวมทันที ถ้าเอกสารครบและ
            // ผ่านหมดพอดีตอนนี้ สถานะจะขยับเป็น DOCUMENT_APPROVED ทันที
            // โดยไม่ต้องรอเจ้าหน้าที่ทำอะไรเพิ่ม (กันคำร้อง DRAFT ไว้
            // เหมือนเดิมอยู่แล้วในตัวฟังก์ชัน)
            const newApplicationStatus = await recalculateApplicationStatus(
                client,
                applicationId
            );

            await client.query("COMMIT");

            return res.status(201).json({
                success: true,
                message: "อัปโหลดเอกสารสำเร็จ",
                data: {
                    ...insertResult.rows[0],
                    applicationStatus: newApplicationStatus,
                },
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