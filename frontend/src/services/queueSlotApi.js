/**
 * src/services/queueSlotApi.js  (frontend)
 * ตัวกลางระหว่างหน้า StaffSettings กับ API รอบเวลาที่มีอยู่แล้ว (staffQueueApi.js)
 *
 * ใช้ staffQueueApi เดิม → GET/PUT /api/staff/queue-slots (routes/staff.js → staffQueueService.js)
 * token / base URL จัดการโดย requestWithAuth ใน api.js อยู่แล้ว ไฟล์นี้แค่แปลงรูปแบบข้อมูล
 *
 * backend ส่งมา:  { from, to, slots: [{ slotId, date, start, end, capacity, status, booked, location, detail }] }
 * StaffSettings ใช้: [{ date, isOpen, location, detail, slots: [{ slotId, startTime, endTime, capacity, isOpen, booked }] }]
 */
import { staffQueueApi } from "./staffQueueApi";

// แถวรอบเวลา (แบนราบ) → จัดกลุ่มเป็นรายวัน
function groupByDay(slots) {
    const map = new Map();
    for (const s of slots) {
        if (!map.has(s.date)) map.set(s.date, []);
        map.get(s.date).push(s);
    }

    return [...map.entries()].map(([date, rows]) => {
        // มีรอบ OPEN อย่างน้อย 1 รอบ = วันนั้นเปิด, ปิดทุกรอบ = ปิดทั้งวัน
        const dayOpen = rows.some((r) => r.status === "OPEN");
        return {
            date,
            isOpen: dayOpen,
            location: rows[0]?.location || "",
            detail: rows[0]?.detail || "",
            slots: rows.map((r) => ({
                slotId: r.slotId,
                startTime: r.start,
                endTime: r.end,
                capacity: Number(r.capacity),
                // ถ้าปิดทั้งวัน ให้รอบเป็น "เปิด" ไว้ เปิดวันกลับมาจะได้ใช้ได้เลย
                isOpen: dayOpen ? r.status === "OPEN" : true,
                booked: Number(r.booked || 0),
            })),
        };
    });
}

/** โหลดรอบเวลาในช่วง from–to (YYYY-MM-DD) → array รายวัน */
export async function loadSlotDays({ from, to }) {
    const data = await staffQueueApi.getSchedule(from, to);
    return groupByDay(data?.slots ?? []);
}

/** บันทึกแบบซิงก์ทั้งวัน: from–to คือช่วงเปิดรับ (รอบที่เปิดอยู่นอกช่วงจะถูกปิดโดย backend) */
export async function saveSlotDays({ from, to, days }) {
    return staffQueueApi.saveSchedule({
        from,
        to,
        days: days.map((d) => ({
            date: d.date,
            open: d.isOpen,
            location: d.location,
            detail: d.detail,
            slots: d.slots.map((s) => ({
                slotId: s.slotId ?? null,
                start: s.startTime,
                end: s.endTime,
                capacity: Number(s.capacity),
                enabled: s.isOpen,
            })),
        })),
    });
}