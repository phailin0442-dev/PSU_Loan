// ============================================================
// รวมฟังก์ชันเรียก backend API ไว้ที่เดียว
// ============================================================

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

async function handleResponse(response) {
    let data = null;

    try {
        data = await response.json();
    } catch {
        // response ไม่ใช่ JSON (เช่น server ล่ม) — ปล่อยให้ตกไป error ด้านล่าง
    }

    if (!response.ok || !data?.success) {
        const message =
            data?.message || `เกิดข้อผิดพลาด (HTTP ${response.status})`;
        throw new Error(message);
    }

    return data;
}

/*
|--------------------------------------------------------------------------
| ฝั่งนักศึกษา
|--------------------------------------------------------------------------
*/

export async function fetchStudentList() {
    const response = await fetch(`${API_BASE_URL}/api/student`);
    return handleResponse(response);
}

export async function fetchStudentDetail(applicationId) {
    const response = await fetch(
        `${API_BASE_URL}/api/student/${applicationId}`
    );
    return handleResponse(response);
}

export async function uploadStudentDocument(
    applicationId,
    { file, requirementId, uploadedBy }
) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("requirementId", requirementId);
    formData.append("uploadedBy", uploadedBy);

    const response = await fetch(
        `${API_BASE_URL}/api/student/${applicationId}/documents`,
        { method: "POST", body: formData }
    );

    return handleResponse(response);
}

/*
|--------------------------------------------------------------------------
| ฝั่งเจ้าหน้าที่
|--------------------------------------------------------------------------
*/

