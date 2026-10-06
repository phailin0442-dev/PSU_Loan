import { useEffect, useMemo, useState } from "react";
import {
    fetchApplicationPeriods,
    fetchHomeContent,
    fetchQueueFailMessage,
    QUEUE_FAIL_DEFAULTS,
    fetchStaffList,
    saveApplicationPeriod,
    saveQueueDates,
    toggleApplicationPeriod,
    updateApplicationPeriod,
    updateHomeContent,
} from "../../services/api";
import { loadSlotDays, saveSlotDays } from "../../services/queueSlotApi";

/*
|--------------------------------------------------------------------------
| หน้าตั้งค่าระบบ
|--------------------------------------------------------------------------
| เมนูด้านซ้าย 3 หมวด:
|   1. ตั้งค่าหน้าหลัก
|   2. ตั้งค่าช่วงเวลาเปิดให้ยื่นกู้
|   3. ตั้งค่าช่วงเวลาเปิดจองส่งเอกสาร (รวมการตั้งรอบเวลาและจำนวนคนต่อรอบ)
|
| กติกากันบันทึกทับ:
|   - เพิ่มเทอมใหม่: ถ้าปี+เทอมนั้นมีวันที่อยู่แล้ว → ปุ่มบันทึกกดไม่ได้
|     แจ้งเตือนวันที่เดิม และมีปุ่ม "แก้ไขเทอมนี้แทน"
|   - กำหนดวันจองส่งเอกสาร: ถ้าเทอมนั้นมีวันจองแล้ว → บันทึกใหม่ไม่ได้ ต้องกด "แก้ไข"
|   - ก่อนบันทึกแบบเพิ่มใหม่ จะโหลดข้อมูลล่าสุดจาก server มาเช็กซ้ำอีกรอบ
|     (กันกรณีเจ้าหน้าที่คนอื่นเพิ่งบันทึกไป)
|   - แก้ไข: ล็อกปี+เทอม แก้ได้เฉพาะวันที่ และกดบันทึกได้เมื่อมีการเปลี่ยนแปลงเท่านั้น
|   - รอบเวลา: ลดจำนวนคนต่ำกว่าที่จองแล้วไม่ได้ ลบรอบที่มีผู้จองไม่ได้
|     ตัดช่วงวันจองหรือล้างวันจอง ถ้าวันที่หลุดออกมีผู้จอง จะไม่ให้บันทึก
|--------------------------------------------------------------------------
*/

const SEMESTER_OPTIONS = [1, 2];

const INPUT =
    "h-11 w-full rounded-xl border border-[#d9e3f7] bg-white px-4 font-semibold text-[#07116f] outline-none transition placeholder:font-normal placeholder:text-gray-300 focus:border-[#0646ff] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400";

const TEXTAREA =
    "w-full resize-y rounded-xl border border-[#d9e3f7] bg-white px-4 py-3 text-[#07116f] outline-none transition placeholder:text-gray-300 focus:border-[#0646ff] focus:ring-4 focus:ring-blue-100";

const SECTIONS = [
    { id: "home", icon: "🏠", title: "ตั้งค่าหน้าหลัก", desc: "ข้อความบนหน้าแรก และข้อความแจ้งนักศึกษา" },
    { id: "period", icon: "📝", title: "ตั้งค่าช่วงเวลาเปิดให้ยื่นกู้", desc: "หนึ่งเทอมมีได้หนึ่งช่วงเวลา" },
    { id: "queue", icon: "📅", title: "ตั้งค่าช่วงเวลาเปิดจองส่งเอกสาร", desc: "ช่วงวันจอง รอบเวลา และจำนวนคน" },
];

/* ---------- วันที่ ---------- */

function todayISO() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
}

const currentThaiYear = () => String(new Date().getFullYear() + 543);

function formatThaiDate(iso) {
    if (!iso) return "-";
    return new Date(`${iso}T00:00:00`).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function dateParts(iso) {
    const d = new Date(`${iso}T00:00:00`);
    return {
        day: d.getDate(),
        month: d.toLocaleDateString("th-TH", { month: "short" }),
        year: d.toLocaleDateString("th-TH", { year: "numeric" }).replace(/\D/g, "").slice(-2),
        weekday: d.toLocaleDateString("th-TH", { weekday: "short" }),
    };
}

function daysInclusive(start, end) {
    if (!start || !end) return 0;
    const ms = new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`);
    return Math.round(ms / 86400000) + 1;
}

const dateRange = (start, end) => `${formatThaiDate(start)} – ${formatThaiDate(end)}`;

const termLabel = (p) => `ภาคเรียนที่ ${p.semester}/${p.academicYear}`;

const sameTerm = (p, year, semester) =>
    String(p.academicYear) === String(year).trim() && Number(p.semester) === Number(semester);

const sortPeriods = (list) =>
    [...list].sort(
        (a, b) =>
            Number(b.academicYear) - Number(a.academicYear) || Number(b.semester) - Number(a.semester)
    );

/* สถานะตามวันที่: กำลังเปิด / ยังไม่ถึง / สิ้นสุด / ปิดใช้งาน / ยังไม่กำหนด */
function phaseOf(start, end, enabled = true) {
    if (!start || !end) return "unset";
    if (!enabled) return "disabled";
    const t = todayISO();
    if (t < start) return "upcoming";
    if (t > end) return "ended";
    return "active";
}

const PHASE = {
    active: { label: "กำลังเปิดอยู่", bar: "bg-emerald-500", tone: "green" },
    upcoming: { label: "ยังไม่ถึงกำหนด", bar: "bg-[#0646ff]", tone: "blue" },
    ended: { label: "สิ้นสุดแล้ว", bar: "bg-gray-300", tone: "gray" },
    disabled: { label: "ปิดใช้งาน", bar: "bg-gray-300", tone: "gray" },
    unset: { label: "ยังไม่กำหนด", bar: "bg-amber-400", tone: "amber" },
};

/* ================================================================ */

function StaffSettings() {
    const [section, setSection] = useState("home");

    const [periods, setPeriods] = useState([]);
    const [periodsLoading, setPeriodsLoading] = useState(true);
    const [periodsError, setPeriodsError] = useState("");

    // เทอมที่กดมาจากหมวด 2 → ไฮไลต์ในหมวด 3
    const [queueFocusId, setQueueFocusId] = useState(null);

    useEffect(() => {
        let cancelled = false;
        fetchApplicationPeriods()
            .then((r) => {
                if (!cancelled) setPeriods(r.data || []);
            })
            .catch((e) => {
                if (!cancelled) setPeriodsError(e.message || "โหลดข้อมูลช่วงเวลาไม่สำเร็จ");
            })
            .finally(() => {
                if (!cancelled) setPeriodsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // คืนรายการล่าสุดด้วย เพื่อให้ฟอร์มเอาไปเช็กซ้ำก่อนบันทึกได้
    const reloadPeriods = async () => {
        try {
            const r = await fetchApplicationPeriods();
            const list = r.data || [];
            setPeriods(list);
            setPeriodsError("");
            return list;
        } catch (e) {
            setPeriodsError(e.message || "โหลดข้อมูลช่วงเวลาไม่สำเร็จ");
            throw e;
        }
    };

    const sorted = useMemo(() => sortPeriods(periods), [periods]);

    const goTo = (id) => {
        setSection(id);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const goQueue = (periodId) => {
        setQueueFocusId(periodId);
        goTo("queue");
    };

    const anyActive = sorted.some((p) => phaseOf(p.startDate, p.endDate, p.isOpen) === "active");
    const missingQueue = sorted.filter((p) => !p.queueStartDate).length;

    const navNote = {
        home: { text: "แบนเนอร์และประกาศ", warn: false },
        period: {
            text: sorted.length ? `${sorted.length} เทอม${anyActive ? " · มีเทอมเปิดรับอยู่" : ""}` : "ยังไม่มีเทอม",
            warn: sorted.length === 0,
        },
        queue: {
            text: periodsLoading
                ? "กำลังโหลด..."
                : missingQueue
                    ? `${missingQueue} เทอมยังไม่กำหนด`
                    : sorted.length
                        ? "กำหนดครบทุกเทอม"
                        : "ยังไม่มีเทอม",
            warn: missingQueue > 0,
        },
    };

    const current = SECTIONS.find((s) => s.id === section);

    return (
        <main className="min-h-screen bg-[#eef3fc] px-4 py-6 text-[#07116f] sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-[1400px]">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <h1 className="text-2xl font-black sm:text-3xl">ตั้งค่าระบบ</h1>
                    <p className="text-sm text-gray-500">{current.desc}</p>
                </div>

                {/* ---------- แท็บหมวด (แนวนอน ใช้พื้นที่น้อย) ---------- */}
                <nav aria-label="หมวดการตั้งค่า" className="mb-5">
                    <ul className="grid gap-2 rounded-2xl bg-white p-1.5 shadow-[0_8px_30px_-18px_rgba(7,17,111,.35)] sm:grid-cols-3">
                        {SECTIONS.map((s) => {
                            const active = section === s.id;
                            const note = navNote[s.id];
                            return (
                                <li key={s.id}>
                                    <button
                                        type="button"
                                        aria-current={active ? "page" : undefined}
                                        onClick={() => setSection(s.id)}
                                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${active ? "bg-[#07116f] text-white" : "hover:bg-[#eef3fc]"}`}
                                    >
                                        <span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base ${active ? "bg-white/15" : "bg-[#eef3fc]"}`}>
                                            {s.icon}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-black leading-snug">{s.title}</span>
                                            <span className={`block truncate text-xs ${active ? "text-blue-100" : note.warn ? "font-bold text-amber-600" : "text-gray-400"}`}>
                                                {note.text}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <section aria-labelledby="section-title" className="min-w-0">
                    <h2 id="section-title" className="sr-only">{current.title}</h2>

                    {section === "home" && <HomeSection />}

                    {section === "period" && (
                        <PeriodSection
                            periods={sorted}
                            loading={periodsLoading}
                            error={periodsError}
                            onReload={reloadPeriods}
                            onGoQueue={goQueue}
                        />
                    )}

                    {section === "queue" && (
                        <QueueSection
                            periods={sorted}
                            loading={periodsLoading}
                            error={periodsError}
                            focusId={queueFocusId}
                            onReload={reloadPeriods}
                            onGoPeriod={() => goTo("period")}
                        />
                    )}
                </section>
            </div>
        </main>
    );
}

/*
|--------------------------------------------------------------------------
| ส่วนประกอบที่ใช้ร่วมกัน
|--------------------------------------------------------------------------
*/

// ชื่อหมวดอยู่ในแท็บด้านบนแล้ว ตรงนี้จึงเหลือแค่คำอธิบายสั้น ๆ กับปุ่ม (ประหยัดพื้นที่)
function SectionHeader({ desc, action }) {
    if (!desc && !action) return null;
    return (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {desc ? <p className="text-sm text-gray-500">{desc}</p> : <span />}
            {action}
        </div>
    );
}

function Panel({ title, desc, action, children, className = "" }) {
    return (
        <div className={`overflow-hidden rounded-2xl border border-[#dfe7f8] bg-white ${className}`}>
            {(title || action) && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2fb] px-5 py-3.5">
                    <div>
                        {title && <h3 className="font-black">{title}</h3>}
                        {desc && <p className="mt-0.5 text-xs text-gray-500">{desc}</p>}
                    </div>
                    {action}
                </div>
            )}
            <div className="p-5">{children}</div>
        </div>
    );
}

