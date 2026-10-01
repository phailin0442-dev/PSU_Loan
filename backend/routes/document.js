const express = require("express");
const fs = require("fs/promises");
const path = require("path");
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
| Helper สำหรับตั้งชื่อไฟล์: <ชื่อ_นามสกุล>_<ประเภทเอกสาร>_<YYYYMMDD_HHmmss>.<ext>
|--------------------------------------------------------------------------
*/

// กำหนดนามสกุลจาก MIME type แทนการเชื่อนามสกุลจากชื่อไฟล์ที่ผู้ใช้ส่งมา
const EXTENSION_BY_MIME = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
};

// multer (busboy) อ่านชื่อไฟล์ภาษาไทยเป็น latin1 ทำให้ได้ตัวอักษรเพี้ยน
// แปลงกลับเป็น UTF-8 แต่ถ้าชื่อถูกอยู่แล้ว (มีอักขระเกิน latin1 เช่นภาษาไทย)
// หรือแปลงแล้วพัง ให้ใช้ค่าเดิม
function decodeOriginalName(originalname) {
    if (/[^\x00-\xff]/.test(originalname)) {
        return originalname;
    }

    const decoded = Buffer.from(originalname, "latin1").toString("utf8");
    return decoded.includes("\uFFFD") ? originalname : decoded;
}

// ตัดอักขระที่ใช้ในชื่อไฟล์ไม่ได้ เปลี่ยนช่องว่างเป็น _ และจำกัดความยาว
function sanitizeFileNamePart(value, maxLength = 50) {
    const cleaned = String(value || "")
        .normalize("NFC")
        .replace(/[\/\\:*?"<>|\x00-\x1f]/g, "")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^[._]+|[._]+$/g, "");

    return Array.from(cleaned).slice(0, maxLength).join("");
}

// วันที่เวลาตามเวลาไทย รูปแบบ YYYYMMDD_HHmmss (เรียงตามชื่อแล้วได้ลำดับเวลาพอดี)
function formatBangkokTimestamp(date = new Date()) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Bangkok",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23",
        })
            .formatToParts(date)
            .map((part) => [part.type, part.value])
    );

    return `${parts.year}${parts.month}${parts.day}_${parts.hour}${parts.minute}${parts.second}`;
}

// ถ้ามีไฟล์ชื่อซ้ำอยู่แล้ว (อัปโหลดวินาทีเดียวกัน) ให้ต่อท้าย _1, _2, ...
async function getAvailableFileName(directory, baseName, extension) {
    let candidate = `${baseName}${extension}`;
    let counter = 1;

    while (true) {
        try {
            await fs.access(path.join(directory, candidate));
            candidate = `${baseName}_${counter}${extension}`;
            counter += 1;
        } catch {
            return candidate;
        }
    }
}

async function removeFileQuietly(filePath) {
    if (!filePath) return;

    try {
        await fs.unlink(filePath);
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.error("ลบไฟล์ที่อัปโหลดไม่สำเร็จ:", filePath, error);
        }
    }
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
| ชื่อไฟล์ที่เก็บจริง: <ชื่อ_นามสกุล>_<ประเภทเอกสาร>_<YYYYMMDD_HHmmss>.<ext>
| เช่น สมชาย_ใจดี_สำเนาบัตรประชาชนผู้กู้_20261001_143719.pdf
| (ชื่อไฟล์ที่ผู้ใช้ตั้งมายังเก็บไว้ในคอลัมน์ original_file_name)
| multer บันทึกด้วยชื่อชั่วคราวก่อน แล้ว route นี้ rename ให้หลังรู้ชื่อนักศึกษา
| ถ้าบันทึกลงฐานข้อมูลไม่สำเร็จ ไฟล์จะถูกลบทิ้ง ไม่ค้างอยู่ในโฟลเดอร์
|--------------------------------------------------------------------------
*/

