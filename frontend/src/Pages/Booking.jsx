import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { bookingApi } from "../services/bookingApi";

/**
 * หน้าจองวันเวลายื่นเอกสาร (เชื่อม backend)
 * - ช่วงเวลา: GET /api/queue/slots
 * - การจองปัจจุบัน: GET /api/applications/:id/booking
 * - จอง/เปลี่ยนนัด: POST /api/applications/:id/booking  (DB ยกเลิกนัดเดิมให้เอง)
 * - ยกเลิก: POST /api/applications/:id/booking/cancel
 *
 * เลขคำขออ่านจาก selectedStudent.applicationId | application_id | id
 * (ถ้า selectedStudent.id เป็น student_id ไม่ใช่ application_id ให้แก้ที่ getApplicationId)
 */

// ค่าตั้งต้น ใช้เมื่อเจ้าหน้าที่ไม่ได้ระบุสถานที่ของรอบนั้น
const LOCATIONS = {
  name: "กองพัฒนานักศึกษา อาคาร 2",
  detail: "กรุณานำเอกสารฉบับจริงมายื่นตามวันและเวลาที่จอง",
};

const BOOKABLE_STATUSES = ["DOCUMENT_APPROVED", "QUEUE_BOOKED"];
const FINISHED_STATUSES = ["SIGNED", "CENTRAL_SUBMITTED", "COMPLETED"];
const REFRESH_ON_ERROR = ["SLOT_FULL", "SLOT_CLOSED", "SLOT_IN_PAST", "SLOT_NOT_FOUND", "CONFLICT"];

const CANCEL_REASONS = [
  "ติดธุระในวันและเวลาดังกล่าว",
  "เจ็บป่วย ไม่สะดวกเดินทาง",
  "เอกสารยังเตรียมไม่ครบ",
  "อื่น ๆ",
];

const C = {
  navy: "#1C2B74",
  navyDark: "#101D5C",
  ink: "#16205A",
  pink: "#E31C79",
  muted: "#4F5F82",
  faint: "#8391B2",
  line: "#DCE5F3",
  soft: "#F3F6FC",
  green: "#159A60",
  greenBg: "#E6F8EF",
  red: "#D6335A",
};

const HEAD = "'Prompt', 'Sarabun', sans-serif";
const SHADOW_CARD = "0 1px 2px rgba(16,29,92,.05), 0 10px 30px -8px rgba(16,29,92,.14)";
const SHADOW_ACTIVE = "0 10px 22px -8px rgba(28,43,116,.55), inset 0 1px 0 rgba(255,255,255,.18)";
const SHADOW_PINK = "0 12px 26px -10px rgba(227,28,121,.7), inset 0 1px 0 rgba(255,255,255,.25)";

/* ---------- helpers ---------- */

function getApplicationId(s) {
  return s?.applicationId ?? s?.application_id ?? s?.id ?? null;
}

function describeDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return {
    label: d.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" }),
    fullLabel: d.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    weekday: d.toLocaleDateString("th-TH", { weekday: "long" }),
    dayNum: d.getDate(),
    monthYear: d.toLocaleDateString("th-TH", { month: "long", year: "numeric" }),
  };
}

const timeRange = (start, end) => `${start}–${end} น.`;

function groupSlotsByDay(slots) {
  const map = new Map();
  for (const s of slots) {
    if (!map.has(s.date)) {
      map.set(s.date, {
        id: s.date,
        ...describeDate(s.date),
        location: s.location || LOCATIONS.name,
        detail: s.detail || LOCATIONS.detail,
        slots: [],
      });
    }
    map.get(s.date).slots.push(s);
  }
  return [...map.values()].map((day) => {
    const totalCapacity = day.slots.reduce((t, s) => t + s.capacity, 0);
    const totalRemaining = day.slots.reduce((t, s) => t + s.remaining, 0);
    return { ...day, totalCapacity, totalRemaining };
  });
}

