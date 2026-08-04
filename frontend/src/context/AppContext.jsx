import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import { fetchStudentDetail, fetchStudentList } from "../services/api";
import {
    mapApplicationStatusToLabel,
    mapBackendStatusToLabel,
    normalizeBorrowerTypeCode,
} from "../rules/documentRules";

const AppContext = createContext(null);

/*
|--------------------------------------------------------------------------
| แปลงแถวจาก v_application_overview (GET /api/student) ให้เป็นรูปแบบ
| student object ที่หน้าเว็บเดิมใช้อยู่ (ตั้งใจให้ field ตรงกับ mockData.js
| เดิมมากที่สุด เพื่อลดจุดที่ต้องแก้ในหน้าอื่นๆ)
|--------------------------------------------------------------------------
| หมายเหตุ: field บางตัวใน mockData.js เดิม (nationality, religion,
| maritalStatus, studentInfoCompleted, eligibilityCompleted,
| currentStep ฯลฯ) ไม่มีอยู่ใน schema จริง เพราะ backend ยังไม่มีระบบ
| ติดตาม flow เหล่านี้ — ใส่ค่า default ไปก่อนเพื่อไม่ให้หน้าอื่นพัง
| ยังไม่ใช่ของจริงจนกว่าจะทำ endpoint ที่เกี่ยวข้องเพิ่ม
|--------------------------------------------------------------------------
*/
function mapOverviewRowToStudent(row) {
    const borrowerTypeCode = normalizeBorrowerTypeCode(row.loan_type_code);

    return {
        // pg ส่งคอลัมน์ BIGINT (application_id, student_user_id) กลับมาเป็น
        // string เสมอ ("2" ไม่ใช่ 2) ต้องแปลงเป็น Number ตรงนี้ ไม่งั้นจะเทียบ
        // กับ selectedStudentId (ที่ AppNavbar แปลงเป็น Number ไว้แล้ว) ไม่ตรงกัน
        // แล้ว selectedStudent จะ fallback ไปที่ students[0] ตลอดไม่ว่าจะเลือกใคร
        id: Number(row.application_id),
        demoLabel: `${row.loan_type_name}${row.semester === 2 ? " ภาคเรียน 2" : ""
            }`,

        studentUserId: Number(row.student_user_id),
        studentId: row.student_code,
        studentCode: row.student_code,
        prefix: row.prefix,
        firstName: row.first_name,
        lastName: row.last_name,
        fullName: row.student_name,
        fullname: row.student_name,

        birthDate: row.birth_date,
        birthdate: row.birth_date,
        age: row.age,

        faculty: row.faculty,
        major: row.major,
        year: row.year_level,
        yearLevel: String(row.year_level),

        academicYear: row.academic_year,
        semester: row.semester,

        borrowerTypeCode,
        loanTypeCode: borrowerTypeCode,
        borrowerType: row.loan_type_name,
        loanTypeName: row.loan_type_name,

        gpax: row.gpax,
        volunteerHours: row.volunteer_hours,

        eligibilityStatus: row.eligibility_status,
        applicationStatus: mapApplicationStatusToLabel(
            row.application_status
        ),
        applicationStatusCode: row.application_status,

        // ยังไม่มี endpoint ติดตาม flow "กรอกข้อมูลส่วนตัว" จริง แต่ในทางปฏิบัติ
        // แถวใน student_profiles จะมีครบทุกฟิลด์เสมอ (NOT NULL ทุกคอลัมน์หลัก)
        // เพราะงั้นถ้าดึงคำร้องมาได้ แปลว่าโปรไฟล์กรอกครบแล้วจริง
        studentInfoCompleted: true,

        // ผ่านคัดกรองแล้วก็ต่อเมื่อ backend ประเมินผลแล้ว (ไม่ใช่ PENDING)
        eligibilityCompleted: row.eligibility_status !== "PENDING",

        // ต้องรอโหลดรายละเอียด (requiredDocuments) ก่อนถึงจะรู้ว่าอัปโหลดครบ
        // ไหม ใส่ false ไปก่อน แล้วไปคำนวณจริงใน mergeDetailIntoStudent
        documentsCompleted: false,
        currentStep: 3,

        // เอกสารต้องดึงเพิ่มผ่าน GET /api/student/:id (ดู loadStudentDetail)
        requiredDocuments: [],
        qualificationDocuments: [],
        documents: [],
        parent: null,

        _detailLoaded: false,
    };
}

