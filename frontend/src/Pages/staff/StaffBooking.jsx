import { useEffect, useMemo, useState } from "react";
import {
  fetchQueueBoard,
  fetchSlotBookings,
  markAttendance,
  recordDocumentResult,
} from "../../services/api";

/*
|--------------------------------------------------------------------------
| จัดการคิว (เจ้าหน้าที่)
|--------------------------------------------------------------------------
| ไม่ได้ตั้งค่าวัน/รอบที่นี่แล้ว (ย้ายไปหน้าตั้งค่า) หน้านี้ใช้ "ดูคิวรายวัน"
|   1. เลือกวัน → 2. เลือกรอบเวลา → 3. รายชื่อนักศึกษาในรอบนั้น
|   แต่ละคน: มา / ไม่มา → ถ้ามา: เอกสารครบถ้วน / ไม่ครบถ้วน
|   ไม่ครบถ้วน → นักศึกษาจะเห็น "เอกสารส่งไม่สำเร็จ" และ popup ให้ติดต่อเจ้าหน้าที่
|--------------------------------------------------------------------------
*/

const FAIL_REASONS = [
  "ขาดเอกสารบางรายการ",
  "เอกสารฉบับจริงไม่ตรงกับที่อัปโหลด",
  "ลายมือชื่อไม่ครบ",
  "เอกสารหมดอายุ",
];

// สถานะของนักศึกษา 1 คนในคิว (คำนวณจาก booking + ผลตรวจเอกสาร)
function personState(b) {
  if (b.bookingStatus === "BOOKED") return "waiting";
  if (b.bookingStatus === "NO_SHOW") return "noShow";
  if (b.bookingStatus === "CHECKED_IN") return "checkedIn";
  if (b.bookingStatus === "COMPLETED") return b.signingStatus === "FAILED" ? "failed" : "completed";
  return "waiting";
}

