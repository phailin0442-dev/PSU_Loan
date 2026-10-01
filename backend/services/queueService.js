/**
 * services/queueService.js  (แทนไฟล์เดิมทั้งไฟล์)
 * การจองวันเวลายื่นเอกสาร ฝั่งนักศึกษา
 *
 * แทนที่ของเดิม:
 *   getAvailableQueueSlots  ->  getBookableSlots
 *   createQueueBooking      ->  bookSlot  (รองรับเปลี่ยนนัด + ตรวจเจ้าของคำร้อง)
 * ของใหม่:
 *   getActiveBooking, cancelBooking
 * ใช้ฟังก์ชัน/วิวจาก booking_backend.sql:
 *   v_bookable_slots, v_active_booking, book_queue_slot(), cancel_queue_booking()
 *
 * error ที่โยนออกไปมี .status + .message (ภาษาไทย) + .code ตาม pattern เดิมของโปรเจกต์
 * route จึงตอบกลับแบบ res.status(error.status || 500).json({ message: error.message }) ได้เลย
 */
const pool = require("../config/db");

const DB_ERRORS = {
    APPLICATION_NOT_FOUND: [404, "ไม่พบคำร้องกู้ยืม"],
    FORBIDDEN: [403, "ไม่มีสิทธิ์จัดการการจองของคำร้องนี้"],
    APPLICATION_NOT_READY: [409, "คำร้องยังไม่อยู่ในสถานะที่จองได้"],
    SLOT_NOT_FOUND: [404, "ไม่พบช่วงเวลาที่เลือก"],
    SLOT_CLOSED: [409, "ช่วงเวลานี้ปิดรับจองแล้ว กรุณาเลือกช่วงเวลาอื่น"],
    SLOT_IN_PAST: [409, "ช่วงเวลานี้ผ่านไปแล้ว กรุณาเลือกช่วงเวลาอื่น"],
    SLOT_FULL: [409, "ช่วงเวลานี้เต็มแล้ว กรุณาเลือกช่วงเวลาอื่น"],
    ALREADY_CHECKED_IN: [409, "คุณเช็กอินแล้ว ไม่สามารถเปลี่ยนแปลงการจองได้"],
    NO_ACTIVE_BOOKING: [404, "ไม่พบการจองที่ใช้งานอยู่"],
    BOOKING_STARTED: [409, "ถึงเวลานัดแล้ว ไม่สามารถยกเลิกทางระบบได้ กรุณาติดต่อเจ้าหน้าที่"],
    REASON_REQUIRED: [400, "กรุณาระบุเหตุผลการยกเลิก"],
};

function httpError(status, message, code) {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    return error;
}

// แปลง error จาก PostgreSQL เป็น error ที่ route ส่งให้ frontend ได้
function toHttpError(error) {
    if (error.code === "P0001" && DB_ERRORS[error.message]) {
        const [status, message] = DB_ERRORS[error.message];
        return httpError(status, message, error.message);
    }
    // จาก trigger เดิม prevent_queue_overbooking
    if (/Queue slot \d+ is full/.test(error.message || "")) {
        return httpError(409, DB_ERRORS.SLOT_FULL[1], "SLOT_FULL");
    }
    if (error.code === "23505") {
        return httpError(409, "ข้อมูลการจองมีการเปลี่ยนแปลง กรุณารีเฟรชหน้าแล้วลองใหม่", "CONFLICT");
    }
    return error; // error อื่น ๆ ให้ route ตอบ 500
}