/* ---------- icons ---------- */
function IconInfo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 11v5.5M12 8v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconCheck({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCheckCircle() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#E8FBF1" />
      <path d="M7.5 12.5l3 3 6-6.5" stroke="#1CA96B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function DetailRow({ icon, label, value, sub, divider }) {
  return (
    <div style={{
      display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 16px",
      borderTop: divider ? `1px solid ${C.line}` : "none",
    }}>
      <span style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: "grid", placeItems: "center",
        background: C.soft, color: C.navy,
      }}>
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: ".76rem", color: C.faint }}>{label}</div>
        <div style={{ fontSize: ".94rem", fontWeight: 600, color: C.ink }}>{value}</div>
        {sub && <div style={{ fontSize: ".82rem", color: C.muted, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ---------- css ---------- */
const css = `
.bk { position: relative; isolation: isolate; }
.bk::before, .bk::after {
  content: ""; position: absolute; z-index: -1; border-radius: 50%; filter: blur(70px); pointer-events: none;
}
.bk::before { width: 420px; height: 420px; top: -80px; left: -120px; background: rgba(90,120,255,.16); }
.bk::after  { width: 380px; height: 380px; top: 180px; right: -120px; background: rgba(227,28,121,.10); }

.bk button:focus-visible { outline: 3px solid ${C.pink}; outline-offset: 2px; }
.bk-layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 20px; align-items: start; }
.bk-aside { position: sticky; top: 112px; display: grid; gap: 16px; }

.bk-pill { transition: transform .15s, box-shadow .15s, background .15s, border-color .15s, color .15s; }
.bk-pill:hover:not(:disabled):not([aria-pressed="true"]) {
  transform: translateY(-2px); border-color: ${C.navy} !important;
  box-shadow: 0 8px 18px -8px rgba(28,43,116,.35);
}
.bk-cta { transition: transform .15s, box-shadow .15s; }
.bk-cta:hover:not(:disabled) { transform: translateY(-1px); }

@keyframes bk-shimmer { 0% { background-position: -300px 0; } 100% { background-position: 300px 0; } }
.bk-skel { background: linear-gradient(90deg, ${C.soft} 0, #E6ECF7 60px, ${C.soft} 120px); background-size: 600px 100%;
  animation: bk-shimmer 1.2s infinite linear; border-radius: 12px; }

@keyframes bk-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes bk-pop { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: none; } }
.bk-overlay { animation: bk-fade .15s ease-out; }
.bk-dialog { animation: bk-pop .2s ease-out; }
.bk-reason { transition: border-color .15s, background .15s; cursor: pointer; }
.bk-reason:hover { border-color: ${C.navy} !important; }
.bk-reason:focus-within { outline: 3px solid ${C.pink}; outline-offset: 2px; }

@media (max-width: 860px) {
  .bk-layout { grid-template-columns: 1fr; }
  .bk-aside { position: static; }
}
@media (prefers-reduced-motion: reduce) {
  .bk * { transition: none !important; animation: none !important; }
  .bk-pill:hover, .bk-cta:hover { transform: none !important; }
}
`;

/* ================================================================ */

function Booking() {
  const { selectedStudent, refreshSelectedStudentDetail } = useApp();

  useEffect(() => {
    refreshSelectedStudentDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent?.id]);

  const statusCode = selectedStudent?.applicationStatusCode;
  const applicationId = getApplicationId(selectedStudent);
  const canBook = BOOKABLE_STATUSES.includes(statusCode);
  const isFinished = FINISHED_STATUSES.includes(statusCode);

  const [slots, setSlots] = useState([]);
  const [booking, setBooking] = useState(null);
  const [loadState, setLoadState] = useState({ status: "loading", message: "" });
  const [reloadKey, setReloadKey] = useState(0);

  const [dateId, setDateId] = useState(null);
  const [slotId, setSlotId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const days = useMemo(() => groupSlotsByDay(slots), [slots]);
  const selectedDay = days.find((d) => d.id === dateId);
  const selectedSlot = selectedDay?.slots.find((s) => s.slotId === slotId);
  const canConfirm = Boolean(selectedSlot) && !submitting;

  const reloadSlots = useCallback(async () => {
    const next = await bookingApi.getSlots(60);
    setSlots(next);
    return next;
  }, []);

  // โหลดรอบเวลา + การจองปัจจุบัน ตอนเปิดหน้า (และทุกครั้งที่กด "ลองใหม่")
  // เปลี่ยน state เฉพาะหลังได้คำตอบจาก backend เท่านั้น ตามคำแนะนำของ React
  useEffect(() => {
    if (!canBook || !applicationId) return undefined;
    let ignore = false; // ถ้าออกจากหน้าก่อนโหลดเสร็จ จะไม่อัปเดตหน้าจอ
    Promise.all([bookingApi.getSlots(60), bookingApi.getActiveBooking(applicationId)])
      .then(([nextSlots, active]) => {
        if (ignore) return;
        setSlots(nextSlots);
        setBooking(active);
        setLoadState({ status: "ready", message: "" });
      })
      .catch((e) => {
        if (!ignore) setLoadState({ status: "error", message: e.message });
      });
    return () => {
      ignore = true;
    };
  }, [canBook, applicationId, reloadKey]);

  const retryLoad = () => {
    setLoadState({ status: "loading", message: "" });
    setReloadKey((k) => k + 1);
  };
  // หมายเหตุ: ถ้าวันที่เลือกไว้หายไปหลังรีเฟรช selectedDay จะเป็น undefined เอง
  // หน้าจอจึงกลับไปเป็น "ยังไม่ได้เลือก" โดยไม่ต้องใช้ useEffect ล้างค่า

  const handleConfirm = async () => {
    if (!selectedSlot) {
      setError("กรุณาเลือกวันและเวลาที่ต้องการจอง");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const result = await bookingApi.book(applicationId, selectedSlot.slotId);
      setBooking(result);
      setRescheduling(false);
      setNotice("");
      setDateId(null);
      setSlotId(null);
      reloadSlots().catch(() => {});
      refreshSelectedStudentDetail();
    } catch (e) {
      setError(e.message);
      if (REFRESH_ON_ERROR.includes(e.code)) {
        setSlotId(null);
        reloadSlots().catch(() => {});
      }
    } finally {
      setSubmitting(false);
    }
  };

  const startReschedule = () => {
    setRescheduling(true);
    setDateId(null);
    setSlotId(null);
    setError("");
  };

  const handleCancel = async (reason) => {
    await bookingApi.cancel(applicationId, reason); // โยน error ให้ dialog แสดงเอง
    const d = describeDate(booking.date);
    setCancelOpen(false);
    setBooking(null);
    setRescheduling(false);
    setDateId(null);
    setSlotId(null);
    setNotice(`ยกเลิกการจอง${d.fullLabel} เวลา ${timeRange(booking.startTime, booking.endTime)} เรียบร้อยแล้ว เลือกวันและเวลาใหม่ได้ด้านล่าง`);
    reloadSlots().catch(() => {});
    refreshSelectedStudentDetail();
  };

  const shell = (children, maxWidth = 1120) => (
    <main className="bk" style={{ maxWidth, margin: "0 auto", padding: "34px 20px 64px", fontFamily: "'Sarabun', sans-serif", color: C.ink }}>
      <style>{css}</style>
      {children}
    </main>
  );

  /* ---------- ดำเนินการเสร็จแล้ว ---------- */
  if (isFinished) {
    return shell(
      <StateCard icon={<IconCheckCircle />} title="ยื่นเอกสารฉบับจริงเรียบร้อยแล้ว"
        text="คำขอของคุณผ่านขั้นตอนนัดหมายแล้ว ไม่ต้องจองวันเวลาเพิ่ม ติดตามสถานะได้ที่หน้าคำขอกู้ยืม" />,
      900,
    );
  }

  /* ---------- ยังไม่ผ่านการคัดกรอง ---------- */
  if (!canBook) {
    return shell(
      <StateCard
        icon={<span style={{ color: C.navy }}><IconLock /></span>}
        title="ยังไม่สามารถจองได้"
        text={
          <>
            คุณต้องยื่นคำขอกู้ยืมเงิน กยศ. และผ่านการคัดกรองเอกสารก่อน จึงจะสามารถจองวันเวลาเข้ารับบริการได้
            {selectedStudent?.eligibilityStatus === "PENDING" && " ขณะนี้คำขอของคุณอยู่ระหว่างการตรวจสอบ"}
            {selectedStudent?.eligibilityStatus === "FAILED" && " คำขอของคุณไม่ผ่านการคัดกรอง กรุณาตรวจสอบและยื่นเอกสารใหม่"}
          </>
        }
        action={
          <a href="#!" onClick={(e) => e.preventDefault()} className="bk-cta" style={{
            display: "inline-block", background: `linear-gradient(180deg, #2A3B8C, ${C.navy})`, color: "#fff",
            textDecoration: "none", fontWeight: 600, fontSize: ".92rem", padding: "12px 26px", borderRadius: 999,
            boxShadow: SHADOW_ACTIVE,
          }}>
            ไปหน้าคำขอกู้ยืมเงิน กยศ.
          </a>
        }
      />,
      900,
    );
  }

  if (!applicationId) {
    return shell(
      <StateCard icon={<span style={{ color: C.red }}><IconInfo /></span>} title="ไม่พบเลขคำขอกู้ยืม"
        text="ระบบหาเลขคำขอของคุณไม่พบ กรุณารีเฟรชหน้า หรือติดต่อเจ้าหน้าที่" />,
      900,
    );
  }

  /* ---------- กำลังโหลด / โหลดไม่สำเร็จ ---------- */
  if (loadState.status === "loading") {
    return shell(
      <div aria-busy="true" aria-label="กำลังโหลดข้อมูลการจอง" style={{ display: "grid", gap: 16 }}>
        <div className="bk-skel" style={{ height: 70, maxWidth: 420 }} />
        <div className="bk-layout">
          <div style={{ display: "grid", gap: 18 }}>
            <div className="bk-skel" style={{ height: 120 }} />
            <div className="bk-skel" style={{ height: 150 }} />
            <div className="bk-skel" style={{ height: 180 }} />
          </div>
          <div className="bk-skel" style={{ height: 300 }} />
        </div>
      </div>,
    );
  }

  if (loadState.status === "error") {
    return shell(
      <StateCard icon={<span style={{ color: C.red }}><IconInfo /></span>} title="โหลดข้อมูลการจองไม่สำเร็จ"
        text={loadState.message}
        action={
          <button type="button" className="bk-cta" onClick={retryLoad} style={{
            background: `linear-gradient(180deg, #2A3B8C, ${C.navy})`, color: "#fff", border: "none",
            fontWeight: 600, fontSize: ".92rem", padding: "12px 26px", borderRadius: 999, cursor: "pointer",
            boxShadow: SHADOW_ACTIVE,
          }}>
            ลองใหม่
          </button>
        }
      />,
      900,
    );
  }

    /* ---------- มีการจองอยู่: แสดงนัดหมาย ---------- */
  if (booking && !rescheduling) {
    const d = describeDate(booking.date);
    const checkedIn = booking.status === "CHECKED_IN";
    const btnBase = {
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      height: 46, boxSizing: "border-box", borderRadius: 12, cursor: "pointer",
      fontFamily: HEAD, fontWeight: 600, fontSize: ".9rem",
    };
    return shell(
      <>
        <div style={{ ...cardStyle, padding: "clamp(22px, 4vw, 32px)", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* หัวเรื่อง */}
          <header style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, filter: "drop-shadow(0 6px 12px rgba(28,169,107,.25))" }}>
              <IconCheckCircle />
            </div>
            <h1 style={{ fontFamily: HEAD, fontWeight: 700, fontSize: "1.3rem", color: C.ink, margin: "0 0 4px" }}>
              {checkedIn ? "เช็กอินแล้ว" : "นัดหมายของคุณ"}
            </h1>
            <p style={{ color: C.muted, fontSize: ".88rem", margin: 0 }}>
              {checkedIn ? "รอเจ้าหน้าที่เรียกตามลำดับคิวที่จุดบริการ" : "กรุณามายื่นเอกสารฉบับจริงภายในช่วงเวลาที่จองไว้"}
            </p>
          </header>

          {/* บัตรนัด */}
          <div style={{
            position: "relative", overflow: "hidden", color: "#fff", borderRadius: 16, padding: 20,
            display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, alignItems: "center",
            background: `linear-gradient(120deg, ${C.navy}, ${C.navyDark})`,
            boxShadow: "0 16px 32px -14px rgba(16,29,92,.55), inset 0 1px 0 rgba(255,255,255,.12)",
          }}>
            <span style={{ position: "absolute", width: 160, height: 160, borderRadius: "50%", top: -70, right: -40, background: "rgba(227,28,121,.3)", filter: "blur(40px)" }} />
            <span style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", bottom: -60, left: -30, background: "rgba(120,150,255,.25)", filter: "blur(40px)" }} />

            <div style={{
              position: "relative", width: 88, borderRadius: 12, overflow: "hidden", textAlign: "center",
              background: "#fff", color: C.ink, boxShadow: "0 10px 20px -10px rgba(0,0,0,.5)",
            }}>
              <div style={{ background: C.pink, color: "#fff", fontSize: ".72rem", fontWeight: 700, padding: "4px" }}>{d.weekday}</div>
              <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: "2rem", lineHeight: 1.15, paddingTop: 4 }}>{d.dayNum}</div>
              <div style={{ fontSize: ".68rem", color: C.muted, padding: "0 4px 8px" }}>{d.monthYear}</div>
            </div>

            <div style={{ position: "relative", minWidth: 0 }}>
              <div style={{ fontSize: ".78rem", opacity: 0.8, marginBottom: 2 }}>ช่วงเวลานัดหมาย</div>
              <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: "clamp(1.35rem, 4.5vw, 1.75rem)", lineHeight: 1.25 }}>
                {timeRange(booking.startTime, booking.endTime)}
              </div>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: ".74rem", fontWeight: 700,
                padding: "3px 10px", borderRadius: 999, background: "rgba(52,200,138,.2)", color: "#8EF0C4",
                border: "1px solid rgba(142,240,196,.35)",
              }}>
                <IconCheck size={11} /> {checkedIn ? "เช็กอินแล้ว" : "จองแล้ว"}
              </span>
            </div>
          </div>

          {/* รายละเอียด */}
          <div style={{ borderRadius: 14, border: `1px solid ${C.line}`, background: "#fff", overflow: "hidden" }}>
            <DetailRow icon={<IconCalendar />} label="วันที่" value={d.fullLabel} />
            <DetailRow icon={<IconPin />} label="สถานที่" value={booking.location || LOCATIONS.name}
              sub={booking.detail || LOCATIONS.detail} divider />
          </div>

          {/* หมายเหตุ */}
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-start", borderRadius: 14, padding: "12px 16px",
            background: "linear-gradient(100deg, #E6F1FF, #F1F6FF)", border: "1px solid #C9DEFB",
            color: C.navy, fontSize: ".84rem", lineHeight: 1.65,
          }}>
            <span style={{ flexShrink: 0, marginTop: 1 }}><IconInfo /></span>
            <span>
              ไม่มีหมายเลขคิวล่วงหน้า เมื่อมาถึงจุดบริการภายในช่วงเวลาที่จอง เจ้าหน้าที่จะออกลำดับคิวให้ตามลำดับการมาถึง
              {!checkedIn && " หากไม่สะดวกมาตามนัด กรุณายกเลิกหรือเปลี่ยนวันเวลา เพื่อเปิดที่ว่างให้ผู้อื่น"}
            </span>
          </div>

          {/* ปุ่ม */}
          {!checkedIn && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <button type="button" className="bk-cta" onClick={startReschedule}
                style={{ ...btnBase, border: "none", color: "#fff", background: `linear-gradient(180deg, #2A3B8C, ${C.navy})`, boxShadow: SHADOW_ACTIVE }}>
                <IconCalendar /> เปลี่ยนวันและเวลา
              </button>
              <button type="button" className="bk-cta" onClick={() => setCancelOpen(true)}
                style={{ ...btnBase, background: "#fff", border: `1.5px solid ${C.red}`, color: C.red }}>
                ยกเลิกการจอง
              </button>
            </div>
          )}
        </div>

        {cancelOpen && (
          <CancelDialog booking={booking} onClose={() => setCancelOpen(false)} onConfirm={handleCancel} />
        )}
      </>,
      560,
    );
  }

  /* ---------- ฟอร์มจอง ---------- */
  return shell(
    <>
      <section style={{ ...cardStyle, padding: "clamp(20px, 3vw, 26px)", marginBottom: 20 }}>
  <p style={{ margin: "0 0 6px", color: C.pink, fontSize: ".82rem", fontWeight: 800 }}>ขั้นตอนสุดท้ายของการยื่นกู้ยืม</p>
  <h1 style={{ fontFamily: HEAD, fontWeight: 800, fontSize: "clamp(1.55rem, 4vw, 2rem)", color: C.ink, margin: "0 0 6px" }}>
    {rescheduling ? "เปลี่ยนวันและเวลานัด" : "จองวันเวลายื่นเอกสาร"}
  </h1>
  <p style={{ color: C.muted, fontSize: ".94rem", margin: "0 0 18px" }}>เลือกวันและเวลาสำหรับยื่นเอกสารฉบับจริง</p>

  <div style={{
    display: "flex", alignItems: "flex-start", gap: 10, color: C.navy, borderRadius: 12,
    padding: "12px 14px", fontSize: ".88rem",
    background: "linear-gradient(100deg, #E6F1FF, #F1F6FF)", border: "1px solid #C9DEFB",
  }}>
    <span style={{ flexShrink: 0, marginTop: 1 }}><IconInfo /></span>
    <span>คำขอกู้ยืมของคุณผ่านการตรวจสอบแล้ว กรุณาเลือกวันและเวลาเพื่อยื่นเอกสารฉบับจริงตามนัดหมาย</span>
  </div>
</section>

      {notice && (
        <div role="status" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          borderRadius: 14, padding: "12px 16px", marginBottom: 20, fontSize: ".88rem",
          background: C.greenBg, border: "1px solid #BFEBD4", color: C.green, fontWeight: 600,
          boxShadow: "0 6px 18px -12px rgba(21,154,96,.5)",
        }}>
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="ปิดข้อความ"
            style={{ background: "none", border: "none", color: C.green, cursor: "pointer", fontSize: "1.2rem", lineHeight: 1 }}>
            ×
          </button>
        </div>
      )}

      {rescheduling && booking && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
          borderRadius: 14, padding: "12px 16px", marginBottom: 20, fontSize: ".88rem",
          background: "#FFF6E5", border: "1px solid #F5D9A3", color: "#8A5A06",
          boxShadow: "0 6px 18px -12px rgba(183,115,11,.5)",
        }}>
          <span>
            <strong>กำลังเปลี่ยนนัด</strong> การจองเดิม {describeDate(booking.date).fullLabel} เวลา{" "}
            {timeRange(booking.startTime, booking.endTime)} จะถูกยกเลิกเมื่อคุณยืนยันวันและเวลาใหม่
          </span>
          <button type="button" onClick={() => { setRescheduling(false); setError(""); }}
            style={{
              background: "#fff", border: "1px solid #E7C27A", color: "#8A5A06", fontWeight: 600,
              fontSize: ".82rem", padding: "6px 14px", borderRadius: 999, cursor: "pointer",
            }}>
            ใช้นัดเดิม
          </button>
        </div>
      )}

      <div className="bk-layout">
        <div style={{ display: "grid", gap: 18 }}>
          <Section title="สถานที่ยื่นเอกสาร">
            <div style={{
              display: "flex", alignItems: "center", gap: 14, borderRadius: 14, padding: "16px 18px",
              background: "linear-gradient(100deg, #FFF1F7, #FFF8FB 60%, #FFFFFF)",
              border: "1px solid #F7C6DC", boxShadow: "inset 0 1px 0 #fff, 0 6px 16px -10px rgba(227,28,121,.35)",
            }}>
              <span style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0, fontSize: "1.35rem",
                display: "grid", placeItems: "center", background: "#fff",
                boxShadow: "0 6px 14px -6px rgba(227,28,121,.45)",
              }}>📍</span>
              <div>
                <strong style={{ display: "block", fontSize: "1.02rem", color: C.ink }}>
                  {selectedDay?.location || days[0]?.location || LOCATIONS.name}
                </strong>
                <span style={{ display: "block", marginTop: 4, color: "#6A2A48", fontSize: ".86rem" }}>
                  {selectedDay?.detail || (selectedDay ? "" : days[0]?.detail) || LOCATIONS.detail}
                </span>
              </div>
            </div>
          </Section>

          <Section title="1. เลือกวันที่" done={!!dateId}>
            {days.length === 0 ? (
              <EmptyBox>ยังไม่มีวันที่เปิดให้จองในช่วงนี้ กรุณากลับมาตรวจสอบภายหลัง</EmptyBox>
            ) : (
              <>
                <p style={{ margin: "0 0 14px", fontSize: ".86rem", color: C.muted }}>เลือกวันทำการที่สะดวกเข้ารับบริการ</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {days.map((day) => {
                    const full = day.totalRemaining === 0;
                    const active = dateId === day.id;
                    return (
                      <button key={day.id} type="button" className="bk-pill"
                        aria-pressed={active} disabled={full}
                        onClick={() => { setDateId(day.id); setSlotId(null); setError(""); }}
                        style={{ ...pillOptionStyle(active, full), minWidth: 132, textAlign: "left" }}>
                        <strong style={{ display: "block", fontSize: ".9rem" }}>{day.label}</strong>
                        <span style={{ display: "block", marginTop: 4, fontSize: ".74rem", color: active ? "#DDE7FF" : C.muted }}>
                          {full ? "เต็มแล้ว" : `เหลือ ${day.totalRemaining} / ${day.totalCapacity} ที่`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </Section>

          <Section title="2. เลือกเวลา" done={!!selectedSlot}>
            {!selectedDay ? (
              <EmptyBox>เลือกวันที่ก่อน เพื่อดูช่วงเวลาที่ว่าง</EmptyBox>
            ) : (
              <>
                <p style={{ margin: "0 0 14px", fontSize: ".86rem", color: C.muted }}>เวลาว่างสำหรับ {selectedDay.label}</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 10 }}>
                  {selectedDay.slots.map((slot) => {
                    const isCurrent = rescheduling && booking?.slotId === slot.slotId;
                    const full = slot.remaining === 0;
                    const disabled = full || isCurrent;
                    const active = slotId === slot.slotId;
                    return (
                      <button key={slot.slotId} type="button" className="bk-pill"
                        aria-pressed={active} disabled={disabled}
                        onClick={() => { setSlotId(slot.slotId); setError(""); }}
                        style={{ ...pillOptionStyle(active, disabled), minHeight: 72, padding: "10px 12px" }}>
                        <strong style={{ display: "block", fontSize: ".9rem" }}>
                          {active ? "✓ " : ""}{slot.startTime}–{slot.endTime}
                        </strong>
                        <span style={{ display: "block", marginTop: 5, fontSize: ".74rem", color: active ? "#DDE7FF" : C.muted }}>
                          {isCurrent ? "นัดปัจจุบัน" : full ? `เต็ม ${slot.booked}/${slot.capacity} คน` : `เหลือ ${slot.remaining}/${slot.capacity} คน`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </Section>
        </div>

        <aside className="bk-aside">
          <div style={{
  ...cardStyle,
  padding: 20,
  border: `1.5px solid ${C.navy}`,
  boxShadow: "0 0 0 4px rgba(28,43,116,.06), 0 10px 30px -8px rgba(16,29,92,.14)",
}}>
  <p style={{ margin: "0 0 4px", color: C.ink, fontSize: "1rem", fontWeight: 800, fontFamily: HEAD }}>สรุปการจอง</p>
            <p style={{ margin: "0 0 16px", color: C.faint, fontSize: ".8rem" }}>ตรวจสอบข้อมูลก่อนยืนยัน</p>

            <div style={{ display: "grid", gap: 14, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, padding: "15px 0" }}>
              <TicketRow label="สถานที่" value={selectedDay?.location || days[0]?.location || LOCATIONS.name} />
              <TicketRow label="วันที่" value={selectedDay?.fullLabel || "ยังไม่ได้เลือก"} valueColor={selectedDay ? undefined : C.faint} />
              <TicketRow label="ช่วงเวลา"
                value={selectedSlot ? timeRange(selectedSlot.startTime, selectedSlot.endTime) : "ยังไม่ได้เลือก"}
                valueColor={selectedSlot ? C.navy : C.faint} />
            </div>

            {error && (
              <p role="alert" style={{ margin: "14px 0 0", color: C.red, fontSize: ".82rem", fontWeight: 600 }}>{error}</p>
            )}

            <button type="button" className="bk-cta" onClick={handleConfirm} disabled={!canConfirm}
              style={{
                width: "100%", marginTop: 18, border: "none", padding: "13px 16px", borderRadius: 12,
                fontFamily: HEAD, fontSize: ".92rem", fontWeight: 700, color: "#fff",
                background: canConfirm ? `linear-gradient(180deg, #F0409A, ${C.pink})` : "#AAB6D6",
                boxShadow: canConfirm ? SHADOW_PINK : "none",
                cursor: canConfirm ? "pointer" : "not-allowed", opacity: submitting ? 0.7 : 1,
              }}>
              {submitting ? "กำลังบันทึก..." : rescheduling ? "ยืนยันวันเวลาใหม่" : "ยืนยันการจอง"}
            </button>

            <p style={{ margin: "12px 0 0", color: C.faint, fontSize: ".76rem", lineHeight: 1.5, textAlign: "center" }}>
              ลำดับคิวจะออกให้ที่จุดบริการ เมื่อมาถึงภายในช่วงเวลาที่จอง
            </p>
          </div>
        </aside>
      </div>
    </>,
  );
}

/* ---------- กล่องยืนยันการยกเลิก ---------- */

function CancelDialog({ booking, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [other, setOther] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const d = describeDate(booking.date);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const finalReason = reason === "อื่น ๆ" ? other.trim() : reason;
  const canSubmit = Boolean(finalReason) && !busy;

  const submit = async () => {
    if (!finalReason) {
      setErr("กรุณาระบุเหตุผลการยกเลิก");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      await onConfirm(finalReason);
    } catch (e) {
      setErr(e.message || "ยกเลิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setBusy(false);
    }
  };

  return (
    <div className="bk-overlay" onClick={() => !busy && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: 20,
        background: "rgba(16,29,92,.45)", backdropFilter: "blur(3px)",
      }}>
      <div className="bk-dialog" role="dialog" aria-modal="true" aria-labelledby="bk-cancel-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 440, background: "#fff", borderRadius: 20, padding: "24px 22px 20px",
          boxShadow: "0 30px 60px -20px rgba(16,29,92,.55)", fontFamily: "'Sarabun', sans-serif", color: C.ink,
        }}>
        <h2 id="bk-cancel-title" style={{ fontFamily: HEAD, fontSize: "1.15rem", margin: "0 0 6px" }}>ยกเลิกการจองนี้?</h2>
        <p style={{ margin: "0 0 16px", fontSize: ".88rem", color: C.muted, lineHeight: 1.6 }}>
          {d.fullLabel} เวลา {timeRange(booking.startTime, booking.endTime)} ที่ว่างนี้จะเปิดให้ผู้อื่นจองทันที
          หากต้องการมาใหม่ต้องจองวันเวลาอีกครั้ง
        </p>

        <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
          <legend style={{ fontSize: ".84rem", fontWeight: 700, marginBottom: 8 }}>เหตุผลการยกเลิก</legend>
          <div style={{ display: "grid", gap: 8 }}>
            {CANCEL_REASONS.map((r) => {
              const on = reason === r;
              return (
                <label key={r} className="bk-reason" style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12,
                  border: `1.5px solid ${on ? C.navy : C.line}`, background: on ? "#F1F4FF" : "#fff", fontSize: ".88rem",
                }}>
                  <input type="radio" name="cancel-reason" value={r} checked={on}
                    onChange={() => { setReason(r); setErr(""); }}
                    style={{ accentColor: C.navy, width: 16, height: 16, margin: 0 }} />
                  {r}
                </label>
              );
            })}
          </div>
        </fieldset>

        {reason === "อื่น ๆ" && (
          <textarea value={other} onChange={(e) => { setOther(e.target.value); setErr(""); }}
            placeholder="ระบุเหตุผล" rows={3} maxLength={300} autoFocus
            style={{
              width: "100%", boxSizing: "border-box", marginTop: 10, padding: "10px 12px", borderRadius: 12,
              border: `1.5px solid ${C.line}`, fontFamily: "inherit", fontSize: ".88rem", resize: "vertical",
            }} />
        )}

        {err && <p role="alert" style={{ margin: "10px 0 0", color: C.red, fontSize: ".82rem", fontWeight: 600 }}>{err}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button type="button" onClick={onClose} disabled={busy}
            style={{
              flex: 1, background: "#fff", border: `1.5px solid ${C.line}`, color: C.ink, fontWeight: 600,
              fontSize: ".9rem", padding: "11px 14px", borderRadius: 12, cursor: busy ? "not-allowed" : "pointer",
            }}>
            เก็บการจองไว้
          </button>
          <button type="button" className="bk-cta" onClick={submit} disabled={!canSubmit}
            style={{
              flex: 1, border: "none", color: "#fff", fontWeight: 700, fontSize: ".9rem", padding: "11px 14px", borderRadius: 12,
              background: canSubmit ? `linear-gradient(180deg, #E24B6E, ${C.red})` : "#E3B3BF",
              boxShadow: canSubmit ? "0 10px 22px -10px rgba(214,51,90,.7)" : "none",
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}>
            {busy ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- ส่วนประกอบย่อย ---------- */

const cardStyle = {
  background: "linear-gradient(180deg, #FFFFFF, #FBFCFF)",
  border: `1px solid ${C.line}`,
  borderRadius: 18,
  boxShadow: SHADOW_CARD,
};

function StateCard({ icon, title, text, action }) {
  return (
    <div style={{ ...cardStyle, padding: "clamp(32px, 6vw, 56px)", textAlign: "center" }}>
      <div style={{
        width: 80, height: 80, borderRadius: "50%", margin: "0 auto 20px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "radial-gradient(circle at 30% 25%, #FFFFFF, #E4EBFF 70%)",
        boxShadow: "0 12px 28px -10px rgba(28,43,116,.4), inset 0 -3px 8px rgba(28,43,116,.08)",
      }}>
        {icon}
      </div>
      <h1 style={{ fontFamily: HEAD, fontWeight: 700, fontSize: "1.5rem", color: C.ink, margin: "0 0 10px" }}>{title}</h1>
      <p style={{ color: C.muted, fontSize: ".95rem", lineHeight: 1.7, maxWidth: "48ch", margin: action ? "0 auto 26px" : "0 auto" }}>{text}</p>
      {action}
    </div>
  );
}

function EmptyBox({ children }) {
  return (
    <div style={{
      borderRadius: 12, background: C.soft, border: `1px dashed ${C.line}`,
      padding: "15px 16px", color: C.faint, fontSize: ".88rem",
    }}>
      {children}
    </div>
  );
}

function Section({ title, done, children }) {
  return (
    <div style={{ ...cardStyle, padding: "20px 22px" }}>
      <h2 style={{
        display: "flex", alignItems: "center", gap: 8, fontFamily: HEAD, fontWeight: 700,
        fontSize: "1.02rem", color: C.ink, margin: "0 0 14px",
      }}>
        {title}
        {done && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".72rem", fontWeight: 700,
            padding: "3px 9px", borderRadius: 999, background: C.greenBg, color: C.green,
          }}>
            <IconCheck size={11} /> เลือกแล้ว
          </span>
        )}
      </h2>
      {children}
    </div>
  );
}

function TicketRow({ label, value, valueColor }) {
  return (
    <div>
      <div style={{ fontSize: ".76rem", color: C.faint }}>{label}</div>
      <div style={{ fontSize: ".92rem", fontWeight: 600, color: valueColor || C.ink }}>{value}</div>
    </div>
  );
}

function pillOptionStyle(active, disabled) {
  return {
    border: `1.5px solid ${active ? C.navy : C.line}`,
    background: active ? `linear-gradient(180deg, #2A3B8C, ${C.navy})` : disabled ? C.soft : "#fff",
    color: active ? "#fff" : C.ink,
    fontFamily: "'Sarabun', sans-serif",
    fontWeight: 600,
    fontSize: ".86rem",
    padding: "10px 18px",
    borderRadius: 12,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    boxShadow: active ? SHADOW_ACTIVE : "0 1px 2px rgba(16,29,92,.06)",
  };
}

export default Booking;