const express = require("express");

const router = express.Router();

/*
  Mock Data คำร้องของนักศึกษา
  ใช้ทดสอบระบบก่อนเชื่อม PostgreSQL จริง
*/
const studentApplications = [
    {
        id: 1,
        studentId: "6810110001",
        fullName: "นางสาวณัฐณิชา ศรีสุข",

        faculty: "คณะวิทยาศาสตร์",
        major: "วิทยาการคอมพิวเตอร์",
        year: 1,

        borrowerType: "ผู้กู้รายใหม่",
        borrowerCode: "NEW",

        semester: 1,
        academicYear: 2569,

        submittedDate: "21/07/2569",
        submittedAt: "2026-07-21T09:30:00.000Z",

        status: "รอตรวจสอบ",
        note: "",

        documents: [
            {
                id: 1,
                documentType: "สัญญากู้ยืมเงิน",
                fileName: "loan-contract-6810110001.pdf",
                fileUrl:
                    "/uploads/documents/loan-contract-6810110001.pdf",
                status: "รอตรวจสอบ",
                note: "",
            },
            {
                id: 2,
                documentType: "ใบเบิกเงิน",
                fileName: "disbursement-6810110001.pdf",
                fileUrl:
                    "/uploads/documents/disbursement-6810110001.pdf",
                status: "รอตรวจสอบ",
                note: "",
            },
            {
                id: 3,
                documentType: "สำเนาบัตรประชาชนนักศึกษา",
                fileName: "student-card-6810110001.jpg",
                fileUrl:
                    "/uploads/documents/student-card-6810110001.jpg",
                status: "รอตรวจสอบ",
                note: "",
            },
            {
                id: 4,
                documentType: "สำเนาบัตรประชาชนผู้ปกครอง",
                fileName: "parent-card-6810110001.jpg",
                fileUrl:
                    "/uploads/documents/parent-card-6810110001.jpg",
                status: "รอตรวจสอบ",
                note: "",
            },
        ],
    },

    {
        id: 2,
        studentId: "6410110025",
        fullName: "นายกิตติพงศ์ แสงทอง",

        faculty: "คณะวิศวกรรมศาสตร์",
        major: "วิศวกรรมคอมพิวเตอร์",
        year: 5,

        borrowerType: "ผู้กู้ย้ายสาขา / กู้เกินหลักสูตร",
        borrowerCode: "OVER_PROGRAM",

        semester: 1,
        academicYear: 2569,

        submittedDate: "20/07/2569",
        submittedAt: "2026-07-20T14:15:00.000Z",

        status: "ผ่าน",
        note: "ตรวจสอบเอกสารครบถ้วนแล้ว",

        documents: [
            {
                id: 1,
                documentType: "สัญญากู้ยืมเงิน",
                fileName: "loan-contract-6410110025.pdf",
                fileUrl:
                    "/uploads/documents/loan-contract-6410110025.pdf",
                status: "ผ่าน",
                note: "",
            },
            {
                id: 2,
                documentType: "ใบเบิกเงิน",
                fileName: "disbursement-6410110025.pdf",
                fileUrl:
                    "/uploads/documents/disbursement-6410110025.pdf",
                status: "ผ่าน",
                note: "",
            },
            {
                id: 3,
                documentType: "สำเนาบัตรประชาชนนักศึกษา",
                fileName: "student-card-6410110025.jpg",
                fileUrl:
                    "/uploads/documents/student-card-6410110025.jpg",
                status: "ผ่าน",
                note: "",
            },
        ],
    },

    {
        id: 3,
        studentId: "6510110042",
        fullName: "นางสาวพิมพ์ชนก บุญรักษ์",

        faculty: "วิทยาลัยการคอมพิวเตอร์",
        major: "เทคโนโลยีสารสนเทศและการสื่อสาร",
        year: 4,

        borrowerType: "ผู้กู้รายเก่าเลื่อนชั้นปี",
        borrowerCode: "CONTINUING",

        semester: 1,
        academicYear: 2569,

        submittedDate: "19/07/2569",
        submittedAt: "2026-07-19T11:20:00.000Z",

        status: "ต้องแก้ไข",
        note: "กรุณาอัปโหลดใบเบิกเงินใหม่ เนื่องจากภาพไม่ชัดเจน",

        documents: [
            {
                id: 1,
                documentType: "ใบเบิกเงิน",
                fileName: "disbursement-6510110042.pdf",
                fileUrl:
                    "/uploads/documents/disbursement-6510110042.pdf",
                status: "ต้องแก้ไข",
                note: "ภาพเอกสารไม่ชัดเจน กรุณาอัปโหลดใหม่",
            },
            {
                id: 2,
                documentType: "สำเนาบัตรประชาชนนักศึกษา",
                fileName: "student-card-6510110042.jpg",
                fileUrl:
                    "/uploads/documents/student-card-6510110042.jpg",
                status: "ผ่าน",
                note: "",
            },
        ],
    },

    {
        id: 4,
        studentId: "6610110088",
        fullName: "นายธนกร ใจดี",

        faculty: "คณะวิทยาศาสตร์",
        major: "เทคโนโลยีสารสนเทศ",
        year: 3,

        borrowerType: "ผู้กู้รายเก่าเลื่อนชั้นปี",
        borrowerCode: "CONTINUING",

        semester: 1,
        academicYear: 2569,

        submittedDate: "18/07/2569",
        submittedAt: "2026-07-18T08:45:00.000Z",

        status: "รอตรวจสอบ",
        note: "",

        documents: [
            {
                id: 1,
                documentType: "ใบเบิกเงิน",
                fileName: "disbursement-6610110088.pdf",
                fileUrl:
                    "/uploads/documents/disbursement-6610110088.pdf",
                status: "รอตรวจสอบ",
                note: "",
            },
            {
                id: 2,
                documentType: "สำเนาบัตรประชาชนนักศึกษา",
                fileName: "student-card-6610110088.jpg",
                fileUrl:
                    "/uploads/documents/student-card-6610110088.jpg",
                status: "รอตรวจสอบ",
                note: "",
            },
        ],
    },

    {
        id: 5,
        studentId: "6710110105",
        fullName: "นางสาวปภาวดี มีสุข",

        faculty: "คณะวิทยาการจัดการ",
        major: "ระบบสารสนเทศ",
        year: 2,

        borrowerType: "ผู้กู้รายเก่าเลื่อนชั้นปี",
        borrowerCode: "CONTINUING",

        semester: 1,
        academicYear: 2569,

        submittedDate: "17/07/2569",
        submittedAt: "2026-07-17T15:40:00.000Z",

        status: "ผ่าน",
        note: "เอกสารถูกต้องครบถ้วน",

        documents: [
            {
                id: 1,
                documentType: "ใบเบิกเงิน",
                fileName: "disbursement-6710110105.pdf",
                fileUrl:
                    "/uploads/documents/disbursement-6710110105.pdf",
                status: "ผ่าน",
                note: "",
            },
            {
                id: 2,
                documentType: "สำเนาบัตรประชาชนนักศึกษา",
                fileName: "student-card-6710110105.jpg",
                fileUrl:
                    "/uploads/documents/student-card-6710110105.jpg",
                status: "ผ่าน",
                note: "",
            },
        ],
    },

    {
        id: 6,
        studentId: "6810110120",
        fullName: "นายภูริณัฐ แสงแก้ว",

        faculty: "คณะเศรษฐศาสตร์",
        major: "เศรษฐศาสตร์",
        year: 1,

        borrowerType: "ผู้กู้รายใหม่",
        borrowerCode: "NEW",

        semester: 1,
        academicYear: 2569,

        submittedDate: "16/07/2569",
        submittedAt: "2026-07-16T10:10:00.000Z",

        status: "ต้องแก้ไข",
        note: "สำเนาบัตรประชาชนหมดอายุ",

        documents: [
            {
                id: 1,
                documentType: "สัญญากู้ยืมเงิน",
                fileName: "loan-contract-6810110120.pdf",
                fileUrl:
                    "/uploads/documents/loan-contract-6810110120.pdf",
                status: "ผ่าน",
                note: "",
            },
            {
                id: 2,
                documentType: "ใบเบิกเงิน",
                fileName: "disbursement-6810110120.pdf",
                fileUrl:
                    "/uploads/documents/disbursement-6810110120.pdf",
                status: "ผ่าน",
                note: "",
            },
            {
                id: 3,
                documentType: "สำเนาบัตรประชาชนนักศึกษา",
                fileName: "student-card-6810110120.jpg",
                fileUrl:
                    "/uploads/documents/student-card-6810110120.jpg",
                status: "ต้องแก้ไข",
                note: "บัตรประชาชนหมดอายุ กรุณาอัปโหลดฉบับใหม่",
            },
        ],
    },
];

