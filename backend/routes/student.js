const express = require("express");

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

        documentNote: "กรุณาอัปโหลดใบเบิกเงินใหม่ เนื่องจากภาพไม่ชัดเจน",

        parent: null,
    },
];

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
  ดูนักศึกษาตาม id
  GET http://localhost:3000/api/student/1
*/
router.get("/:id", (req, res) => {
    const studentId = Number(req.params.id);

    const student = students.find((item) => item.id === studentId);

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

module.exports = router;