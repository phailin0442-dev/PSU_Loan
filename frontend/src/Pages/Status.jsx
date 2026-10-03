import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";

/**
 * หน้าติดตามสถานะ (นักศึกษา)
 * - สถานะปัจจุบัน 6 ขั้น: ยื่นคำขอ > คัดกรองคุณสมบัติ > อัปโหลดเอกสาร >
 *   ตรวจสอบเอกสาร > จองคิว > ส่งเอกสารสำเร็จ
 * - ประวัติคำขอ: แท็บ "คำขอปัจจุบัน" และ "คำขอที่สำเร็จแล้ว" + กรองปีการศึกษา/ประเภทผู้กู้
 *
 * ใช้ API ที่มีอยู่แล้ว: GET /api/student/:id และ GET /api/student
 */

/* ---------- ตั้งค่า (แก้ตรงนี้ถ้าจำเป็น) ---------- */
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ชื่อหน้าที่ใช้ตอนกดปุ่มไปหน้าอื่น (ต้องตรงกับชื่อหน้าใน App.jsx ถ้าปุ่มไม่พาไป ให้แก้ตรงนี้)
const BOOKING_PAGE_KEY = "booking";
const UPLOAD_PAGE_KEY = "uploadDocuments";

function getToken() {
    for (const key of ["token", "accessToken", "authToken", "jwt"]) {
        const value = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (value) return value;
    }
    return null;
}

const C = {
    navy: "#1C2B74",
    navyDark: "#101D5C",
    pink: "#E31C79",
    ink: "#1B2142",
    muted: "#5B6485",
    faint: "#8A93AD",
    line: "#E3E8F4",
    soft: "#F1F4FB",
    red: "#D6335A",
    redBg: "#FFF1F4",
    green: "#159A60",
    greenBg: "#E8FBF1",
    amber: "#8A5A06",
    amberBg: "#FFF6E5",
};
const HEAD = "'Prompt', 'Sarabun', sans-serif";
const SHADOW_CARD = "0 10px 30px -14px rgba(16,29,92,.18)";
const SHADOW_ACTIVE = "0 10px 22px -10px rgba(28,43,116,.6)";

/* ---------- ข้อมูลคงที่ ---------- */
const STEPS = [
    { n: 1, label: "ยื่นคำขอ", hint: "กำลังบันทึกคำขอ" },
    { n: 2, label: "คัดกรองคุณสมบัติ", hint: "กำลังคัดกรองคุณสมบัติ" },
    { n: 3, label: "อัปโหลดเอกสาร", hint: "อัปโหลดเอกสารให้ครบ" },
    { n: 4, label: "ตรวจสอบเอกสาร", hint: "รอเจ้าหน้าที่ตรวจสอบ" },
    { n: 5, label: "จองคิว", hint: "เลือกวันเวลายื่นเอกสาร" },
    { n: 6, label: "ส่งเอกสารสำเร็จ", hint: "ไปยื่นเอกสารฉบับจริงตามนัด" },
];

const STATUS_TH = {
    DRAFT: "ร่างคำขอ",
    SUBMITTED: "ยื่นคำขอแล้ว",
    ELIGIBILITY_REVIEW: "กำลังคัดกรองคุณสมบัติ",
    ELIGIBILITY_FAILED: "ไม่ผ่านการคัดกรอง",
    DOCUMENT_REVIEW: "รอตรวจสอบเอกสาร",
    REVISION_REQUIRED: "ต้องแก้ไขเอกสาร",
    DOCUMENT_APPROVED: "เอกสารผ่านการตรวจสอบ",
    QUEUE_BOOKED: "จองคิวแล้ว",
    SIGNED: "ลงนามแล้ว",
    CENTRAL_SUBMITTED: "ส่งเอกสารเรียบร้อย",
    COMPLETED: "เสร็จสิ้น",
    CANCELLED: "ยกเลิก",
};