/*
  สร้างข้อมูลสรุป Dashboard
*/
function createDashboardSummary(students) {
    const pendingCount = students.filter(
        (student) => student.status === "รอตรวจสอบ"
    ).length;

    const revisionCount = students.filter(
        (student) => student.status === "ต้องแก้ไข"
    ).length;

    const approvedCount = students.filter(
        (student) => student.status === "ผ่าน"
    ).length;

    return {
        totalCount: students.length,
        pendingCount,
        revisionCount,
        approvedCount,
    };
}

/*
  Dashboard เจ้าหน้าที่
  GET http://localhost:3000/api/staff/dashboard
*/
router.get("/dashboard", (req, res) => {
    const sortedStudents = [...studentApplications].sort(
        (firstStudent, secondStudent) =>
            new Date(secondStudent.submittedAt) -
            new Date(firstStudent.submittedAt)
    );

    const summary = createDashboardSummary(sortedStudents);

    res.status(200).json({
        success: true,
        message: "โหลดข้อมูล Dashboard สำเร็จ",
        data: {
            summary,
            recentStudents: sortedStudents.slice(0, 5),
            students: sortedStudents,
        },
    });
});

/*
  ดูรายชื่อนักศึกษาทั้งหมด

  รองรับตัวกรอง:
  GET /api/staff/students
  GET /api/staff/students?status=รอตรวจสอบ
  GET /api/staff/students?search=6810110001
*/
router.get("/students", (req, res) => {
    const status = req.query.status?.trim();
    const search = req.query.search?.trim().toLowerCase();

    let filteredStudents = [...studentApplications];

    if (status && status !== "ทั้งหมด") {
        filteredStudents = filteredStudents.filter(
            (student) => student.status === status
        );
    }

    if (search) {
        filteredStudents = filteredStudents.filter((student) => {
            return (
                student.studentId.toLowerCase().includes(search) ||
                student.fullName.toLowerCase().includes(search) ||
                student.borrowerType.toLowerCase().includes(search)
            );
        });
    }

    filteredStudents.sort(
        (firstStudent, secondStudent) =>
            new Date(secondStudent.submittedAt) -
            new Date(firstStudent.submittedAt)
    );

    res.status(200).json({
        success: true,
        total: filteredStudents.length,
        data: filteredStudents,
    });
});