/*
|--------------------------------------------------------------------------
| แปลงผลลัพธ์จาก GET /api/student/:id (รายละเอียด + requiredDocuments)
| มารวมเข้ากับ student object เดิม
|--------------------------------------------------------------------------
*/
function mergeDetailIntoStudent(student, detail) {
    const requiredDocuments = detail.requiredDocuments || [];

    // อัปโหลดครบแล้วก็ต่อเมื่อทุก requirement (ยกเว้นกลุ่มคัดกรอง
    // GPAX/จิตอาสา ที่อัปโหลดไปแล้วตั้งแต่หน้า Eligibility) มี documentId
    // จริง — ต้องกรองกลุ่มเดียวกับที่ UploadDocuments.jsx ไม่บังคับอัปโหลดซ้ำ
    const PRESCREEN_CATEGORIES = ["GPAX_EVIDENCE", "VOLUNTEER_EVIDENCE"];

    const uploadStageRequirements = requiredDocuments.filter(
        (item) => !PRESCREEN_CATEGORIES.includes(item.documentCode)
    );

    const documentsCompleted =
        uploadStageRequirements.length === 0 ||
        uploadStageRequirements.every((item) => Boolean(item.documentId));

    // เอกสารกลุ่มคัดกรอง (ภาคเรียน 1) แยกจากเอกสารกลุ่มอื่น เหมือนโครงสร้างเดิม
    const qualificationDocuments = requiredDocuments
        .filter((item) =>
            ["GPAX_EVIDENCE", "VOLUNTEER_EVIDENCE"].includes(
                item.documentCode
            )
        )
        .filter((item) => item.documentId)
        .map((item) => mapRequiredDocToFrontendDoc(item));

    const documents = requiredDocuments
        .filter(
            (item) =>
                !["GPAX_EVIDENCE", "VOLUNTEER_EVIDENCE"].includes(
                    item.documentCode
                )
        )
        .filter((item) => item.documentId)
        .map((item) => mapRequiredDocToFrontendDoc(item));

    // จำนวนครั้งที่ถูกตีกลับสะสม "รวมทุกเอกสาร ทุกรอบ" (ไม่ใช่แค่นับว่า
    // ตอนนี้ค้างอยู่กี่ใบ) ให้ตรงกับความหมายเดียวกับที่หน้าเจ้าหน้าที่ใช้
    // (rejectionCount ต่อเอกสาร) — Home.jsx จะอ่านจาก field นี้โดยตรง
    const revisionCount = requiredDocuments.reduce(
        (sum, item) => sum + (Number(item.rejectionCount) || 0),
        0
    );

    // ประวัติการเปลี่ยนสถานะคำร้อง — แปลรหัสสถานะเป็นข้อความไทยไว้ล่วงหน้า
    // ให้หน้า Status.jsx ใช้แสดงตารางได้เลยไม่ต้องแปลเอง
    const statusHistory = (detail.statusHistory || []).map((item) => ({
        oldStatus: item.oldStatus,
        newStatus: item.newStatus,
        oldStatusLabel: item.oldStatus
            ? mapApplicationStatusToLabel(item.oldStatus)
            : "-",
        newStatusLabel: mapApplicationStatusToLabel(item.newStatus),
        remark: item.remark || "",
        changedAt: item.changedAt,
    }));

    // ประวัติการตรวจ/ตีกลับรายไฟล์แบบละเอียด (ไฟล์ไหน รอบที่เท่าไหร่
    // ใครตรวจ เหตุผลอะไร) — ใช้แทนที่ statusHistory แบบทั่วไปในตาราง
    // "ประวัติการยื่นคำขอ" ที่หน้า Status.jsx
    const documentReviewHistory = (detail.documentReviewHistory || []).map(
        (item) => ({
            round: item.round,
            documentName: item.documentName,
            versionNo: item.versionNo,
            oldStatusLabel: item.oldStatus
                ? mapBackendStatusToLabel(item.oldStatus)
                : "-",
            newStatusLabel: mapBackendStatusToLabel(item.newStatus),
            reason: item.reason || "-",
            reviewedByName: item.reviewedByName?.trim() || "-",
            reviewedAt: item.reviewedAt,
        })
    );

    return {
        ...student,
        parent: detail.parent || null,
        requiredDocuments,
        qualificationDocuments,
        documents,
        documentsCompleted,
        revisionCount,
        statusHistory,
        documentReviewHistory,
        _detailLoaded: true,
    };
}