function parsePositiveInteger(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function requireId(value, message) {
    const id = parsePositiveInteger(value);
    if (!id) throw httpError(400, message, "BAD_REQUEST");
    return id;
}

// แปลงวันที่/เวลาเป็นข้อความใน SQL เพื่อไม่ให้ timezone ของ Node เลื่อนวัน
const BOOKING_COLUMNS = `
    booking_id, application_id, slot_id,
    queue_date::text AS queue_date,
    to_char(start_time, 'HH24:MI') AS start_time,
    to_char(end_time, 'HH24:MI') AS end_time,
    booking_status, booked_at, location, location_detail`;

const toSlot = (row) => ({
    slotId: Number(row.slot_id),
    date: row.queue_date, // "YYYY-MM-DD"
    startTime: row.start_time, // "HH:MM"
    endTime: row.end_time,
    capacity: row.capacity,
    booked: row.booked_count,
    remaining: Math.max(0, row.remaining_capacity),
    location: row.location,
    detail: row.location_detail || "",
});

const toBooking = (row) =>
    row
        ? {
              bookingId: Number(row.booking_id),
              applicationId: Number(row.application_id),
              slotId: Number(row.slot_id),
              date: row.queue_date,
              startTime: row.start_time,
              endTime: row.end_time,
              status: row.booking_status,
              bookedAt: row.booked_at,
              location: row.location,
              detail: row.location_detail || "",
          }
        : null;

// เจ้าของคำร้อง หรือเจ้าหน้าที่ เท่านั้น
async function assertCanAccessApplication(applicationId, userId) {
    const result = await pool.query(
        `SELECT a.student_id,
                EXISTS (SELECT 1 FROM psu_loan.staff_profiles s WHERE s.staff_id = $2) AS is_staff
           FROM psu_loan.applications a
          WHERE a.application_id = $1`,
        [applicationId, userId]
    );

    if (result.rowCount === 0) throw httpError(404, DB_ERRORS.APPLICATION_NOT_FOUND[1], "APPLICATION_NOT_FOUND");

    const { student_id: studentId, is_staff: isStaff } = result.rows[0];
    if (Number(studentId) !== Number(userId) && !isStaff) {
        throw httpError(403, DB_ERRORS.FORBIDDEN[1], "FORBIDDEN");
    }
}

/* ---------- public ---------- */

async function getBookableSlots({ days } = {}) {
    const parsedDays = Math.min(Math.max(parseInt(days, 10) || 14, 1), 60);

    const result = await pool.query(
        `SELECT slot_id, queue_date::text AS queue_date,
                to_char(start_time, 'HH24:MI') AS start_time,
                to_char(end_time, 'HH24:MI') AS end_time,
                capacity, booked_count, remaining_capacity, location, location_detail
           FROM psu_loan.v_bookable_slots
          WHERE queue_date <= (now() AT TIME ZONE 'Asia/Bangkok')::date + $1::int
          ORDER BY queue_date, start_time`,
        [parsedDays]
    );

    return result.rows.map(toSlot);
}

async function getActiveBooking({ applicationId, userId }) {
    const appId = requireId(applicationId, "รหัสคำร้องไม่ถูกต้อง");

    try {
        await assertCanAccessApplication(appId, userId);
        const result = await pool.query(
            `SELECT ${BOOKING_COLUMNS} FROM psu_loan.v_active_booking WHERE application_id = $1`,
            [appId]
        );
        return toBooking(result.rows[0]);
    } catch (error) {
        throw toHttpError(error);
    }
}

// จองใหม่ หรือเปลี่ยนนัด (ฟังก์ชันใน DB ยกเลิกนัดเดิมให้ใน transaction เดียว)
async function bookSlot({ applicationId, slotId, userId }) {
    const appId = requireId(applicationId, "รหัสคำร้องไม่ถูกต้อง");
    const parsedSlotId = requireId(slotId, "กรุณาเลือกช่วงเวลา");

    try {
        const booked = await pool.query(
            `SELECT booking_id FROM psu_loan.book_queue_slot($1, $2, $3)`,
            [appId, parsedSlotId, userId]
        );
        const result = await pool.query(
            `SELECT ${BOOKING_COLUMNS} FROM psu_loan.v_active_booking WHERE booking_id = $1`,
            [booked.rows[0].booking_id]
        );
        return toBooking(result.rows[0]);
    } catch (error) {
        throw toHttpError(error);
    }
}

async function cancelBooking({ applicationId, reason, userId }) {
    const appId = requireId(applicationId, "รหัสคำร้องไม่ถูกต้อง");
    const cleanReason = typeof reason === "string" ? reason.trim().slice(0, 300) : "";
    if (!cleanReason) throw httpError(400, DB_ERRORS.REASON_REQUIRED[1], "REASON_REQUIRED");

    try {
        const result = await pool.query(
            `SELECT booking_id, booking_status, cancelled_at
               FROM psu_loan.cancel_queue_booking($1, $2, $3)`,
            [appId, userId, cleanReason]
        );
        const row = result.rows[0];
        return {
            bookingId: Number(row.booking_id),
            status: row.booking_status,
            cancelledAt: row.cancelled_at,
        };
    } catch (error) {
        throw toHttpError(error);
    }
}

module.exports = {
    getBookableSlots,
    getActiveBooking,
    bookSlot,
    cancelBooking,
};