/*
  ดูรายละเอียดนักศึกษารายคน
  GET http://localhost:3000/api/staff/students/1
*/
router.get("/students/:id", (req, res) => {
    const applicationId = Number(req.params.id);

    const student = studentApplications.find(
        (item) => item.id === applicationId
    );

    if (!student) {
        return res.status(404).json({
            success: false,
            message: "ไม่พบข้อมูลคำร้องของนักศึกษา",
        });
    }

    return res.status(200).json({
        success: true,
        data: student,
    });
});

/*
  แก้สถานะคำร้องทั้งรายการ

  PATCH http://localhost:3000/api/staff/students/1/status

  Body:
  {
    "status": "ผ่าน",
    "note": "ตรวจสอบเอกสารครบถ้วนแล้ว"
  }
*/
router.patch("/students/:id/status", (req, res) => {
    const applicationId = Number(req.params.id);
    const { status, note = "" } = req.body;

    const allowedStatuses = [
        "รอตรวจสอบ",
        "ต้องแก้ไข",
        "ผ่าน",
    ];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: "สถานะไม่ถูกต้อง",
            allowedStatuses,
        });
    }

    if (status === "ต้องแก้ไข" && !note.trim()) {
        return res.status(400).json({
            success: false,
            message: "กรุณาระบุหมายเหตุสำหรับเอกสารที่ต้องแก้ไข",
        });
    }

    const studentIndex = studentApplications.findIndex(
        (item) => item.id === applicationId
    );

    if (studentIndex === -1) {
        return res.status(404).json({
            success: false,
            message: "ไม่พบข้อมูลคำร้องของนักศึกษา",
        });
    }

    studentApplications[studentIndex].status = status;
    studentApplications[studentIndex].note = note.trim();
    studentApplications[studentIndex].reviewedAt =
        new Date().toISOString();

    return res.status(200).json({
        success: true,
        message: "บันทึกผลการตรวจสอบเรียบร้อยแล้ว",
        data: studentApplications[studentIndex],
    });
});

