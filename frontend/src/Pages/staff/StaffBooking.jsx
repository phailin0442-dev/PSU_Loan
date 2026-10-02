import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { staffQueueApi } from "../../services/staffQueueApi";


/**
 * หน้าเจ้าหน้าที่: กำหนดวันและรอบยื่นเอกสาร (เชื่อม backend: /api/queue-slots)
 *
 * - เปิดหน้า/สร้างตารางวัน: โหลดรอบที่บันทึกไว้ในช่วงนั้นจากฐานข้อมูล
 *   วันที่ยังไม่มีรอบในระบบ จะขึ้นรอบตั้งต้นให้ (ยังไม่บันทึกจนกว่าจะกดบันทึก)
 * - รอบที่มีผู้จองแล้ว: เปลี่ยนเวลา/ลบไม่ได้, ลดจำนวนต่ำกว่าผู้จองไม่ได้ (ปิดรอบได้)
 *
 * ปรับจากเดิม
 * - เลือกวันด้วยปฏิทินที่แสดงเป็น DD/MM/YYYY เสมอ (ไม่ขึ้นกับภาษาเบราว์เซอร์)
 * - เปิดรับได้ทุกวันรวมเสาร์-อาทิตย์, ปิดรับทั้งวันได้ (เช่น วันหยุดนักขัตฤกษ์)
 * - การ์ดวันมีแถบโควตา และบอกเป็นข้อความเมื่อยังไม่มีรอบหรือมีจุดต้องแก้
 * - รอบเวลา: สวิตช์เปิด/ปิด, ปุ่ม −/+ จำนวนคน, ตรวจเวลาทับกัน/เวลาสิ้นสุดก่อนเริ่ม
 * - คัดลอกการตั้งค่าไปทุกวัน, ตั้งจำนวนคนทุกรอบพร้อมกัน
 * - สรุปรายวัน + ภาพรวมทั้งช่วง + รายการที่ต้องแก้ก่อนบันทึก
 * - แก้บั๊กวันที่เลื่อน 1 วัน (เดิมใช้ toISOString ซึ่งเป็นเวลา UTC)
 */

const DEFAULT_LOCATION = "กองพัฒนานักศึกษา อาคาร 2";
const DEFAULT_DETAIL = "กรุณานำเอกสารฉบับจริงมายื่นตามวันและเวลาที่จอง";
const SLOT_MINUTES = 30;



// ฟอนต์สำหรับตัวเลขเท่านั้น
const NUM_FONT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600&family=Sarabun:wght@400;500;600;700;800&display=swap');
.sb-num { font-family: 'Prompt', 'Sarabun', sans-serif; font-variant-numeric: tabular-nums; letter-spacing: 0; }
`;

/* ---------- helpers ---------- */

let uid = 0;
const newId = () => `s${Date.now().toString(36)}${(uid++).toString(36)}`;



// วันที่แบบเวลาท้องถิ่น (ไม่ใช้ toISOString เพราะเป็น UTC ทำให้วันเลื่อนในไทย)
function toDateId(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(dateId, n) {
  const d = new Date(`${dateId}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toDateId(d);
}

const todayId = () => toDateId(new Date());

function formatDate(value, options) {
  return new Intl.DateTimeFormat("th-TH", options).format(
    new Date(`${value}T00:00:00`),
  );
}

const toMin = (hhmm) => {
  const [h, m] = (hhmm || "0:0").split(":").map(Number);
  return h * 60 + m;
};
const toTime = (min) => {
  const clamped = Math.min(Math.max(min, 0), 23 * 60 + 59);
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
};

function newDay(id) {
  return {
    id,
    open: true,
    location: DEFAULT_LOCATION,
    detail: DEFAULT_DETAIL,
    slots: [],
    saved: false,
  };
}

// แปลงรอบจาก API เป็นวัน; วันที่มีใน keepDays (แก้ค้างไว้ในหน้า) จะใช้ของเดิม
function daysFromServer(from, to, serverSlots, keepDays = []) {
  const keep = new Map(keepDays.map((d) => [d.id, d]));
  const byDate = new Map();
  for (const s of serverSlots) {
    if (!byDate.has(s.date)) byDate.set(s.date, []);
    byDate.get(s.date).push(s);
  }
  const result = [];
  for (let id = from; id <= to; id = addDays(id, 1)) {
    if (keep.has(id)) {
      result.push(keep.get(id));
      continue;
    }
    const rows = byDate.get(id);
    if (!rows) {
      result.push(newDay(id));
      continue;
    }
    // วันที่ทุกรอบเป็น CLOSED = ปิดรับทั้งวัน (เปิดกลับมาแล้วรอบจะกลับมาเปิดทั้งหมด)
    const open = rows.some((r) => r.status === "OPEN");
    result.push({
      id,
      open,
      location: rows[0].location || DEFAULT_LOCATION,
      detail: rows[0].detail || "",
      saved: true,
      slots: rows.map((r) => ({
        id: `db${r.slotId}`,
        slotId: r.slotId,
        start: r.start,
        end: r.end,
        capacity: r.capacity,
        enabled: open ? r.status === "OPEN" : true,
        booked: r.booked,
      })),
    });
  }
  return result;
}

const dayCount = (from, to) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86400000,
  ) + 1;

// ตรวจรอบเวลาในวันเดียว: คืน { [slotId]: ข้อความ }
function validateSlots(slots) {
  const errors = {};
  const active = slots.filter((s) => s.enabled);
  for (const s of active) {
    if (!s.start || !s.end) errors[s.id] = "กรอกเวลาให้ครบ";
    else if (toMin(s.end) <= toMin(s.start))
      errors[s.id] = "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม";
  }
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      if (errors[a.id] || errors[b.id]) continue;
      if (toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end)) {
        errors[b.id] = `เวลาทับกับรอบ ${a.start}–${a.end}`;
      }
    }
  }
  return errors;
}