function mapRequiredDocToFrontendDoc(item) {
    // import ตรงนี้เพื่อเลี่ยง circular import ตอน build (จะย้ายไป top ถ้าจำเป็น)
    const category =
        item.documentCode === "DISBURSEMENT_FORM"
            ? "WITHDRAWAL_FORM"
            : item.documentCode;

    const statusMap = {
        PENDING: "รอตรวจสอบ",
        APPROVED: "ผ่าน",
        REVISION_REQUIRED: "ต้องแก้ไข",
    };

    return {
        id: item.documentId,
        requirementId: item.requirementId,
        category,
        name: item.documentType,
        fileName: item.fileName || "-",
        status: statusMap[item.status] || item.status || "รอตรวจสอบ",
        remark: item.note || "",
    };
}

export function AppProvider({ children }) {
    const [students, setStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [role, setRole] = useState("student");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    /*
    |----------------------------------------------------------------
    | โหลดรายชื่อคำร้องทั้งหมดจาก backend ตอนเปิดแอปครั้งแรก
    |----------------------------------------------------------------
    */
    useEffect(() => {
        let cancelled = false;

        async function loadStudents() {
            setLoading(true);
            setLoadError("");

            try {
                const result = await fetchStudentList();
                const mapped = (result.data || []).map(
                    mapOverviewRowToStudent
                );

                if (cancelled) return;

                setStudents(mapped);

                if (mapped.length > 0) {
                    setSelectedStudentId(mapped[0].id);
                }
            } catch (error) {
                if (!cancelled) {
                    setLoadError(
                        error.message ||
                        "โหลดรายชื่อนักศึกษาจากเซิร์ฟเวอร์ไม่สำเร็จ"
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadStudents();

        return () => {
            cancelled = true;
        };
    }, []);

    /*
    |----------------------------------------------------------------
    | โหลดรายละเอียด (เอกสาร/ผู้ปกครอง) ของคนที่เลือกอยู่ตอนนี้
    | เรียกซ้ำได้ทุกครั้งที่อยากรีเฟรช เช่น หลังอัปโหลด/ตรวจเอกสารเสร็จ
    |----------------------------------------------------------------
    */
    const refreshSelectedStudentDetail = useCallback(async () => {
        if (!selectedStudentId) return;

        try {
            const result = await fetchStudentDetail(selectedStudentId);

            setStudents((current) =>
                current.map((student) =>
                    student.id === selectedStudentId
                        ? mergeDetailIntoStudent(student, result.data)
                        : student
                )
            );
        } catch (error) {
            setLoadError(
                error.message || "โหลดรายละเอียดคำร้องไม่สำเร็จ"
            );
        }
    }, [selectedStudentId]);

    useEffect(() => {
        if (!selectedStudentId) return;

        const current = students.find(
            (student) => student.id === selectedStudentId
        );

        if (current && !current._detailLoaded) {
            refreshSelectedStudentDetail();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStudentId]);

    const selectedStudent = useMemo(
        () =>
            students.find(
                (student) => student.id === selectedStudentId
            ) || students[0] || null,
        [students, selectedStudentId]
    );

    // เก็บไว้เผื่อหน้าไหนยังเรียกใช้แบบ optimistic local update อยู่
    // (เช่นตอนพิมพ์หมายเหตุในฟอร์มก่อนกดส่งจริง)
    const updateSelectedStudent = (updatedStudent) => {
        setStudents((current) =>
            current.map((student) =>
                student.id === updatedStudent.id
                    ? updatedStudent
                    : student
            )
        );
    };

    return (
        <AppContext.Provider
            value={{
                students,
                setStudents,
                selectedStudent,
                selectedStudentId,
                setSelectedStudentId,
                updateSelectedStudent,
                refreshSelectedStudentDetail,
                role,
                setRole,
                loading,
                loadError,
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);

    if (!context) {
        throw new Error("useApp ต้องใช้อยู่ภายใน AppProvider");
    }

    return context;
}