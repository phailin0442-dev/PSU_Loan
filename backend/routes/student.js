const express = require("express");
const upload = require("../config/upload");

const router = express.Router();

/*
  Mock Data นักศึกษา
  ใช้สำหรับทดสอบระบบก่อนเชื่อมต่อฐานข้อมูลจริง
*/
const students = [
    {
        id: 1,
        studentId: "6810110001",
        citizenId: "1909900000001",
        firstName: "ณัฐณิชา",
        lastName: "ศรีสุข",
        fullName: "นางสาวณัฐณิชา ศรีสุข",

        birthdate: "12/08/2550",
        age: 18,
        isUnder20: true,

        faculty: "คณะวิทยาศาสตร์",
        major: "วิทยาการคอมพิวเตอร์",
        year: 1,

        phone: "0812345671",
        email: "6810110001@psu.ac.th",

        borrowerType: "ผู้กู้รายใหม่",
        borrowerGroup: 1,
        borrowerCode: "NEW",

        semester: 1,
        academicYear: 2569,

        gpax: 2.85,
        volunteerHours: 20,

        qualificationStatus: "ผ่านเกณฑ์",
        applicationStatus: "รออัปโหลดเอกสาร",

        requiredDocuments: [
            "สัญญากู้ยืมเงิน",
            "ใบเบิกเงิน",
            "สำเนาบัตรประชาชนนักศึกษา",
            "สำเนาบัตรประชาชนผู้ปกครอง",
            "รูปถ่ายผู้ปกครองพร้อมสัญญากู้ยืม",
        ],

        parent: {
            fullName: "นายสมชาย ศรีสุข",
            relationship: "บิดา",
            phone: "0891111111",
        },
    },

    {
        id: 2,
        studentId: "6410110025",
        citizenId: "1909900000002",
        firstName: "กิตติพงศ์",
        lastName: "แสงทอง",
        fullName: "นายกิตติพงศ์ แสงทอง",

        birthdate: "05/02/2546",
        age: 23,
        isUnder20: false,

        faculty: "คณะวิศวกรรมศาสตร์",
        major: "วิศวกรรมคอมพิวเตอร์",
        year: 5,

        phone: "0812345672",
        email: "6410110025@psu.ac.th",

        borrowerType: "ผู้กู้เกินหลักสูตร",
        borrowerGroup: 2,
        borrowerCode: "OVER_PROGRAM",

        semester: 1,
        academicYear: 2569,

        gpax: 2.45,
        volunteerHours: 36,

        qualificationStatus: "ผ่านเกณฑ์",
        applicationStatus: "รอตรวจเอกสาร",

        requiredDocuments: [
            "สัญญากู้ยืมเงิน",
            "ใบเบิกเงิน",
            "สำเนาบัตรประชาชนนักศึกษา",
        ],

        parent: null,
    },

    {
        id: 3,
        studentId: "6510110042",
        citizenId: "1909900000003",
        firstName: "พิมพ์ชนก",
        lastName: "บุญรักษ์",
        fullName: "นางสาวพิมพ์ชนก บุญรักษ์",

        birthdate: "20/06/2548",
        age: 21,
        isUnder20: false,

        faculty: "วิทยาลัยการคอมพิวเตอร์",
        major: "เทคโนโลยีสารสนเทศและการสื่อสาร",
        year: 4,

        phone: "0812345673",
        email: "6510110042@psu.ac.th",

        borrowerType: "ผู้กู้รายเก่า",
        borrowerGroup: 3,
        borrowerCode: "CONTINUING",

        semester: 1,
        academicYear: 2569,

        gpax: 3.15,
        volunteerHours: 42,

        qualificationStatus: "ผ่านเกณฑ์",
        applicationStatus: "เอกสารต้องแก้ไข",

        requiredDocuments: [
            "ใบเบิกเงิน",
            "สำเนาบัตรประชาชนนักศึกษา",
        ],

        documentNote:
            "กรุณาอัปโหลดใบเบิกเงินใหม่ เนื่องจากภาพไม่ชัดเจน",

        parent: null,
    },
];

/*
  เก็บผลการคัดกรองชั่วคราว
  ตอนเชื่อมฐานข้อมูลจริงค่อยเปลี่ยนเป็น INSERT PostgreSQL
*/
const eligibilityResults = [];

