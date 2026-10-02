/**
 * services/staffQueueService.js
 * เจ้าหน้าที่: ดู/บันทึกรอบเวลายื่นเอกสาร (ตาราง queue_slots)
 *
 * การบันทึกเป็นแบบ "ซิงก์ทั้งวัน": ส่งรอบทั้งหมดของแต่ละวันมา
 *   - รอบที่มี slotId  -> แก้ไข
 *   - รอบที่ไม่มี slotId -> เพิ่มใหม่
 *   - รอบเดิมที่ไม่อยู่ในรายการ -> ลบ (ถ้าเคยมีประวัติการจอง จะเปลี่ยนเป็น CANCELLED แทน)
 * กันไม่ให้กระทบนักศึกษาที่จองแล้ว:
 *   - รอบที่มีผู้จองอยู่ ลบไม่ได้ / เปลี่ยนเวลาไม่ได้ / ลดจำนวนต่ำกว่าผู้จองไม่ได้ (ปิดรอบได้)
 *
 * ช่วงวันที่เจ้าหน้าที่เลือก (from–to) = ช่วงเปิดรับ
 *   - บันทึกแล้ว รอบที่ยังเปิดอยู่นอกช่วงนี้ (ตั้งแต่วันนี้เป็นต้นไป) จะถูกปิด (CLOSED)
 *   - นัดที่นักศึกษาจองไว้แล้วในวันนั้นไม่ถูกยกเลิก แค่จองเพิ่มไม่ได้
 */
const pool = require("../config/db");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_RANGE_DAYS = 62;
const MAX_SLOTS_PER_DAY = 30;

function httpError(status, message, code = "BAD_REQUEST") {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    return error;
}

const toMin = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
};

const bangkokToday = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

const dayCount = (from, to) =>
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;

const dmy = (dateId) => {
    const [y, m, d] = dateId.split("-");
    return `${d}/${m}/${y}`;
};

