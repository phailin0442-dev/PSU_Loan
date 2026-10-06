/* eslint-disable react-refresh/only-export-components */
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
| แก้บัค "รีเฟรชแล้วเจ้าหน้าที่กลายเป็นนักศึกษา"
|--------------------------------------------------------------------------
| เดิม role เริ่มต้นเป็น "student" เสมอ แต่ token + user ถูกเก็บใน localStorage
| พอรีเฟรช user ยังเป็นเจ้าหน้าที่ แต่ role กลับเป็น student
|   → เมนูเป็นของนักศึกษา
|   → ไปขอ /api/student/profile/<id เจ้าหน้าที่> แล้วได้ 404
|   → หน้านักศึกษาให้กรอกข้อมูลใหม่หมด
| ตอนนี้ role คำนวณจาก user ที่ login ค้างไว้ และกันไม่ให้บัญชีเจ้าหน้าที่
| ไปโหลดข้อมูลฝั่งนักศึกษา
|--------------------------------------------------------------------------
*/

const STORAGE_TOKEN = "psu_loan_token";
const STORAGE_USER = "psu_loan_user";

function readSavedUser() {
    try {
        const saved = localStorage.getItem(STORAGE_USER);
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
}

const roleOfUser = (user) => (user?.role === "STAFF" ? "staff" : "student");

/*
|--------------------------------------------------------------------------
| แปลงแถวจาก v_application_overview (GET /api/student) ให้เป็นรูปแบบ
| student object ที่หน้าเว็บเดิมใช้อยู่
|--------------------------------------------------------------------------
*/
function mapOverviewRowToStudent(row) {
    const borrowerTypeCode = normalizeBorrowerTypeCode(row.loan_type_code);

    return {
        // pg ส่ง BIGINT กลับมาเป็น string ต้องแปลงเป็น Number
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

        studentInfoCompleted: true,

        // ตรวจแล้วหรือยัง (FAILED ก็ถือว่าตรวจแล้ว)
        eligibilityCompleted: row.eligibility_status !== "PENDING",

        // ผ่านจริง — ใช้ตัวนี้เช็กก่อนปล่อยเข้าหน้าอัปโหลด
        eligibilityPassed: row.eligibility_status === "PASSED",

        documentsCompleted: false,
        currentStep: 3,

        requiredDocuments: [],
        qualificationDocuments: [],
        documents: [],
        parent: null,

        _detailLoaded: false,
    };
}

/*
|--------------------------------------------------------------------------
| รวมผลจาก GET /api/student/:id เข้ากับ student object เดิม
|--------------------------------------------------------------------------
*/
function mergeDetailIntoStudent(student, detail) {
    const requiredDocuments = detail.requiredDocuments || [];

    const PRESCREEN_CATEGORIES = ["GPAX_EVIDENCE", "VOLUNTEER_EVIDENCE"];

    const uploadStageRequirements = requiredDocuments.filter(
        (item) => !PRESCREEN_CATEGORIES.includes(item.documentCode)
    );

    const documentsCompleted =
        uploadStageRequirements.length === 0 ||
        uploadStageRequirements.every((item) => Boolean(item.documentId));

    const qualificationDocuments = requiredDocuments
        .filter((item) => PRESCREEN_CATEGORIES.includes(item.documentCode))
        .filter((item) => item.documentId)
        .map((item) => mapRequiredDocToFrontendDoc(item));

    const documents = requiredDocuments
        .filter((item) => !PRESCREEN_CATEGORIES.includes(item.documentCode))
        .filter((item) => item.documentId)
        .map((item) => mapRequiredDocToFrontendDoc(item));

    const revisionCount = requiredDocuments.reduce(
        (sum, item) => sum + (Number(item.rejectionCount) || 0),
        0
    );

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

    // ผลวันนัดยื่นเอกสารฉบับจริง (เจ้าหน้าที่บันทึกที่หน้าจัดการคิว)
    //   ไม่มาตามนัด (NO_SHOW)      → ไม่สำเร็จ
    //   มาแล้วแต่เอกสารไม่ครบ (FAILED) → ไม่สำเร็จ
    // ใช้ร่วมกันทั้งป้ายสถานะ, popup และหน้าจองคิว
    const signing = detail.signing || null;
    const latestBooking = detail.latestBooking || null;
    const latestStatus = latestBooking?.status || null;

    const noShow = latestStatus === "NO_SHOW";
    // ถ้าจองรอบใหม่หลังจากไม่ผ่าน ผลเก่าไม่นับแล้ว
    const docsFailed =
        !noShow && signing?.status === "FAILED" && (latestStatus === "COMPLETED" || !latestStatus);

    const queueFailed = noShow || docsFailed;
    const queueFailType = noShow ? "NO_SHOW" : docsFailed ? "DOCS_INCOMPLETE" : null;
    const queueFailReason = noShow
        ? "ไม่ได้มายื่นเอกสารตามวันเวลาที่นัดไว้"
        : docsFailed
            ? `เอกสารฉบับจริงไม่ครบถ้วน${signing?.remark ? `: ${signing.remark}` : ""}`
            : "";

    return {
        ...student,
        applicationStatus: queueFailed ? "ไม่สำเร็จ" : student.applicationStatus,
        queueFailed,
        queueFailType,
        queueFailReason,
        latestBooking,
        signingStatus: signing?.status || null,
        signingRemark: signing?.remark || "",
        signingVerifiedAt: signing?.verifiedAt || null,
        signingLocation: signing?.location || "",
        // ชื่อเดิม เผื่อหน้าอื่นใช้อยู่
        documentSubmissionFailed: queueFailed,
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
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [token, setToken] = useState(
        () => localStorage.getItem(STORAGE_TOKEN) || null
    );
    const [currentUser, setCurrentUser] = useState(readSavedUser);

    // ✅ role เริ่มจาก user ที่ login ค้างไว้ (เดิมเป็น "student" เสมอ)
    const [role, setRole] = useState(() => roleOfUser(readSavedUser()));

    const isAuthenticated = Boolean(token && currentUser);
    const isStaffUser = currentUser?.role === "STAFF";

    // หน้าแรกของแต่ละบทบาท ใช้ตอนกดโลโก้ / หลังรีเฟรช
    const homePage = role === "staff" ? "studentList" : "home";

    const [myProfile, setMyProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);

    const currentUserId = currentUser?.userId;

    const refreshMyProfile = useCallback(async () => {
        // ✅ บัญชีเจ้าหน้าที่ไม่มีโปรไฟล์นักศึกษา ไม่ต้องโหลด
        if (!currentUserId || isStaffUser) {
            setMyProfile(null);
            return null;
        }

        setProfileLoading(true);

        try {
            const result = await fetchMyProfile(currentUserId);
            setMyProfile(result.data);
            return result.data;
        } catch {
            setMyProfile(null);
            return null;
        } finally {
            setProfileLoading(false);
        }
    }, [currentUserId, isStaffUser]);

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            if (isAuthenticated && role === "student" && !isStaffUser) {
                void refreshMyProfile();
            } else {
                setMyProfile(null);
            }
        }, 0);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [isAuthenticated, role, isStaffUser, refreshMyProfile]);

    const saveMyProfile = async (payload) => {
        await updateMyProfile(currentUser.userId, payload);
        await refreshMyProfile();
    };

    // ค่า placeholder ที่ backend ใส่ให้ตอนสมัครสมาชิก
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
            localStorage.setItem(STORAGE_TOKEN, nextToken);
            localStorage.setItem(STORAGE_USER, JSON.stringify(nextUser));
        } else {
            localStorage.removeItem(STORAGE_TOKEN);
            localStorage.removeItem(STORAGE_USER);
        }
    };

    const logout = () => {
        persistAuth(null, null);
        setRole("student");
        setMyProfile(null);
        try {
            sessionStorage.removeItem("psu_loan_page");
        } catch {
            // ไม่เป็นไร
        }
    };

    /*
    |----------------------------------------------------------------
    | โหลดรายชื่อคำร้องทั้งหมด
    |----------------------------------------------------------------
    */
    const refreshStudentList = useCallback(
        async ({ selectApplicationId, user } = {}) => {
            setLoading(true);
            setLoadError("");

            // ใช้ user ที่ส่งมา (ตอน login) ก่อน เพราะ state อาจยังไม่อัปเดต
            const activeUser = user ?? currentUser;

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
                        : activeUser && activeUser.role !== "STAFF"
                            ? mapped.find(
                                (student) =>
                                    Number(student.studentUserId) ===
                                    Number(activeUser.userId)
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
        [currentUser]
    );

    useEffect(() => {
        refreshStudentList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = async ({ identifier, password, role: loginRole }) => {
        const result = await loginUser({ identifier, password, role: loginRole });
        const { token: nextToken, user } = result.data;

        persistAuth(nextToken, user);
        setRole(roleOfUser(user));

        if (user.role !== "STAFF") {
            const mapped = await refreshStudentList({ user });
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

        await refreshStudentList({ user });

        return user;
    };

    const createNewApplication = async (payload) => {
        const result = await createApplication(payload);
        await refreshStudentList({
            selectApplicationId: result.data.applicationId,
        });
        return result.data;
    };

    const hasOwnApplication =
        role !== "student" ||
        !isAuthenticated ||
        isStaffUser ||
        students.some(
            (student) =>
                Number(student.studentUserId) === Number(currentUser?.userId)
        );

    /*
    |----------------------------------------------------------------
    | โหลดรายละเอียดของคำร้องที่เลือกอยู่
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
        if (!selectedStudentId) {
            return undefined;
        }

        const current = students.find(
            (student) => student.id === selectedStudentId
        );

        if (!current || current._detailLoaded) {
            return undefined;
        }

        const timerId = window.setTimeout(() => {
            void refreshSelectedStudentDetail();
        }, 0);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [selectedStudentId, students, refreshSelectedStudentDetail]);

    const selectedStudent = useMemo(() => {
        // นักศึกษาที่ login อยู่ เห็นได้แค่คำร้องของตัวเอง
        if (isAuthenticated && role === "student" && currentUser && !isStaffUser) {
            return (
                students.find(
                    (student) =>
                        Number(student.studentUserId) ===
                        Number(currentUser.userId)
                ) || null
            );
        }

        // เจ้าหน้าที่ / ยังไม่ login ใช้ selectedStudentId ปกติ
        return (
            students.find((student) => student.id === selectedStudentId) ||
            students[0] ||
            null
        );
    }, [students, selectedStudentId, isAuthenticated, role, currentUser, isStaffUser]);

    const updateSelectedStudent = (updatedStudent) => {
        setStudents((current) =>
            current.map((student) =>
                student.id === updatedStudent.id ? updatedStudent : student
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
                homePage,
                loading,
                loadError,
                token,
                currentUser,
                isAuthenticated,
                isStaffUser,
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