function calculateAge(birthdate) {
    if (!birthdate) return 0;

    let day;
    let month;
    let year;

    if (birthdate.includes("/")) {
        const parts = birthdate.split("/").map(Number);

        if (parts.length !== 3) return 0;

        day = parts[0];
        month = parts[1];
        year = parts[2];
    } else if (birthdate.includes("-")) {
        const parts = birthdate.split("-").map(Number);

        if (parts.length !== 3) return 0;

        year = parts[0];
        month = parts[1];
        day = parts[2];
    } else {
        return 0;
    }

    if (!day || !month || !year) return 0;

    if (year > 2400) {
        year -= 543;
    }

    const birth = new Date(year, month - 1, day);

    if (
        Number.isNaN(birth.getTime()) ||
        birth.getFullYear() !== year ||
        birth.getMonth() !== month - 1 ||
        birth.getDate() !== day
    ) {
        return 0;
    }

    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();
    const monthDifference = today.getMonth() - birth.getMonth();

    if (
        monthDifference < 0 ||
        (monthDifference === 0 && today.getDate() < birth.getDate())
    ) {
        age -= 1;
    }

    return age > 0 && age < 120 ? age : 0;
}

function getVolunteerMinimum(loanType) {
    if (loanType === "new") {
        return 2;
    }

    if (loanType === "continue" || loanType === "transfer") {
        return 36;
    }

    return null;
}

function getLoanTypeText(loanType) {
    const loanTypes = {
        new: "ผู้กู้รายใหม่",
        continue: "ผู้กู้รายเก่าเลื่อนชั้นปี",
        transfer: "ผู้กู้ย้ายสาขา / กู้เกินหลักสูตร",
    };

    return loanTypes[loanType] || "";
}

function removeUploadedFiles(files) {
    const fs = require("fs");

    if (!files) return;

    const uploadedFiles = Object.values(files).flat();

    uploadedFiles.forEach((file) => {
        if (file?.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    });
}

/*
  ดูนักศึกษาทั้งหมด
  GET http://localhost:3000/api/student
*/
router.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        total: students.length,
        data: students,
    });
});

/*
  ดูผลการคัดกรองทั้งหมด
  GET http://localhost:3000/api/student/eligibility/results
*/
router.get("/eligibility/results", (req, res) => {
    res.status(200).json({
        success: true,
        total: eligibilityResults.length,
        data: eligibilityResults,
    });
});