export async function updateHomeContent(payload) {
    const response = await fetch(`${API_BASE_URL}/api/staff/home-content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return handleResponse(response);
}

export async function fetchApplicationPeriods() {
    const response = await fetch(
        `${API_BASE_URL}/api/staff/application-periods`
    );
    return handleResponse(response);
}

// เพิ่มเทอมใหม่เท่านั้น — ถ้าปี+เทอมนี้มีอยู่แล้ว backend จะตอบ error (ไม่เขียนทับ)
export async function saveApplicationPeriod(payload) {
    const response = await fetch(
        `${API_BASE_URL}/api/staff/application-periods`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        }
    );
    return handleResponse(response);
}

// แก้ไขวันที่ของเทอมที่มีอยู่แล้ว (ปี+เทอมเปลี่ยนไม่ได้)
export async function updateApplicationPeriod(periodId, { startDate, endDate, isOpen }) {
    const response = await fetch(
        `${API_BASE_URL}/api/staff/application-periods/${periodId}`,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ startDate, endDate, isOpen }),
        }
    );
    return handleResponse(response);
}

export async function toggleApplicationPeriod(periodId) {
    const response = await fetch(
        `${API_BASE_URL}/api/staff/application-periods/${periodId}/toggle`,
        { method: "PATCH" }
    );
    return handleResponse(response);
}

// กำหนด/ล้างวันเปิด-ปิดจองคิวของเทอม (แยกบันทึกจากช่วงยื่นกู้)
// ส่ง null ทั้งคู่ = ล้างวันจองคิว
export async function saveQueueDates(periodId, { queueStartDate, queueEndDate }) {
    const response = await fetch(
        `${API_BASE_URL}/api/staff/application-periods/${periodId}/queue-dates`,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ queueStartDate, queueEndDate }),
        }
    );
    return handleResponse(response);
}

export async function fetchStaffDashboard() {
    const response = await fetch(`${API_BASE_URL}/api/staff/dashboard`);
    return handleResponse(response);
}

// รายงานผลการตรวจสอบเอกสาร
// ไม่ส่งอะไร = ภาคเรียนล่าสุด, { scope: "all" } = ทุกภาคเรียน
export async function fetchStaffReport({ academicYear, semester, scope } = {}) {
    const params = new URLSearchParams();
    if (scope) params.set("scope", scope);
    if (academicYear) params.set("academicYear", academicYear);
    if (semester) params.set("semester", semester);
    const qs = params.toString();

    const response = await fetch(`${API_BASE_URL}/api/staff/report${qs ? `?${qs}` : ""}`);
    return handleResponse(response);
}

export async function fetchStaffStudentList({ status, search } = {}) {
    const params = new URLSearchParams();

    if (status) params.set("status", status);
    if (search) params.set("search", search);

    const qs = params.toString();

    const response = await fetch(
        `${API_BASE_URL}/api/staff/students${qs ? `?${qs}` : ""}`
    );

    return handleResponse(response);
}

export async function fetchStaffStudentDetail(applicationId) {
    const response = await fetch(
        `${API_BASE_URL}/api/staff/students/${applicationId}`
    );

    return handleResponse(response);
}

export async function updateApplicationStatus(
    applicationId,
    { status, note }
) {
    const response = await fetch(
        `${API_BASE_URL}/api/staff/students/${applicationId}/status`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, note }),
        }
    );

    return handleResponse(response);
}

export async function reviewDocument(
    applicationId,
    documentId,
    { status, note, staffId }
) {
    const response = await fetch(
        `${API_BASE_URL}/api/staff/students/${applicationId}/documents/${documentId}`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, note, staffId }),
        }
    );

    return handleResponse(response);
}

export async function loginUser({ identifier, password, role }) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, role }),
    });
    return handleResponse(response);
}

export async function registerUser(payload) {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return handleResponse(response);
}

export async function fetchMyProfile(userId) {
    const response = await fetch(
        `${API_BASE_URL}/api/student/profile/${userId}`
    );
    return handleResponse(response);
}

export async function updateMyProfile(userId, payload) {
    const response = await fetch(
        `${API_BASE_URL}/api/student/profile/${userId}`,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        }
    );
    return handleResponse(response);
}

export async function createApplication(payload) {
    const response = await fetch(`${API_BASE_URL}/api/student/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return handleResponse(response);
}

export async function fetchHomeContent() {
    const response = await fetch(`${API_BASE_URL}/api/home`);
    return handleResponse(response);
}

export async function fetchStaffList() {
    const response = await fetch(`${API_BASE_URL}/api/staff/list`);
    return handleResponse(response);
}

export async function fetchDocumentHistory(applicationId, requirementId) {
    const response = await fetch(
        `${API_BASE_URL}/api/staff/students/${applicationId}/documents/${requirementId}/history`
    );

    return handleResponse(response);
}

/*
|--------------------------------------------------------------------------
| ตัวช่วยกลางสำหรับ API ที่ต้อง login
|--------------------------------------------------------------------------
| ใช้โดย bookingApi.js (นักศึกษาจองคิว) และ staffQueueApi.js (เจ้าหน้าที่จัดการรอบ)
| - หา token ที่ได้จากการ login ในเบราว์เซอร์ แล้วแนบไปให้อัตโนมัติ
| - คืนค่าเฉพาะส่วน data ของคำตอบ
*/

// token ที่ AppContext เก็บไว้ตอน login (ดู persistAuth ใน AppContext.jsx)
function getToken() {
    try {
        return localStorage.getItem("psu_loan_token");
    } catch {
        return null;
    }
}

export async function requestWithAuth(path, { method = "GET", body } = {}) {
    const token = getToken();
    let response;

    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch {
        const error = new Error("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบว่า backend เปิดอยู่");
        error.code = "NETWORK_ERROR";
        throw error;
    }

    const json = await response.json().catch(() => ({}));

    if (!response.ok || !json.success) {
        const error = new Error(json.message || `เกิดข้อผิดพลาด (HTTP ${response.status})`);
        error.code = json.code; // เช่น SLOT_FULL, UNAUTHORIZED
        error.status = response.status;
        throw error;
    }

    return json.data;
}

/*
|--------------------------------------------------------------------------
| หน้าจัดการคิว (เจ้าหน้าที่) — ต้อง login เป็นเจ้าหน้าที่
|--------------------------------------------------------------------------
*/

// วันและรอบในช่วงจองของเทอม (ไม่ส่ง periodId = ระบบเลือกเทอมที่กำลังเปิดจองให้)
export function fetchQueueBoard(periodId) {
    return requestWithAuth(`/api/staff/queue-board${periodId ? `?periodId=${periodId}` : ""}`);
}

// รายชื่อนักศึกษาในรอบเวลานั้น
export function fetchSlotBookings(slotId) {
    return requestWithAuth(`/api/staff/queue-board/slots/${slotId}`);
}

// บันทึกว่านักศึกษามา (true) หรือไม่มา (false)
export function markAttendance(bookingId, attended) {
    return requestWithAuth(`/api/staff/queue-bookings/${bookingId}/attendance`, {
        method: "PATCH",
        body: { attended },
    });
}

// บันทึกผลตรวจเอกสารฉบับจริง: ครบถ้วน / ไม่ครบถ้วน (ไม่ครบต้องมีเหตุผล)
export function recordDocumentResult(bookingId, { complete, remark }) {
    return requestWithAuth(`/api/staff/queue-bookings/${bookingId}/documents`, {
        method: "PATCH",
        body: { complete, remark },
    });
}

/*
|--------------------------------------------------------------------------
| ข้อความ popup "ยื่นเอกสารไม่สำเร็จ" (แก้ได้ในหน้าตั้งค่า)
|--------------------------------------------------------------------------
*/
export const QUEUE_FAIL_DEFAULTS = {
    title: "ยื่นเอกสารไม่สำเร็จ",
    noShow: "คุณไม่ได้มายื่นเอกสารฉบับจริงตามวันเวลาที่นัดไว้",
    incomplete: "เจ้าหน้าที่ตรวจเอกสารฉบับจริงในวันนัดแล้ว พบว่าเอกสารยังไม่ครบถ้วน",
    contact: "กรุณาติดต่อเจ้าหน้าที่กองทุนฯ ณ กองพัฒนานักศึกษา อาคาร 2 ในวันและเวลาราชการ เพื่อดำเนินการต่อ",
};

export async function fetchQueueFailMessage() {
    const response = await fetch(`${API_BASE_URL}/api/student/messages/queue-fail`);
    return handleResponse(response);
}