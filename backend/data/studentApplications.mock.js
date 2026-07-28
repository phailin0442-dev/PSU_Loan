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
                fileUrl: "/uploads/documents/loan-contract-6810110001.pdf",
                status: "รอตรวจสอบ",
                note: "",
            },
            {
                id: 2,
                documentType: "ใบเบิกเงิน",
                fileName: "disbursement-6810110001.pdf",
                fileUrl: "/uploads/documents/disbursement-6810110001.pdf",
                status: "รอตรวจสอบ",
                note: "",
            },
            {
                id: 3,
                documentType: "สำเนาบัตรประชาชนนักศึกษา",
                fileName: "student-card-6810110001.jpg",
                fileUrl: "/uploads/documents/student-card-6810110001.jpg",
                status: "รอตรวจสอบ",
                note: "",
            },
            {
                id: 4,
                documentType: "สำเนาบัตรประชาชนผู้ปกครอง",
                fileName: "parent-card-6810110001.jpg",
                fileUrl: "/uploads/documents/parent-card-6810110001.jpg",
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
                fileUrl: "/uploads/documents/loan-contract-6410110025.pdf",
                status: "ผ่าน",
                note: "",
            },
            {
                id: 2,
                documentType: "ใบเบิกเงิน",
                fileName: "disbursement-6410110025.pdf",
                fileUrl: "/uploads/documents/disbursement-6410110025.pdf",
                status: "ผ่าน",
                note: "",
            },
            {
                id: 3,
                documentType: "สำเนาบัตรประชาชนนักศึกษา",
                fileName: "student-card-6410110025.jpg",
                fileUrl: "/uploads/documents/student-card-6410110025.jpg",
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
                fileUrl: "/uploads/documents/disbursement-6510110042.pdf",
                status: "ต้องแก้ไข",
                note: "ภาพเอกสารไม่ชัดเจน กรุณาอัปโหลดใหม่",
            },
            {
                id: 2,
                documentType: "สำเนาบัตรประชาชนนักศึกษา",
                fileName: "student-card-6510110042.jpg",
                fileUrl: "/uploads/documents/student-card-6510110042.jpg",
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
                fileUrl: "/uploads/documents/disbursement-6610110088.pdf",
                status: "รอตรวจสอบ",
                note: "",
            },
            {
                id: 2,
                documentType: "สำเนาบัตรประชาชนนักศึกษา",
                fileName: "student-card-6610110088.jpg",
                fileUrl: "/uploads/documents/student-card-6610110088.jpg",
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
                fileUrl: "/uploads/documents/disbursement-6710110105.pdf",
                status: "ผ่าน",
                note: "",
            },
            {
                id: 2,
                documentType: "สำเนาบัตรประชาชนนักศึกษา",
                fileName: "student-card-6710110105.jpg",
                fileUrl: "/uploads/documents/student-card-6710110105.jpg",
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
                fileUrl: "/uploads/documents/loan-contract-6810110120.pdf",
                status: "ผ่าน",
                note: "",
            },
            {
                id: 2,
                documentType: "ใบเบิกเงิน",
                fileName: "disbursement-6810110120.pdf",
                fileUrl: "/uploads/documents/disbursement-6810110120.pdf",
                status: "ผ่าน",
                note: "",
            },
            {
                id: 3,
                documentType: "สำเนาบัตรประชาชนนักศึกษา",
                fileName: "student-card-6810110120.jpg",
                fileUrl: "/uploads/documents/student-card-6810110120.jpg",
                status: "ต้องแก้ไข",
                note: "บัตรประชาชนหมดอายุ กรุณาอัปโหลดฉบับใหม่",
            },
        ],
    },
];

module.exports = studentApplications;