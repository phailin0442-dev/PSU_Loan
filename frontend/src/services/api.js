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

export async function saveApplicationPeriod(payload) {
    const response = await fetch(
        `${API_BASE_URL}/api/staff/application-periods`,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
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

export async function fetchStaffDashboard() {
    const response = await fetch(`${API_BASE_URL}/api/staff/dashboard`);
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