/*
  แก้สถานะเอกสารรายไฟล์

  PATCH http://localhost:3000/api/staff/students/1/documents/2

  Body:
  {
    "status": "ต้องแก้ไข",
    "note": "ภาพไม่ชัด กรุณาอัปโหลดใหม่"
  }
*/
router.patch(
    "/students/:studentId/documents/:documentId",
    (req, res) => {
        const applicationId = Number(req.params.studentId);
        const documentId = Number(req.params.documentId);

        const { status, note = "" } = req.body;

        const allowedStatuses = [
            "รอตรวจสอบ",
            "ต้องแก้ไข",
            "ผ่าน",
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "สถานะเอกสารไม่ถูกต้อง",
                allowedStatuses,
            });
        }

        if (status === "ต้องแก้ไข" && !note.trim()) {
            return res.status(400).json({
                success: false,
                message: "กรุณาระบุเหตุผลที่ต้องแก้ไขเอกสาร",
            });
        }

        const student = studentApplications.find(
            (item) => item.id === applicationId
        );

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "ไม่พบข้อมูลคำร้องของนักศึกษา",
            });
        }

        const document = student.documents.find(
            (item) => item.id === documentId
        );

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "ไม่พบเอกสารที่ต้องการตรวจสอบ",
            });
        }

        document.status = status;
        document.note = note.trim();
        document.reviewedAt = new Date().toISOString();

        /*
          คำนวณสถานะรวมของคำร้องจากเอกสารทั้งหมด
        */
        const hasRevision = student.documents.some(
            (item) => item.status === "ต้องแก้ไข"
        );

        const allApproved = student.documents.every(
            (item) => item.status === "ผ่าน"
        );

        if (hasRevision) {
            student.status = "ต้องแก้ไข";
        } else if (allApproved) {
            student.status = "ผ่าน";
        } else {
            student.status = "รอตรวจสอบ";
        }

        const revisionNotes = student.documents
            .filter((item) => item.status === "ต้องแก้ไข")
            .map(
                (item) =>
                    `${item.documentType}: ${item.note}`
            );

        student.note = revisionNotes.join(" | ");
        student.reviewedAt = new Date().toISOString();

        return res.status(200).json({
            success: true,
            message: "บันทึกผลการตรวจเอกสารเรียบร้อยแล้ว",
            data: student,
        });
    }
);

module.exports = router;