router.post(
    "/:applicationId/documents",
    upload.single("file"),
    async (req, res) => {
        // ตำแหน่งไฟล์ปัจจุบันบนดิสก์ (เปลี่ยนหลัง rename) และธงว่าจะเก็บไฟล์ไว้ไหม
        let currentFilePath = req.file ? req.file.path : null;
        let keepFile = false;

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
            const originalFileName = decodeOriginalName(req.file.originalname);

            await client.query("BEGIN");

            // ดึงชื่อนักศึกษามาด้วยเพื่อใช้ตั้งชื่อไฟล์
            // applications.student_id อ้างอิง student_profiles.student_id
            const applicationCheck = await client.query(
                `SELECT a.application_id, sp.first_name, sp.last_name
                 FROM psu_loan.applications a
                 LEFT JOIN psu_loan.student_profiles sp ON sp.student_id = a.student_id
                 WHERE a.application_id = $1
                 FOR UPDATE OF a`,
                [applicationId]
            );

            if (applicationCheck.rowCount === 0) {
                await client.query("ROLLBACK");

                return res.status(404).json({
                    success: false,
                    message: "ไม่พบคำร้องนี้",
                });
            }

            // ดึงชื่อประเภทเอกสาร (เช่น "สำเนาบัตรประชาชนผู้กู้") มาใช้แทนชื่อไฟล์ที่ผู้ใช้ตั้งมา
            // requirementId → document_requirements → document_types
            const requirementCheck = await client.query(
                `SELECT dt.document_name
                 FROM psu_loan.document_requirements dr
                 JOIN psu_loan.document_types dt ON dt.document_type_id = dr.document_type_id
                 WHERE dr.requirement_id = $1`,
                [requirementId]
            );

            if (requirementCheck.rowCount === 0) {
                await client.query("ROLLBACK");

                return res.status(404).json({
                    success: false,
                    message: "ไม่พบประเภทเอกสารนี้",
                });
            }

            // ---- ตั้งชื่อไฟล์ใหม่แล้ว rename ----
            const { first_name: firstName, last_name: lastName } = applicationCheck.rows[0];
            const { document_name: documentName } = requirementCheck.rows[0];

            const ownerPart =
                sanitizeFileNamePart(`${firstName || ""} ${lastName || ""}`) ||
                `app${applicationId}`;

            const documentPart =
                sanitizeFileNamePart(documentName, 80) || `requirement${requirementId}`;

            const extension =
                EXTENSION_BY_MIME[mimeType] ||
                path.extname(originalFileName).toLowerCase();

            const uploadDirectory = path.dirname(req.file.path);
            const storedFileName = await getAvailableFileName(
                uploadDirectory,
                `${ownerPart}_${documentPart}_${formatBangkokTimestamp()}`,
                extension
            );
            const newFilePath = path.join(uploadDirectory, storedFileName);

            await fs.rename(req.file.path, newFilePath);
            currentFilePath = newFilePath;

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
                 RETURNING document_id, stored_file_name, version_no, review_status, uploaded_at`,
                [
                    applicationId,
                    requirementId,
                    originalFileName,
                    storedFileName,
                    `/uploads/eligibility/${encodeURIComponent(storedFileName)}`,
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
            keepFile = true;

            return res.status(201).json({
                success: true,
                message: "อัปโหลดเอกสารสำเร็จ",
                data: insertResult.rows[0],
            });
        } catch (error) {
            await client.query("ROLLBACK").catch(() => {});
            console.error("POST /api/student/:applicationId/documents error:", error);

            return res.status(500).json({
                success: false,
                message: "ไม่สามารถอัปโหลดเอกสารได้",
            });
        } finally {
            client.release();

            // คำขอที่ไม่สำเร็จ (validation ไม่ผ่าน / ไม่พบคำร้อง / DB error) ลบไฟล์ทิ้ง
            if (!keepFile) {
                await removeFileQuietly(currentFilePath);
            }
        }
    }
);

module.exports = router;