const DOC_STATUS_TH = {
    PENDING: "รอตรวจ",
    APPROVED: "ผ่าน",
    REVISION_REQUIRED: "ต้องแก้ไข",
    REJECTED: "ไม่ผ่าน",
};

const DONE_STATUSES = ["SIGNED", "CENTRAL_SUBMITTED", "COMPLETED"];
const GENERIC_REMARKS = ["Application created", "Status updated"];

/* ---------- ฟังก์ชันช่วย ---------- */
async function getJson(path) {
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, { headers });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) {
        throw new Error(body?.message || "โหลดข้อมูลไม่สำเร็จ");
    }
    return body.data;
}

function getApplicationId(student) {
    return student?.applicationId ?? student?.application_id ?? student?.id ?? null;
}

function formatDateTime(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("th-TH", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

// current = ขั้นที่กำลังทำ (7 = เสร็จครบทุกขั้น, 0 = ยกเลิก)
function getProgress(status, docsComplete) {
    switch (status) {
        case "DRAFT":
            return { current: 1, mode: "normal" };
        case "SUBMITTED":
        case "ELIGIBILITY_REVIEW":
            return { current: 2, mode: "normal" };
        case "ELIGIBILITY_FAILED":
            return { current: 2, mode: "failed" };
        case "DOCUMENT_REVIEW":
            return { current: docsComplete === false ? 3 : 4, mode: "normal" };
        case "REVISION_REQUIRED":
            return { current: 3, mode: "revision" };
        case "DOCUMENT_APPROVED":
            return { current: 5, mode: "normal" };
        case "QUEUE_BOOKED":
            return { current: 6, mode: "normal" };
        case "SIGNED":
        case "CENTRAL_SUBMITTED":
        case "COMPLETED":
            return { current: 7, mode: "done" };
        case "CANCELLED":
            return { current: 0, mode: "cancelled" };
        default:
            return { current: 1, mode: "normal" };
    }
}

function stepState(n, progress) {
    if (progress.mode === "cancelled") return "idle";
    if (progress.current >= 7) return "done";
    if (n < progress.current) return "done";
    if (n === progress.current) {
        if (progress.mode === "failed") return "failed";
        if (progress.mode === "revision") return "revision";
        return "active";
    }
    return "idle";
}

function buildTimeline(detail) {
    return (detail?.statusHistory || [])
        .map((h) => ({
            key: `s-${h.changedAt}-${h.newStatus}`,
            at: h.changedAt,
            title: STATUS_TH[h.newStatus] || h.newStatus,
            note: h.remark && !GENERIC_REMARKS.includes(h.remark) ? h.remark : "",
            tone: ["REVISION_REQUIRED", "ELIGIBILITY_FAILED", "CANCELLED"].includes(h.newStatus) ? "bad" : "ok",
        }))
        .sort((a, b) => new Date(b.at) - new Date(a.at));
}

/* ---------- ไอคอน ---------- */
function IconCheck({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
function IconCross({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}
function IconChevron({ open }) {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/* ---------- css ---------- */
const css = `
.st { position: relative; isolation: isolate; }
.st::before, .st::after { content: ""; position: absolute; z-index: -1; border-radius: 50%; filter: blur(70px); pointer-events: none; }
.st::before { width: 420px; height: 420px; top: -80px; left: -120px; background: rgba(90,120,255,.16); }
.st::after { width: 380px; height: 380px; top: 260px; right: -120px; background: rgba(227,28,121,.10); }
.st button:focus-visible, .st select:focus-visible { outline: 3px solid ${C.pink}; outline-offset: 2px; }
.st-steps { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
.st-cta { transition: transform .15s, box-shadow .15s; }
.st-cta:hover:not(:disabled) { transform: translateY(-1px); }
@keyframes st-shimmer { 0% { background-position: -300px 0; } 100% { background-position: 300px 0; } }
.st-skel { background: linear-gradient(90deg, ${C.soft} 0, #E6ECF7 60px, ${C.soft} 120px); background-size: 600px 100%; animation: st-shimmer 1.2s infinite linear; border-radius: 12px; }
@media (max-width: 900px) { .st-steps { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (prefers-reduced-motion: reduce) { .st * { transition: none !important; animation: none !important; } }
`;

const cardStyle = {
    background: "linear-gradient(180deg, #FFFFFF, #FBFCFF)",
    border: `1px solid ${C.line}`,
    borderRadius: 18,
    boxShadow: SHADOW_CARD,
};

/* ---------- ส่วนประกอบย่อย ---------- */
function StepBox({ step, state, children }) {
    const palette = {
        done: { bg: C.greenBg, border: "#BFEBD4", circle: C.green, text: C.green },
        active: { bg: "#EEF2FF", border: C.navy, circle: C.navy, text: C.navy },
        revision: { bg: C.amberBg, border: "#F5D9A3", circle: "#D98E04", text: C.amber },
        failed: { bg: C.redBg, border: "#F7C6D0", circle: C.red, text: C.red },
        idle: { bg: "#fff", border: C.line, circle: "#C6CEE2", text: C.faint },
    }[state];

    const hintText =
        state === "done" ? "เสร็จแล้ว"
            : state === "active" ? step.hint
                : state === "revision" ? "มีเอกสารต้องแก้ไข"
                    : state === "failed" ? "ไม่ผ่านเกณฑ์"
                        : "";

    return (
        <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8,
            padding: "16px 10px 14px", borderRadius: 16, minHeight: 150, boxSizing: "border-box",
            background: palette.bg, border: `${state === "active" ? 2 : 1}px solid ${palette.border}`,
            boxShadow: state === "active" ? "0 0 0 4px rgba(28,43,116,.06)" : "none",
        }}>
            <span style={{
                width: 40, height: 40, borderRadius: "50%", display: "grid", placeItems: "center",
                background: palette.circle, color: "#fff", fontFamily: HEAD, fontWeight: 700, fontSize: "1rem",
            }}>
                {state === "done" ? <IconCheck /> : state === "failed" ? <IconCross /> : step.n}
            </span>
            <strong style={{ fontFamily: HEAD, fontSize: ".9rem", color: state === "idle" ? C.muted : C.ink }}>{step.label}</strong>
            {hintText && <span style={{ fontSize: ".76rem", color: palette.text, fontWeight: 600 }}>{hintText}</span>}
            {children}
        </div>
    );
}

function StatusBadge({ status }) {
    let bg = "#EEF2FF";
    let color = C.navy;
    if (DONE_STATUSES.includes(status)) { bg = C.greenBg; color = C.green; }
    else if (status === "REVISION_REQUIRED") { bg = C.amberBg; color = C.amber; }
    else if (status === "ELIGIBILITY_FAILED" || status === "CANCELLED") { bg = C.redBg; color = C.red; }
    return (
        <span style={{ background: bg, color, fontSize: ".76rem", fontWeight: 700, padding: "4px 12px", borderRadius: 999, whiteSpace: "nowrap" }}>
            {STATUS_TH[status] || status}
        </span>
    );
}

const DOC_CHIP = {
    PENDING: { bg: "#EEF2FF", color: C.navy },
    APPROVED: { bg: C.greenBg, color: C.green },
    REVISION_REQUIRED: { bg: C.amberBg, color: C.amber },
    REJECTED: { bg: C.redBg, color: C.red },
};

function DocStatusChip({ status }) {
    const style = DOC_CHIP[status] || DOC_CHIP.PENDING;
    return (
        <span style={{ background: style.bg, color: style.color, fontSize: ".74rem", fontWeight: 700, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
            {DOC_STATUS_TH[status] || status}
        </span>
    );
}

const thStyle = { textAlign: "left", padding: "10px 12px", fontSize: ".76rem", color: C.faint, fontWeight: 700, whiteSpace: "nowrap", borderBottom: `1px solid ${C.line}`, background: "#fff" };
const tdStyle = { padding: "10px 12px", fontSize: ".84rem", verticalAlign: "top", borderBottom: `1px solid ${C.line}` };

function SubmissionsTable({ rows }) {
    return (
        <div style={{ overflowX: "auto", border: `1px solid ${C.line}`, borderRadius: 12, background: "#fff" }}>
            <table style={{ width: "100%", minWidth: 820, borderCollapse: "collapse" }}>
                <thead>
                    <tr>
                        <th style={thStyle}>เอกสาร</th>
                        <th style={thStyle}>ส่งครั้งที่</th>
                        <th style={thStyle}>ไฟล์</th>
                        <th style={thStyle}>วันที่ส่ง</th>
                        <th style={thStyle}>สถานะ</th>
                        <th style={thStyle}>ผู้ตรวจ</th>
                        <th style={thStyle}>หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => {
                        const sentBack = r.status === "REVISION_REQUIRED" || r.status === "REJECTED";
                        const autoApproved = r.status === "APPROVED" && !r.reviewedByName;
                        return (
                            <tr key={r.documentId}>
                                <td style={tdStyle}>
                                    <div style={{ fontWeight: 600 }}>{r.documentName}</div>
                                    {r.isCurrent && <div style={{ fontSize: ".72rem", color: C.green, marginTop: 2 }}>ฉบับล่าสุด</div>}
                                </td>
                                <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>ครั้งที่ {r.versionNo}</td>
                                <td style={{ ...tdStyle, maxWidth: 220, wordBreak: "break-all" }} title={r.fileName}>{r.fileName}</td>
                                <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{formatDateTime(r.uploadedAt)}</td>
                                <td style={tdStyle}><DocStatusChip status={r.status} /></td>
                                <td style={tdStyle}>
                                    {r.reviewedByName ? (
                                        <>
                                            <div>{r.reviewedByName}</div>
                                            <div style={{ fontSize: ".72rem", color: C.faint }}>{formatDateTime(r.reviewedAt)}</div>
                                        </>
                                    ) : autoApproved ? (
                                        <span style={{ color: C.muted }}>ระบบตรวจอัตโนมัติ</span>
                                    ) : (
                                        <span style={{ color: C.faint }}>-</span>
                                    )}
                                </td>
                                <td style={{ ...tdStyle, minWidth: 180, color: sentBack ? C.red : C.muted, fontWeight: sentBack ? 600 : 400 }}>
                                    {r.remark || "-"}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function ApplicationCard({ app, detail, defaultOpen, onOpen }) {
    const [open, setOpen] = useState(Boolean(defaultOpen));
    const id = app.application_id;

    useEffect(() => {
        if (open) onOpen(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, id]);

    const timeline = useMemo(() => buildTimeline(detail), [detail]);
    const submissions = detail?.documentSubmissions || [];
    const missing = (detail?.requiredDocuments || []).filter((d) => d.status === "ยังไม่อัปโหลด");

    return (
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, background: "#fff", overflow: "hidden" }}>
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
                style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                    background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: C.ink,
                }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: ".98rem" }}>
                        ปีการศึกษา {app.academic_year} เทอม {app.semester}
                    </div>
                    <div style={{ fontSize: ".82rem", color: C.muted, marginTop: 2 }}>
                        {app.loan_type_name} · ยื่นเมื่อ {formatDate(app.submitted_at || app.created_at)}
                    </div>
                </div>
                <StatusBadge status={app.application_status} />
                <IconChevron open={open} />
            </button>

            {open && (
                <div style={{ borderTop: `1px solid ${C.line}`, padding: "16px", background: C.soft, display: "grid", gap: 18 }}>
                    {!detail ? (
                        <div className="st-skel" style={{ height: 90 }} />
                    ) : (
                        <>
                            <div>
                                <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: ".88rem", marginBottom: 8 }}>ประวัติการส่งเอกสาร</div>
                                {submissions.length === 0 ? (
                                    <div style={{ color: C.faint, fontSize: ".84rem" }}>ยังไม่มีการส่งเอกสาร</div>
                                ) : (
                                    <SubmissionsTable rows={submissions} />
                                )}
                                {missing.length > 0 && (
                                    <div style={{ marginTop: 10, background: C.amberBg, border: "1px solid #F5D9A3", color: C.amber, borderRadius: 10, padding: "9px 12px", fontSize: ".82rem", fontWeight: 600 }}>
                                        ยังไม่ได้ส่ง: {missing.map((d) => d.documentType).join(", ")}
                                    </div>
                                )}
                            </div>

                            <div>
                                <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: ".88rem", marginBottom: 8 }}>ประวัติสถานะคำขอ</div>
                                {timeline.length === 0 ? (
                                    <div style={{ color: C.faint, fontSize: ".84rem" }}>ยังไม่มีประวัติ</div>
                                ) : (
                                    <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
                                        {timeline.map((ev) => (
                                            <li key={ev.key} style={{ display: "flex", gap: 10 }}>
                                                <span style={{
                                                    width: 10, height: 10, borderRadius: "50%", marginTop: 6, flexShrink: 0,
                                                    background: ev.tone === "bad" ? C.red : C.green,
                                                }} />
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontSize: ".86rem", fontWeight: 600 }}>{ev.title}</div>
                                                    <div style={{ fontSize: ".76rem", color: C.faint }}>{formatDateTime(ev.at)}</div>
                                                    {ev.note && <div style={{ fontSize: ".82rem", color: C.muted, marginTop: 2 }}>{ev.note}</div>}
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function EmptyBox({ children }) {
    return (
        <div style={{ borderRadius: 12, background: C.soft, border: `1px dashed ${C.line}`, padding: "18px 16px", color: C.faint, fontSize: ".9rem", textAlign: "center" }}>
            {children}
        </div>
    );
}

const selectStyle = {
    border: `1.5px solid ${C.line}`, borderRadius: 10, padding: "8px 12px", background: "#fff",
    fontFamily: "'Sarabun', sans-serif", fontSize: ".88rem", color: C.ink, minWidth: 160,
};

/* ================================================================ */

function Status({ setPage } = {}) {
    const appContext = useApp();
    const { selectedStudent } = appContext;
    const applicationId = getApplicationId(selectedStudent);

    const [load, setLoad] = useState({ status: "loading", message: "" });
    const [apps, setApps] = useState([]);
    const [details, setDetails] = useState({});
    const [tab, setTab] = useState("current");
    const [yearFilter, setYearFilter] = useState("ALL");
    const [loanFilter, setLoanFilter] = useState("ALL");
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        if (!applicationId) return undefined;
        let ignore = false;

        (async () => {
            try {
                const detail = await getJson(`/api/student/${applicationId}`);
                const all = await getJson("/api/student");
                if (ignore) return;

                const mine = all.filter((r) => String(r.student_user_id) === String(detail.student_user_id));
                const hasSelected = mine.some((r) => String(r.application_id) === String(applicationId));
                const list = (hasSelected ? mine : [detail, ...mine]).sort(
                    (a, b) => new Date(b.created_at) - new Date(a.created_at),
                );

                setApps(list);
                setDetails({ [applicationId]: detail });
                setLoad({ status: "ready", message: "" });
            } catch (e) {
                if (!ignore) setLoad({ status: "error", message: e.message });
            }
        })();

        return () => { ignore = true; };
    }, [applicationId, reloadKey]);

    const retry = () => {
        setLoad({ status: "loading", message: "" });
        setReloadKey((k) => k + 1);
    };

    const loadDetail = useCallback(async (id) => {
        if (details[id]) return;
        try {
            const data = await getJson(`/api/student/${id}`);
            setDetails((prev) => ({ ...prev, [id]: data }));
        } catch {
            /* ปล่อยให้แสดง skeleton ต่อ ถ้าโหลดรายละเอียดไม่ได้ */
        }
    }, [details]);

    // พาไปหน้าอื่น: ใช้ setPage ที่ App.jsx ส่งมา > ฟังก์ชันใน context > เปลี่ยน URL
    const goToPage = (pageKey) => {
        const nav =
            setPage ||
            appContext.setCurrentPage ||
            appContext.setPage ||
            appContext.navigateTo ||
            appContext.navigate;
        if (typeof nav === "function") {
            nav(pageKey);
        } else {
            window.location.assign(`/${pageKey}`);
        }
    };
    const goToBooking = () => goToPage(BOOKING_PAGE_KEY);
    const goToUpload = () => goToPage(UPLOAD_PAGE_KEY);

    const selectedApp = apps.find((a) => String(a.application_id) === String(applicationId));
    const selectedDetail = details[applicationId];
    const docsComplete = selectedDetail?.requiredDocuments
        ? selectedDetail.requiredDocuments.every((d) => d.status !== "ยังไม่อัปโหลด")
        : null;
    const progress = getProgress(selectedApp?.application_status, docsComplete);
    const revisionDocs = (selectedDetail?.requiredDocuments || []).filter(
        (d) => d.status === "REVISION_REQUIRED" || d.status === "REJECTED",
    );

    const years = useMemo(() => [...new Set(apps.map((a) => a.academic_year))].sort().reverse(), [apps]);
    const loanTypes = useMemo(() => [...new Set(apps.map((a) => a.loan_type_name))], [apps]);

    const filtered = apps.filter((a) =>
        (yearFilter === "ALL" || a.academic_year === yearFilter) &&
        (loanFilter === "ALL" || a.loan_type_name === loanFilter));
    const currentList = filtered.filter((a) => !DONE_STATUSES.includes(a.application_status));
    const doneList = filtered.filter((a) => DONE_STATUSES.includes(a.application_status));
    const shownList = tab === "current" ? currentList : doneList;

    const shell = (children) => (
        <main className="st" style={{ maxWidth: 1120, margin: "0 auto", padding: "34px 20px 64px", fontFamily: "'Sarabun', sans-serif", color: C.ink }}>
            <style>{css}</style>
            {children}
        </main>
    );

    if (!applicationId) {
        return shell(
            <div style={{ ...cardStyle, padding: 32, textAlign: "center" }}>
                <h1 style={{ fontFamily: HEAD, fontSize: "1.3rem", margin: "0 0 8px" }}>ยังไม่มีคำขอกู้ยืม</h1>
                <p style={{ color: C.muted, margin: 0 }}>เมื่อยื่นคำขอกู้ยืมแล้ว จะติดตามสถานะได้ที่หน้านี้</p>
            </div>,
        );
    }

    if (load.status === "loading") {
        return shell(
            <div aria-busy="true" aria-label="กำลังโหลดสถานะ" style={{ display: "grid", gap: 16 }}>
                <div className="st-skel" style={{ height: 40, maxWidth: 260 }} />
                <div className="st-skel" style={{ height: 160 }} />
                <div className="st-skel" style={{ height: 240 }} />
            </div>,
        );
    }

    if (load.status === "error") {
        return shell(
            <div style={{ ...cardStyle, padding: 32, textAlign: "center" }}>
                <h1 style={{ fontFamily: HEAD, fontSize: "1.3rem", margin: "0 0 8px" }}>โหลดสถานะไม่สำเร็จ</h1>
                <p style={{ color: C.muted, margin: "0 0 18px" }}>{load.message}</p>
                <button type="button" className="st-cta" onClick={retry}
                    style={{ background: `linear-gradient(180deg, #2A3B8C, ${C.navy})`, color: "#fff", border: "none", fontWeight: 600, padding: "11px 26px", borderRadius: 999, cursor: "pointer", boxShadow: SHADOW_ACTIVE }}>
                    ลองใหม่
                </button>
            </div>,
        );
    }

    return shell(
        <>
            {/* ---------- สถานะปัจจุบัน ---------- */}
            <section style={{ ...cardStyle, padding: "clamp(18px, 3vw, 26px)", marginBottom: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                    <div>
                        <h1 style={{ fontFamily: HEAD, fontWeight: 800, fontSize: "clamp(1.4rem, 3.5vw, 1.8rem)", margin: 0 }}>สถานะปัจจุบัน</h1>
                        {selectedApp && (
                            <p style={{ margin: "4px 0 0", color: C.muted, fontSize: ".9rem" }}>
                                ปีการศึกษา {selectedApp.academic_year} เทอม {selectedApp.semester} · {selectedApp.loan_type_name}
                            </p>
                        )}
                    </div>
                    {selectedApp && <StatusBadge status={selectedApp.application_status} />}
                </div>

                {progress.mode === "cancelled" && (
                    <div role="status" style={{ background: C.redBg, border: "1px solid #F7C6D0", color: C.red, borderRadius: 12, padding: "12px 14px", marginBottom: 14, fontSize: ".9rem", fontWeight: 600 }}>
                        คำขอนี้ถูกยกเลิกแล้ว
                    </div>
                )}
                {progress.mode === "failed" && (
                    <div role="status" style={{ background: C.redBg, border: "1px solid #F7C6D0", color: C.red, borderRadius: 12, padding: "12px 14px", marginBottom: 14, fontSize: ".9rem", fontWeight: 600 }}>
                        คำขอไม่ผ่านการคัดกรองคุณสมบัติ กรุณาตรวจสอบข้อมูลแล้วยื่นคำขอใหม่
                    </div>
                )}

                {revisionDocs.length > 0 && (
                    <div role="alert" style={{ background: C.amberBg, border: "2px solid #F5D9A3", borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                            <div style={{ fontFamily: HEAD, fontWeight: 700, color: C.amber }}>
                                มีเอกสารที่ต้องแก้ไข {revisionDocs.length} รายการ
                            </div>
                            <button type="button" className="st-cta" onClick={goToUpload}
                                style={{
                                    border: "none", background: "linear-gradient(180deg, #E8A317, #D98E04)", color: "#fff",
                                    fontFamily: HEAD, fontWeight: 700, fontSize: ".9rem", padding: "10px 22px", borderRadius: 999,
                                    cursor: "pointer", boxShadow: "0 10px 22px -10px rgba(217,142,4,.7)",
                                }}>
                                แก้ไขเอกสาร
                            </button>
                        </div>
                        <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
                            {revisionDocs.map((d) => (
                                <li key={d.requirementId} style={{ background: "#fff", border: "1px solid #F5D9A3", borderRadius: 10, padding: "9px 12px", fontSize: ".86rem" }}>
                                    <div style={{ fontWeight: 700, color: C.ink }}>{d.documentType}</div>
                                    {d.note && <div style={{ color: C.red, marginTop: 3 }}>เหตุผล: {d.note}</div>}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="st-steps">
                    {STEPS.map((step) => {
                        const state = stepState(step.n, progress);
                        const status = selectedApp?.application_status;
                        const showBook = step.n === 5 && status === "DOCUMENT_APPROVED";
                        const showView = step.n === 5 && status === "QUEUE_BOOKED";
                        const showFix = step.n === 3 && state === "revision";
                        const showUpload = step.n === 3 && state === "active";
                        return (
                            <StepBox key={step.n} step={step} state={state}>
                                {(showFix || showUpload) && (
                                    <button type="button" className="st-cta" onClick={goToUpload}
                                        style={{
                                            marginTop: "auto", border: "none",
                                            background: showFix ? "linear-gradient(180deg, #E8A317, #D98E04)" : `linear-gradient(180deg, #2A3B8C, ${C.navy})`,
                                            color: "#fff", fontFamily: HEAD, fontWeight: 700, fontSize: ".82rem",
                                            padding: "8px 18px", borderRadius: 999, cursor: "pointer",
                                        }}>
                                        {showFix ? "แก้ไขเอกสาร" : "อัปโหลดเอกสาร"}
                                    </button>
                                )}
                                {(showBook || showView) && (
                                    <button type="button" className="st-cta" onClick={goToBooking}
                                        style={{
                                            marginTop: "auto", border: showBook ? "none" : `1.5px solid ${C.navy}`,
                                            background: showBook ? `linear-gradient(180deg, #F0409A, ${C.pink})` : "#fff",
                                            color: showBook ? "#fff" : C.navy, fontFamily: HEAD, fontWeight: 700, fontSize: ".82rem",
                                            padding: "8px 18px", borderRadius: 999, cursor: "pointer",
                                            boxShadow: showBook ? "0 10px 22px -10px rgba(227,28,121,.65)" : "none",
                                        }}>
                                        {showBook ? "จองคิว" : "ดูนัดหมาย"}
                                    </button>
                                )}
                            </StepBox>
                        );
                    })}
                </div>
            </section>

            {/* ---------- ประวัติคำขอ ---------- */}
            <section style={{ ...cardStyle, padding: "clamp(18px, 3vw, 26px)" }}>
                <h2 style={{ fontFamily: HEAD, fontWeight: 700, fontSize: "1.2rem", margin: "0 0 14px" }}>ประวัติคำขอ</h2>

                <div role="tablist" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                    {[
                        { key: "current", label: "คำขอปัจจุบัน", count: currentList.length },
                        { key: "done", label: "คำขอที่สำเร็จแล้ว", count: doneList.length },
                    ].map((t) => {
                        const active = tab === t.key;
                        return (
                            <button key={t.key} type="button" role="tab" aria-selected={active} onClick={() => setTab(t.key)}
                                style={{
                                    border: `1.5px solid ${active ? C.navy : C.line}`,
                                    background: active ? `linear-gradient(180deg, #2A3B8C, ${C.navy})` : "#fff",
                                    color: active ? "#fff" : C.ink, fontFamily: HEAD, fontWeight: 600, fontSize: ".88rem",
                                    padding: "9px 18px", borderRadius: 12, cursor: "pointer",
                                    boxShadow: active ? SHADOW_ACTIVE : "none",
                                }}>
                                {t.label} ({t.count})
                            </button>
                        );
                    })}
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, padding: "12px 14px", background: C.soft, borderRadius: 12 }}>
                    <label style={{ display: "grid", gap: 4, fontSize: ".76rem", color: C.faint }}>
                        ปีการศึกษา
                        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={selectStyle}>
                            <option value="ALL">ทั้งหมด</option>
                            {years.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </label>
                    <label style={{ display: "grid", gap: 4, fontSize: ".76rem", color: C.faint }}>
                        ประเภทผู้กู้
                        <select value={loanFilter} onChange={(e) => setLoanFilter(e.target.value)} style={selectStyle}>
                            <option value="ALL">ทั้งหมด</option>
                            {loanTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </label>
                </div>

                {shownList.length === 0 ? (
                    <EmptyBox>
                        {tab === "current" ? "ไม่มีคำขอที่กำลังดำเนินการ" : "ยังไม่มีคำขอที่สำเร็จแล้ว"}
                    </EmptyBox>
                ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                        {shownList.map((app) => (
                            <ApplicationCard
                                key={app.application_id}
                                app={app}
                                detail={details[app.application_id]}
                                defaultOpen={String(app.application_id) === String(applicationId)}
                                onOpen={loadDetail}
                            />
                        ))}
                    </div>
                )}
            </section>
        </>,
    );
}

export default Status;