function Field({ label, hint, children }) {
    return (
        <label className="block">
            <span className="text-sm font-black">{label}</span>
            <span className="mt-2 block">{children}</span>
            {hint && <span className="mt-1.5 block text-xs text-gray-400">{hint}</span>}
        </label>
    );
}

function PrimaryButton({ onClick, disabled, busy, children, full }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || busy}
            className={`h-11 rounded-xl bg-[#07116f] px-6 text-sm font-black text-white shadow-[0_10px_20px_-10px_rgba(7,17,111,.7)] transition hover:bg-[#0a1a99] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:bg-[#b9c3e3] disabled:shadow-none ${full ? "w-full" : ""
                }`}
        >
            {busy ? "กำลังบันทึก..." : children}
        </button>
    );
}

function SecondaryButton({ onClick, disabled, children, danger, small }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`rounded-xl border font-black transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50 ${small ? "h-9 px-3 text-xs" : "h-11 px-5 text-sm"
                } ${danger
                    ? "border-red-200 text-red-600 hover:bg-red-50"
                    : "border-[#d9e3f7] bg-white text-[#07116f] hover:bg-[#eef3fc]"
                }`}
        >
            {children}
        </button>
    );
}

function Badge({ tone, children }) {
    const tones = {
        green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        blue: "bg-blue-50 text-[#0646ff] ring-blue-200",
        gray: "bg-gray-50 text-gray-500 ring-gray-200",
        amber: "bg-amber-50 text-amber-700 ring-amber-200",
    };
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ring-1 ${tones[tone]}`}>
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
            {children}
        </span>
    );
}

function Notice({ type, children, action }) {
    if (!children) return null;
    const styles = {
        success: "border-emerald-200 bg-emerald-50 text-emerald-800",
        error: "border-red-200 bg-red-50 text-red-700",
        warn: "border-amber-200 bg-amber-50 text-amber-800",
    };
    return (
        <div
            role={type === "success" ? "status" : "alert"}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${styles[type]}`}
        >
            <div className="min-w-0">{children}</div>
            {action}
        </div>
    );
}

/* บล็อกวันที่แบบปฏิทินเล็ก */
function DateTile({ iso, muted }) {
    if (!iso) {
        return (
            <span className="grid h-[68px] w-[64px] place-items-center rounded-2xl border-2 border-dashed border-gray-200 text-lg font-black text-gray-300">
                ?
            </span>
        );
    }
    const p = dateParts(iso);
    return (
        <span
            className={`flex h-[68px] w-[64px] flex-col items-center justify-center rounded-2xl border text-center ${muted ? "border-gray-200 bg-gray-50 text-gray-400" : "border-[#d9e3f7] bg-white text-[#07116f]"
                }`}
        >
            <span className="text-[10px] font-bold leading-none opacity-70">{p.weekday}</span>
            <span className="mt-1 text-2xl font-black leading-none">{p.day}</span>
            <span className="mt-1 text-[10px] font-bold leading-none opacity-70">
                {p.month} {p.year}
            </span>
        </span>
    );
}

function DateSpan({ start, end, muted }) {
    const days = daysInclusive(start, end);
    return (
        <div className="flex items-center gap-2">
            <DateTile iso={start} muted={muted} />
            <span className="flex flex-col items-center px-1 text-xs text-gray-400">
                <span aria-hidden="true" className="h-px w-8 bg-gray-300" />
                <span className="mt-1 whitespace-nowrap">{start && end ? `${days} วัน` : "ถึง"}</span>
            </span>
            <DateTile iso={end} muted={muted} />
            <span className="sr-only">{start && end ? dateRange(start, end) : "ยังไม่กำหนด"}</span>
        </div>
    );
}

