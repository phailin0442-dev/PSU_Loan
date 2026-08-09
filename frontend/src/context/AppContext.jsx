import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    createApplication,
    fetchMyProfile,
    fetchStudentDetail,
    fetchStudentList,
    loginUser,
    registerUser,
    updateMyProfile,
} from "../services/api";
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

        // ผ่านคัดกรองแล้วก็ต่อเมื่อ backend ประเมินผลแล้ว (ไม่ใช่ PENDING) —
        // ใช้แค่บอกว่า "ตรวจแล้วหรือยัง" ไม่ได้แปลว่า "ผ่าน" เสมอไป
        // (ถ้า FAILED ก็ถือว่า "ตรวจแล้ว" เหมือนกัน)
        eligibilityCompleted: row.eligibility_status !== "PENDING",

        // ตัวนี้ต่างหากที่บอกว่า "ผ่านจริง" — ใช้เช็คก่อนปล่อยเข้าหน้า
        // อัปโหลดเอกสาร/โชว์ banner "ผ่านแล้ว" ห้ามใช้ eligibilityCompleted
        // แทนเด็ดขาด เพราะ FAILED ก็จะ true ไปด้วย (บั๊กที่เคยเจอมาแล้ว)
        eligibilityPassed: row.eligibility_status === "PASSED",

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
        periodOpen: detail.periodOpen !== false,
        periodMessage: detail.periodMessage || "",
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

    // สถานะล็อกอินจริง — เก็บ token ไว้ใน localStorage กันหายตอนรีเฟรชหน้า
    // (แยกต่างหากจาก dropdown "นักศึกษาตัวอย่าง" ที่ยังเก็บไว้คู่กันสำหรับ
    // demo/ทดสอบ — ไม่ได้ตัดออก)
    const [token, setToken] = useState(
        () => localStorage.getItem("psu_loan_token") || null
    );
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = localStorage.getItem("psu_loan_user");
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const isAuthenticated = Boolean(token && currentUser);

    // โปรไฟล์ดิบ (student_profiles ตรงๆ) — ไม่ผูกกับคำร้องเลย ใช้ได้
    // ตั้งแต่สมัครสมาชิกเสร็จ แม้ยังไม่มีคำร้องกู้ยืมสักใบก็ตาม
    const [myProfile, setMyProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);

    const refreshMyProfile = useCallback(async () => {
        if (!currentUser?.userId) {
            setMyProfile(null);
            return null;
        }

        setProfileLoading(true);

        try {
            const result = await fetchMyProfile(currentUser.userId);
            setMyProfile(result.data);
            return result.data;
        } catch (error) {
            setMyProfile(null);
            return null;
        } finally {
            setProfileLoading(false);
        }
    }, [currentUser?.userId]);

    useEffect(() => {
        if (isAuthenticated && role === "student") {
            refreshMyProfile();
        } else {
            setMyProfile(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, currentUser?.userId]);

    const saveMyProfile = async (payload) => {
        await updateMyProfile(currentUser.userId, payload);
        await refreshMyProfile();
    };

    // ค่า placeholder ที่ backend ใส่ให้ตอนสมัครสมาชิก (ดู routes/auth.js
    // POST /register) — ใช้เทียบเพื่อรู้ว่า "กรอกข้อมูลจริงแล้วหรือยัง"
    const PLACEHOLDER_VALUES = ["-", "2000-01-01", "00000"];

    const isProfileComplete = Boolean(
        myProfile &&
        myProfile.prefix &&
        !PLACEHOLDER_VALUES.includes(myProfile.prefix) &&
        myProfile.faculty &&
        !PLACEHOLDER_VALUES.includes(myProfile.faculty) &&
        myProfile.major &&
        !PLACEHOLDER_VALUES.includes(myProfile.major) &&
        myProfile.houseNo &&
        !PLACEHOLDER_VALUES.includes(myProfile.houseNo) &&
        myProfile.postalCode &&
        !PLACEHOLDER_VALUES.includes(myProfile.postalCode)
    );

    const persistAuth = (nextToken, nextUser) => {
        setToken(nextToken);
        setCurrentUser(nextUser);

        if (nextToken && nextUser) {
            localStorage.setItem("psu_loan_token", nextToken);
            localStorage.setItem("psu_loan_user", JSON.stringify(nextUser));
        } else {
            localStorage.removeItem("psu_loan_token");
            localStorage.removeItem("psu_loan_user");
        }
    };

    const logout = () => {
        persistAuth(null, null);
        setRole("student");
    };

    const login = async ({ identifier, password, role: loginRole }) => {
        const result = await loginUser({ identifier, password, role: loginRole });
        const { token: nextToken, user } = result.data;

        persistAuth(nextToken, user);

        if (user.role === "STAFF") {
            setRole("staff");
        } else {
            setRole("student");
            // รีโหลดลิสต์ใหม่ทั้งหมด แล้วให้ฟังก์ชันเลือกคำร้องของตัวเอง
            // ให้อัตโนมัติ (ถ้ามี) —ใช้ user จาก response ตรงๆ แทน currentUser
            // เพราะ state ยังไม่อัปเดตทันในรอบ render เดียวกัน
            const mapped = await refreshStudentList();
            const own = mapped.find(
                (student) =>
                    Number(student.studentUserId) === Number(user.userId)
            );
            if (own) setSelectedStudentId(own.id);
        }

        return user;
    };

    const register = async (payload) => {
        const result = await registerUser(payload);
        const { token: nextToken, user } = result.data;

        persistAuth(nextToken, user);
        setRole("student");

        // สมัครใหม่ยังไม่มีคำร้อง (application) เลย — refresh ลิสต์ไว้
        // เผื่อมีอยู่แล้ว (เช่นกรณีสมัครซ้ำ) แต่ตามปกติจะไม่เจอ ต้องไปสร้าง
        // คำร้องใหม่ผ่าน createNewApplication() ที่หน้าคัดกรองต่อ
        await refreshStudentList();

        return user;
    };

    // สร้างคำร้องกู้ยืมใหม่ (ใช้ตอนบัญชีที่ login อยู่ยังไม่มีคำร้องเลย)
    // แล้ว refresh + เลือกคำร้องที่เพิ่งสร้างให้อัตโนมัติ
    const createNewApplication = async (payload) => {
        const result = await createApplication(payload);
        await refreshStudentList({
            selectApplicationId: result.data.applicationId,
        });
        return result.data;
    };

    // มีคำร้องเป็นของตัวเองอยู่แล้วไหม (ใช้เช็คว่าต้องพาไปสร้างคำร้องใหม่
    // ก่อนไหม สำหรับบัญชีที่เพิ่ง register)
    const hasOwnApplication =
        role !== "student" ||
        !isAuthenticated ||
        students.some(
            (student) =>
                Number(student.studentUserId) === Number(currentUser?.userId)
        );

    /*
    |----------------------------------------------------------------
    | โหลดรายชื่อคำร้องทั้งหมดจาก backend ตอนเปิดแอปครั้งแรก
    |----------------------------------------------------------------
    */
    const refreshStudentList = useCallback(
        async ({ selectApplicationId } = {}) => {
            setLoading(true);
            setLoadError("");

            try {
                const result = await fetchStudentList();
                const mapped = (result.data || []).map(
                    mapOverviewRowToStudent
                );

                setStudents(mapped);

                if (mapped.length > 0) {
                    const preferred = selectApplicationId
                        ? mapped.find(
                            (student) => student.id === selectApplicationId
                        )
                        : currentUser
                            ? mapped.find(
                                (student) =>
                                    Number(student.studentUserId) ===
                                    Number(currentUser.userId)
                            )
                            : null;

                    setSelectedStudentId(
                        preferred ? preferred.id : mapped[0].id
                    );
                }

                return mapped;
            } catch (error) {
                setLoadError(
                    error.message ||
                    "โหลดรายชื่อนักศึกษาจากเซิร์ฟเวอร์ไม่สำเร็จ"
                );
                return [];
            } finally {
                setLoading(false);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [currentUser]
    );

    useEffect(() => {
        refreshStudentList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const selectedStudent = useMemo(() => {
        // ถ้า login เป็นนักศึกษาจริงอยู่ ต้องเห็นแค่ข้อมูลของตัวเองเท่านั้น
        // ห้าม fallback ไปโชว์คนอื่นเด็ดขาด (ต่อให้หาไม่เจอเพราะยังไม่มี
        // คำร้องเลยก็ตาม — คืน null ไปดีกว่าโชว์ข้อมูลผิดคน)
        if (isAuthenticated && role === "student" && currentUser) {
            return (
                students.find(
                    (student) =>
                        Number(student.studentUserId) ===
                        Number(currentUser.userId)
                ) || null
            );
        }

        // กรณีอื่น (ยังไม่ login / เป็นเจ้าหน้าที่) ใช้ selectedStudentId ปกติ
        return (
            students.find(
                (student) => student.id === selectedStudentId
            ) ||
            students[0] ||
            null
        );
    }, [students, selectedStudentId, isAuthenticated, role, currentUser]);

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
                token,
                currentUser,
                isAuthenticated,
                login,
                register,
                logout,
                createNewApplication,
                hasOwnApplication,
                refreshStudentList,
                myProfile,
                profileLoading,
                refreshMyProfile,
                saveMyProfile,
                isProfileComplete,
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