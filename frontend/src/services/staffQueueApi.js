// ============================================================
// จัดการรอบเวลายื่นเอกสาร — ฝั่งเจ้าหน้าที่
// ใช้กับหน้า: Pages/staff/StaffBooking.jsx
// backend:     routes/staff.js
// ============================================================
import { requestWithAuth } from "./api";

export const staffQueueApi = {
    // โหลดรอบเวลาที่บันทึกไว้ ระหว่างวันที่ from ถึง to (รูปแบบ YYYY-MM-DD)
    getSchedule: (from, to) =>
        requestWithAuth(`/api/staff/queue-slots?from=${from}&to=${to}`),

    // บันทึกรอบเวลาทั้งช่วง (เพิ่ม / แก้ / ลบ ให้ตรงกับหน้าจอ)
    saveSchedule: (payload) =>
        requestWithAuth("/api/staff/queue-slots", {
            method: "PUT",
            body: payload,
        }),
};