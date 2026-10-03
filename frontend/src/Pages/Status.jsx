import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";

/**
 * หน้าติดตามสถานะ (นักศึกษา) — ออกแบบใหม่
 * - ส่วนบน: บอก "ขั้นถัดไปที่ต้องทำ" ชัดๆ พร้อมปุ่ม + แถบความคืบหน้า 6 ขั้น
 * - เอกสาร: แสดงเฉพาะฉบับล่าสุดของแต่ละเอกสาร (ประวัติการส่งก่อนหน้ากดดูได้)
 * - ประวัติสถานะคำขอ + คำขออื่นๆ ย้อนหลัง
 *
 * ใช้ API เดิม: GET /api/student/:id และ GET /api/student
 */

/* ---------- ตั้งค่า ---------- */
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getToken() {
    for (const key of ["token", "accessToken", "authToken", "jwt"]) {
        const value = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (value) return value;
    }
    return null;
}

const C = {
    navy: "#1C2B74",
    navyDeep: "#101D5C",
    pink: "#E31C79",
    ink: "#1B2142",
    muted: "#5B6485",
    faint: "#8A93AD",
    line: "#E3E8F4",
    wash: "#F4F6FB",
    green: "#138A57",
    greenBg: "#E7F7EF",
    amber: "#9A6408",
    amberBg: "#FFF5E2",
    red: "#C42D52",
    redBg: "#FFF0F3",
};
const HEAD = "'Prompt', 'Sarabun', sans-serif";

/* ---------- ข้อมูลคงที่ ---------- */
const STEPS = [
    { n: 1, label: "กรอกข้อมูลส่วนตัว" },
    { n: 2, label: "คัดกรองคุณสมบัติ" },
    { n: 3, label: "อัปโหลดเอกสาร" },
    { n: 4, label: "ตรวจสอบเอกสาร" },
    { n: 5, label: "จองคิว" },
    { n: 6, label: "ยื่นเอกสารฉบับจริง" },
];