function isValidDate(value) {
    if (typeof value !== "string" || !DATE_RE.test(value)) return false;
    const d = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function validateRange(from, to) {
    if (!isValidDate(from) || !isValidDate(to)) throw httpError(400, "รูปแบบวันที่ไม่ถูกต้อง");
    if (from > to) throw httpError(400, "วันเริ่มต้นต้องมาก่อนหรือเป็นวันเดียวกับวันสิ้นสุด");
    if (dayCount(from, to) > MAX_RANGE_DAYS) throw httpError(400, `เลือกช่วงวันได้ครั้งละไม่เกิน ${MAX_RANGE_DAYS} วัน`);
}

const SLOT_SELECT = `
    SELECT qs.slot_id,
           qs.queue_date::text AS queue_date,
           to_char(qs.start_time, 'HH24:MI') AS start_time,
           to_char(qs.end_time, 'HH24:MI') AS end_time,
           qs.capacity, qs.slot_status, qs.location, qs.location_detail,
           COUNT(qb.booking_id) FILTER (WHERE qb.booking_status IN ('BOOKED', 'CHECKED_IN'))::int AS booked,
           COUNT(qb.booking_id)::int AS booking_rows
      FROM psu_loan.queue_slots qs
      LEFT JOIN psu_loan.queue_bookings qb ON qb.slot_id = qs.slot_id`;

const toSlot = (r) => ({
    slotId: Number(r.slot_id),
    date: r.queue_date,
    start: r.start_time,
    end: r.end_time,
    capacity: r.capacity,
    status: r.slot_status,
    booked: r.booked,
    location: r.location,
    detail: r.location_detail || "",
});

/* ---------- อ่าน ---------- */

async function getSchedule({ from, to }) {
    validateRange(from, to);

    const result = await pool.query(
        `${SLOT_SELECT}
          WHERE qs.queue_date BETWEEN $1 AND $2
            AND qs.slot_status <> 'CANCELLED'
          GROUP BY qs.slot_id
          ORDER BY qs.queue_date, qs.start_time`,
        [from, to]
    );

    return { from, to, slots: result.rows.map(toSlot) };
}

/* ---------- ตรวจข้อมูลที่ส่งมา ---------- */

function normalizeDays({ from, to, days }) {
    validateRange(from, to);
    if (!Array.isArray(days) || days.length === 0) throw httpError(400, "ไม่มีข้อมูลวันที่จะบันทึก");

    const today = bangkokToday();
    const seen = new Set();

    return days.map((day) => {
        const date = day?.date;
        if (!isValidDate(date) || date < from || date > to) throw httpError(400, "มีวันที่อยู่นอกช่วงที่เลือก");
        if (seen.has(date)) throw httpError(400, `วันที่ ${dmy(date)} ถูกส่งมาซ้ำ`);
        seen.add(date);
        if (date < today) throw httpError(400, `วันที่ ${dmy(date)} ผ่านไปแล้ว แก้ไขไม่ได้`);

        const open = day.open !== false;
        const location = typeof day.location === "string" ? day.location.trim().slice(0, 200) : "";
        const detail = typeof day.detail === "string" ? day.detail.trim().slice(0, 500) : "";
        if (open && !location) throw httpError(400, `กรุณาระบุสถานที่ของวันที่ ${dmy(date)}`);

        if (!Array.isArray(day.slots)) throw httpError(400, `ข้อมูลรอบเวลาวันที่ ${dmy(date)} ไม่ถูกต้อง`);
        if (day.slots.length > MAX_SLOTS_PER_DAY) throw httpError(400, `วันหนึ่งตั้งได้ไม่เกิน ${MAX_SLOTS_PER_DAY} รอบ`);

        const slots = day.slots.map((s) => {
            const slotId = s.slotId == null ? null : Number(s.slotId);
            if (slotId !== null && (!Number.isInteger(slotId) || slotId <= 0)) throw httpError(400, "รหัสรอบเวลาไม่ถูกต้อง");
            if (!TIME_RE.test(s.start || "") || !TIME_RE.test(s.end || "")) {
                throw httpError(400, `กรุณากรอกเวลาให้ครบ วันที่ ${dmy(date)}`);
            }
            if (toMin(s.end) <= toMin(s.start)) {
                throw httpError(400, `รอบ ${s.start}–${s.end} วันที่ ${dmy(date)} เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม`);
            }
            const capacity = Number(s.capacity);
            if (!Number.isInteger(capacity) || capacity < 1 || capacity > 200) {
                throw httpError(400, `จำนวนคนต่อรอบต้องอยู่ระหว่าง 1–200 (วันที่ ${dmy(date)})`);
            }
            return { slotId, start: s.start, end: s.end, capacity, enabled: s.enabled !== false };
        });

        const keys = new Set();
        for (const s of slots) {
            const key = `${s.start}-${s.end}`;
            if (keys.has(key)) throw httpError(400, `มีรอบ ${s.start}–${s.end} ซ้ำกันในวันที่ ${dmy(date)}`);
            keys.add(key);
        }
        if (open) {
            const active = slots.filter((s) => s.enabled);
            for (let i = 0; i < active.length; i++) {
                for (let j = i + 1; j < active.length; j++) {
                    const a = active[i];
                    const b = active[j];
                    if (toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end)) {
                        throw httpError(400, `รอบ ${a.start}–${a.end} กับ ${b.start}–${b.end} วันที่ ${dmy(date)} เวลาทับกัน`);
                    }
                }
            }
        }

        return { date, open, location: location || null, detail: detail || null, slots };
    });
}

/* ---------- บันทึก ---------- */