function Switch({ checked, onChange, disabled, label }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={onChange}
            className={`relative h-7 w-12 shrink-0 rounded-full transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 ${checked ? "bg-emerald-500" : "bg-gray-300"
                }`}
        >
            <span
                aria-hidden="true"
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-6" : "left-1"
                    }`}
            />
        </button>
    );
}

function LoadingBlock() {
    return (
        <div className="space-y-3" aria-busy="true" aria-label="กำลังโหลด">
            {[0, 1].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-3xl bg-white/70" />
            ))}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| หมวด 1: ตั้งค่าหน้าหลัก
|--------------------------------------------------------------------------
*/
const EMPTY_HOME_FORM = {
    bannerTitle: "",
    bannerSubtitle: "",
    bannerDescription: "",
    notice: "",
    popupTitle: QUEUE_FAIL_DEFAULTS.title,
    popupNoShow: QUEUE_FAIL_DEFAULTS.noShow,
    popupIncomplete: QUEUE_FAIL_DEFAULTS.incomplete,
    popupContact: QUEUE_FAIL_DEFAULTS.contact,
};

function HomeSection() {
    const [staffList, setStaffList] = useState([]);
    const [staffId, setStaffId] = useState("");
    const [form, setForm] = useState(EMPTY_HOME_FORM);
    const [saved, setSaved] = useState(null); // ค่าที่บันทึกล่าสุด ใช้เช็กว่ามีการแก้ไขไหม
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState({ type: "", text: "" });
    const [preview, setPreview] = useState("home"); // home | noShow | incomplete

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            fetchHomeContent(),
            fetchStaffList(),
            fetchQueueFailMessage().catch(() => ({ data: QUEUE_FAIL_DEFAULTS })),
        ])
            .then(([content, staff, popup]) => {
                if (cancelled) return;
                const banner = content.data?.banner || {};
                const p = { ...QUEUE_FAIL_DEFAULTS, ...(popup?.data || {}) };
                const next = {
                    bannerTitle: banner.title || "",
                    bannerSubtitle: banner.subtitle || "",
                    bannerDescription: banner.description || "",
                    notice: content.data?.notice || "",
                    popupTitle: p.title,
                    popupNoShow: p.noShow,
                    popupIncomplete: p.incomplete,
                    popupContact: p.contact,
                };
                setForm(next);
                setSaved(next);
                setStaffList(staff.data || []);
                if (staff.data?.length) setStaffId(String(staff.data[0].staffId));
            })
            .catch((e) => {
                if (!cancelled) setMsg({ type: "error", text: e.message || "โหลดข้อมูลไม่สำเร็จ" });
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const dirty = saved && JSON.stringify(form) !== JSON.stringify(saved);

    const change = (field, previewMode) => (e) => {
        setForm((f) => ({ ...f, [field]: e.target.value }));
        setMsg({ type: "", text: "" });
        if (previewMode) setPreview(previewMode);
    };

    const resetPopup = () => {
        setForm((f) => ({
            ...f,
            popupTitle: QUEUE_FAIL_DEFAULTS.title,
            popupNoShow: QUEUE_FAIL_DEFAULTS.noShow,
            popupIncomplete: QUEUE_FAIL_DEFAULTS.incomplete,
            popupContact: QUEUE_FAIL_DEFAULTS.contact,
        }));
        setMsg({ type: "", text: "" });
    };

    const handleSave = async () => {
        if (!form.bannerTitle.trim() || !form.bannerSubtitle.trim()) {
            setMsg({ type: "error", text: "กรุณากรอกหัวข้อหลักและหัวข้อรองให้ครบ" });
            return;
        }
        if (!form.popupTitle.trim() || !form.popupContact.trim()) {
            setMsg({ type: "error", text: "กรุณากรอกหัวข้อ popup และข้อความติดต่อเจ้าหน้าที่ให้ครบ" });
            return;
        }
        setSaving(true);
        try {
            await updateHomeContent({
                bannerTitle: form.bannerTitle,
                bannerSubtitle: form.bannerSubtitle,
                bannerDescription: form.bannerDescription,
                notice: form.notice,
                queueFailPopup: {
                    title: form.popupTitle,
                    noShow: form.popupNoShow,
                    incomplete: form.popupIncomplete,
                    contact: form.popupContact,
                },
                staffId: Number(staffId),
            });
            setSaved(form);
            setMsg({ type: "success", text: "บันทึกเรียบร้อยแล้ว" });
        } catch (e) {
            setMsg({ type: "error", text: e.message || "บันทึกไม่สำเร็จ" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingBlock />;

    const previewTabs = [
        ["home", "หน้าแรก"],
        ["noShow", "popup: ไม่มา"],
        ["incomplete", "popup: เอกสารไม่ครบ"],
    ];

    return (
        <>
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
                {/* ---------- ซ้าย: ฟอร์ม ---------- */}
                <div className="space-y-5">
                    <Panel title="หน้าแรก" desc="แบนเนอร์และแถบประกาศที่นักศึกษาเห็นเป็นอย่างแรก">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="หัวข้อหลัก *">
                                <input value={form.bannerTitle} onChange={change("bannerTitle", "home")} placeholder="เช่น กยศ." className={INPUT} />
                            </Field>
                            <Field label="หัวข้อรอง *">
                                <input
                                    value={form.bannerSubtitle}
                                    onChange={change("bannerSubtitle", "home")}
                                    placeholder="เช่น กองทุนเงินให้กู้ยืมเพื่อการศึกษา"
                                    className={INPUT}
                                />
                            </Field>
                            <Field label="คำอธิบาย" hint="ไม่บังคับ">
                                <textarea value={form.bannerDescription} onChange={change("bannerDescription", "home")} rows={3} className={TEXTAREA} />
                            </Field>
                            <Field label="ประกาศ (แถบสีเหลือง)" hint="เว้นว่างถ้าไม่ต้องการแสดง">
                                <textarea
                                    value={form.notice}
                                    onChange={change("notice", "home")}
                                    rows={3}
                                    placeholder="เช่น เปิดรับยื่นกู้เทอม 1/2569 ระหว่าง 10–15 ส.ค. 2569"
                                    className={TEXTAREA}
                                />
                            </Field>
                        </div>
                    </Panel>

                    <Panel
                        title="ข้อความเมื่อยื่นเอกสารไม่สำเร็จ"
                        desc="popup ที่นักศึกษาเห็นเมื่อไม่มาตามนัด หรือเอกสารฉบับจริงไม่ครบ"
                        action={
                            <button
                                type="button"
                                onClick={resetPopup}
                                className="text-xs font-bold text-gray-500 underline underline-offset-2 hover:text-[#07116f]"
                            >
                                คืนค่าข้อความเริ่มต้น
                            </button>
                        }
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <Field label="หัวข้อ popup *">
                                    <input value={form.popupTitle} onChange={change("popupTitle")} maxLength={120} className={INPUT} />
                                </Field>
                            </div>
                            <Field label="เมื่อไม่มาตามนัด">
                                <textarea value={form.popupNoShow} onChange={change("popupNoShow", "noShow")} rows={3} maxLength={500} className={TEXTAREA} />
                            </Field>
                            <Field label="เมื่อเอกสารไม่ครบ" hint="เหตุผลที่เจ้าหน้าที่ระบุจะแสดงต่อท้ายให้อัตโนมัติ">
                                <textarea
                                    value={form.popupIncomplete}
                                    onChange={change("popupIncomplete", "incomplete")}
                                    rows={3}
                                    maxLength={500}
                                    className={TEXTAREA}
                                />
                            </Field>
                            <div className="md:col-span-2">
                                <Field label="ข้อความติดต่อเจ้าหน้าที่ *" hint="แสดงทั้งสองกรณี เช่น สถานที่ เวลาทำการ เบอร์โทร">
                                    <textarea value={form.popupContact} onChange={change("popupContact")} rows={2} maxLength={500} className={TEXTAREA} />
                                </Field>
                            </div>
                        </div>
                    </Panel>
                </div>

                {/* ---------- ขวา: ตัวอย่าง (สลับได้) ---------- */}
                <div className="xl:sticky xl:top-6">
                    <Panel title="ตัวอย่าง">
                        <div role="tablist" aria-label="เลือกตัวอย่าง" className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-[#eef3fc] p-1">
                            {previewTabs.map(([k, label]) => (
                                <button
                                    key={k}
                                    type="button"
                                    role="tab"
                                    aria-selected={preview === k}
                                    onClick={() => setPreview(k)}
                                    className={`rounded-lg px-2 py-1.5 text-xs font-black transition ${preview === k ? "bg-white text-[#07116f] shadow-sm" : "text-gray-500 hover:text-[#07116f]"}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {preview === "home" ? (
                            <div className="overflow-hidden rounded-2xl ring-1 ring-[#dfe7f8]">
                                {form.notice.trim() && (
                                    <div className="bg-amber-100 px-4 py-2 text-xs font-bold leading-relaxed text-amber-800">📢 {form.notice}</div>
                                )}
                                <div className="bg-gradient-to-br from-[#07116f] to-[#0646ff] p-5 text-white">
                                    <p className="break-words text-2xl font-black">{form.bannerTitle || <span className="opacity-40">หัวข้อหลัก</span>}</p>
                                    <p className="mt-1 break-words font-bold">{form.bannerSubtitle || <span className="opacity-40">หัวข้อรอง</span>}</p>
                                    {form.bannerDescription && (
                                        <p className="mt-3 whitespace-pre-line break-words text-xs leading-relaxed text-blue-100">{form.bannerDescription}</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl bg-[#07116f]/10 p-4">
                                <div className="rounded-2xl bg-white p-5 text-center shadow-lg">
                                    <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-rose-50 text-xl font-black text-rose-600" aria-hidden="true">!</div>
                                    <p className="mt-3 break-words text-base font-black text-rose-600">{form.popupTitle || "หัวข้อ popup"}</p>
                                    <p className="mt-1.5 whitespace-pre-line break-words text-xs leading-relaxed text-gray-600">
                                        {preview === "noShow" ? form.popupNoShow : form.popupIncomplete}
                                    </p>
                                    {preview === "incomplete" && (
                                        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-left text-xs font-bold text-rose-700">
                                            เหตุผล: (ตามที่เจ้าหน้าที่ระบุ)
                                        </p>
                                    )}
                                    <p className="mt-3 whitespace-pre-line break-words rounded-lg bg-[#eef5ff] px-3 py-2 text-left text-xs font-bold leading-relaxed text-[#07116f]">
                                        {form.popupContact}
                                    </p>
                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        <span className="rounded-lg border border-[#c9d8f5] py-2 text-xs font-black">ดูสถานะคำขอ</span>
                                        <span className="rounded-lg bg-[#07116f] py-2 text-xs font-black text-white">รับทราบ</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Panel>
                </div>
            </div>

            {/* ---------- แถบบันทึก ติดขอบล่าง ---------- */}
            <div className="sticky bottom-4 z-10 mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_16px_40px_-18px_rgba(7,17,111,.55)] ring-1 ring-[#dfe7f8]">
                <label className="flex items-center gap-2 text-sm font-black">
                    ผู้แก้ไข
                    <select
                        value={staffId}
                        onChange={(e) => setStaffId(e.target.value)}
                        className="h-10 rounded-xl border border-[#d9e3f7] bg-white px-3 text-sm font-semibold text-[#07116f] outline-none focus:border-[#0646ff] focus:ring-4 focus:ring-blue-100"
                    >
                        {staffList.map((s) => (
                            <option key={s.staffId} value={s.staffId}>{s.fullName}</option>
                        ))}
                    </select>
                </label>

                <span
                    role={msg.type === "error" ? "alert" : "status"}
                    className={`min-w-0 flex-1 text-sm font-bold ${msg.type === "error" ? "text-red-600" : msg.type === "success" ? "text-emerald-600" : dirty ? "text-amber-600" : "text-gray-400"}`}
                >
                    {msg.text || (dirty ? "มีการแก้ไขที่ยังไม่ได้บันทึก" : "ยังไม่มีการแก้ไข")}
                </span>

                <PrimaryButton onClick={handleSave} busy={saving} disabled={!dirty}>
                    บันทึก
                </PrimaryButton>
            </div>
        </>
    );
}

/*
|--------------------------------------------------------------------------
| หมวด 2: ตั้งค่าช่วงเวลาเปิดให้ยื่นกู้
|--------------------------------------------------------------------------
*/
function PeriodSection({ periods, loading, error, onReload, onGoQueue }) {
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    const [msg, setMsg] = useState({ type: "", text: "" });

    const startAdd = () => {
        setEditingId(null);
        setAdding(true);
        setMsg({ type: "", text: "" });
    };

    const startEdit = (periodId) => {
        setAdding(false);
        setEditingId(periodId);
        setMsg({ type: "", text: "" });
        // รอให้แถวเปลี่ยนเป็นโหมดแก้ไขก่อนค่อยเลื่อนไป
        requestAnimationFrame(() =>
            document.getElementById(`period-row-${periodId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
        );
    };

    const handleToggle = async (period) => {
        setTogglingId(period.periodId);
        setMsg({ type: "", text: "" });
        try {
            await toggleApplicationPeriod(period.periodId);
            await onReload();
            setMsg({
                type: "success",
                text: `${period.isOpen ? "ปิดใช้งาน" : "เปิดใช้งาน"}${termLabel(period)} แล้ว`,
            });
        } catch (e) {
            setMsg({ type: "error", text: e.message || "เปลี่ยนสถานะไม่สำเร็จ" });
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <>
            <SectionHeader
                icon="📝"
                title="ตั้งค่าช่วงเวลาเปิดให้ยื่นกู้"
                desc="หนึ่งเทอมมีได้หนึ่งช่วงเวลา ถ้าต้องการเปลี่ยนวันที่ให้กด แก้ไข ที่เทอมนั้น"
                action={
                    !adding && (
                        <PrimaryButton onClick={startAdd}>
                            + เพิ่มเทอมใหม่
                        </PrimaryButton>
                    )
                }
            />

            <div className="space-y-4">
                {error && <Notice type="error">{error}</Notice>}
                {msg.text && <Notice type={msg.type}>{msg.text}</Notice>}

                {adding && (
                    <NewPeriodForm
                        periods={periods}
                        onReload={onReload}
                        onCancel={() => setAdding(false)}
                        onCreated={(text) => {
                            setAdding(false);
                            setMsg({ type: "success", text });
                        }}
                        onEditExisting={startEdit}
                    />
                )}

                {loading ? (
                    <LoadingBlock />
                ) : periods.length === 0 ? (
                    !adding && (
                        <div className="rounded-3xl border-2 border-dashed border-[#cfdaf3] bg-white/60 px-6 py-12 text-center">
                            <p className="font-black">ยังไม่มีเทอมที่เปิดให้ยื่นกู้</p>
                            <p className="mt-1 text-sm text-gray-500">เริ่มจากเพิ่มเทอมแรก กำหนดวันเปิดและปิดรับคำขอ</p>
                            <div className="mt-5">
                                <PrimaryButton onClick={startAdd}>+ เพิ่มเทอมใหม่</PrimaryButton>
                            </div>
                        </div>
                    )
                ) : (
                    periods.map((period) => (
                        <PeriodRow
                            key={period.periodId}
                            period={period}
                            editing={editingId === period.periodId}
                            toggling={togglingId === period.periodId}
                            onEdit={() => startEdit(period.periodId)}
                            onCancelEdit={() => setEditingId(null)}
                            onSaved={async (text) => {
                                await onReload();
                                setEditingId(null);
                                setMsg({ type: "success", text });
                            }}
                            onToggle={() => handleToggle(period)}
                            onGoQueue={() => onGoQueue(period.periodId)}
                        />
                    ))
                )}
            </div>
        </>
    );
}

function NewPeriodForm({ periods, onReload, onCancel, onCreated, onEditExisting }) {
    const [form, setForm] = useState({
        academicYear: currentThaiYear(),
        semester: 1,
        startDate: "",
        endDate: "",
        isOpen: true,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // ปี+เทอมนี้มีอยู่แล้ว → ห้ามบันทึก ต้องไปแก้ไขแทน
    const duplicate = periods.find((p) => sameTerm(p, form.academicYear, form.semester));

    const change = (field) => (e) => {
        const value = field === "isOpen" ? e.target.checked : e.target.value;
        setForm((f) => ({ ...f, [field]: value }));
        setError("");
    };

    const canSave = !duplicate && form.academicYear.trim() && form.startDate && form.endDate;

    const handleSave = async () => {
        if (duplicate) return;
        if (!/^\d{4}$/.test(form.academicYear.trim())) {
            setError("ปีการศึกษาต้องเป็นตัวเลข 4 หลัก เช่น 2569");
            return;
        }
        if (!form.startDate || !form.endDate) {
            setError("กรุณาเลือกวันเปิดและวันปิดรับให้ครบ");
            return;
        }
        if (form.endDate < form.startDate) {
            setError("วันปิดรับต้องไม่ก่อนวันเปิดรับ");
            return;
        }

        setSaving(true);
        setError("");
        try {
            // เช็กกับข้อมูลล่าสุดบน server อีกรอบ กันบันทึกทับของคนอื่น
            const latest = await onReload();
            if (latest.some((p) => sameTerm(p, form.academicYear, form.semester))) {
                setError("เทอมนี้เพิ่งมีการบันทึกวันที่ไปแล้ว ไม่สามารถบันทึกซ้ำได้ กรุณาใช้ปุ่มแก้ไขแทน");
                return;
            }
            await saveApplicationPeriod({
                ...form,
                academicYear: form.academicYear.trim(),
                semester: Number(form.semester),
            });
            await onReload();
            onCreated(`เพิ่ม${termLabel(form)} เรียบร้อยแล้ว`);
        } catch (e) {
            setError(e.message || "บันทึกไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="rounded-3xl border-2 border-[#07116f] bg-white p-6 shadow-[0_20px_40px_-24px_rgba(7,17,111,.5)]">
            <div className="mb-5 flex items-center justify-between gap-3">
                <p className="text-lg font-black">เพิ่มเทอมใหม่</p>
                <button
                    type="button"
                    onClick={onCancel}
                    aria-label="ปิดฟอร์ม"
                    className="grid h-9 w-9 place-items-center rounded-full text-xl text-gray-400 hover:bg-gray-100"
                >
                    ×
                </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="ปีการศึกษา (พ.ศ.)">
                    <input
                        value={form.academicYear}
                        onChange={change("academicYear")}
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="2569"
                        className={INPUT}
                    />
                </Field>
                <Field label="ภาคเรียน">
                    <select value={form.semester} onChange={change("semester")} className={INPUT}>
                        {SEMESTER_OPTIONS.map((v) => (
                            <option key={v} value={v}>
                                ภาคเรียนที่ {v}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>

            {duplicate ? (
                <div className="mt-5">
                    <Notice
                        type="warn"
                        action={
                            <button
                                type="button"
                                onClick={() => onEditExisting(duplicate.periodId)}
                                className="h-10 rounded-xl bg-amber-500 px-4 text-sm font-black text-white hover:bg-amber-600"
                            >
                                แก้ไขเทอมนี้แทน
                            </button>
                        }
                    >
                        <p className="font-black">{termLabel(duplicate)} มีวันที่อยู่แล้ว บันทึกซ้ำไม่ได้</p>
                        <p className="mt-0.5 text-xs">
                            วันที่เดิม {dateRange(duplicate.startDate, duplicate.endDate)} ถ้าต้องการเปลี่ยน ให้แก้ไขเทอมเดิม
                        </p>
                    </Notice>
                </div>
            ) : (
                <>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <Field label="วันเปิดรับ">
                            <input type="date" value={form.startDate} onChange={change("startDate")} className={INPUT} />
                        </Field>
                        <Field label="วันปิดรับ">
                            <input
                                type="date"
                                value={form.endDate}
                                min={form.startDate || undefined}
                                onChange={change("endDate")}
                                className={INPUT}
                            />
                        </Field>
                    </div>

                    <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm font-bold text-gray-600">
                        <input
                            type="checkbox"
                            checked={form.isOpen}
                            onChange={change("isOpen")}
                            className="h-5 w-5 rounded accent-[#07116f]"
                        />
                        เปิดใช้งานทันทีเมื่อบันทึก
                    </label>
                </>
            )}

            {error && (
                <div className="mt-4">
                    <Notice type="error">{error}</Notice>
                </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
                <PrimaryButton onClick={handleSave} busy={saving} disabled={!canSave}>
                    บันทึกเทอมใหม่
                </PrimaryButton>
                <SecondaryButton onClick={onCancel} disabled={saving}>
                    ยกเลิก
                </SecondaryButton>
            </div>
        </div>
    );
}

function PeriodRow({ period, editing, toggling, onEdit, onCancelEdit, onSaved, onToggle, onGoQueue }) {
    const phase = phaseOf(period.startDate, period.endDate, period.isOpen);
    const info = PHASE[phase];

    return (
        <article
            id={`period-row-${period.periodId}`}
            className={`relative scroll-mt-6 overflow-hidden rounded-3xl border bg-white transition ${editing ? "border-[#07116f] shadow-[0_20px_40px_-24px_rgba(7,17,111,.5)]" : "border-[#dfe7f8]"
                }`}
        >
            <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${info.bar}`} />

            <div className="flex flex-wrap items-center gap-x-6 gap-y-4 py-5 pl-7 pr-5">
                {/* ชื่อเทอม + สถานะ */}
                <div className="min-w-[170px] flex-1">
                    <p className="text-lg font-black leading-tight">{termLabel(period)}</p>
                    <div className="mt-2">
                        <Badge tone={info.tone}>{phase === "active" ? "กำลังเปิดรับ" : info.label}</Badge>
                    </div>
                    <button
                        type="button"
                        onClick={onGoQueue}
                        className="mt-2 block text-left text-xs text-gray-500 underline-offset-2 hover:text-[#0646ff] hover:underline"
                    >
                        จองส่งเอกสาร:{" "}
                        {period.queueStartDate ? (
                            dateRange(period.queueStartDate, period.queueEndDate)
                        ) : (
                            <span className="font-bold text-amber-600">ยังไม่กำหนด</span>
                        )}
                    </button>
                </div>

                {/* วันที่ */}
                {!editing && <DateSpan start={period.startDate} end={period.endDate} muted={phase === "ended" || phase === "disabled"} />}

                {/* ปุ่ม */}
                {!editing && (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={Boolean(period.isOpen)}
                                onChange={onToggle}
                                disabled={toggling}
                                label={`เปิดใช้งาน${termLabel(period)}`}
                            />
                            <span className="w-14 text-xs font-bold text-gray-500">
                                {toggling ? "..." : period.isOpen ? "เปิดใช้" : "ปิดใช้"}
                            </span>
                        </div>
                        <SecondaryButton small onClick={onEdit}>
                            แก้ไขวันที่
                        </SecondaryButton>
                    </div>
                )}
            </div>

            {editing && <PeriodEditor period={period} onCancel={onCancelEdit} onSaved={onSaved} />}
        </article>
    );
}

function PeriodEditor({ period, onCancel, onSaved }) {
    const [dates, setDates] = useState({ startDate: period.startDate || "", endDate: period.endDate || "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const changed = dates.startDate !== (period.startDate || "") || dates.endDate !== (period.endDate || "");

    const change = (field) => (e) => {
        setDates((d) => ({ ...d, [field]: e.target.value }));
        setError("");
    };

    const handleSave = async () => {
        if (!dates.startDate || !dates.endDate) {
            setError("กรุณาเลือกวันที่ให้ครบ");
            return;
        }
        if (dates.endDate < dates.startDate) {
            setError("วันปิดรับต้องไม่ก่อนวันเปิดรับ");
            return;
        }
        setSaving(true);
        setError("");
        try {
            // แก้ไขด้วย id ของเทอม (backend ล็อกปี+เทอมไว้ ไม่ใช่การบันทึกทับ)
            await updateApplicationPeriod(period.periodId, {
                startDate: dates.startDate,
                endDate: dates.endDate,
            });
            await onSaved(`แก้ไขวันที่${termLabel(period)} เป็น ${dateRange(dates.startDate, dates.endDate)} แล้ว`);
        } catch (e) {
            setError(e.message || "บันทึกไม่สำเร็จ");
            setSaving(false);
        }
    };

    return (
        <div className="border-t border-[#eef2fb] bg-[#f7f9ff] py-5 pl-7 pr-5">
            <p className="text-sm font-black">แก้ไขวันที่</p>
            <p className="mt-0.5 text-xs text-gray-500">
                วันที่เดิม {dateRange(period.startDate, period.endDate)} · ปีการศึกษาและภาคเรียนเปลี่ยนไม่ได้
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="วันเปิดรับ">
                    <input type="date" value={dates.startDate} onChange={change("startDate")} className={INPUT} />
                </Field>
                <Field label="วันปิดรับ">
                    <input
                        type="date"
                        value={dates.endDate}
                        min={dates.startDate || undefined}
                        onChange={change("endDate")}
                        className={INPUT}
                    />
                </Field>
            </div>

            {error && (
                <div className="mt-4">
                    <Notice type="error">{error}</Notice>
                </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
                <PrimaryButton onClick={handleSave} busy={saving} disabled={!changed}>
                    {changed ? "บันทึกการแก้ไข" : "ยังไม่ได้เปลี่ยนวันที่"}
                </PrimaryButton>
                <SecondaryButton onClick={onCancel} disabled={saving}>
                    ยกเลิก
                </SecondaryButton>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| หมวด 3: ตั้งค่าช่วงเวลาเปิดจองส่งเอกสาร + รอบเวลาและจำนวนคน
|--------------------------------------------------------------------------
*/

/* ---------- ค่าเริ่มต้นและตัวช่วยของรอบเวลา ---------- */

// ใช้กับวันที่ยังไม่เคยตั้งค่า (ถ้ามีวันที่บันทึกไว้แล้ว จะคัดลอกจากวันนั้นแทน)
const DEFAULT_SLOTS = [
    { startTime: "08:30", endTime: "09:00", capacity: 15 },
    { startTime: "09:00", endTime: "09:30", capacity: 15 },
];
const DEFAULT_SLOT_MINUTES = 30;
const MAX_CAPACITY = 200; // ตรงกับ backend (staffQueueService: 1–200)
const MAX_RANGE_DAYS = 62; // backend ตั้งรอบได้ครั้งละไม่เกิน 62 วัน

const isPastDate = (iso) => iso < todayISO();

let slotKeySeq = 0;
const newSlotKey = () => `slot-${++slotKeySeq}`;

const toMin = (t) => {
    const [h, m] = String(t || "").split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
};
const fromMin = (n) =>
    `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

function listDates(start, end) {
    const out = [];
    if (!start || !end) return out;
    const d = new Date(`${start}T00:00:00`);
    const last = new Date(`${end}T00:00:00`);
    while (d <= last && out.length < 92) {
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        out.push(`${d.getFullYear()}-${mm}-${dd}`);
        d.setDate(d.getDate() + 1);
    }
    return out;
}

const isWeekend = (iso) => {
    const g = new Date(`${iso}T00:00:00`).getDay();
    return g === 0 || g === 6;
};

const fullThaiDate = (iso) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("th-TH", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

const bySlotStart = (a, b) => toMin(a.startTime) - toMin(b.startTime);

// ใช้เทียบว่าวันนั้นมีการแก้ไขหลังบันทึกหรือยัง
const serializeDay = (day) =>
    JSON.stringify({
        isOpen: day.isOpen,
        location: day.location.trim(),
        detail: day.detail.trim(),
        slots: [...day.slots].sort(bySlotStart).map((s) => [s.slotId, s.startTime, s.endTime, Number(s.capacity), s.isOpen]),
    });

function dayTotals(day) {
    const open = day.isOpen ? day.slots.filter((s) => s.isOpen) : [];
    return {
        openSlots: open.length,
        capacity: open.reduce((t, s) => t + Number(s.capacity || 0), 0),
        booked: day.slots.reduce((t, s) => t + Number(s.booked || 0), 0),
    };
}

function validateDay(day) {
    if (isPastDate(day.date) || !day.isOpen) return "";
    if (!day.location.trim()) return "กรุณากรอกสถานที่ยื่นเอกสาร";
    if (!day.slots.some((s) => s.isOpen)) return "ต้องเปิดอย่างน้อย 1 รอบ หรือปิดรับวันนี้";

    const keys = new Set();
    for (const s of day.slots) {
        const range = `${s.startTime}–${s.endTime}`;
        if (!s.startTime || !s.endTime) return "กรุณากรอกเวลาให้ครบทุกรอบ";
        if (toMin(s.startTime) >= toMin(s.endTime)) return `รอบ ${range} เวลาเริ่มต้องก่อนเวลาสิ้นสุด`;
        if (keys.has(range)) return `มีรอบ ${range} ซ้ำกัน`;
        keys.add(range);
        if (!(Number(s.capacity) >= 1)) return `รอบ ${range} ต้องรับอย่างน้อย 1 คน`;
        if (Number(s.capacity) < Number(s.booked || 0)) {
            return `รอบ ${range} มีผู้จองแล้ว ${s.booked} คน ตั้งจำนวนต่ำกว่านี้ไม่ได้`;
        }
    }

    // เวลาทับกัน เช็กเฉพาะรอบที่เปิด
    const open = day.slots.filter((s) => s.isOpen).sort(bySlotStart);
    for (let i = 1; i < open.length; i += 1) {
        if (toMin(open[i].startTime) < toMin(open[i - 1].endTime)) {
            return `รอบ ${open[i].startTime}–${open[i].endTime} เวลาทับกับรอบ ${open[i - 1].startTime}–${open[i - 1].endTime}`;
        }
    }
    return "";
}

// รวมวันในช่วงจองกับข้อมูลที่บันทึกไว้ วันที่ยังไม่มีข้อมูลจะใช้ค่าตั้งต้น
function buildDays(period, saved) {
    const byDate = new Map(saved.map((d) => [d.date, d]));
    const template = saved.find((d) => d.slots.length > 0) || null;
    const snapshot = {};

    const days = listDates(period.queueStartDate, period.queueEndDate).map((date) => {
        const s = byDate.get(date);
        if (s) {
            const day = {
                date,
                isOpen: Boolean(s.isOpen),
                location: s.location || "",
                detail: s.detail || "",
                slots: s.slots.map((slot) => ({ ...slot, key: newSlotKey() })),
                saved: true,
            };
            snapshot[date] = serializeDay(day);
            return day;
        }
        const source = template?.slots.length ? template.slots : DEFAULT_SLOTS;
        return {
            date,
            isOpen: !isWeekend(date),
            location: template?.location || "",
            detail: template?.detail || "",
            slots: source.map((slot) => ({
                key: newSlotKey(),
                slotId: null,
                startTime: slot.startTime,
                endTime: slot.endTime,
                capacity: Number(slot.capacity) || 15,
                isOpen: true,
                booked: 0,
            })),
            saved: false,
        };
    });

    return { days, snapshot };
}

const dayToPayload = (day) => ({
    date: day.date,
    isOpen: day.isOpen,
    location: day.location.trim(),
    detail: day.detail.trim(),
    slots: [...day.slots].sort(bySlotStart).map((s) => ({
        slotId: s.slotId,
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: Number(s.capacity),
        isOpen: s.isOpen,
    })),
});

/* ---------- ส่วนแสดงผลของหมวด 3 ---------- */

function QueueSection({ periods, loading, error, focusId, onReload, onGoPeriod }) {
    // editing = { id, mode: "create" | "edit" } สำหรับแก้ช่วงวันจอง
    const [editing, setEditing] = useState(null);
    // เทอมที่กางส่วนตั้งรอบเวลาอยู่
    const [plannerId, setPlannerId] = useState(null);
    const [msg, setMsg] = useState({ type: "", text: "" });

    useEffect(() => {
        if (!focusId || loading) return;
        document.getElementById(`queue-row-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [focusId, loading]);

    const openEditor = (id, mode) => {
        setPlannerId(null);
        setEditing({ id, mode });
        setMsg({ type: "", text: "" });
    };

    const togglePlanner = (id) => {
        setEditing(null);
        setMsg({ type: "", text: "" });
        setPlannerId((cur) => (cur === id ? null : id));
    };

    return (
        <>
            <SectionHeader
                icon="📅"
                title="ตั้งค่าช่วงเวลาเปิดจองส่งเอกสาร"
                desc="กำหนดช่วงวันจอง แล้วตั้งรอบเวลาและจำนวนคนของแต่ละวัน"
            />

            <div className="space-y-4">
                {error && <Notice type="error">{error}</Notice>}
                {msg.text && <Notice type={msg.type}>{msg.text}</Notice>}

                {loading ? (
                    <LoadingBlock />
                ) : periods.length === 0 ? (
                    <div className="rounded-3xl border-2 border-dashed border-[#cfdaf3] bg-white/60 px-6 py-12 text-center">
                        <p className="font-black">ยังไม่มีเทอมให้กำหนดวันจอง</p>
                        <p className="mt-1 text-sm text-gray-500">ต้องเพิ่มช่วงเวลาเปิดให้ยื่นกู้ของเทอมนั้นก่อน</p>
                        <div className="mt-5">
                            <PrimaryButton onClick={onGoPeriod}>ไปตั้งค่าช่วงเวลาเปิดให้ยื่นกู้</PrimaryButton>
                        </div>
                    </div>
                ) : (
                    periods.map((period) => (
                        <QueueRow
                            key={period.periodId}
                            period={period}
                            highlight={focusId === period.periodId}
                            mode={editing?.id === period.periodId ? editing.mode : null}
                            plannerOpen={plannerId === period.periodId}
                            onOpen={(mode) => openEditor(period.periodId, mode)}
                            onClose={() => setEditing(null)}
                            onTogglePlanner={() => togglePlanner(period.periodId)}
                            onReload={onReload}
                            onDone={async (text, openPlannerAfter) => {
                                await onReload();
                                setEditing(null);
                                setMsg({ type: "success", text });
                                if (openPlannerAfter) setPlannerId(period.periodId);
                            }}
                        />
                    ))
                )}
            </div>
        </>
    );
}

function QueueRow({ period, highlight, mode, plannerOpen, onOpen, onClose, onTogglePlanner, onReload, onDone }) {
    const hasQueue = Boolean(period.queueStartDate);
    const phase = phaseOf(period.queueStartDate, period.queueEndDate);
    const info = PHASE[phase];
    const expanded = Boolean(mode) || plannerOpen;

    return (
        <article
            id={`queue-row-${period.periodId}`}
            className={`relative scroll-mt-6 rounded-3xl border bg-white transition ${expanded
                ? "border-[#07116f] shadow-[0_20px_40px_-24px_rgba(7,17,111,.5)]"
                : highlight
                    ? "border-[#0646ff] ring-4 ring-blue-100"
                    : "border-[#dfe7f8]"
                }`}
        >
            <span aria-hidden="true" className={`absolute bottom-0 left-0 top-0 w-1.5 rounded-l-3xl ${info.bar}`} />

            <div className="flex flex-wrap items-center gap-x-6 gap-y-4 py-5 pl-7 pr-5">
                <div className="min-w-[170px] flex-1">
                    <p className="text-lg font-black leading-tight">{termLabel(period)}</p>
                    <div className="mt-2">
                        <Badge tone={info.tone}>{phase === "active" ? "เปิดให้จองอยู่" : info.label}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">ช่วงยื่นกู้ {dateRange(period.startDate, period.endDate)}</p>
                </div>

                {!mode && (
                    <>
                        <DateSpan start={period.queueStartDate} end={period.queueEndDate} muted={phase === "ended"} />
                        {hasQueue ? (
                            <div className="flex flex-wrap gap-2">
                                <PrimaryButton onClick={onTogglePlanner}>
                                    {plannerOpen ? "ซ่อนรอบเวลา" : "ตั้งรอบเวลาและจำนวนคน"}
                                </PrimaryButton>
                                <SecondaryButton onClick={() => onOpen("edit")}>แก้ไขวันจอง</SecondaryButton>
                            </div>
                        ) : (
                            <PrimaryButton onClick={() => onOpen("create")}>กำหนดวันจอง</PrimaryButton>
                        )}
                    </>
                )}
            </div>

            {mode && (
                <QueueEditor
                    period={period}
                    mode={hasQueue ? "edit" : mode}
                    onCancel={onClose}
                    onReload={onReload}
                    onDone={onDone}
                    onSwitchToEdit={() => onOpen("edit")}
                />
            )}

            {!mode && hasQueue && plannerOpen && <SlotPlanner period={period} />}
        </article>
    );
}

// นับผู้จองในวันที่จะหลุดออกจากช่วง (โหลดไม่ได้ → คืน null)
async function bookedOnDates(dates) {
    if (!dates.length) return { configuredDays: 0, booked: 0 };
    const sorted = [...dates].sort();
    try {
        const saved = await loadSlotDays({ from: sorted[0], to: sorted[sorted.length - 1] });
        const hit = saved.filter((d) => dates.includes(d.date));
        return {
            configuredDays: hit.length,
            booked: hit.reduce((t, d) => t + d.slots.reduce((a, s) => a + Number(s.booked || 0), 0), 0),
        };
    } catch {
        return null;
    }
}

function QueueEditor({ period, mode, onCancel, onReload, onDone, onSwitchToEdit }) {
    const isEdit = mode === "edit";
    const [dates, setDates] = useState({
        queueStartDate: period.queueStartDate || "",
        queueEndDate: period.queueEndDate || "",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [conflict, setConflict] = useState(false);

    const changed =
        dates.queueStartDate !== (period.queueStartDate || "") || dates.queueEndDate !== (period.queueEndDate || "");

    const change = (field) => (e) => {
        setDates((d) => ({ ...d, [field]: e.target.value }));
        setError("");
    };

    const startsBeforeApplication =
        dates.queueStartDate && period.startDate && dates.queueStartDate < period.startDate;

    const handleSave = async () => {
        if (!dates.queueStartDate || !dates.queueEndDate) {
            setError("กรุณาเลือกวันเปิดและวันปิดจองให้ครบ");
            return;
        }
        if (dates.queueEndDate < dates.queueStartDate) {
            setError("วันปิดจองต้องไม่ก่อนวันเปิดจอง");
            return;
        }
        if (daysInclusive(dates.queueStartDate, dates.queueEndDate) > MAX_RANGE_DAYS) {
            setError(`ช่วงวันจองยาวได้ไม่เกิน ${MAX_RANGE_DAYS} วัน`);
            return;
        }

        setSaving(true);
        setError("");
        try {
            if (!isEdit) {
                // กำหนดครั้งแรก: เช็กกับ server ว่ายังไม่มีใครตั้งวันจองไว้
                const latest = await onReload();
                const fresh = latest.find((p) => p.periodId === period.periodId);
                if (fresh?.queueStartDate) {
                    setConflict(true);
                    setSaving(false);
                    return;
                }
            } else {
                // แก้ไข: ถ้าช่วงใหม่ตัดวันเดิมออก ต้องเช็กว่ามีรอบเวลา/ผู้จองในวันนั้นไหม
                const dropped = listDates(period.queueStartDate, period.queueEndDate).filter(
                    (d) => d < dates.queueStartDate || d > dates.queueEndDate
                );
                if (dropped.length) {
                    const check = await bookedOnDates(dropped);
                    if (check?.booked > 0) {
                        setError(
                            `วันที่จะถูกตัดออกมีผู้จองแล้ว ${check.booked} คน เปลี่ยนช่วงวันแบบนี้ไม่ได้ ให้เลือกช่วงที่ครอบคลุมวันเหล่านั้น`
                        );
                        setSaving(false);
                        return;
                    }
                    const detail = check?.configuredDays
                        ? `มีรอบเวลาตั้งไว้แล้ว ${check.configuredDays} วัน ระบบจะปิดรอบในวันเหล่านั้นให้อัตโนมัติ`
                        : "รอบเวลาในวันเหล่านั้น (ถ้ามี) จะถูกปิดอัตโนมัติ";
                    if (!window.confirm(`ช่วงใหม่ตัดวันเดิมออก ${dropped.length} วัน ${detail} บันทึกต่อไหม?`)) {
                        setSaving(false);
                        return;
                    }
                }
            }

            await saveQueueDates(period.periodId, dates);
            await onDone(
                isEdit
                    ? `แก้ไขวันจองส่งเอกสาร${termLabel(period)} เป็น ${dateRange(dates.queueStartDate, dates.queueEndDate)} แล้ว`
                    : `กำหนดวันจองส่งเอกสาร${termLabel(period)} แล้ว ตั้งรอบเวลาและจำนวนคนต่อด้านล่างได้เลย`,
                !isEdit
            );
        } catch (e) {
            setError(e.message || "บันทึกไม่สำเร็จ");
            setSaving(false);
        }
    };

    const handleClear = async () => {
        setSaving(true);
        setError("");
        const check = await bookedOnDates(listDates(period.queueStartDate, period.queueEndDate));
        if (check?.booked > 0) {
            setError(`มีผู้จองแล้ว ${check.booked} คน ล้างวันจองไม่ได้`);
            setSaving(false);
            return;
        }
        if (!window.confirm(`ล้างวันจองส่งเอกสารของ${termLabel(period)}? นักศึกษาจะจองไม่ได้จนกว่าจะกำหนดใหม่`)) {
            setSaving(false);
            return;
        }
        try {
            await saveQueueDates(period.periodId, { queueStartDate: null, queueEndDate: null });
            await onDone(`ล้างวันจองส่งเอกสาร${termLabel(period)} แล้ว`, false);
        } catch (e) {
            setError(e.message || "ล้างวันจองไม่สำเร็จ");
            setSaving(false);
        }
    };

    if (conflict) {
        return (
            <div className="rounded-b-3xl border-t border-[#eef2fb] bg-[#f7f9ff] py-5 pl-7 pr-5">
                <Notice
                    type="warn"
                    action={
                        <button
                            type="button"
                            onClick={onSwitchToEdit}
                            className="h-10 rounded-xl bg-amber-500 px-4 text-sm font-black text-white hover:bg-amber-600"
                        >
                            ไปแก้ไขวันจอง
                        </button>
                    }
                >
                    <p className="font-black">{termLabel(period)} มีวันจองอยู่แล้ว บันทึกทับไม่ได้</p>
                    <p className="mt-0.5 text-xs">มีการกำหนดวันจองไว้ก่อนหน้านี้ ถ้าต้องการเปลี่ยน ให้ใช้การแก้ไข</p>
                </Notice>
            </div>
        );
    }

    return (
        <div className="rounded-b-3xl border-t border-[#eef2fb] bg-[#f7f9ff] py-5 pl-7 pr-5">
            <p className="text-sm font-black">{isEdit ? "แก้ไขวันจอง" : "กำหนดวันจองครั้งแรก"}</p>
            <p className="mt-0.5 text-xs text-gray-500">
                {isEdit
                    ? `วันจองเดิม ${dateRange(period.queueStartDate, period.queueEndDate)}`
                    : "แนะนำให้เปิดจองหลังเริ่มรับยื่นกู้ เพื่อให้มีเวลาตรวจเอกสาร"}
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="วันเปิดจอง">
                    <input type="date" value={dates.queueStartDate} onChange={change("queueStartDate")} className={INPUT} />
                </Field>
                <Field label="วันปิดจอง">
                    <input
                        type="date"
                        value={dates.queueEndDate}
                        min={dates.queueStartDate || undefined}
                        onChange={change("queueEndDate")}
                        className={INPUT}
                    />
                </Field>
            </div>

            {startsBeforeApplication && (
                <div className="mt-4">
                    <Notice type="warn">
                        <span className="text-xs font-bold">
                            วันเปิดจองอยู่ก่อนวันเริ่มรับยื่นกู้ ({formatThaiDate(period.startDate)}) ตรวจสอบอีกครั้งว่าตั้งใจไว้แบบนี้
                        </span>
                    </Notice>
                </div>
            )}

            {error && (
                <div className="mt-4">
                    <Notice type="error">{error}</Notice>
                </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
                <PrimaryButton onClick={handleSave} busy={saving} disabled={isEdit && !changed}>
                    {isEdit ? (changed ? "บันทึกการแก้ไข" : "ยังไม่ได้เปลี่ยนวันที่") : "บันทึกวันจอง"}
                </PrimaryButton>
                <SecondaryButton onClick={onCancel} disabled={saving}>
                    ยกเลิก
                </SecondaryButton>
                {isEdit && (
                    <span className="ml-auto">
                        <SecondaryButton danger onClick={handleClear} disabled={saving}>
                            ล้างวันจอง
                        </SecondaryButton>
                    </span>
                )}
            </div>
        </div>
    );
}

/* ---------- ตั้งรอบเวลาและจำนวนคน ---------- */

function Stepper({ value, onChange, min = 1, max = MAX_CAPACITY, label, disabled }) {
    // เก็บข้อความที่กำลังพิมพ์ไว้ก่อน เพื่อให้ลบแล้วพิมพ์ใหม่ได้โดยตัวเลขไม่เด้ง
    const [draft, setDraft] = useState(null);
    const clamp = (n) => Math.min(max, Math.max(min, n));

    const btn =
        "grid h-full w-10 place-items-center text-lg font-black text-gray-500 transition hover:bg-[#eef3fc] disabled:cursor-not-allowed disabled:opacity-30";

    return (
        <div
            className={`inline-flex h-10 items-stretch overflow-hidden rounded-xl border border-[#d9e3f7] bg-white ${disabled ? "opacity-50" : ""
                }`}
        >
            <button
                type="button"
                aria-label={`ลด${label}`}
                disabled={disabled || value <= min}
                onClick={() => onChange(clamp(value - 1))}
                className={btn}
            >
                −
            </button>
            <input
                type="number"
                inputMode="numeric"
                aria-label={label}
                value={draft ?? value}
                min={min}
                max={max}
                disabled={disabled}
                onChange={(e) => {
                    setDraft(e.target.value);
                    const n = parseInt(e.target.value, 10);
                    if (!Number.isNaN(n)) onChange(clamp(n));
                }}
                onBlur={() => setDraft(null)}
                className="w-14 border-x border-[#d9e3f7] text-center font-black text-[#0646ff] outline-none [appearance:textfield] focus:bg-blue-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
                type="button"
                aria-label={`เพิ่ม${label}`}
                disabled={disabled || value >= max}
                onClick={() => onChange(clamp(value + 1))}
                className={btn}
            >
                +
            </button>
        </div>
    );
}

function SlotPlanner({ period }) {
    const [status, setStatus] = useState({ state: "loading", message: "" });
    const [days, setDays] = useState([]);
    const [snapshot, setSnapshot] = useState({});
    const [activeDate, setActiveDate] = useState(null);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState({ type: "", text: "" });
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        loadSlotDays({ from: period.queueStartDate, to: period.queueEndDate })
            .then((saved) => {
                if (cancelled) return;
                const built = buildDays(period, saved);
                setDays(built.days);
                setSnapshot(built.snapshot);
                setActiveDate((cur) =>
                    built.days.some((d) => d.date === cur)
                        ? cur
                        : (built.days.find((d) => d.isOpen) || built.days[0])?.date ?? null
                );
                setStatus({ state: "ready", message: "" });
            })
            .catch((e) => {
                if (!cancelled) setStatus({ state: "error", message: e.message || "โหลดรอบเวลาไม่สำเร็จ" });
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period.periodId, period.queueStartDate, period.queueEndDate, reloadKey]);

    // วันที่ผ่านแล้วแก้ไม่ได้ / วันที่ยังไม่เคยบันทึกและปิดอยู่ ไม่มีอะไรต้องบันทึก
    const isDirty = (day) => {
        if (isPastDate(day.date)) return false;
        return day.saved ? serializeDay(day) !== snapshot[day.date] : day.isOpen;
    };

    const updateDay = (date, fn) => {
        setDays((ds) => ds.map((d) => (d.date === date ? fn(d) : d)));
        setMsg({ type: "", text: "" });
    };

    const applyToAllDays = (source) => {
        if (!window.confirm(`ใช้สถานที่และรอบเวลาของ${fullThaiDate(source.date)} กับทุกวัน? (สถานะเปิด/ปิดของแต่ละวันจะไม่เปลี่ยน)`)) {
            return;
        }
        const skipped = [];
        const next = days.map((d) => {
            if (d.date === source.date) return d;
            // วันที่มีผู้จองแล้ว ห้ามเปลี่ยนรอบทับ
            if (d.slots.some((s) => Number(s.booked) > 0)) {
                skipped.push(d.date);
                return d;
            }
            return {
                ...d,
                location: source.location,
                detail: source.detail,
                slots: source.slots.map((s) => ({ ...s, key: newSlotKey(), slotId: null, booked: 0 })),
            };
        });
        setDays(next);
        setMsg(
            skipped.length
                ? {
                    type: "warn",
                    text: `ใช้กับวันอื่นแล้ว ยกเว้น ${skipped.length} วันที่มีผู้จองแล้ว (${skipped
                        .map((d) => formatThaiDate(d))
                        .join(", ")}) อย่าลืมกดบันทึก`,
                }
                : { type: "success", text: "ใช้กับทุกวันแล้ว อย่าลืมกดบันทึก" }
        );
    };

    const handleSave = async () => {
        const firstError = days.map((d) => [d, validateDay(d)]).find(([, err]) => err);
        if (firstError) {
            setActiveDate(firstError[0].date);
            setMsg({ type: "error", text: `${fullThaiDate(firstError[0].date)}: ${firstError[1]}` });
            return;
        }
        setSaving(true);
        setMsg({ type: "", text: "" });
        try {
            // ส่งเฉพาะวันที่ยังไม่ผ่าน (backend ไม่ให้แก้วันที่ผ่านแล้ว)
            // และไม่ส่งวันที่ไม่เคยบันทึกแต่ปิดอยู่ (ไม่ต้องสร้างรอบปิดทิ้งไว้)
            const payload = days.filter((d) => !isPastDate(d.date) && (d.saved || d.isOpen)).map(dayToPayload);
            if (payload.length === 0) {
                setMsg({ type: "error", text: "ไม่มีวันที่บันทึกได้ (ทุกวันผ่านไปแล้วหรือปิดอยู่)" });
                return;
            }
            const range = { from: period.queueStartDate, to: period.queueEndDate };
            await saveSlotDays({ ...range, days: payload });
            const fresh = await loadSlotDays(range);
            const built = buildDays(period, fresh);
            setDays(built.days);
            setSnapshot(built.snapshot);
            const t = built.days.reduce((acc, d) => acc + dayTotals(d).capacity, 0);
            setMsg({ type: "success", text: `บันทึกแล้ว นักศึกษาจองได้รวม ${t} คน` });
        } catch (e) {
            setMsg({ type: "error", text: e.message || "บันทึกรอบเวลาไม่สำเร็จ" });
        } finally {
            setSaving(false);
        }
    };

    const wrap = (children) => (
        <div className="rounded-b-3xl border-t border-[#eef2fb] bg-[#f7f9ff] px-4 py-5 sm:pl-7 sm:pr-5">{children}</div>
    );

    if (status.state === "loading") {
        return wrap(<div className="h-40 animate-pulse rounded-2xl bg-white" aria-busy="true" aria-label="กำลังโหลดรอบเวลา" />);
    }

    if (status.state === "error") {
        return wrap(
            <Notice
                type="error"
                action={
                    <SecondaryButton
                        small
                        onClick={() => {
                            setStatus({ state: "loading", message: "" });
                            setReloadKey((k) => k + 1);
                        }}
                    >
                        ลองใหม่
                    </SecondaryButton>
                }
            >
                {status.message}
            </Notice>
        );
    }

    if (daysInclusive(period.queueStartDate, period.queueEndDate) > MAX_RANGE_DAYS) {
        return wrap(
            <Notice type="warn">
                ช่วงวันจองยาวเกิน {MAX_RANGE_DAYS} วัน ระบบตั้งรอบเวลาได้ครั้งละไม่เกิน {MAX_RANGE_DAYS} วัน กรุณากด แก้ไขวันจอง ให้สั้นลง
            </Notice>
        );
    }

    const active = days.find((d) => d.date === activeDate) || days[0];
    const totals = days.reduce(
        (acc, d) => {
            const t = dayTotals(d);
            if (t.openSlots > 0) acc.days += 1;
            acc.slots += t.openSlots;
            acc.capacity += t.capacity;
            return acc;
        },
        { days: 0, slots: 0, capacity: 0 }
    );
    const unsaved = days.filter(isDirty).length;

    return wrap(
        <>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                    <p className="font-black">รอบเวลาและจำนวนคน</p>
                    <p className="mt-0.5 text-xs text-gray-500">เลือกวัน แล้วตั้งรอบเวลา วันเสาร์–อาทิตย์ปิดไว้ให้ก่อน เปิดเองได้</p>
                </div>
            </div>

            {/* แถบเลือกวัน */}
            <div role="tablist" aria-label="เลือกวัน" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                {days.map((d) => {
                    const isActive = d.date === active?.date;
                    const t = dayTotals(d);
                    const dirty = isDirty(d);
                    const hasError = Boolean(validateDay(d));
                    const p = dateParts(d.date);
                    const chip = isActive
                        ? "bg-white/15 text-white"
                        : !d.isOpen
                            ? "bg-gray-100 text-gray-500"
                            : dirty
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-50 text-emerald-700";
                    return (
                        <button
                            key={d.date}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setActiveDate(d.date)}
                            className={`relative w-[86px] shrink-0 rounded-2xl border-2 px-2 py-2.5 text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${isActive
                                ? "border-[#07116f] bg-[#07116f] text-white shadow-md"
                                : hasError
                                    ? "border-red-300 bg-white"
                                    : "border-[#dfe7f8] bg-white hover:border-blue-200"
                                } ${!d.isOpen && !isActive ? "opacity-60" : ""}`}
                        >
                            <span className="block text-[11px] font-bold opacity-70">{p.weekday}</span>
                            <span className="block text-2xl font-black leading-tight">{p.day}</span>
                            <span className="block text-[10px] font-bold opacity-70">{p.month}</span>
                            <span className={`mt-1.5 block truncate rounded-full px-1 py-0.5 text-[10px] font-black ${chip}`}>
                                {isPastDate(d.date) ? "ผ่านแล้ว" : !d.isOpen ? "ปิด" : dirty ? "ยังไม่บันทึก" : `${t.capacity} คน`}
                            </span>
                            {hasError && (
                                <span
                                    aria-label="มีข้อมูลต้องแก้"
                                    className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {active && (
                <DayEditor
                    key={active.date}
                    day={active}
                    error={validateDay(active)}
                    onChange={(fn) => updateDay(active.date, fn)}
                    onApplyAll={() => applyToAllDays(active)}
                    canApplyAll={days.length > 1}
                />
            )}

            {msg.text && (
                <div className="mt-4">
                    <Notice type={msg.type}>{msg.text}</Notice>
                </div>
            )}

            {/* แถบสรุป + บันทึก */}
            <div className="sticky bottom-4 z-10 mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#07116f] px-5 py-4 text-white shadow-[0_20px_40px_-16px_rgba(7,17,111,.7)]">
                <div>
                    <p className="text-sm font-black">
                        เปิดรับ {totals.days} วัน รวม {totals.slots} รอบ รับได้ {totals.capacity} คน
                    </p>
                    <p className={`mt-0.5 text-xs ${unsaved ? "font-bold text-amber-300" : "text-blue-100"}`}>
                        {unsaved ? `มี ${unsaved} วันที่ยังไม่ได้บันทึก` : "บันทึกครบทุกวันแล้ว"}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || unsaved === 0}
                    className="h-11 rounded-xl bg-[#E31C79] px-6 text-sm font-black text-white shadow-[0_10px_20px_-8px_rgba(227,28,121,.8)] transition hover:bg-[#c8166a] focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-300 disabled:cursor-not-allowed disabled:bg-white/20 disabled:shadow-none"
                >
                    {saving ? "กำลังบันทึก..." : "บันทึกและเปิดให้จอง"}
                </button>
            </div>
        </>
    );
}

function DayEditor({ day, error, onChange, onApplyAll, canApplyAll }) {
    const t = dayTotals(day);
    const bulk = day.slots[0]?.capacity ?? 15;
    const mixed = day.slots.some((s) => Number(s.capacity) !== Number(bulk));

    const setSlot = (key, patch) =>
        onChange((d) => ({ ...d, slots: d.slots.map((s) => (s.key === key ? { ...s, ...patch } : s)) }));

    // ถามยืนยันทุกครั้งก่อนลบรอบ
    const removeSlot = (key) => {
        const slot = day.slots.find((s) => s.key === key);
        if (!slot) return;
        const label = `${slot.startTime}–${slot.endTime} น.`;
        const isLast = day.slots.length === 1;
        const message = [
            `ยืนยันลบรอบ ${label} ของ${fullThaiDate(day.date)}?`,
            isLast ? "รอบนี้เป็นรอบสุดท้ายของวัน ถ้าลบแล้ววันนี้จะไม่มีรอบให้จอง" : "",
            "รอบจะถูกลบจริงเมื่อกด บันทึกและเปิดให้จอง",
        ]
            .filter(Boolean)
            .join("\n\n");
        if (!window.confirm(message)) return;
        onChange((d) => ({ ...d, slots: d.slots.filter((s) => s.key !== key) }));
    };

    // ปรับ "ทุกรอบ" มีผลทันที (ไม่มีปุ่ม ใช้) แต่ไม่ต่ำกว่าจำนวนที่จองแล้วของแต่ละรอบ
    const setAllCapacity = (n) =>
        onChange((d) => ({
            ...d,
            slots: d.slots.map((s) => ({ ...s, capacity: Math.max(n, Number(s.booked || 0)) })),
        }));

    const lastSlot = [...day.slots].sort(bySlotStart).at(-1);
    const nextLength = lastSlot
        ? Math.max(toMin(lastSlot.endTime) - toMin(lastSlot.startTime), 5)
        : DEFAULT_SLOT_MINUTES;
    const nextStart = lastSlot ? toMin(lastSlot.endTime) : toMin("08:30");
    const canAdd = nextStart + nextLength <= 24 * 60;

    const addSlot = () =>
        onChange((d) => ({
            ...d,
            slots: [
                ...d.slots,
                {
                    key: newSlotKey(),
                    slotId: null,
                    startTime: fromMin(nextStart),
                    endTime: fromMin(nextStart + nextLength),
                    capacity: Number(lastSlot?.capacity) || 15,
                    isOpen: true,
                    booked: 0,
                },
            ],
        }));

    const toggleDay = () => {
        if (day.isOpen && t.booked > 0) {
            if (!window.confirm(`วันนี้มีผู้จองแล้ว ${t.booked} คน ปิดรับวันนี้จะไม่ยกเลิกนัดเดิม แต่จะไม่รับจองเพิ่ม ปิดต่อไหม?`)) return;
        }
        onChange((d) => ({ ...d, isOpen: !d.isOpen }));
    };

    const readOnly = isPastDate(day.date);

    return (
        // fieldset disabled ปิดทุกช่องและปุ่มข้างในให้พร้อมกัน เมื่อวันนั้นผ่านไปแล้ว
        <fieldset disabled={readOnly} className="mt-3 min-w-0 rounded-3xl border border-[#dfe7f8] bg-white p-5 sm:p-6">
            {readOnly && (
                <div className="mb-4">
                    <Notice type="warn">
                        <span className="text-xs font-bold">วันนี้ผ่านไปแล้ว ดูได้อย่างเดียว แก้ไขไม่ได้</span>
                    </Notice>
                </div>
            )}
            {/* หัววัน */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2fb] pb-4">
                <div>
                    <p className="text-lg font-black">{fullThaiDate(day.date)}</p>
                    <p className={`mt-0.5 text-xs font-bold ${!day.isOpen ? "text-gray-400" : error ? "text-red-600" : "text-emerald-600"}`}>
                        {!day.isOpen ? "ปิดรับวันนี้" : error ? error : "พร้อมเปิดจอง"}
                    </p>
                </div>
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-[#f7f9ff] px-4 py-2.5">
                    <Switch checked={day.isOpen} onChange={toggleDay} label="เปิดรับวันนี้" />
                    <span className="text-sm font-black">เปิดรับวันนี้</span>
                </label>
            </div>

            {!day.isOpen ? (
                <p className="py-8 text-center text-sm text-gray-400">
                    นักศึกษาจะไม่เห็นวันนี้ในหน้าจอง เปิดสวิตช์ด้านบนเพื่อตั้งรอบเวลา
                </p>
            ) : (
                <>
                    {/* สถานที่ */}
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <Field label="สถานที่ยื่นเอกสาร *">
                            <input
                                value={day.location}
                                onChange={(e) => onChange((d) => ({ ...d, location: e.target.value }))}
                                placeholder="เช่น กองพัฒนานักศึกษา อาคาร 2"
                                className={INPUT}
                            />
                        </Field>
                        <Field label="รายละเอียดเพิ่มเติม" hint="ไม่บังคับ แสดงใต้ชื่อสถานที่">
                            <input
                                value={day.detail}
                                onChange={(e) => onChange((d) => ({ ...d, detail: e.target.value }))}
                                placeholder="เช่น กรุณานำเอกสารฉบับจริงมาด้วย"
                                className={INPUT}
                            />
                        </Field>
                    </div>

                    {/* หัวตารางรอบ + ปรับทุกรอบ */}
                    <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="font-black">รอบเวลา</p>
                            <p className="mt-0.5 text-xs text-gray-500">
                                เปิดอยู่ {t.openSlots} จาก {day.slots.length} รอบ รับได้รวม {t.capacity} คน
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2 rounded-2xl bg-[#f7f9ff] py-1.5 pl-3 pr-1.5">
                                <span className="text-xs font-bold text-gray-500">
                                    ทุกรอบ{mixed && <span className="block text-[10px] font-normal">(ตอนนี้ไม่เท่ากัน)</span>}
                                </span>
                                <Stepper
                                    value={Number(bulk)}
                                    onChange={setAllCapacity}
                                    label="จำนวนคนทุกรอบ"
                                    disabled={day.slots.length === 0}
                                />
                            </div>
                            {canApplyAll && (
                                <SecondaryButton onClick={onApplyAll}>ใช้ค่านี้กับทุกวัน</SecondaryButton>
                            )}
                        </div>
                    </div>

                    {/* ตารางรอบ */}
                    <div className="mt-4 overflow-hidden rounded-2xl border border-[#dfe7f8]">
                        <div className="hidden grid-cols-[minmax(0,1fr)_120px_150px_44px] items-center gap-4 bg-[#f7f9ff] px-4 py-3 text-xs font-bold text-gray-500 md:grid">
                            <span>ช่วงเวลา</span>
                            <span>เปิดให้จอง</span>
                            <span>จำนวนคนต่อรอบ</span>
                            <span className="sr-only">ลบ</span>
                        </div>

                        {day.slots.length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-gray-400">ยังไม่มีรอบเวลา กดเพิ่มรอบด้านล่าง</p>
                        ) : (
                            <ul className="divide-y divide-[#eef2fb]">
                                {day.slots.map((slot) => {
                                    const booked = Number(slot.booked || 0);
                                    const label = `${slot.startTime}–${slot.endTime}`;
                                    return (
                                        <li
                                            key={slot.key}
                                            className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_120px_150px_44px] ${!slot.isOpen ? "bg-gray-50/70" : ""
                                                }`}
                                        >
                                            <div className="col-span-2 flex items-center gap-2 md:col-span-1">
                                                <input
                                                    type="time"
                                                    step={300}
                                                    aria-label="เวลาเริ่ม"
                                                    disabled={booked > 0}
                                                    title={booked > 0 ? "รอบนี้มีผู้จองแล้ว เปลี่ยนเวลาไม่ได้" : undefined}
                                                    value={slot.startTime}
                                                    onChange={(e) => setSlot(slot.key, { startTime: e.target.value })}
                                                    className={`${INPUT} max-w-[140px]`}
                                                />
                                                <span className="text-gray-400">–</span>
                                                <input
                                                    type="time"
                                                    step={300}
                                                    aria-label="เวลาสิ้นสุด"
                                                    disabled={booked > 0}
                                                    title={booked > 0 ? "รอบนี้มีผู้จองแล้ว เปลี่ยนเวลาไม่ได้" : undefined}
                                                    value={slot.endTime}
                                                    onChange={(e) => setSlot(slot.key, { endTime: e.target.value })}
                                                    className={`${INPUT} max-w-[140px]`}
                                                />
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={slot.isOpen}
                                                    onChange={() => setSlot(slot.key, { isOpen: !slot.isOpen })}
                                                    label={`เปิดให้จองรอบ ${label}`}
                                                />
                                                <span className="text-sm font-bold text-gray-600">{slot.isOpen ? "เปิด" : "ปิด"}</span>
                                            </div>

                                            <div className="flex items-center justify-end gap-3 md:justify-start">
                                                <div>
                                                    <Stepper
                                                        value={Number(slot.capacity)}
                                                        min={Math.max(1, booked)}
                                                        onChange={(n) => setSlot(slot.key, { capacity: n })}
                                                        label={`จำนวนคนรอบ ${label}`}
                                                    />
                                                    {booked > 0 && (
                                                        <span className="mt-1 block text-[11px] font-bold text-[#0646ff]">
                                                            จองแล้ว {booked} คน
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="col-start-2 row-start-2 flex justify-end md:col-start-auto md:row-start-auto">
                                                <button
                                                    type="button"
                                                    onClick={() => removeSlot(slot.key)}
                                                    disabled={booked > 0}
                                                    title={booked > 0 ? "รอบนี้มีผู้จองแล้ว ลบไม่ได้ ปิดรอบแทนได้" : "ลบรอบนี้"}
                                                    aria-label={`ลบรอบ ${label}`}
                                                    className="grid h-10 w-10 place-items-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                        <path
                                                            d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"
                                                            stroke="currentColor"
                                                            strokeWidth="1.7"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={addSlot}
                        disabled={!canAdd}
                        className="mt-3 h-12 w-full rounded-2xl border-2 border-dashed border-[#cfdaf3] text-sm font-black text-[#07116f] transition hover:border-[#0646ff] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        + เพิ่มรอบเวลา (ต่อจากรอบสุดท้าย {nextLength} นาที)
                    </button>
                </>
            )}
        </fieldset>
    );
}

export default StaffSettings;