const STATUS_TH = {
    DRAFT: "ร่างคำขอ",
    SUBMITTED: "กรอกข้อมูลส่วนตัวแล้ว",
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

const DOC_STATUS = {
    PENDING: { label: "รอตรวจ", bg: "#EEF1FB", color: C.navy },
    APPROVED: { label: "ผ่าน", bg: C.greenBg, color: C.green },
    REVISION_REQUIRED: { label: "ต้องแก้ไข", bg: C.amberBg, color: C.amber },
    REJECTED: { label: "ไม่ผ่าน", bg: C.redBg, color: C.red },
    MISSING: { label: "ยังไม่ได้ส่ง", bg: C.amberBg, color: C.amber },
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

// "ขั้นถัดไป" ที่นักศึกษาต้องทำ แยกตามสถานะคำร้อง
function nextStepOf(status, docsComplete, revisionCount) {
    switch (status) {
        case "DRAFT":
        case "SUBMITTED":
        case "ELIGIBILITY_REVIEW":
            return {
                title: "คัดกรองคุณสมบัติ",
                text: "กรอก GPAX และชั่วโมงจิตอาสา พร้อมแนบหลักฐาน เพื่อไปขั้นตอนอัปโหลดเอกสาร",
                cta: { label: "ไปคัดกรองคุณสมบัติ", page: "eligibility" },
            };
        case "ELIGIBILITY_FAILED":
            return {
                title: "คำขอไม่ผ่านการคัดกรอง",
                text: "GPAX หรือชั่วโมงจิตอาสายังไม่ถึงเกณฑ์ หากมีข้อสงสัยกรุณาติดต่อเจ้าหน้าที่ กยศ.",
                cta: null,
            };
        case "DOCUMENT_REVIEW":
            return docsComplete === false
                ? {
                    title: "อัปโหลดเอกสารให้ครบ",
                    text: "ยังมีเอกสารที่ต้องส่ง ส่งให้ครบทุกรายการ เจ้าหน้าที่จึงจะเริ่มตรวจได้",
                    cta: { label: "อัปโหลดเอกสาร", page: "uploadDocuments" },
                }
                : {
                    title: "รอเจ้าหน้าที่ตรวจเอกสาร",
                    text: "ส่งเอกสารครบแล้ว ไม่ต้องทำอะไรเพิ่มในตอนนี้ เมื่อตรวจผ่านจะจองวันยื่นเอกสารได้ทันที",
                    cta: null,
                };
        case "REVISION_REQUIRED":
            return {
                title: revisionCount > 0 ? `แก้ไขเอกสาร ${revisionCount} รายการ` : "แก้ไขเอกสาร",
                text: "เจ้าหน้าที่ให้แก้ไขเอกสารบางรายการ ดูเหตุผลด้านล่าง แล้วส่งไฟล์ใหม่",
                cta: { label: "แก้ไขเอกสาร", page: "uploadDocuments", tone: "amber" },
            };
        case "DOCUMENT_APPROVED":
            return {
                title: "จองวันเวลายื่นเอกสาร",
                text: "เอกสารผ่านการตรวจสอบครบแล้ว เลือกวันและเวลาที่สะดวกมายื่นเอกสารฉบับจริง",
                cta: { label: "จองคิว", page: "booking" },
            };
        case "QUEUE_BOOKED":
            return {
                title: "ไปยื่นเอกสารฉบับจริงตามนัด",
                text: "นำเอกสารฉบับจริงไปยื่นภายในช่วงเวลาที่จองไว้ เปลี่ยนหรือยกเลิกนัดได้ที่หน้านัดหมาย",
                cta: { label: "ดูนัดหมาย", page: "booking" },
            };
        case "SIGNED":
        case "CENTRAL_SUBMITTED":
        case "COMPLETED":
            return {
                title: "ยื่นเอกสารเรียบร้อยแล้ว",
                text: "คำขอกู้ยืมของภาคการศึกษานี้ดำเนินการครบทุกขั้นตอนแล้ว",
                cta: null,
            };
        case "CANCELLED":
            return {
                title: "คำขอนี้ถูกยกเลิกแล้ว",
                text: "หากต้องการกู้ยืม กรุณายื่นคำขอใหม่",
                cta: null,
            };
        default:
            return { title: "-", text: "", cta: null };
    }
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

// รวมการส่งเอกสารเป็นกลุ่มตามชื่อเอกสาร: ฉบับล่าสุด + ฉบับก่อนหน้า
function groupSubmissions(rows) {
    const map = new Map();
    for (const r of rows || []) {
        const key = r.documentName || r.documentId;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(r);
    }
    return [...map.entries()].map(([name, list]) => {
        const sorted = [...list].sort((a, b) => (b.versionNo || 0) - (a.versionNo || 0));
        const latest = sorted.find((r) => r.isCurrent) || sorted[0];
        return { name, latest, older: sorted.filter((r) => r !== latest) };
    });
}

/* ---------- ไอคอน ---------- */
function IconCheck({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
function IconCross({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}
function IconChevron({ open }) {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }}>
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/* ---------- css ---------- */
const css = `
.sx { max-width: 1120px; margin: 0 auto; padding: 32px 20px 64px; font-family: 'Sarabun', sans-serif; color: ${C.ink}; display: grid; gap: 20px; }
.sx h1, .sx h2, .sx h3 { font-family: ${HEAD}; margin: 0; }
.sx button { font-family: inherit; }
.sx button:focus-visible, .sx select:focus-visible { outline: 3px solid ${C.pink}; outline-offset: 2px; }

/* ---- hero ---- */
.sx-hero { background: linear-gradient(135deg, ${C.navy}, ${C.navyDeep}); color: #fff; border-radius: 22px; padding: clamp(22px, 4vw, 34px); display: grid; gap: 30px; }
.sx-hero-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 22px; flex-wrap: wrap; }
.sx-kicker { font-size: .84rem; color: #B9C4F2; font-weight: 600; margin: 0 0 6px; }
.sx-next { font-size: clamp(1.5rem, 3.6vw, 2.05rem); font-weight: 700; line-height: 1.25; margin: 0 0 8px; }
.sx-next-text { margin: 0; color: #D7DEF8; max-width: 52ch; line-height: 1.7; font-size: .95rem; }
.sx-cta { margin-top: 18px; display: inline-flex; align-items: center; gap: 8px; border: none; border-radius: 12px; padding: 12px 24px; font-weight: 700; font-size: .95rem; cursor: pointer; background: ${C.pink}; color: #fff; transition: transform .15s; }
.sx-cta:hover { transform: translateY(-1px); }
.sx-cta.is-amber { background: #F2B233; color: #2B1B00; }
.sx-meta { margin: 0; display: grid; gap: 12px; min-width: 230px; padding: 16px 18px; border-radius: 14px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); }
.sx-meta dt { font-size: .74rem; color: #A9B5E6; }
.sx-meta dd { margin: 2px 0 0; font-weight: 600; font-size: .92rem; }

/* ---- progress rail ---- */
.sx-rail { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); }
.sx-node { position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 0 4px; }
.sx-node + .sx-node::before { content: ""; position: absolute; top: 15px; right: 50%; width: 100%; height: 2px; background: rgba(255,255,255,.18); }
.sx-node.is-done::before, .sx-node.is-active::before, .sx-node.is-revision::before, .sx-node.is-failed::before { background: #fff; }
.sx-dot { position: relative; z-index: 1; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font-family: ${HEAD}; font-weight: 700; font-size: .86rem; }
.is-done .sx-dot { background: #fff; color: ${C.navy}; }
.is-active .sx-dot { background: ${C.pink}; color: #fff; box-shadow: 0 0 0 6px rgba(227,28,121,.28); }
.is-revision .sx-dot { background: #F2B233; color: #2B1B00; box-shadow: 0 0 0 6px rgba(242,178,51,.28); }
.is-failed .sx-dot { background: #F0567A; color: #fff; }
.is-idle .sx-dot { background: ${C.navyDeep}; color: #8E9AD0; border: 2px solid rgba(255,255,255,.22); }
.sx-lbl { font-size: .84rem; font-weight: 600; color: #fff; line-height: 1.35; }
.is-idle .sx-lbl { color: #8E9AD0; font-weight: 500; }

/* ---- panels ---- */
.sx-panel { background: #fff; border: 1px solid ${C.line}; border-radius: 18px; padding: clamp(18px, 3vw, 26px); }
.sx-panel-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 6px; }
.sx-h2 { font-size: 1.15rem; font-weight: 700; }
.sx-h3 { font-size: .98rem; font-weight: 700; margin-bottom: 4px !important; }
.sx-sub { color: ${C.muted}; font-size: .88rem; }

.sx-detail { display: grid; grid-template-columns: minmax(0, 1fr) 270px; gap: 32px; align-items: start; }

/* ---- documents ---- */
.sx-docs { list-style: none; margin: 0; padding: 0; }
.sx-doc { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; padding: 14px 0; border-top: 1px solid ${C.line}; }
.sx-doc:first-child { border-top: none; }
.sx-doc-main { min-width: 0; flex: 1; }
.sx-doc-name { font-weight: 700; font-size: .95rem; }
.sx-doc-meta { display: flex; flex-wrap: wrap; gap: 2px 12px; margin-top: 3px; font-size: .8rem; color: ${C.muted}; }
.sx-file { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sx-remark { margin: 8px 0 0; padding: 8px 12px; border-radius: 10px; background: ${C.redBg}; color: ${C.red}; font-size: .84rem; font-weight: 600; }
.sx-more { background: none; border: none; padding: 6px 0 0; color: ${C.navy}; font-size: .8rem; font-weight: 600; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
.sx-versions { list-style: none; margin: 8px 0 0; padding: 2px 0 2px 12px; border-left: 2px solid ${C.line}; display: grid; gap: 8px; }
.sx-versions li { font-size: .8rem; color: ${C.muted}; }
.sx-versions strong { color: ${C.ink}; font-weight: 600; }
.sx-chip { flex-shrink: 0; font-size: .76rem; font-weight: 700; padding: 4px 12px; border-radius: 999px; white-space: nowrap; }

/* ---- timeline ---- */
.sx-tl { list-style: none; margin: 10px 0 0; padding: 0; }
.sx-tl li { position: relative; padding: 0 0 16px 22px; }
.sx-tl li::before { content: ""; position: absolute; left: 4px; top: 14px; bottom: -2px; width: 2px; background: ${C.line}; }
.sx-tl li:last-child::before { display: none; }
.sx-tl-dot { position: absolute; left: 0; top: 6px; width: 10px; height: 10px; border-radius: 50%; }
.sx-tl-title { font-size: .88rem; font-weight: 600; }
.sx-tl-at { font-size: .76rem; color: ${C.faint}; }
.sx-tl-note { font-size: .82rem; color: ${C.muted}; margin-top: 2px; }

/* ---- history ---- */
.sx-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin: 14px 0 12px; }
.sx-tab { border: 1.5px solid ${C.line}; background: #fff; color: ${C.ink}; font-weight: 600; font-size: .86rem; padding: 8px 16px; border-radius: 10px; cursor: pointer; }
.sx-tab[aria-selected="true"] { background: ${C.navy}; border-color: ${C.navy}; color: #fff; }
.sx-filters { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.sx-filters label { display: grid; gap: 4px; font-size: .76rem; color: ${C.faint}; }
.sx-filters select { border: 1.5px solid ${C.line}; border-radius: 10px; padding: 8px 12px; background: #fff; font-family: inherit; font-size: .88rem; color: ${C.ink}; min-width: 160px; }
.sx-app { border: 1px solid ${C.line}; border-radius: 14px; overflow: hidden; }
.sx-app + .sx-app { margin-top: 10px; }
.sx-app-head { width: 100%; display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: none; border: none; cursor: pointer; text-align: left; color: ${C.ink}; }
.sx-app-title { font-family: ${HEAD}; font-weight: 700; font-size: .96rem; }
.sx-app-body { border-top: 1px solid ${C.line}; padding: 18px 16px; background: ${C.wash}; }
.sx-empty { border-radius: 12px; background: ${C.wash}; padding: 18px 16px; color: ${C.faint}; font-size: .9rem; text-align: center; }

@keyframes sx-shimmer { 0% { background-position: -300px 0; } 100% { background-position: 300px 0; } }
.sx-skel { background: linear-gradient(90deg, ${C.wash} 0, #E6ECF7 60px, ${C.wash} 120px); background-size: 600px 100%; animation: sx-shimmer 1.2s infinite linear; border-radius: 14px; }

@media (max-width: 880px) {
  .sx-detail { grid-template-columns: 1fr; gap: 22px; }
}
@media (max-width: 720px) {
  .sx-rail { grid-template-columns: 1fr; gap: 0; }
  .sx-node { flex-direction: row; text-align: left; gap: 14px; padding: 8px 0; }
  .sx-node + .sx-node::before { top: -50%; right: auto; left: 15px; width: 2px; height: 100%; }
  .sx-meta { width: 100%; }
  .sx-file { max-width: 180px; }
}
@media (prefers-reduced-motion: reduce) { .sx * { transition: none !important; animation: none !important; } }
`;

/* ---------- ส่วนประกอบย่อย ---------- */
function Chip({ status }) {
    const s = DOC_STATUS[status] || DOC_STATUS.PENDING;
    return <span className="sx-chip" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

function reviewerText(r) {
    if (r.reviewedByName) return `ตรวจโดย ${r.reviewedByName} · ${formatDateTime(r.reviewedAt)}`;
    if (r.status === "APPROVED") return "ระบบตรวจอัตโนมัติ";
    return "รอเจ้าหน้าที่ตรวจ";
}

function DocumentRow({ group }) {
    const [showOlder, setShowOlder] = useState(false);
    const r = group.latest;
    const sentBack = r.status === "REVISION_REQUIRED" || r.status === "REJECTED";

    return (
        <li className="sx-doc">
            <div className="sx-doc-main">
                <div className="sx-doc-name">{group.name}</div>
                <div className="sx-doc-meta">
                    <span className="sx-file" title={r.fileName}>{r.fileName}</span>
                    <span>ส่งครั้งที่ {r.versionNo} · {formatDateTime(r.uploadedAt)}</span>
                </div>
                <div className="sx-doc-meta">{reviewerText(r)}</div>
                {r.remark && (
                    <p className="sx-remark" style={sentBack ? undefined : { background: C.wash, color: C.muted }}>
                        {sentBack ? "เหตุผล: " : "หมายเหตุ: "}{r.remark}
                    </p>
                )}

                {group.older.length > 0 && (
                    <>
                        <button type="button" className="sx-more" aria-expanded={showOlder} onClick={() => setShowOlder((v) => !v)}>
                            {showOlder ? "ซ่อนการส่งก่อนหน้า" : `ดูการส่งก่อนหน้า (${group.older.length})`}
                        </button>
                        {showOlder && (
                            <ol className="sx-versions">
                                {group.older.map((o) => (
                                    <li key={o.documentId}>
                                        <strong>ครั้งที่ {o.versionNo}</strong> · {formatDateTime(o.uploadedAt)} · {DOC_STATUS[o.status]?.label || o.status}
                                        {o.remark && <> · เหตุผล: {o.remark}</>}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </>
                )}
            </div>
            <Chip status={r.status} />
        </li>
    );
}

function DocumentList({ detail }) {
    const groups = useMemo(() => groupSubmissions(detail?.documentSubmissions), [detail]);
    const missing = (detail?.requiredDocuments || []).filter((d) => d.status === "ยังไม่อัปโหลด");
    const approved = groups.filter((g) => g.latest.status === "APPROVED").length;
    const total = groups.length + missing.length;

    return (
        <div>
            <div className="sx-panel-head">
                <h3 className="sx-h3">เอกสาร</h3>
                {total > 0 && <span className="sx-sub">ผ่านแล้ว {approved} จาก {total} รายการ</span>}
            </div>

            {total === 0 ? (
                <div className="sx-empty">ยังไม่มีการส่งเอกสาร</div>
            ) : (
                <ul className="sx-docs">
                    {missing.map((d) => (
                        <li key={`m-${d.requirementId}`} className="sx-doc">
                            <div className="sx-doc-main">
                                <div className="sx-doc-name">{d.documentType}</div>
                                <div className="sx-doc-meta">ยังไม่ได้แนบไฟล์</div>
                            </div>
                            <Chip status="MISSING" />
                        </li>
                    ))}
                    {groups.map((g) => <DocumentRow key={g.name} group={g} />)}
                </ul>
            )}
        </div>
    );
}

function Timeline({ detail }) {
    const items = useMemo(() => buildTimeline(detail), [detail]);
    return (
        <div>
            <h3 className="sx-h3">ประวัติสถานะ</h3>
            {items.length === 0 ? (
                <div className="sx-empty" style={{ marginTop: 10 }}>ยังไม่มีประวัติ</div>
            ) : (
                <ol className="sx-tl">
                    {items.map((ev) => (
                        <li key={ev.key}>
                            <span className="sx-tl-dot" style={{ background: ev.tone === "bad" ? C.red : C.green }} />
                            <div className="sx-tl-title">{ev.title}</div>
                            <div className="sx-tl-at">{formatDateTime(ev.at)}</div>
                            {ev.note && <div className="sx-tl-note">{ev.note}</div>}
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}

function DetailBody({ detail }) {
    if (!detail) return <div className="sx-skel" style={{ height: 120 }} />;
    return (
        <div className="sx-detail">
            <DocumentList detail={detail} />
            <Timeline detail={detail} />
        </div>
    );
}

function HistoryItem({ app, detail, onOpen, defaultOpen = false }) {
    const [open, setOpen] = useState(Boolean(defaultOpen));
    const id = app.application_id;

    useEffect(() => {
        if (open) onOpen(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, id]);

    return (
        <div className="sx-app">
            <button type="button" className="sx-app-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sx-app-title">ปีการศึกษา {app.academic_year} เทอม {app.semester}</div>
                    <div className="sx-sub" style={{ fontSize: ".82rem", marginTop: 2 }}>
                        {app.loan_type_name} · ยื่นเมื่อ {formatDate(app.submitted_at || app.created_at)} · {STATUS_TH[app.application_status] || app.application_status}
                    </div>
                </div>
                <IconChevron open={open} />
            </button>
            {open && (
                <div className="sx-app-body">
                    <DetailBody detail={detail} />
                </div>
            )}
        </div>
    );
}

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
        if (typeof nav === "function") nav(pageKey);
        else window.location.assign(`/${pageKey}`);
    };

    const selectedApp = apps.find((a) => String(a.application_id) === String(applicationId));
    const selectedDetail = details[applicationId];
    const status = selectedApp?.application_status;
    const docsComplete = selectedDetail?.requiredDocuments
        ? selectedDetail.requiredDocuments.every((d) => d.status !== "ยังไม่อัปโหลด")
        : null;
    const progress = getProgress(status, docsComplete);
    const revisionDocs = (selectedDetail?.requiredDocuments || []).filter(
        (d) => d.status === "REVISION_REQUIRED" || d.status === "REJECTED",
    );
    const next = nextStepOf(status, docsComplete, revisionDocs.length);

    // คำขออื่น (ไม่รวมคำขอปัจจุบันที่แสดงด้านบนแล้ว)
    const others = useMemo(
        () => apps.filter((a) => String(a.application_id) !== String(applicationId)),
        [apps, applicationId],
    );
    const years = useMemo(() => [...new Set(others.map((a) => a.academic_year))].sort().reverse(), [others]);
    const loanTypes = useMemo(() => [...new Set(others.map((a) => a.loan_type_name))], [others]);
    const filtered = others.filter((a) =>
        (yearFilter === "ALL" || a.academic_year === yearFilter) &&
        (loanFilter === "ALL" || a.loan_type_name === loanFilter));
    const currentList = filtered.filter((a) => !DONE_STATUSES.includes(a.application_status));
    const doneList = filtered.filter((a) => DONE_STATUSES.includes(a.application_status));
    const shownList = tab === "current" ? currentList : doneList;

    const shell = (children) => (
        <main className="sx">
            <style>{css}</style>
            {children}
        </main>
    );

    if (!applicationId) {
        return shell(
            <div className="sx-panel" style={{ textAlign: "center", padding: 36 }}>
                <h1 style={{ fontSize: "1.3rem", marginBottom: 8 }}>ยังไม่มีคำขอกู้ยืม</h1>
                <p className="sx-sub" style={{ margin: "0 0 18px" }}>ยื่นคำขอกู้ยืมเงิน กยศ. แล้วติดตามความคืบหน้าได้ที่หน้านี้</p>
                <button type="button" className="sx-cta" style={{ marginTop: 0 }} onClick={() => goToPage("eligibility")}>
                    ไปหน้าคำขอกู้ยืมเงิน กยศ.
                </button>
            </div>,
        );
    }

    if (load.status === "loading") {
        return shell(
            <div aria-busy="true" aria-label="กำลังโหลดสถานะ" style={{ display: "grid", gap: 20 }}>
                <div className="sx-skel" style={{ height: 300, borderRadius: 22 }} />
                <div className="sx-skel" style={{ height: 260 }} />
            </div>,
        );
    }

    if (load.status === "error") {
        return shell(
            <div className="sx-panel" style={{ textAlign: "center", padding: 36 }}>
                <h1 style={{ fontSize: "1.3rem", marginBottom: 8 }}>โหลดสถานะไม่สำเร็จ</h1>
                <p className="sx-sub" style={{ margin: "0 0 18px" }}>{load.message}</p>
                <button type="button" className="sx-cta" style={{ marginTop: 0 }} onClick={retry}>ลองใหม่</button>
            </div>,
        );
    }

    return shell(
        <>
            {/* ---------- ขั้นถัดไป + ความคืบหน้า ---------- */}
            <section className="sx-hero" aria-labelledby="sx-next-title">
                <div className="sx-hero-top">
                    <div style={{ minWidth: 0, flex: "1 1 360px" }}>
                        <p className="sx-kicker">
                            {progress.mode === "done" || progress.mode === "cancelled" || progress.mode === "failed"
                                ? "สถานะคำขอ"
                                : "สิ่งที่ต้องทำต่อไป"}
                        </p>
                        <h1 id="sx-next-title" className="sx-next">{next.title}</h1>
                        {next.text && <p className="sx-next-text">{next.text}</p>}
                        {next.cta && (
                            <button type="button" className={`sx-cta ${next.cta.tone === "amber" ? "is-amber" : ""}`}
                                onClick={() => goToPage(next.cta.page)}>
                                {next.cta.label}
                            </button>
                        )}
                    </div>

                    {selectedApp && (
                        <dl className="sx-meta">
                            <div>
                                <dt>ภาคการศึกษา</dt>
                                <dd>ปีการศึกษา {selectedApp.academic_year} เทอม {selectedApp.semester}</dd>
                            </div>
                            <div>
                                <dt>ประเภทผู้กู้</dt>
                                <dd>{selectedApp.loan_type_name}</dd>
                            </div>
                            <div>
                                <dt>สถานะล่าสุด</dt>
                                <dd>{STATUS_TH[status] || status || "-"}</dd>
                            </div>
                        </dl>
                    )}
                </div>

                <ol className="sx-rail" aria-label="ความคืบหน้าคำขอ">
                    {STEPS.map((step) => {
                        const state = stepState(step.n, progress);
                        return (
                            <li key={step.n} className={`sx-node is-${state}`} aria-current={state === "active" ? "step" : undefined}>
                                <span className="sx-dot">
                                    {state === "done" ? <IconCheck /> : state === "failed" ? <IconCross /> : step.n}
                                </span>
                                <span className="sx-lbl">{step.label}</span>
                            </li>
                        );
                    })}
                </ol>
            </section>

            {/* ---------- เอกสารที่ต้องแก้ไข ---------- */}
            {revisionDocs.length > 0 && (
                <section role="alert" className="sx-panel" style={{ borderColor: "#F2D49A", background: C.amberBg }}>
                    <h2 className="sx-h2" style={{ color: C.amber }}>เอกสารที่ต้องแก้ไข {revisionDocs.length} รายการ</h2>
                    <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
                        {revisionDocs.map((d) => (
                            <li key={d.requirementId} style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", fontSize: ".88rem" }}>
                                <div style={{ fontWeight: 700 }}>{d.documentType}</div>
                                {d.note && <div style={{ color: C.red, marginTop: 3 }}>เหตุผล: {d.note}</div>}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* ---------- รายละเอียดคำขอปัจจุบัน ---------- */}
            <section className="sx-panel">
                <h2 className="sx-h2" style={{ marginBottom: 14 }}>รายละเอียดคำขอปัจจุบัน</h2>
                {selectedApp ? (
                    <HistoryItem app={selectedApp} detail={selectedDetail} onOpen={loadDetail} defaultOpen />
                ) : (
                    <DetailBody detail={selectedDetail} />
                )}
            </section>

            {/* ---------- คำขอย้อนหลัง ---------- */}
            <section className="sx-panel">
                <h2 className="sx-h2">คำขอกู้ยืมที่สำเร็จแล้ว</h2>

                {others.length === 0 ? (
                    <div className="sx-empty" style={{ marginTop: 14 }}>ยังไม่มีคำขอในภาคการศึกษาอื่น</div>
                ) : (
                    <>
                        <div role="tablist" className="sx-tabs">
                            {[
                                { key: "current", label: "กำลังดำเนินการ", count: currentList.length },
                                { key: "done", label: "สำเร็จแล้ว", count: doneList.length },
                            ].map((t) => (
                                <button key={t.key} type="button" role="tab" className="sx-tab"
                                    aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
                                    {t.label} ({t.count})
                                </button>
                            ))}
                        </div>

                        {(years.length > 1 || loanTypes.length > 1) && (
                            <div className="sx-filters">
                                <label>
                                    ปีการศึกษา
                                    <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                                        <option value="ALL">ทั้งหมด</option>
                                        {years.map((y) => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </label>
                                <label>
                                    ประเภทผู้กู้
                                    <select value={loanFilter} onChange={(e) => setLoanFilter(e.target.value)}>
                                        <option value="ALL">ทั้งหมด</option>
                                        {loanTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </label>
                            </div>
                        )}

                        {shownList.length === 0 ? (
                            <div className="sx-empty">
                                {tab === "current" ? "ไม่มีคำขออื่นที่กำลังดำเนินการ" : "ยังไม่มีคำขอที่สำเร็จแล้ว"}
                            </div>
                        ) : (
                            <div>
                                {shownList.map((app) => (
                                    <HistoryItem key={app.application_id} app={app}
                                        detail={details[app.application_id]} onOpen={loadDetail} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </section>
        </>,
    );
}

export default Status;