const express = require("express");
const studentApplications = require("../data/studentApplications.mock");

const router = express.Router();

const ALLOWED_STATUSES = [
    "รอตรวจสอบ",
    "ต้องแก้ไข",
    "ผ่าน",
];

function parseApplicationId(value) {
    const applicationId = Number(value);

    if (!Number.isInteger(applicationId) || applicationId <= 0) {
        return null;
    }

    return applicationId;
}

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

function sortBySubmittedDate(students) {
    return [...students].sort(
        (firstStudent, secondStudent) =>
            new Date(secondStudent.submittedAt) -
            new Date(firstStudent.submittedAt)
    );
}

function updateApplicationStatusFromDocuments(student) {
    const hasRevision = student.documents.some(
        (document) => document.status === "ต้องแก้ไข"
    );

    const allApproved =
        student.documents.length > 0 &&
        student.documents.every(
            (document) => document.status === "ผ่าน"
        );

    if (hasRevision) {
        student.status = "ต้องแก้ไข";
    } else if (allApproved) {
        student.status = "ผ่าน";
    } else {
        student.status = "รอตรวจสอบ";
    }

    const revisionNotes = student.documents
        .filter(
            (document) =>
                document.status === "ต้องแก้ไข" &&
                document.note
        )
        .map(
            (document) =>
                `${document.documentType}: ${document.note}`
        );

    student.note = revisionNotes.join(" | ");
    student.reviewedAt = new Date().toISOString();
}

/*
  Dashboard เจ้าหน้าที่
  GET /api/staff/dashboard
*/
router.get("/dashboard", (req, res) => {
    try {
        const sortedStudents =
            sortBySubmittedDate(studentApplications);

        const summary =
            createDashboardSummary(sortedStudents);

        return res.status(200).json({
            success: true,
            message: "โหลดข้อมูล Dashboard สำเร็จ",
            data: {
                summary,
                recentStudents: sortedStudents.slice(0, 5),
                students: sortedStudents,
            },
        });
    } catch (error) {
        console.error("GET /api/staff/dashboard error:", error);

        return res.status(500).json({
            success: false,
            message: "ไม่สามารถโหลดข้อมูล Dashboard ได้",
        });
    }
});

/*
  รายชื่อนักศึกษา

  GET /api/staff/students
  GET /api/staff/students?status=รอตรวจสอบ
  GET /api/staff/students?search=6810110001
*/
router.get("/students", (req, res) => {
    try {
        const status =
            typeof req.query.status === "string"
                ? req.query.status.trim()
                : "";

        const search =
            typeof req.query.search === "string"
                ? req.query.search.trim().toLowerCase()
                : "";

        let filteredStudents = [...studentApplications];

        if (status && status !== "ทั้งหมด") {
            filteredStudents = filteredStudents.filter(
                (student) => student.status === status
            );
        }

        if (search) {
            filteredStudents = filteredStudents.filter(
                (student) => {
                    const searchableValues = [
                        student.studentId,
                        student.fullName,
                        student.faculty,
                        student.major,
                        student.borrowerType,
                        student.borrowerCode,
                        student.academicYear,
                        student.semester,
                    ];

                    return searchableValues.some((value) =>
                        String(value ?? "")
                            .toLowerCase()
                            .includes(search)
                    );
                }
            );
        }

        filteredStudents =
            sortBySubmittedDate(filteredStudents);

        return res.status(200).json({
            success: true,
            total: filteredStudents.length,
            data: filteredStudents,
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
  รายละเอียดนักศึกษารายคน
  GET /api/staff/students/:id
*/
router.get("/students/:id", (req, res) => {
    try {
        const applicationId =
            parseApplicationId(req.params.id);

        if (!applicationId) {
            return res.status(400).json({
                success: false,
                message: "รหัสคำร้องไม่ถูกต้อง",
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

        return res.status(200).json({
            success: true,
            data: student,
        });
    } catch (error) {
        console.error(
            "GET /api/staff/students/:id error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "ไม่สามารถโหลดข้อมูลนักศึกษาได้",
        });
    }
});

/*
  แก้สถานะคำร้องทั้งรายการ

  PATCH /api/staff/students/:id/status

  Body:
  {
    "status": "ผ่าน",
    "note": "ตรวจสอบเอกสารครบถ้วนแล้ว"
  }
*/
router.patch("/students/:id/status", (req, res) => {
    try {
        const applicationId =
            parseApplicationId(req.params.id);

        if (!applicationId) {
            return res.status(400).json({
                success: false,
                message: "รหัสคำร้องไม่ถูกต้อง",
            });
        }

        const status =
            typeof req.body.status === "string"
                ? req.body.status.trim()
                : "";

        const note =
            typeof req.body.note === "string"
                ? req.body.note.trim()
                : "";

        if (!ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "สถานะไม่ถูกต้อง",
                allowedStatuses: ALLOWED_STATUSES,
            });
        }

        if (status === "ต้องแก้ไข" && !note) {
            return res.status(400).json({
                success: false,
                message:
                    "กรุณาระบุหมายเหตุสำหรับรายการที่ต้องแก้ไข",
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

        student.status = status;
        student.note = note;
        student.reviewedAt = new Date().toISOString();

        return res.status(200).json({
            success: true,
            message: "บันทึกผลการตรวจสอบเรียบร้อยแล้ว",
            data: student,
        });
    } catch (error) {
        console.error(
            "PATCH /api/staff/students/:id/status error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "ไม่สามารถบันทึกผลการตรวจสอบได้",
        });
    }
});

/*
  แก้สถานะเอกสารรายไฟล์

  PATCH /api/staff/students/:studentId/documents/:documentId

  Body:
  {
    "status": "ต้องแก้ไข",
    "note": "ภาพไม่ชัด กรุณาอัปโหลดใหม่"
  }
*/
router.patch(
    "/students/:studentId/documents/:documentId",
    (req, res) => {
        try {
            const applicationId =
                parseApplicationId(req.params.studentId);

            const documentId =
                parseApplicationId(req.params.documentId);

            if (!applicationId || !documentId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "รหัสคำร้องหรือรหัสเอกสารไม่ถูกต้อง",
                });
            }

            const status =
                typeof req.body.status === "string"
                    ? req.body.status.trim()
                    : "";

            const note =
                typeof req.body.note === "string"
                    ? req.body.note.trim()
                    : "";

            if (!ALLOWED_STATUSES.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "สถานะเอกสารไม่ถูกต้อง",
                    allowedStatuses: ALLOWED_STATUSES,
                });
            }

            if (status === "ต้องแก้ไข" && !note) {
                return res.status(400).json({
                    success: false,
                    message:
                        "กรุณาระบุเหตุผลที่ต้องแก้ไขเอกสาร",
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
            document.note = note;
            document.reviewedAt =
                new Date().toISOString();

            updateApplicationStatusFromDocuments(student);

            return res.status(200).json({
                success: true,
                message:
                    "บันทึกผลการตรวจเอกสารเรียบร้อยแล้ว",
                data: student,
            });
        } catch (error) {
            console.error(
                "PATCH document status error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "ไม่สามารถบันทึกผลการตรวจเอกสารได้",
            });
        }
    }
);

module.exports = router;