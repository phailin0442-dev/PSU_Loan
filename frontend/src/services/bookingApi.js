// ============================================================
// การจองวันเวลายื่นเอกสาร — ฝั่งนักศึกษา
// ใช้กับหน้า: Pages/Booking.jsx
// backend:     routes/student.js
// ============================================================
import { requestWithAuth } from "./api";

export const bookingApi = {
    // ดูรอบเวลาที่เปิดให้จอง (ค่าเริ่มต้น 14 วันข้างหน้า)
    getSlots: (days = 14) =>
        requestWithAuth(`/api/student/booking-slots?days=${days}`),

    // ดูว่าคำร้องนี้จองไว้แล้วหรือยัง (ยังไม่จอง = null)
    getActiveBooking: (applicationId) =>
        requestWithAuth(`/api/student/applications/${applicationId}/booking`),

    // จองรอบเวลา (ถ้าจองไว้แล้ว = เปลี่ยนเป็นรอบใหม่)
    book: (applicationId, slotId) =>
        requestWithAuth("/api/student/bookings", {
            method: "POST",
            body: { applicationId, slotId },
        }),

    // ยกเลิกการจอง (ต้องระบุเหตุผล)
    cancel: (applicationId, reason) =>
        requestWithAuth("/api/student/bookings/cancel", {
            method: "POST",
            body: { applicationId, reason },
        }),
};