function summarizeDay(day) {
  const active = day.open ? day.slots.filter((s) => s.enabled) : [];
  const quota = active.reduce((t, s) => t + (Number(s.capacity) || 0), 0);
  const errors = day.open ? validateSlots(day.slots) : {};
  const errorCount = Object.keys(errors).length;
  const booked = day.slots.reduce((t, s) => t + (s.booked || 0), 0);
  let status = "ready";
  if (!day.open) status = "closed";
  else if (errorCount > 0 || !day.location.trim()) status = "error";
  else if (active.length === 0) status = "empty";
  return { active: active.length, quota, errors, errorCount, status, booked };
}

const STATUS = {
  ready: { label: "พร้อมเปิดจอง", text: "text-emerald-700" },
  empty: { label: "ยังไม่มีรอบ", text: "text-amber-700" },
  error: { label: "มีจุดต้องแก้", text: "text-rose-600" },
  closed: { label: "ปิดรับ", text: "text-slate-500" },
};

/* ---------- icons ---------- */

const Icon = {
  Trash: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Copy: () => (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="8"
        y="8"
        width="12"
        height="12"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  ),
  Pin: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  ),
  Plus: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  Alert: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 9v4M12 17v.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  ),
};

/* ---------- small components ---------- */

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e31c79] ${
        checked
          ? "bg-gradient-to-b from-[#f0409a] to-[#e31c79] shadow-[0_4px_12px_-4px_rgba(227,28,121,.7),inset_0_1px_0_rgba(255,255,255,.3)]"
          : "bg-slate-300 shadow-[inset_0_1px_3px_rgba(15,23,42,.2)]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_2px_5px_rgba(15,23,42,.3)] transition-all ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function Stepper({ value, onChange, label, disabled, min = 1 }) {
  const set = (v) => onChange(Math.min(200, Math.max(min, Number(v) || min)));
  return (
    <div
      className={`flex h-10 items-stretch overflow-hidden rounded-xl border border-[#cfdaec] bg-white shadow-[inset_0_1px_2px_rgba(15,23,42,.05)] ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => set(value - 1)}
        aria-label={`ลด${label}`}
        className="w-9 text-lg font-bold text-slate-500 transition hover:bg-[#f1f5ff] hover:text-[#07116f] disabled:cursor-not-allowed"
      >
        −
      </button>
      <input
        type="number"
        min={min}
        max="200"
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => set(e.target.value)}
        className="w-12 border-x border-[#e3eaf5] text-center text-base font-black text-[#0c2eff] outline-none [appearance:textfield] focus:bg-[#f5f8ff] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => set(value + 1)}
        aria-label={`เพิ่ม${label}`}
        className="w-9 text-lg font-bold text-slate-500 transition hover:bg-[#f1f5ff] hover:text-[#07116f] disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  );
}

/* ---------- ช่องเลือกเวลา (24 ชั่วโมงเสมอ ไม่ขึ้นกับภาษาเบราว์เซอร์) ---------- */

const TIME_STEP = 15; // เลือกได้ทุก 15 นาที
const TIME_FROM = 6 * 60; // 06:00
const TIME_TO = 21 * 60; // 21:00
const TIME_OPTIONS = Array.from(
  { length: (TIME_TO - TIME_FROM) / TIME_STEP + 1 },
  (_, i) => toTime(TIME_FROM + i * TIME_STEP),
);

function TimeSelect({ value, onChange, label, disabled, title, invalid }) {
  // ถ้าค่าเดิมในระบบไม่อยู่ในรายการ (เช่น 09:10) ให้ยังแสดงได้
  const options =
    value && !TIME_OPTIONS.includes(value)
      ? [value, ...TIME_OPTIONS].sort()
      : TIME_OPTIONS;
  return (
    <div className="relative min-w-0 flex-1">
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        title={title}
        onChange={(e) => onChange(e.target.value)}
        className={`sb-num h-10 w-full cursor-pointer appearance-none rounded-lg border bg-white pl-3 pr-12 text-sm font-medium text-[#16205a] shadow-[inset_0_1px_2px_rgba(15,23,42,.05)] outline-none focus:border-[#07116f] focus:ring-4 focus:ring-[#dce7ff] disabled:cursor-not-allowed disabled:bg-slate-50 ${
          invalid ? "border-rose-300" : "border-[#dbe4f1]"
        }`}
      >
        {options.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs text-slate-400">
        น.
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}

/* ---------- ปฏิทินเลือกวัน (แสดง DD/MM/YYYY เสมอ) ---------- */

const USE_BUDDHIST_YEAR = false; // true = แสดงปี พ.ศ. เช่น 21/09/2569
const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function formatDMY(dateId) {
  if (!dateId) return "";
  const [y, m, d] = dateId.split("-");
  return `${d}/${m}/${USE_BUDDHIST_YEAR ? Number(y) + 543 : y}`;
}

function DatePicker({ label, value, onChange, min, rangeStart, rangeEnd }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => (value || todayId()).slice(0, 7)); // "YYYY-MM"
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open && value) setView(value.slice(0, 7));
    setOpen((o) => !o);
  };

  const [vy, vm] = view.split("-").map(Number);
  const first = new Date(vy, vm - 1, 1);
  const daysInMonth = new Date(vy, vm, 0).getDate();
  const cells = [
    ...Array(first.getDay()).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      toDateId(new Date(vy, vm - 1, i + 1)),
    ),
  ];
  const shiftMonth = (n) =>
    setView(toDateId(new Date(vy, vm - 1 + n, 1)).slice(0, 7));
  const monthLabel = new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
  }).format(first);
  const today = todayId();

  return (
    <div ref={wrapRef} className="relative">
      <span className="mb-1 block text-xs font-bold text-slate-500">
        {label}
      </span>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label} ${formatDMY(value)}`}
        className={`flex h-11 min-w-[168px] items-center justify-between gap-3 rounded-xl border bg-white px-3 text-sm font-bold tabular-nums text-[#16205a] shadow-[inset_0_1px_2px_rgba(15,23,42,.05)] outline-none transition focus-visible:ring-4 focus-visible:ring-[#dce7ff] ${
          open
            ? "border-[#07116f] ring-4 ring-[#dce7ff]"
            : "border-[#cbd8ed] hover:border-[#8ea5d7]"
        }`}
      >
        {formatDMY(value) || "วว/ดด/ปปปป"}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="text-[#3155a3]"
        >
          <rect
            x="3.5"
            y="5"
            width="17"
            height="15"
            rx="2.5"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M3.5 10h17M8 3v4M16 3v4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`เลือก${label}`}
          className="absolute left-0 top-full z-40 mt-2 w-[296px] rounded-2xl border border-[#dce5f2] bg-white p-3 shadow-[0_24px_48px_-16px_rgba(7,17,111,.45)]"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="เดือนก่อนหน้า"
              className="grid h-8 w-8 place-items-center rounded-lg text-lg font-bold text-[#3155a3] hover:bg-[#f1f5ff]"
            >
              ‹
            </button>
            <span className="text-sm font-black text-[#07116f]">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="เดือนถัดไป"
              className="grid h-8 w-8 place-items-center rounded-lg text-lg font-bold text-[#3155a3] hover:bg-[#f1f5ff]"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400">
            {WEEKDAYS.map((w) => (
              <span key={w} className="py-1">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((id, i) => {
              if (!id) return <span key={`e${i}`} />;
              const disabled = min && id < min;
              const selected = id === value;
              const inRange =
                rangeStart && rangeEnd && id >= rangeStart && id <= rangeEnd;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={disabled}
                  aria-label={formatDMY(id)}
                  aria-pressed={selected}
                  onClick={() => {
                    onChange(id);
                    setOpen(false);
                  }}
                  className={`h-9 rounded-lg text-sm font-bold tabular-nums transition ${
                    selected
                      ? "bg-gradient-to-b from-[#1a2a9c] to-[#07116f] text-white shadow-[0_6px_14px_-6px_rgba(7,17,111,.8)]"
                      : disabled
                        ? "cursor-not-allowed text-slate-300"
                        : inRange
                          ? "bg-[#eaf0ff] text-[#07116f] hover:bg-[#dbe5ff]"
                          : "text-[#16205a] hover:bg-[#f1f5ff]"
                  } ${id === today && !selected ? "ring-1 ring-inset ring-[#e31c79]" : ""}`}
                >
                  {Number(id.slice(8))}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between border-t border-[#eef2f8] pt-2">
            <button
              type="button"
              onClick={() => setView(today.slice(0, 7))}
              className="rounded-lg px-2 py-1 text-xs font-bold text-[#3155a3] hover:bg-[#f1f5ff]"
            >
              ไปเดือนนี้
            </button>
            <span className="px-2 py-1 text-xs text-slate-400">
              {formatDMY(value)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const CARD =
  "rounded-3xl border border-white/70 bg-white shadow-[0_1px_2px_rgba(7,17,111,.05),0_14px_36px_-14px_rgba(7,17,111,.22)]";

/* ================================================================ */

function StaffBooking() {
  const initialStart = addDays(todayId(), 1);
  const initialEnd = addDays(initialStart, 13);

  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [days, setDays] = useState([]);
  const [selectedDateId, setSelectedDateId] = useState(null);
  const [rangeError, setRangeError] = useState("");
  const [bulkCapacity, setBulkCapacity] = useState(15);
  const [toast, setToast] = useState("");
  const [loadState, setLoadState] = useState({
    status: "loading",
    message: "",
  });
  const [rangeLoading, setRangeLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [dirty, setDirty] = useState(false);
  const toastTimer = useRef(null);

  const selectedDay =
    days.find((d) => d.id === selectedDateId) ?? days[0] ?? null;
  const summaries = useMemo(
    () => new Map(days.map((d) => [d.id, summarizeDay(d)])),
    [days],
  );
  const selectedSummary = selectedDay ? summaries.get(selectedDay.id) : null;

  const overview = useMemo(() => {
    const list = [...summaries.entries()];
        const openDays = list.filter(
      ([, s]) => s.status !== "closed" && s.active > 0,
    );
    return {
      openDays: openDays.length,
      totalSlots: openDays.reduce((t, [, s]) => t + s.active, 0),
      totalQuota: openDays.reduce((t, [, s]) => t + s.quota, 0),
      totalBooked: list.reduce((t, [, s]) => t + s.booked, 0),
            problems: list
        .filter(([, s]) => s.status === "error")
        .map(([id, s]) => ({ id, status: s.status })),
    };
  }, [summaries]);

  const canSave = days.length > 0 && overview.problems.length === 0 && !saving;
  const unsavedDays = days.filter((d) => !d.saved).length;

  const flash = (message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  };

  const touch = () => {
    setDirty(true);
    setSaveError("");
  };

  // เตือนก่อนออกจากหน้าเมื่อมีการแก้ที่ยังไม่บันทึก
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  /* ---------- โหลดจาก backend ---------- */
  const loadRange = useCallback(async (from, to, keepDays = []) => {
    const data = await staffQueueApi.getSchedule(from, to);
    const next = daysFromServer(from, to, data.slots, keepDays);
    setDays(next);
    setSelectedDateId((cur) =>
      next.some((d) => d.id === cur) ? cur : (next[0]?.id ?? null),
    );
    return next;
  }, []);

  // โหลดครั้งแรกตอนเปิดหน้า (และทุกครั้งที่กด "ลองใหม่" ซึ่งจะเพิ่ม reloadKey)
  // เปลี่ยน state เฉพาะหลังได้คำตอบจาก backend เท่านั้น ตามคำแนะนำของ React
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false; // ถ้าออกจากหน้าก่อนโหลดเสร็จ จะไม่อัปเดตหน้าจอ
    staffQueueApi
      .getSchedule(initialStart, initialEnd)
      .then((data) => {
        if (ignore) return;
        const next = daysFromServer(initialStart, initialEnd, data.slots);
        setDays(next);
        setSelectedDateId(next[0]?.id ?? null);
        setDirty(false);
        setLoadState({ status: "ready", message: "" });
      })
      .catch((e) => {
        if (!ignore) setLoadState({ status: "error", message: e.message });
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const retryLoad = () => {
    setLoadState({ status: "loading", message: "" });
    setReloadKey((k) => k + 1);
  };

  /* ---------- range ---------- */
  const buildRange = async (start, end) => {
    if (!start || !end || start > end) {
      setRangeError("วันเริ่มต้นต้องมาก่อนหรือเป็นวันเดียวกับวันสิ้นสุด");
      return;
    }
    if (dayCount(start, end) > 62) {
      setRangeError("ตั้งได้ครั้งละไม่เกิน 62 วัน");
      return;
    }
    setRangeError("");
    setRangeLoading(true);
    try {
      // วันที่แก้ค้างไว้และยังอยู่ในช่วงใหม่ จะไม่ถูกทับด้วยข้อมูลจากระบบ
      const keep = dirty
        ? days.filter((d) => d.id >= start && d.id <= end)
        : [];
      await loadRange(start, end, keep);
      setSaveError("");
    } catch (e) {
      setRangeError(e.message);
    } finally {
      setRangeLoading(false);
    }
  };

  /* ---------- day / slot updates ---------- */
  const updateDay = (patch) => {
    touch();
    setDays((cur) =>
      cur.map((d) => (d.id === selectedDateId ? { ...d, ...patch } : d)),
    );
  };

  const updateSlot = (slotId, patch) => {
    touch();
    setDays((cur) =>
      cur.map((d) =>
        d.id !== selectedDateId
          ? d
          : {
              ...d,
              slots: d.slots.map((s) =>
                s.id === slotId ? { ...s, ...patch } : s,
              ),
            },
      ),
    );
  };

  const addSlot = () => {
    const lastEnd = selectedDay.slots.reduce(
      (m, s) => Math.max(m, toMin(s.end)),
      toMin("08:30"),
    );
    const start = Math.min(lastEnd, 23 * 60 + 29);
    updateDay({
      slots: [
        ...selectedDay.slots,
        {
          id: newId(),
          slotId: null,
          booked: 0,
          start: toTime(start),
          end: toTime(start + SLOT_MINUTES),
          capacity: bulkCapacity,
          enabled: true,
        },
      ],
    });
  };

  const removeSlot = (slotId) =>
    updateDay({ slots: selectedDay.slots.filter((s) => s.id !== slotId) });

  const sortSlots = () =>
    updateDay({
      slots: [...selectedDay.slots].sort(
        (a, b) => toMin(a.start) - toMin(b.start),
      ),
    });

  const applyCapacityToDay = () => {
    const raised = selectedDay.slots.filter(
      (s) => s.booked > bulkCapacity,
    ).length;
    updateDay({
      slots: selectedDay.slots.map((s) => ({
        ...s,
        capacity: Math.max(bulkCapacity, s.booked || 0),
      })),
    });
    flash(
      raised > 0
        ? `ตั้งเป็น ${bulkCapacity} คนแล้ว ยกเว้น ${raised} รอบที่มีผู้จองเกินจำนวนนี้`
        : `ตั้งทุกรอบของวันนี้เป็น ${bulkCapacity} คนแล้ว`,
    );
  };

  const copyToAllDays = () => {
    const source = selectedDay;
    const hasBookings = (d) => d.slots.some((s) => s.booked > 0);
    const targets = days.filter(
      (d) => d.id !== source.id && d.open && !hasBookings(d),
    );
    const skipped = days.filter(
      (d) => d.id !== source.id && d.open && hasBookings(d),
    ).length;
    const targetIds = new Set(targets.map((d) => d.id));
    touch();
    setDays((cur) =>
      cur.map((d) =>
        !targetIds.has(d.id)
          ? d
          : {
              ...d,
              location: source.location,
              detail: source.detail,
              // วันปลายทาง: รอบเดิมจะถูกแทนที่ทั้งหมด (ลบในระบบตอนบันทึก)
              slots: source.slots.map((s) => ({
                ...s,
                id: newId(),
                slotId: null,
                booked: 0,
              })),
            },
      ),
    );
    flash(
      skipped > 0
        ? `คัดลอกไป ${targets.length} วันแล้ว ข้าม ${skipped} วันที่มีผู้จองอยู่`
        : `คัดลอกรอบเวลาและสถานที่ไปอีก ${targets.length} วันแล้ว`,
    );
  };

  const handleSave = async () => {
    if (!canSave) return;
    const from = days[0].id;
    const to = days[days.length - 1].id;
    setSaving(true);
    setSaveError("");
    try {
      const data = await staffQueueApi.saveSchedule({
        from,
        to,
        days: days
          .filter((d) => d.id >= todayId()) // วันที่ผ่านไปแล้วแก้ไม่ได้
          .map((d) => ({
            date: d.id,
            open: d.open,
            location: d.location,
            detail: d.detail,
            slots: d.slots.map((s) => ({
              slotId: s.slotId,
              start: s.start,
              end: s.end,
              capacity: Number(s.capacity),
              enabled: s.enabled,
            })),
          })),
      });
      const next = daysFromServer(from, to, data.slots);
      setDays(next);
      setSelectedDateId((cur) =>
        next.some((d) => d.id === cur) ? cur : (next[0]?.id ?? null),
      );
      setDirty(false);
      flash("บันทึกแล้ว นักศึกษาเห็นรอบที่เปิดได้ทันที");
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- render ---------- */
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#eef3fc] font-['Sarabun'] text-[#172554]">
      <style>{NUM_FONT_CSS}</style>

      {/* แสงฟุ้งพื้นหลัง */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-[#5b7cff]/20 blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-60 -z-10 h-[460px] w-[460px] rounded-full bg-[#e31c79]/10 blur-[100px]"
      />

      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-8 sm:py-9">
        {/* ---------- ส่วนหัว + ภาพรวม ---------- */}
        <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b1a86] via-[#07116f] to-[#050c4f] p-6 text-white shadow-[0_24px_48px_-20px_rgba(7,17,111,.65)] sm:p-8">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#e31c79]/40 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-[#6f8cff]/30 blur-3xl"
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                กำหนดวันและรอบยื่นเอกสาร
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
                เลือกช่วงวันที่เปิดรับ ตั้งรอบเวลาและจำนวนคนต่อรอบ
                แล้วกดบันทึกเพื่อเปิดให้นักศึกษาจอง
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {[
                ["วันเปิดรับ", overview.openDays, "วัน"],
                ["รอบทั้งหมด", overview.totalSlots, "รอบ"],
                [
                  "รับได้รวม",
                  overview.totalQuota.toLocaleString("th-TH"),
                  "คน",
                ],
                ["จองแล้ว", overview.totalBooked.toLocaleString("th-TH"), "คน"],
              ].map(([label, value, unit]) => (
                <div
                  key={label}
                  className="min-w-[96px] rounded-2xl border border-[#e1e8f4] bg-white px-4 py-3 shadow-[0_4px_14px_-6px_rgba(7,17,111,.35)]"
                >
                  <dt className="text-xs font-semibold text-[#3155a3]">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-2xl font-black leading-tight text-[#07116f]">
                    {value}
                    <span className="ml-1 text-xs font-semibold text-[#3155a3]">
                      {unit}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {loadState.status === "loading" && (
          <div
            aria-busy="true"
            aria-label="กำลังโหลดรอบเวลา"
            className="grid gap-6"
          >
            <div className="h-56 animate-pulse rounded-3xl bg-white/70 shadow-[0_14px_36px_-14px_rgba(7,17,111,.18)]" />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="h-96 animate-pulse rounded-3xl bg-white/70" />
              <div className="h-72 animate-pulse rounded-3xl bg-white/70" />
            </div>
          </div>
        )}

        {loadState.status === "error" && (
          <section className={`${CARD} p-8 text-center`}>
            <p className="text-lg font-black text-[#07116f]">
              โหลดรอบเวลาไม่สำเร็จ
            </p>
            <p className="mt-1 text-sm text-slate-500">{loadState.message}</p>
            <button
              type="button"
              onClick={retryLoad}
              className="mt-5 rounded-xl bg-gradient-to-b from-[#1a2a9c] to-[#07116f] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_22px_-10px_rgba(7,17,111,.8)]"
            >
              ลองใหม่
            </button>
          </section>
        )}

        {loadState.status === "ready" && (
          <>
            {/* ---------- 1. ช่วงวัน ---------- */}
            <section className={`${CARD} mb-6 p-5 sm:p-7`}>
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h2 className="flex items-center gap-2.5 text-lg font-black text-[#07116f]">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-[#07116f] text-sm text-white shadow-[0_4px_10px_-3px_rgba(7,17,111,.6)]">
                      1
                    </span>
                    ช่วงวันที่เปิดรับเอกสาร
                  </h2>
                  <p className="mt-1 pl-[38px] text-sm text-slate-500">
                    เลือกวันเริ่มและวันสิ้นสุด แล้วกดสร้างตารางวัน
                    ระบบจะสร้างให้ครบทุกวันในช่วงนั้น
                  </p>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <DatePicker
                    label="เริ่มวันที่"
                    value={startDate}
                    min={todayId()}
                    rangeStart={startDate}
                    rangeEnd={endDate}
                    onChange={(v) => {
                      setStartDate(v);
                      if (v > endDate) setEndDate(v);
                    }}
                  />
                  <DatePicker
                    label="ถึงวันที่"
                    value={endDate}
                    min={startDate}
                    rangeStart={startDate}
                    rangeEnd={endDate}
                    onChange={(v) => setEndDate(v)}
                  />
                  <button
                    type="button"
                    onClick={() => buildRange(startDate, endDate)}
                    disabled={rangeLoading}
                    className="h-11 rounded-xl bg-gradient-to-b from-[#1a2a9c] to-[#07116f] px-5 text-sm font-bold text-white shadow-[0_10px_22px_-10px_rgba(7,17,111,.8),inset_0_1px_0_rgba(255,255,255,.15)] transition hover:-translate-y-px disabled:cursor-wait disabled:opacity-70"
                  >
                    {rangeLoading ? "กำลังโหลด..." : "สร้างตารางวัน"}
                  </button>
                </div>
              </div>

              {rangeError && (
                <p
                  role="alert"
                  className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600"
                >
                  <Icon.Alert /> {rangeError}
                </p>
              )}

              {/* การ์ดวัน */}
              <p className="mt-6 text-sm font-bold text-slate-600">
                เลือกวันเพื่อตั้งรอบ{" "}
                <span className="font-normal text-slate-400">
                  ({days.length} วัน)
                </span>
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
                {days.map((day) => {
                  const sum = summaries.get(day.id);
                  const selected = day.id === selectedDay?.id;

                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => setSelectedDateId(day.id)}
                      aria-pressed={selected}
                      className={`group relative rounded-2xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e31c79] ${
                        selected
                          ? "border-[#07116f] bg-gradient-to-b from-[#16259a] to-[#07116f] text-white shadow-[0_14px_28px_-12px_rgba(7,17,111,.75)]"
                          : `border-[#dce5f2] bg-white text-[#16205a] shadow-[0_1px_2px_rgba(15,23,42,.04)] hover:-translate-y-0.5 hover:border-[#8ea5d7] hover:shadow-[0_10px_20px_-12px_rgba(7,17,111,.4)] ${sum.status === "closed" ? "bg-slate-50" : ""}`
                      }`}
                    >
                      <span
                        className={`block text-xs font-semibold ${selected ? "text-blue-100" : "text-slate-500"}`}
                      >
                        {formatDate(day.id, { weekday: "short" })}
                      </span>
                      <span
                        className={`mt-1 block text-lg font-black ${sum.status === "closed" && !selected ? "text-slate-400 line-through" : ""}`}
                      >
                        {formatDate(day.id, { day: "numeric", month: "short" })}
                      </span>

                                            <span
                        className={`mt-1.5 block text-xs ${
                          selected
                            ? "text-blue-100"
                            : sum.status === "error"
                              ? "font-bold text-rose-600"
                              : "text-slate-500"
                        }`}
                      >
                        {sum.status === "closed"
                          ? "ปิดรับ"
                          : sum.status === "error"
                            ? "มีจุดต้องแก้"
                            : `${sum.active} รอบ / ${sum.quota} คน`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {selectedDay && (
              <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                {/* ---------- 2. ตั้งค่าวันที่เลือก ---------- */}
                <section className={`${CARD} p-5 sm:p-7`}>
                  <div className="flex flex-col gap-4 border-b border-[#e7edf7] pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="flex items-center gap-2.5 text-lg font-black text-[#07116f]">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#07116f] text-sm text-white shadow-[0_4px_10px_-3px_rgba(7,17,111,.6)]">
                          2
                        </span>
                        {formatDate(selectedDay.id, {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </h2>
                      <p
                        className={`mt-1 pl-[38px] text-sm font-semibold ${STATUS[selectedSummary.status].text}`}
                      >
                        {STATUS[selectedSummary.status].label}
                        {!selectedDay.saved && (
                          <span className="ml-2 font-normal text-slate-400">
                            ยังไม่ได้บันทึกลงระบบ
                          </span>
                        )}
                        {selectedSummary.booked > 0 && (
                          <span className="ml-2 font-normal text-slate-500">
                            มีผู้จองแล้ว {selectedSummary.booked} คน
                          </span>
                        )}
                      </p>
                    </div>
                    <label className="flex items-center gap-3 self-start rounded-2xl border border-[#e1e8f4] bg-[#f8faff] px-4 py-2.5 text-sm font-bold text-[#405373] sm:self-auto">
                      <Toggle
                        checked={selectedDay.open}
                        label="เปิดรับวันนี้"
                        onChange={(v) => updateDay({ open: v })}
                      />
                      {selectedDay.open ? "เปิดรับวันนี้" : "ปิดรับทั้งวัน"}
                    </label>
                  </div>

                  {!selectedDay.open ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                      <p className="text-base font-bold text-slate-600">
                        วันนี้ปิดรับ นักศึกษาจะไม่เห็นวันนี้ในหน้าจอง
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        รอบเวลาที่ตั้งไว้ยังเก็บอยู่
                        เปิดสวิตช์ด้านบนเมื่อต้องการเปิดรับอีกครั้ง
                      </p>
                      {selectedSummary.booked > 0 && (
                        <p className="mx-auto mt-4 max-w-md rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800">
                          วันนี้มีผู้จองไว้แล้ว {selectedSummary.booked} คน
                          นัดเดิมยังอยู่ ปิดรับจะหยุดแค่การจองเพิ่ม
                          หากต้องการยกเลิกนัด
                          ต้องแจ้งนักศึกษาให้ยกเลิกหรือเปลี่ยนวันเอง
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* สถานที่ */}
                      <div className="mt-5 grid gap-4 rounded-2xl border border-[#f5cfe1] bg-gradient-to-r from-[#fff3f8] via-[#fffafc] to-white p-4 shadow-[inset_0_1px_0_#fff,0_8px_20px_-14px_rgba(227,28,121,.45)] sm:grid-cols-[auto_1fr_1fr] sm:items-end sm:p-5">
                        <span className="hidden h-11 w-11 place-items-center rounded-xl bg-white text-[#e31c79] shadow-[0_6px_14px_-6px_rgba(227,28,121,.55)] sm:grid">
                          <Icon.Pin />
                        </span>
                        <label>
                          <span className="mb-1.5 block text-sm font-bold text-[#16205a]">
                            สถานที่ยื่นเอกสาร
                          </span>
                          <input
                            type="text"
                            value={selectedDay.location}
                            onChange={(e) =>
                              updateDay({ location: e.target.value })
                            }
                            placeholder="เช่น กองพัฒนานักศึกษา อาคาร 2"
                            className={`h-11 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-[#16205a] outline-none focus:ring-4 focus:ring-[#dce7ff] ${selectedDay.location.trim() ? "border-[#e6cdda] focus:border-[#07116f]" : "border-rose-400"}`}
                          />
                        </label>
                        <label>
                          <span className="mb-1.5 block text-sm font-bold text-[#16205a]">
                            รายละเอียดเพิ่มเติม{" "}
                            <span className="font-normal text-slate-400">
                              (ไม่บังคับ)
                            </span>
                          </span>
                          <input
                            type="text"
                            value={selectedDay.detail}
                            onChange={(e) =>
                              updateDay({ detail: e.target.value })
                            }
                            className="h-11 w-full rounded-xl border border-[#e6cdda] bg-white px-3 text-sm font-semibold text-[#16205a] outline-none focus:border-[#07116f] focus:ring-4 focus:ring-[#dce7ff]"
                          />
                        </label>
                      </div>

                      {/* แถบเครื่องมือ */}
                      <div className="mt-7 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h3 className="text-base font-black text-[#07116f]">
                            รอบเวลา
                          </h3>
                          <p className="mt-0.5 text-sm text-slate-500">
                            เปิดอยู่ {selectedSummary.active} จาก{" "}
                            {selectedDay.slots.length} รอบ รับได้รวม{" "}
                            {selectedSummary.quota} คน
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-2 rounded-xl border border-[#e1e8f4] bg-[#f8faff] py-1 pl-3 pr-1">
                            <span className="text-xs font-bold text-slate-500">
                              ทุกรอบ
                            </span>
                            <Stepper
                              value={bulkCapacity}
                              onChange={setBulkCapacity}
                              label="จำนวนคนสำหรับทุกรอบ"
                            />
                            <button
                              type="button"
                              onClick={applyCapacityToDay}
                              className="h-10 rounded-lg bg-white px-3 text-xs font-bold text-[#07116f] shadow-[0_2px_6px_-2px_rgba(7,17,111,.3)] transition hover:bg-[#07116f] hover:text-white"
                            >
                              ใช้
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={copyToAllDays}
                            className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#cfdaec] bg-white px-3.5 text-xs font-bold text-[#3155a3] shadow-[0_2px_6px_-3px_rgba(7,17,111,.3)] transition hover:border-[#07116f] hover:text-[#07116f]"
                          >
                            <Icon.Copy /> ใช้ค่านี้กับทุกวัน
                          </button>
                        </div>
                      </div>

                      {/* ตารางรอบ */}
                      <div className="mt-4 overflow-hidden rounded-2xl border border-[#dce5f2] shadow-[0_8px_24px_-18px_rgba(7,17,111,.5)]">
                        <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_150px_44px] gap-4 border-b border-[#e6edf7] bg-gradient-to-b from-[#f8faff] to-[#f1f5fd] px-5 py-3 text-xs font-bold text-slate-500 md:grid">
                          <span className="flex items-center gap-2">
                            ช่วงเวลา
                            <button
                              type="button"
                              onClick={sortSlots}
                              className="rounded-md px-1.5 py-0.5 font-semibold text-[#3155a3] hover:bg-white"
                            >
                              เรียงตามเวลา
                            </button>
                          </span>
                          <span>เปิดให้จอง</span>
                          <span className="text-center">จำนวนคนต่อรอบ</span>
                          <span />
                        </div>

                        {selectedDay.slots.length === 0 ? (
                          <div className="bg-white px-6 py-10 text-center">
                            <p className="text-base font-bold text-slate-600">
                              ยังไม่มีรอบเวลาในวันนี้
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              กดเพิ่มรอบเวลาด้านล่าง
                              หรือคัดลอกจากวันอื่นที่ตั้งไว้แล้ว
                            </p>
                          </div>
                        ) : (
                          <ul className="divide-y divide-[#eaf0f8]">
                            {selectedDay.slots.map((slot, index) => {
                              const err = selectedSummary.errors[slot.id];
                              return (
                                <li
                                  key={slot.id}
                                  className={`grid gap-3 p-4 transition md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_150px_44px] md:items-center md:gap-4 md:px-5 ${
                                    err
                                      ? "bg-rose-50/70"
                                      : slot.enabled
                                        ? "bg-white hover:bg-[#fafcff]"
                                        : "bg-slate-50"
                                  }`}
                                >
                                  <div
                                    className={slot.enabled ? "" : "opacity-50"}
                                  >
                                    <div className="flex items-center gap-2">
                                      <TimeSelect
                                        label={`เวลาเริ่มรอบที่ ${index + 1}`}
                                        value={slot.start}
                                        disabled={slot.booked > 0}
                                        title={
                                          slot.booked > 0
                                            ? "มีผู้จองแล้ว เปลี่ยนเวลาไม่ได้"
                                            : undefined
                                        }
                                        invalid={Boolean(err)}
                                        onChange={(v) =>
                                          updateSlot(slot.id, { start: v })
                                        }
                                      />
                                      <span className="font-bold text-slate-400">
                                        –
                                      </span>
                                      <TimeSelect
                                        label={`เวลาสิ้นสุดรอบที่ ${index + 1}`}
                                        value={slot.end}
                                        disabled={slot.booked > 0}
                                        title={
                                          slot.booked > 0
                                            ? "มีผู้จองแล้ว เปลี่ยนเวลาไม่ได้"
                                            : undefined
                                        }
                                        invalid={Boolean(err)}
                                        onChange={(v) =>
                                          updateSlot(slot.id, { end: v })
                                        }
                                      />
                                    </div>
                                    {slot.booked > 0 && (
                                      <p className="mt-1.5 text-xs font-bold text-[#3155a3]">
                                        จองแล้ว {slot.booked} จาก{" "}
                                        {slot.capacity} คน
                                      </p>
                                    )}
                                    {err && (
                                      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                                        <Icon.Alert /> {err}
                                      </p>
                                    )}
                                  </div>

                                  <label className="flex items-center gap-2.5 text-sm font-bold text-[#405373]">
                                    <Toggle
                                      checked={slot.enabled}
                                      label={`เปิดรอบ ${slot.start}`}
                                      onChange={(v) =>
                                        updateSlot(slot.id, { enabled: v })
                                      }
                                    />
                                    {slot.enabled ? "เปิด" : "ปิดรอบนี้"}
                                  </label>

                                  <div className="flex items-center justify-between gap-3 md:justify-center">
                                    <span className="text-xs font-bold text-slate-500 md:hidden">
                                      จำนวนคนต่อรอบ
                                    </span>
                                    <Stepper
                                      value={slot.capacity}
                                      disabled={!slot.enabled}
                                      min={Math.max(1, slot.booked || 0)}
                                      label={`จำนวนคนรอบ ${slot.start}`}
                                      onChange={(v) =>
                                        updateSlot(slot.id, { capacity: v })
                                      }
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    aria-label={`ลบรอบ ${slot.start}`}
                                    onClick={() => removeSlot(slot.id)}
                                    disabled={slot.booked > 0}
                                    title={
                                      slot.booked > 0
                                        ? "มีผู้จองแล้ว ลบไม่ได้ ให้ปิดรอบแทน"
                                        : undefined
                                    }
                                    className="justify-self-end rounded-lg p-2 text-slate-400 transition hover:bg-[#fff1f5] hover:text-[#e31c79] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                  >
                                    <Icon.Trash />
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={addSlot}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#9aabc6] bg-white/60 py-3.5 text-sm font-bold text-[#50617d] transition hover:border-[#07116f] hover:bg-[#f5f8ff] hover:text-[#07116f] hover:shadow-[0_8px_18px_-12px_rgba(7,17,111,.5)]"
                      >
                        <Icon.Plus /> เพิ่มรอบเวลา (ต่อจากรอบสุดท้าย{" "}
                        {SLOT_MINUTES} นาที)
                      </button>
                    </>
                  )}
                </section>

                {/* ---------- สรุป ---------- */}
                <aside className="space-y-5 xl:sticky xl:top-5">
                  <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#12219a] to-[#07116f] p-6 text-white shadow-[0_22px_44px_-18px_rgba(7,17,111,.7)]">
                    <div
                      aria-hidden="true"
                      className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[#e31c79]/35 blur-3xl"
                    />
                    <div className="relative">
                      <p className="text-sm font-bold text-blue-200">
                        วันที่กำลังตั้งค่า
                      </p>
                      <p className="mt-1 text-xl font-black">
                        {formatDate(selectedDay.id, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <p className="mt-3 flex items-start gap-2 rounded-2xl bg-white/10 p-3 text-sm font-bold leading-5 shadow-[inset_0_1px_0_rgba(255,255,255,.12)]">
                        <span className="mt-0.5 shrink-0 text-pink-200">
                          <Icon.Pin />
                        </span>
                        <span>
                          {selectedDay.location || "ยังไม่ได้ระบุสถานที่"}
                          {selectedDay.detail && (
                            <span className="mt-1 block text-xs font-normal text-blue-100">
                              {selectedDay.detail}
                            </span>
                          )}
                        </span>
                      </p>

                      {(() => {
                        const openSlots = selectedDay.open
                          ? [...selectedDay.slots]
                              .filter((s) => s.enabled)
                              .sort((a, b) => toMin(a.start) - toMin(b.start))
                          : [];
                        if (openSlots.length === 0) {
                          return (
                            <p className="mt-4 rounded-2xl border border-dashed border-white/25 p-3 text-center text-xs text-blue-100">
                              {selectedDay.open
                                ? "ยังไม่มีรอบที่เปิด"
                                : "ปิดรับทั้งวัน"}
                            </p>
                          );
                        }
                        const caps = openSlots.map(
                          (s) => Number(s.capacity) || 0,
                        );
                        const minCap = Math.min(...caps);
                        const maxCap = Math.max(...caps);
                        return (
                          <dl className="mt-4 space-y-2 rounded-2xl bg-white/10 p-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,.12)]">
                            <div className="flex items-baseline justify-between gap-3">
                              <dt className="text-blue-100">ช่วงเวลา</dt>
                              <dd className="sb-num font-semibold">
                                {openSlots[0].start}–
                                {openSlots[openSlots.length - 1].end} น.
                              </dd>
                            </div>
                            <div className="flex items-baseline justify-between gap-3">
                              <dt className="text-blue-100">ต่อรอบ</dt>
                              <dd className="sb-num font-semibold">
                                {minCap === maxCap
                                  ? minCap
                                  : `${minCap}–${maxCap}`}{" "}
                                คน
                              </dd>
                            </div>
                          </dl>
                        );
                      })}

                      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
                        <div>
                          <p className="text-xs font-semibold text-blue-100">
                            รอบที่เปิด
                          </p>
                          <p className="text-2xl font-black">
                            {selectedSummary.active}
                            <span className="ml-1 text-xs font-semibold">
                              รอบ
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-blue-100">
                            รับได้
                          </p>
                          <p className="text-2xl font-black">
                            {selectedSummary.quota}
                            <span className="ml-1 text-xs font-semibold">
                              คน
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className={`${CARD} p-6`}>
                    <h2 className="text-base font-black text-[#07116f]">
                      บันทึกและเปิดให้จอง
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {days.length > 0 && (
                        <>
                          {formatDate(days[0].id, {
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          ถึง{" "}
                          {formatDate(days[days.length - 1].id, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          เปิดรับ {overview.openDays} วัน รวม{" "}
                          {overview.totalQuota.toLocaleString("th-TH")} คน
                        </>
                      )}
                    </p>

                    {overview.problems.length > 0 && (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                        <p className="flex items-center gap-1.5 text-sm font-bold text-amber-800">
                          <Icon.Alert /> ต้องแก้ {overview.problems.length}{" "}
                          วันก่อนบันทึก
                        </p>
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {overview.problems.slice(0, 8).map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedDateId(p.id)}
                                className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-amber-800 shadow-[0_1px_3px_rgba(146,64,14,.2)] hover:bg-amber-100"
                              >
                                {formatDate(p.id, {
                                  day: "numeric",
                                  month: "short",
                                })}
                                <span className="font-normal">
                                  {" "}
                                  {p.status === "empty"
                                    ? "ไม่มีรอบ"
                                    : "มีจุดผิด"}
                                </span>
                              </button>
                            </li>
                          ))}
                          {overview.problems.length > 8 && (
                            <li className="px-1 py-1 text-xs text-amber-700">
                              และอีก {overview.problems.length - 8} วัน
                            </li>
                          )}
                        </ul>
                        <p className="mt-2 text-xs text-amber-700">
                          วันที่ไม่ต้องการเปิดรับ ให้ปิดสวิตช์ "เปิดรับวันนี้"
                        </p>
                      </div>
                    )}

                    {saveError && (
                      <p
                        role="alert"
                        className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-600"
                      >
                        <span className="mt-0.5 shrink-0">
                          <Icon.Alert />
                        </span>{" "}
                        {saveError}
                      </p>
                    )}

                    <button
                      type="button"
                      disabled={!canSave}
                      onClick={handleSave}
                      className="mt-5 w-full rounded-xl bg-gradient-to-b from-[#f0409a] to-[#e31c79] py-3.5 text-sm font-extrabold text-white shadow-[0_14px_28px_-12px_rgba(227,28,121,.8),inset_0_1px_0_rgba(255,255,255,.25)] transition hover:-translate-y-px disabled:translate-y-0 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
                    >
                      {saving ? "กำลังบันทึก..." : "บันทึกและเปิดให้จอง"}
                    </button>
                    <p
                      role="status"
                      className={`mt-3 text-center text-sm font-bold ${dirty || unsavedDays > 0 ? "text-amber-700" : "text-emerald-600"}`}
                    >
                      {dirty
                        ? "มีการแก้ไขที่ยังไม่ได้บันทึก"
                        : unsavedDays > 0
                          ? `มี ${unsavedDays} วันที่ยังไม่ได้บันทึกลงระบบ`
                          : "ข้อมูลตรงกับในระบบแล้ว"}
                    </p>
                  </section>
                </aside>
              </div>
            )}
          </>
        )}
      </div>

      {/* toast */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
      >
        {toast && (
          <p className="rounded-full bg-[#07116f] px-5 py-2.5 text-sm font-bold text-white shadow-[0_16px_32px_-12px_rgba(7,17,111,.7)]">
            {toast}
          </p>
        )}
      </div>
    </main>
  );
}

export default StaffBooking;