/*
  ตรวจสอบคุณสมบัติและรับไฟล์หลักฐาน
  POST http://localhost:3000/api/student/eligibility
*/
router.post(
    "/eligibility",
    upload.fields([
        {
            name: "gpaxFile",
            maxCount: 1,
        },
        {
            name: "volunteerFile",
            maxCount: 1,
        },
    ]),
    (req, res) => {
        try {
            const {
                loanType,
                gpax,
                volunteerHours,
                birthdate,
                studentId,
            } = req.body;

            const errors = [];

            const age = calculateAge(birthdate);
            const volunteerMinimum = getVolunteerMinimum(loanType);

            const gpaxNumber = Number(gpax);
            const volunteerHoursNumber = Number(volunteerHours);

            if (!loanType || volunteerMinimum === null) {
                errors.push("กรุณาเลือกประเภทผู้กู้ยืมให้ถูกต้อง");
            }

            if (!age) {
                errors.push(
                    "กรุณาตรวจสอบวันเดือนปีเกิดให้ถูกต้อง เช่น 12/08/2547"
                );
            }

            if (
                gpax === undefined ||
                gpax === null ||
                gpax === "" ||
                Number.isNaN(gpaxNumber)
            ) {
                errors.push("กรุณากรอกเกรดเฉลี่ยสะสม GPAX");
            } else if (gpaxNumber < 1.8) {
                errors.push("เกรดเฉลี่ยสะสมต้องไม่ต่ำกว่า 1.80");
            } else if (gpaxNumber > 4) {
                errors.push("เกรดเฉลี่ยสะสมต้องไม่เกิน 4.00");
            }

            if (
                volunteerHours === undefined ||
                volunteerHours === null ||
                volunteerHours === "" ||
                Number.isNaN(volunteerHoursNumber)
            ) {
                errors.push("กรุณากรอกจำนวนชั่วโมงจิตอาสา");
            } else if (volunteerHoursNumber < 0) {
                errors.push("ชั่วโมงจิตอาสาต้องไม่ต่ำกว่า 0 ชั่วโมง");
            } else if (
                volunteerMinimum !== null &&
                volunteerHoursNumber < volunteerMinimum
            ) {
                errors.push(
                    `ชั่วโมงจิตอาสาต้องไม่น้อยกว่า ${volunteerMinimum} ชั่วโมง`
                );
            }

            const gpaxFile = req.files?.gpaxFile?.[0];
            const volunteerFile = req.files?.volunteerFile?.[0];

            if (!gpaxFile) {
                errors.push("กรุณาแนบไฟล์หลักฐาน GPAX");
            }

            if (!volunteerFile) {
                errors.push("กรุณาแนบไฟล์หลักฐานชั่วโมงจิตอาสา");
            }

            if (errors.length > 0) {
                removeUploadedFiles(req.files);

                return res.status(400).json({
                    success: false,
                    pass: false,
                    message: "ไม่ผ่านการคัดกรองคุณสมบัติ",
                    errors,
                });
            }

            let student = null;

            if (studentId) {
                student = students.find(
                    (item) =>
                        String(item.id) === String(studentId) ||
                        String(item.studentId) === String(studentId)
                );
            }

            const resultId = eligibilityResults.length + 1;

            const eligibilityData = {
                id: resultId,

                student: student
                    ? {
                        id: student.id,
                        studentId: student.studentId,
                        fullName: student.fullName,
                        faculty: student.faculty,
                        major: student.major,
                    }
                    : {
                        id: null,
                        studentId: studentId || null,
                        fullName: null,
                        faculty: null,
                        major: null,
                    },

                loanType,
                loanTypeText: getLoanTypeText(loanType),

                birthdate,
                age,
                isAdult: age >= 20,
                isUnder20: age < 20,

                gpax: gpaxNumber,
                gpaxMinimum: 1.8,

                volunteerHours: volunteerHoursNumber,
                volunteerMinimum,

                qualificationStatus: "ผ่านเกณฑ์",
                applicationStatus: "รออัปโหลดเอกสาร",

                files: {
                    gpax: {
                        originalName: gpaxFile.originalname,
                        fileName: gpaxFile.filename,
                        mimeType: gpaxFile.mimetype,
                        size: gpaxFile.size,
                        url: `/uploads/eligibility/${gpaxFile.filename}`,
                    },

                    volunteer: {
                        originalName: volunteerFile.originalname,
                        fileName: volunteerFile.filename,
                        mimeType: volunteerFile.mimetype,
                        size: volunteerFile.size,
                        url: `/uploads/eligibility/${volunteerFile.filename}`,
                    },
                },

                checkedAt: new Date().toISOString(),
            };

            eligibilityResults.push(eligibilityData);

            return res.status(200).json({
                success: true,
                pass: true,
                message: "ผ่านการคัดกรองคุณสมบัติ",
                data: eligibilityData,
            });
        } catch (error) {
            console.error("Eligibility error:", error);

            removeUploadedFiles(req.files);

            return res.status(500).json({
                success: false,
                pass: false,
                message: "เกิดข้อผิดพลาดในการตรวจสอบคุณสมบัติ",
                errors: [error.message],
            });
        }
    }
);

/*
  ดูนักศึกษาตาม id
  GET http://localhost:3000/api/student/1

  Route นี้ต้องอยู่ล่างสุด เพราะ /:id อาจจับคำว่า eligibility ได้
*/
router.get("/:id", (req, res) => {
    const id = Number(req.params.id);

    const student = students.find((item) => item.id === id);

    if (!student) {
        return res.status(404).json({
            success: false,
            message: "ไม่พบข้อมูลนักศึกษา",
        });
    }

    res.status(200).json({
        success: true,
        data: student,
    });
});

/*
  จัดการ Error จาก multer
  เช่น ไฟล์ใหญ่เกิน หรือชนิดไฟล์ไม่ถูกต้อง
*/
router.use((error, req, res, next) => {
    if (!error) {
        return next();
    }

    console.error("Upload error:", error);

    let message = error.message || "เกิดข้อผิดพลาดในการอัปโหลดไฟล์";

    if (error.code === "LIMIT_FILE_SIZE") {
        message = "ไฟล์มีขนาดเกิน 5 MB";
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
        message = "ชื่อช่องอัปโหลดไฟล์ไม่ถูกต้อง หรืออัปโหลดเกินจำนวนที่กำหนด";
    }

    return res.status(400).json({
        success: false,
        pass: false,
        message,
        errors: [message],
    });
});

module.exports = router;