const STATE = {
  waiting: { label: "รอมา", badge: "bg-slate-100 text-slate-600 ring-slate-300", dot: "bg-slate-400" },
  checkedIn: { label: "มาแล้ว รอตรวจเอกสาร", badge: "bg-blue-50 text-[#0646ff] ring-blue-200", dot: "bg-[#0646ff]" },
  noShow: { label: "ไม่มา", badge: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  completed: { label: "เอกสารครบถ้วน", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  failed: { label: "เอกสารไม่ครบถ้วน", badge: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
};

const SUMMARY_KEYS = [
  ["waiting", "รอมา"],
  ["checkedIn", "มาแล้ว"],
  ["noShow", "ไม่มา"],
  ["completed", "ครบถ้วน"],
  ["failed", "ไม่ครบ"],
];

const nf = (n) => Number(n || 0).toLocaleString("th-TH");

function dateParts(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return {
    weekday: d.toLocaleDateString("th-TH", { weekday: "short" }),
    day: d.getDate(),
    month: d.toLocaleDateString("th-TH", { month: "short" }),
    full: d.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  };
}

const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5bff] focus-visible:ring-offset-2";

/* ---------- ส่วนประกอบย่อย ---------- */

function Badge({ state }) {
  const s = STATE[state];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function Btn({ tone = "navy", onClick, disabled, children }) {
  const tones = {
    navy: "bg-[#07116f] text-white hover:bg-[#0c1a9a] disabled:bg-[#b9c3e3]",
    green: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-200",
    rose: "bg-white text-rose-600 ring-1 ring-inset ring-rose-300 hover:bg-rose-50 disabled:opacity-50",
    amber: "bg-white text-amber-700 ring-1 ring-inset ring-amber-300 hover:bg-amber-50 disabled:opacity-50",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-10 rounded-xl px-4 text-sm font-black transition disabled:cursor-not-allowed ${tones[tone]} ${focus}`}
    >
      {children}
    </button>
  );
}

function LinkBtn({ onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-xs font-bold text-gray-500 underline underline-offset-2 hover:text-[#07116f] disabled:opacity-50 ${focus}`}
    >
      {children}
    </button>
  );
}

// กล่องระบุเหตุผลตอนเอกสารไม่ครบ
function FailDialog({ booking, busy, onCancel, onConfirm }) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const remark = [reason, detail.trim()].filter(Boolean).join(": ");

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-[#07116f]/40 p-5 backdrop-blur-sm"
      onClick={() => !busy && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fail-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
      >
        <h2 id="fail-title" className="text-lg font-black text-[#07116f]">เอกสารไม่ครบถ้วน</h2>
        <p className="mt-1 text-sm text-gray-500">
          {booking.name} ({booking.studentCode}) จะเห็นสถานะ "เอกสารส่งไม่สำเร็จ" และข้อความให้ติดต่อเจ้าหน้าที่
        </p>

        <p className="mt-5 text-sm font-black text-[#07116f]">เหตุผล</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {FAIL_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={reason === r}
              onClick={() => setReason(reason === r ? "" : r)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset transition ${focus} ${reason === r ? "bg-[#07116f] text-white ring-[#07116f]" : "bg-white text-[#07116f] ring-[#c9d8f5] hover:bg-[#f6f9ff]"}`}
            >
              {r}
            </button>
          ))}
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-black text-[#07116f]">รายละเอียดเพิ่มเติม</span>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            maxLength={400}
            placeholder="เช่น ขาดสำเนาทะเบียนบ้านผู้ปกครอง"
            className="mt-2 w-full resize-y rounded-xl border border-[#c9d8f5] px-4 py-3 text-sm text-[#07116f] outline-none focus:border-[#0646ff] focus:ring-4 focus:ring-blue-100"
          />
        </label>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={`h-11 flex-1 rounded-xl border border-[#c9d8f5] text-sm font-black text-[#07116f] hover:bg-[#f6f9ff] ${focus}`}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => onConfirm(remark)}
            disabled={busy || !remark}
            className={`h-11 flex-1 rounded-xl bg-rose-600 text-sm font-black text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-200 ${focus}`}
          >
            {busy ? "กำลังบันทึก..." : "ยืนยันไม่ครบถ้วน"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- หน้าหลัก ---------- */

function StaffBooking() {
  const [periodId, setPeriodId] = useState(null);
  const [boardTick, setBoardTick] = useState(0);
  const [board, setBoard] = useState(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardError, setBoardError] = useState("");

  const [pickedDate, setPickedDate] = useState(null);
  const [pickedSlot, setPickedSlot] = useState(null);

  const [slotTick, setSlotTick] = useState(0);
  const [slotData, setSlotData] = useState(null);
  const [slotLoading, setSlotLoading] = useState(true);
  const [slotError, setSlotError] = useState("");

  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState({ type: "", text: "" });
  const [failTarget, setFailTarget] = useState(null);

  /* ---------- โหลดวัน/รอบ ---------- */
  useEffect(() => {
    let cancelled = false;
    fetchQueueBoard(periodId)
      .then((data) => {
        if (cancelled) return;
        setBoard(data);
        setBoardError("");
      })
      .catch((e) => {
        if (!cancelled) setBoardError(e.message || "โหลดข้อมูลคิวไม่สำเร็จ");
      })
      .finally(() => {
        if (!cancelled) setBoardLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [periodId, boardTick]);

  const today = board?.today;

  // จัดกลุ่มรอบตามวัน
  const days = useMemo(() => {
    const map = new Map();
    for (const s of board?.slots ?? []) {
      if (!map.has(s.date)) map.set(s.date, { date: s.date, slots: [], total: 0, capacity: 0 });
      const d = map.get(s.date);
      d.slots.push(s);
      d.total += s.total;
      d.capacity += s.capacity;
    }
    return [...map.values()];
  }, [board]);

  // วันที่แสดง: ที่เลือกไว้ > วันนี้ > วันถัดไปที่ใกล้ที่สุด > วันสุดท้าย
  const activeDay =
    days.find((d) => d.date === pickedDate) ||
    days.find((d) => d.date === today) ||
    days.find((d) => today && d.date > today) ||
    days[days.length - 1] ||
    null;

  // รอบที่แสดง: ที่เลือกไว้ (ถ้าอยู่ในวันนั้น) > รอบแรกที่มีคนจอง > รอบแรก
  const activeSlot =
    activeDay?.slots.find((s) => s.slotId === pickedSlot) ||
    activeDay?.slots.find((s) => s.total > 0) ||
    activeDay?.slots[0] ||
    null;
  const activeSlotId = activeSlot?.slotId ?? null;

  /* ---------- โหลดรายชื่อในรอบ ---------- */
  useEffect(() => {
    if (!activeSlotId) return undefined;
    let cancelled = false;
    fetchSlotBookings(activeSlotId)
      .then((data) => {
        if (cancelled) return;
        setSlotData(data);
        setSlotError("");
      })
      .catch((e) => {
        if (!cancelled) setSlotError(e.message || "โหลดรายชื่อไม่สำเร็จ");
      })
      .finally(() => {
        if (!cancelled) setSlotLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSlotId, slotTick]);

  const pickDate = (date) => {
    setPickedDate(date);
    setPickedSlot(null);
    setSlotLoading(true);
    setQuery("");
  };

  const pickSlot = (slotId) => {
    if (slotId === activeSlotId) return;
    setPickedSlot(slotId);
    setSlotLoading(true);
    setQuery("");
  };

  const refreshAll = () => {
    setBoardLoading(true);
    setSlotLoading(true);
    setBoardTick((n) => n + 1);
    setSlotTick((n) => n + 1);
  };

  // รายชื่อของรอบที่กำลังดู (กันกรณีข้อมูลเก่าของรอบอื่นค้าง)
  const bookings = useMemo(
    () => (slotData?.slot?.slotId === activeSlotId ? slotData.bookings : []),
    [slotData, activeSlotId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter(
      (b) => (b.name || "").toLowerCase().includes(q) || (b.studentCode || "").toLowerCase().includes(q)
    );
  }, [bookings, query]);

  // ยอดรวมของวันที่เลือก (จากข้อมูลรอบ)
  const daySummary = useMemo(() => {
    const t = { waiting: 0, checkedIn: 0, noShow: 0, completed: 0, failed: 0, total: 0 };
    for (const s of activeDay?.slots ?? []) {
      t.waiting += s.waiting;
      t.checkedIn += s.checkedIn;
      t.noShow += s.noShow;
      t.completed += s.completed;
      t.failed += s.failed;
      t.total += s.total;
    }
    return t;
  }, [activeDay]);

  /* ---------- บันทึก ---------- */
  const applyUpdate = (updated, message) => {
    setSlotData((cur) =>
      cur ? { ...cur, bookings: cur.bookings.map((b) => (b.bookingId === updated.bookingId ? updated : b)) } : cur
    );
    setToast({ type: "success", text: message });
    setBoardTick((n) => n + 1); // อัปเดตตัวเลขบนวัน/รอบแบบเงียบ ๆ
  };

  const run = async (booking, action, successText) => {
    setBusyId(booking.bookingId);
    setToast({ type: "", text: "" });
    try {
      const updated = await action();
      applyUpdate(updated, successText);
      return true;
    } catch (e) {
      setToast({ type: "error", text: e.message || "บันทึกไม่สำเร็จ" });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const setAttendance = (b, attended) =>
    run(b, () => markAttendance(b.bookingId, attended), `${b.name}: ${attended ? "มาแล้ว" : "ไม่มา"}`);

  const setComplete = (b) => {
    if (!window.confirm(`ยืนยันว่าเอกสารของ ${b.name} ครบถ้วน?`)) return;
    run(b, () => recordDocumentResult(b.bookingId, { complete: true }), `${b.name}: เอกสารครบถ้วน`);
  };

  const confirmFail = async (remark) => {
    const b = failTarget;
    const ok = await run(b, () => recordDocumentResult(b.bookingId, { complete: false, remark }), `${b.name}: เอกสารไม่ครบถ้วน`);
    if (ok) setFailTarget(null);
  };

  const isFutureDay = Boolean(activeDay && today && activeDay.date > today);

  /* ---------- แสดงผล ---------- */
  return (
    <main className="min-h-screen bg-[#eef5ff] px-5 py-8 text-[#07116f] sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1400px] space-y-6">
        {/* หัวหน้า */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-black sm:text-3xl">จัดการคิว</h1>
            <p className="mt-2 text-sm text-gray-500 sm:text-base">
              ดูนักศึกษาที่จองในแต่ละรอบ บันทึกการมา และผลตรวจเอกสารฉบับจริง
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {(board?.periods?.length ?? 0) > 1 && (
              <>
                <label className="sr-only" htmlFor="queue-period">เลือกภาคเรียน</label>
                <select
                  id="queue-period"
                  value={board?.period?.periodId ?? ""}
                  onChange={(e) => {
                    setBoardLoading(true);
                    setPeriodId(Number(e.target.value));
                    setPickedDate(null);
                    setPickedSlot(null);
                  }}
                  className={`rounded-xl border border-[#c9d8f5] bg-white px-4 py-2.5 text-sm font-semibold ${focus}`}
                >
                  {board.periods.map((p) => (
                    <option key={p.periodId} value={p.periodId}>{p.label}</option>
                  ))}
                </select>
              </>
            )}
            <button
              type="button"
              onClick={refreshAll}
              disabled={boardLoading}
              className={`rounded-xl border border-[#c9d8f5] bg-white px-4 py-2.5 text-sm font-bold hover:bg-[#f6f9ff] disabled:opacity-50 ${focus}`}
            >
              {boardLoading ? "กำลังโหลด..." : "รีเฟรช"}
            </button>
          </div>
        </div>

        {boardError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            <span className="font-semibold">{boardError}</span>
            <button type="button" onClick={refreshAll} className={`rounded-xl bg-white px-4 py-2 font-bold ring-1 ring-rose-200 ${focus}`}>
              ลองใหม่
            </button>
          </div>
        )}

        {boardLoading && !board ? (
          <div className="space-y-4" aria-busy="true" aria-label="กำลังโหลด">
            <div className="h-36 animate-pulse rounded-2xl bg-white/70" />
            <div className="h-80 animate-pulse rounded-2xl bg-white/70" />
          </div>
        ) : !board ? null : !board.period ? (
          <section className="rounded-2xl bg-white px-6 py-16 text-center">
            <p className="text-lg font-black">ยังไม่ได้กำหนดช่วงวันจองส่งเอกสาร</p>
            <p className="mt-2 text-sm text-gray-500">ไปที่เมนู ตั้งค่า แล้วกำหนดวันจองและรอบเวลาก่อน</p>
          </section>
        ) : days.length === 0 ? (
          <section className="rounded-2xl bg-white px-6 py-16 text-center">
            <p className="text-lg font-black">ยังไม่มีรอบเวลาใน{board.period.label}</p>
            <p className="mt-2 text-sm text-gray-500">ไปที่เมนู ตั้งค่า แล้วกด ตั้งรอบเวลาและจำนวนคน</p>
          </section>
        ) : (
          <>
            {/* 1. เลือกวัน */}
            <section className="rounded-2xl bg-white p-6 sm:p-7">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-black">เลือกวัน</h2>
                <p className="text-sm text-gray-500">{board.period.label}</p>
              </div>
              <div className="-mx-1 mt-4 flex gap-2.5 overflow-x-auto px-1 pb-2">
                {days.map((d) => {
                  const p = dateParts(d.date);
                  const active = d.date === activeDay?.date;
                  const isToday = d.date === today;
                  const past = today && d.date < today;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      aria-pressed={active}
                      onClick={() => pickDate(d.date)}
                      className={`relative w-[96px] shrink-0 rounded-2xl border-2 px-2 py-3 text-center transition ${focus} ${active ? "border-[#07116f] bg-[#07116f] text-white shadow-md" : "border-[#dbe6fb] bg-white hover:border-blue-300"} ${past && !active ? "opacity-60" : ""}`}
                    >
                      {isToday && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[#E31C79] px-2 py-0.5 text-[10px] font-black text-white">
                          วันนี้
                        </span>
                      )}
                      <span className="block text-xs font-bold opacity-70">{p.weekday}</span>
                      <span className="block text-2xl font-black leading-tight">{p.day}</span>
                      <span className="block text-[11px] font-bold opacity-70">{p.month}</span>
                      <span className={`mt-1.5 block rounded-full px-1 py-0.5 text-[11px] font-black ${active ? "bg-white/15" : d.total ? "bg-blue-50 text-[#0646ff]" : "bg-slate-100 text-slate-500"}`}>
                        {nf(d.total)}/{nf(d.capacity)} คน
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {activeDay && (
              <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                {/* 2. เลือกรอบ */}
                <section className="rounded-2xl bg-white p-6 lg:sticky lg:top-6">
                  <h2 className="text-lg font-black">เลือกรอบเวลา</h2>
                  <p className="mt-1 text-sm text-gray-500">{dateParts(activeDay.date).full}</p>

                  <div className="mt-4 grid grid-cols-5 gap-1.5 text-center">
                    {SUMMARY_KEYS.map(([k, label]) => (
                      <div key={k} className="rounded-xl bg-[#f6f9ff] px-1 py-2">
                        <span className="block text-lg font-black tabular-nums">{nf(daySummary[k])}</span>
                        <span className="block text-[10px] font-bold text-gray-500">{label}</span>
                      </div>
                    ))}
                  </div>

                  <ul className="mt-4 space-y-2">
                    {activeDay.slots.map((s) => {
                      const active = s.slotId === activeSlotId;
                      const done = s.completed + s.failed + s.noShow;
                      return (
                        <li key={s.slotId}>
                          <button
                            type="button"
                            aria-pressed={active}
                            onClick={() => pickSlot(s.slotId)}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${focus} ${active ? "border-[#07116f] bg-[#eef3ff]" : "border-[#e3eafa] hover:border-blue-300"}`}
                          >
                            <span>
                              <span className="block font-black tabular-nums">{s.start}–{s.end} น.</span>
                              <span className="mt-0.5 block text-xs text-gray-500">
                                จอง {nf(s.total)}/{nf(s.capacity)} คน
                                {s.total > 0 && ` · จัดการแล้ว ${nf(done)}`}
                              </span>
                            </span>
                            <span className="flex shrink-0 flex-col items-end gap-1">
                              {s.status === "CLOSED" && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">ปิดรอบ</span>
                              )}
                              {s.waiting + s.checkedIn > 0 && (
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-[#0646ff]">
                                  ค้าง {nf(s.waiting + s.checkedIn)}
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                {/* 3. รายชื่อนักศึกษา */}
                <section className="rounded-2xl bg-white p-6 sm:p-7">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-lg font-black">
                        รายชื่อนักศึกษา {activeSlot && <span className="tabular-nums">รอบ {activeSlot.start}–{activeSlot.end} น.</span>}
                      </h2>
                      {activeSlot && (
                        <p className="mt-1 text-sm text-gray-500">
                          {activeSlot.location}
                          {activeSlot.detail && ` · ${activeSlot.detail}`}
                        </p>
                      )}
                    </div>
                    {bookings.length > 0 && (
                      <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="ค้นหาชื่อหรือรหัสนักศึกษา"
                        aria-label="ค้นหานักศึกษา"
                        className={`w-full rounded-xl border border-[#c9d8f5] px-4 py-2 text-sm sm:w-64 ${focus}`}
                      />
                    )}
                  </div>

                  {isFutureDay && (
                    <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                      ยังไม่ถึงวันนัด ดูรายชื่อได้ แต่จะบันทึกการมาได้ในวันนัดเท่านั้น
                    </p>
                  )}

                  {toast.text && (
                    <p
                      role={toast.type === "error" ? "alert" : "status"}
                      className={`mt-4 rounded-xl px-4 py-3 text-sm font-bold ${toast.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}
                    >
                      {toast.text}
                    </p>
                  )}

                  {slotError ? (
                    <div className="mt-6 rounded-xl bg-rose-50 px-4 py-6 text-center text-sm text-rose-700">
                      <p className="font-bold">{slotError}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSlotLoading(true);
                          setSlotTick((n) => n + 1);
                        }}
                        className={`mt-3 rounded-xl bg-white px-4 py-2 font-bold ring-1 ring-rose-200 ${focus}`}
                      >
                        ลองใหม่
                      </button>
                    </div>
                  ) : slotLoading && bookings.length === 0 ? (
                    <div className="mt-6 space-y-3" aria-busy="true">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#f6f9ff]" />
                      ))}
                    </div>
                  ) : bookings.length === 0 ? (
                    <p className="mt-6 rounded-2xl border-2 border-dashed border-[#dbe6fb] px-4 py-14 text-center text-sm text-gray-500">
                      ยังไม่มีนักศึกษาจองรอบนี้
                    </p>
                  ) : filtered.length === 0 ? (
                    <p className="mt-6 px-4 py-10 text-center text-sm text-gray-500">ไม่พบชื่อที่ค้นหา</p>
                  ) : (
                    <ul className={`mt-5 space-y-3 transition-opacity ${slotLoading ? "opacity-60" : ""}`}>
                      {filtered.map((b, i) => {
                        const st = personState(b);
                        const busy = busyId === b.bookingId;
                        return (
                          <li
                            key={b.bookingId}
                            className="flex flex-col gap-4 rounded-2xl border border-[#e3eafa] p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex min-w-0 gap-3">
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eef3ff] text-sm font-black tabular-nums">
                                {i + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-black">{b.name}</p>
                                  <Badge state={st} />
                                </div>
                                <p className="mt-0.5 text-xs text-gray-500">
                                  <span className="tabular-nums">{b.studentCode}</span>
                                  {b.faculty && ` · ${b.faculty}`}
                                  {b.loanType && ` · ${b.loanType}`}
                                  {b.phone && ` · โทร ${b.phone}`}
                                </p>
                                {st === "failed" && b.signingRemark && (
                                  <p className="mt-1.5 text-xs font-bold text-rose-600">เหตุผล: {b.signingRemark}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                              {st === "waiting" && (
                                <div className="flex gap-2">
                                  <Btn tone="navy" disabled={busy || isFutureDay} onClick={() => setAttendance(b, true)}>
                                    มา
                                  </Btn>
                                  <Btn tone="amber" disabled={busy || isFutureDay} onClick={() => setAttendance(b, false)}>
                                    ไม่มา
                                  </Btn>
                                </div>
                              )}

                              {st === "checkedIn" && (
                                <>
                                  <div className="flex gap-2">
                                    <Btn tone="green" disabled={busy} onClick={() => setComplete(b)}>
                                      เอกสารครบถ้วน
                                    </Btn>
                                    <Btn tone="rose" disabled={busy} onClick={() => setFailTarget(b)}>
                                      ไม่ครบถ้วน
                                    </Btn>
                                  </div>
                                  <LinkBtn disabled={busy} onClick={() => setAttendance(b, false)}>
                                    กดผิด เปลี่ยนเป็นไม่มา
                                  </LinkBtn>
                                </>
                              )}

                              {st === "noShow" && (
                                <LinkBtn disabled={busy} onClick={() => setAttendance(b, true)}>
                                  กดผิด เปลี่ยนเป็นมาแล้ว
                                </LinkBtn>
                              )}

                              {st === "completed" && (
                                <LinkBtn disabled={busy} onClick={() => setFailTarget(b)}>
                                  เปลี่ยนเป็นไม่ครบถ้วน
                                </LinkBtn>
                              )}

                              {st === "failed" && (
                                <LinkBtn disabled={busy} onClick={() => setComplete(b)}>
                                  เปลี่ยนเป็นครบถ้วน
                                </LinkBtn>
                              )}

                              {busy && <span className="text-xs font-bold text-gray-400">กำลังบันทึก...</span>}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </>
        )}
      </div>

      {failTarget && (
        <FailDialog
          booking={failTarget}
          busy={busyId === failTarget.bookingId}
          onCancel={() => setFailTarget(null)}
          onConfirm={confirmFail}
        />
      )}
    </main>
  );
}

export default StaffBooking;