async function saveSchedule({ from, to, days, staffId }) {
    const normalized = normalizeDays({ from, to, days });

    const staff = await pool.query(`SELECT 1 FROM psu_loan.staff_profiles WHERE staff_id = $1`, [staffId]);
    if (staff.rowCount === 0) {
        throw httpError(403, "บัญชีนี้ยังไม่มีข้อมูลเจ้าหน้าที่ในระบบ จึงบันทึกรอบเวลาไม่ได้", "NOT_STAFF");
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        for (const day of normalized) {
            await client.query(
                `SELECT slot_id FROM psu_loan.queue_slots
                  WHERE queue_date = $1 AND slot_status <> 'CANCELLED' FOR UPDATE`,
                [day.date]
            );
            const existingResult = await client.query(
                `${SLOT_SELECT}
                  WHERE qs.queue_date = $1 AND qs.slot_status <> 'CANCELLED'
                  GROUP BY qs.slot_id`,
                [day.date]
            );
            const existing = new Map(existingResult.rows.map((r) => [Number(r.slot_id), r]));

            for (const s of day.slots) {
                if (s.slotId !== null && !existing.has(s.slotId)) {
                    throw httpError(409, "ข้อมูลรอบเวลาถูกแก้จากที่อื่นแล้ว กรุณาโหลดหน้าใหม่", "STALE");
                }
            }

            // 1) รอบที่ถูกเอาออก
            const keepIds = new Set(day.slots.filter((s) => s.slotId !== null).map((s) => s.slotId));
            for (const [slotId, row] of existing) {
                if (keepIds.has(slotId)) continue;
                if (row.booked > 0) {
                    throw httpError(409,
                        `รอบ ${row.start_time}–${row.end_time} วันที่ ${dmy(day.date)} มีผู้จอง ${row.booked} คน ลบไม่ได้ ให้ปิดรอบแทน`,
                        "SLOT_HAS_BOOKINGS");
                }
                if (row.booking_rows > 0) {
                    await client.query(`UPDATE psu_loan.queue_slots SET slot_status = 'CANCELLED' WHERE slot_id = $1`, [slotId]);
                } else {
                    await client.query(`DELETE FROM psu_loan.queue_slots WHERE slot_id = $1`, [slotId]);
                }
            }

            // 2) แก้ไขรอบเดิม
            for (const s of day.slots.filter((x) => x.slotId !== null)) {
                const row = existing.get(s.slotId);
                const timeChanged = row.start_time !== s.start || row.end_time !== s.end;
                if (row.booked > 0 && timeChanged) {
                    throw httpError(409,
                        `รอบ ${row.start_time}–${row.end_time} วันที่ ${dmy(day.date)} มีผู้จองแล้ว เปลี่ยนเวลาไม่ได้`,
                        "SLOT_HAS_BOOKINGS");
                }
                if (s.capacity < row.booked) {
                    throw httpError(409,
                        `รอบ ${s.start}–${s.end} วันที่ ${dmy(day.date)} มีผู้จองแล้ว ${row.booked} คน ตั้งจำนวนต่ำกว่านี้ไม่ได้`,
                        "CAPACITY_BELOW_BOOKED");
                }
                await client.query(
                    `UPDATE psu_loan.queue_slots
                        SET start_time = $2::time, end_time = $3::time, capacity = $4,
                            slot_status = $5::psu_loan.slot_status_code,
                            location = COALESCE($6, location), location_detail = $7
                      WHERE slot_id = $1`,
                    [s.slotId, s.start, s.end, s.capacity, day.open && s.enabled ? "OPEN" : "CLOSED", day.location, day.detail]
                );
            }

            // 3) เพิ่มรอบใหม่ (ถ้าเวลาตรงกับรอบที่เคยยกเลิก จะเปิดรอบนั้นกลับมาใช้)
            for (const s of day.slots.filter((x) => x.slotId === null)) {
                const inserted = await client.query(
                    `INSERT INTO psu_loan.queue_slots
                        (queue_date, start_time, end_time, capacity, slot_status, created_by, location, location_detail)
                     VALUES ($1, $2::time, $3::time, $4, $5::psu_loan.slot_status_code, $6,
                             COALESCE($7, 'กองพัฒนานักศึกษา อาคาร 2'), $8)
                     ON CONFLICT (queue_date, start_time, end_time) DO UPDATE
                        SET capacity = EXCLUDED.capacity, slot_status = EXCLUDED.slot_status,
                            location = EXCLUDED.location, location_detail = EXCLUDED.location_detail
                      WHERE psu_loan.queue_slots.slot_status = 'CANCELLED'
                     RETURNING slot_id`,
                    [day.date, s.start, s.end, s.capacity, day.open && s.enabled ? "OPEN" : "CLOSED",
                     staffId, day.location, day.detail]
                );
                if (inserted.rowCount === 0) {
                    throw httpError(409, `มีรอบ ${s.start}–${s.end} วันที่ ${dmy(day.date)} อยู่แล้ว`, "DUPLICATE_SLOT");
                }
            }
        }

        // 4) ช่วงวันที่เลือก = ช่วงเปิดรับ
        //    ปิดรอบที่ยังเปิดอยู่นอกช่วง from–to (เฉพาะวันนี้เป็นต้นไป)
        //    นัดที่จองไว้แล้วไม่ถูกยกเลิก แค่จองเพิ่มไม่ได้
        await client.query(
            `UPDATE psu_loan.queue_slots
                SET slot_status = 'CLOSED'
              WHERE slot_status = 'OPEN'
                AND queue_date >= $1
                AND (queue_date < $2 OR queue_date > $3)`,
            [bangkokToday(), from, to]
        );

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") {
            throw httpError(409, "มีรอบเวลาซ้ำกันในวันเดียวกัน กรุณาตรวจเวลาอีกครั้ง", "DUPLICATE_SLOT");
        }
        throw error;
    } finally {
        client.release();
    }

    return getSchedule({ from, to });
}

module.exports = { getSchedule, saveSchedule };