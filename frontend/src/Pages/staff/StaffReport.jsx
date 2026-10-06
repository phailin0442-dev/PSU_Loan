import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { fetchStaffReport } from "../../services/api";

/*
|--------------------------------------------------------------------------
| หน้ารายงาน — ข้อมูลจริงจาก GET /api/staff/report
|--------------------------------------------------------------------------
| - เลือกภาคเรียน (ค่าเริ่มต้น = ภาคล่าสุด) และคณะ
| - สรุปสถานะ 4 กลุ่ม, แยกตามคณะ, เอกสารที่ถูกส่งกลับบ่อย, รายชื่อนักศึกษา
| - ส่งออก Excel ตามตัวกรองที่เลือกอยู่
|--------------------------------------------------------------------------
*/

const STATUS = {
    approved: { label: "ผ่านการตรวจสอบ", short: "ผ่าน", bar: "bg-emerald-500", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
    pending: { label: "รอตรวจสอบ", short: "รอตรวจ", bar: "bg-amber-400", dot: "bg-amber-400", badge: "bg-amber-50 text-amber-800 ring-amber-600/20" },
    revise: { label: "ส่งกลับแก้ไข", short: "แก้ไข", bar: "bg-rose-500", dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700 ring-rose-600/20" },
    missing: { label: "ยังส่งเอกสารไม่ครบ", short: "ยังไม่ครบ", bar: "bg-slate-300", dot: "bg-slate-300", badge: "bg-slate-100 text-slate-600 ring-slate-500/20" },
};
const STATUS_KEYS = Object.keys(STATUS);
const ALL_FACULTIES = "ทั้งหมด";
const PAGE_SIZE = 50;

const nf = (n) => Number(n || 0).toLocaleString("th-TH");
const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
const emptyCounts = () => ({ approved: 0, pending: 0, revise: 0, missing: 0 });

const termKey = (t) => (t ? `${t.academicYear}-${t.semester}` : "all");
const termLabel = (t) => (t ? `ภาคเรียนที่ ${t.semester}/${t.academicYear}` : "ทุกภาคเรียน");

function formatDate(iso) {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

/* ---------- ส่วนประกอบย่อย ---------- */

function StackedBar({ counts, className = "h-4" }) {
    const total = STATUS_KEYS.reduce((s, k) => s + counts[k], 0);
    return (
        <div
            className={`flex w-full overflow-hidden rounded-full bg-slate-100 ${className}`}
            role="img"
            aria-label={STATUS_KEYS.map((k) => `${STATUS[k].short} ${counts[k]}`).join(" ")}
        >
            {total > 0 &&
                STATUS_KEYS.map((k) => (
                    <div key={k} className={`${STATUS[k].bar} h-full`} style={{ width: `${(counts[k] / total) * 100}%` }} />
                ))}
        </div>
    );
}

function StatusBadge({ status }) {
    const s = STATUS[status];
    return (
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {s.short}
        </span>
    );
}

// สีของแต่ละชิ้นในกราฟวงกลม (ชิ้นสุดท้ายสีเทาสำหรับ "อื่น ๆ")
const PIE_COLORS = ["#E31C79", "#0646ff", "#f59e0b", "#10b981", "#8b5cf6", "#06b6d4"];
const PIE_OTHER_COLOR = "#cbd5e1";
const PIE_MAX_SLICES = 5;

// รวมรายการที่เกิน 5 อันดับเป็น "อื่น ๆ"
function toSlices(items) {
    const sorted = [...items].sort((a, b) => b.count - a.count);
    const top = sorted.slice(0, PIE_MAX_SLICES).map((it, i) => ({ ...it, color: PIE_COLORS[i] }));
    const rest = sorted.slice(PIE_MAX_SLICES);
    if (rest.length) {
        top.push({
            name: `อื่น ๆ (${rest.length} รายการ)`,
            count: rest.reduce((t, it) => t + it.count, 0),
            color: PIE_OTHER_COLOR,
        });
    }
    return top;
}

function PieChart({ items, unit = "ครั้ง", emptyText }) {
    const slices = toSlices(items);
    const total = slices.reduce((t, s) => t + s.count, 0);

    if (total === 0) {
        return <p className="mt-6 rounded-xl bg-[#f6f9ff] px-4 py-10 text-center text-sm text-gray-500">{emptyText}</p>;
    }

    // วาดเป็นวงโดนัทด้วย stroke-dasharray (รองรับกรณีมีชิ้นเดียว 100% ด้วย)
    const size = 160;
    const stroke = 30;
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    let offset = 0;

    return (
        <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <div className="relative shrink-0" style={{ width: size, height: size }}>
                <svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    style={{ transform: "rotate(-90deg)" }}
                    role="img"
                    aria-label={slices.map((s) => `${s.name} ${s.count} ${unit}`).join(", ")}
                >
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
                    {slices.map((s) => {
                        const len = (s.count / total) * circ;
                        const el = (
                            <circle
                                key={s.name}
                                cx={size / 2}
                                cy={size / 2}
                                r={r}
                                fill="none"
                                stroke={s.color}
                                strokeWidth={stroke}
                                strokeDasharray={`${len} ${circ - len}`}
                                strokeDashoffset={-offset}
                            >
                                <title>{`${s.name}: ${nf(s.count)} ${unit} (${pct(s.count, total)}%)`}</title>
                            </circle>
                        );
                        offset += len;
                        return el;
                    })}
                </svg>
                <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
                    <span className="text-3xl font-black tabular-nums">{nf(total)}</span>
                    <span className="text-xs text-gray-500">{unit}</span>
                </div>
            </div>

            <ul className="w-full min-w-0 space-y-2.5">
                {slices.map((s) => (
                    <li key={s.name} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
                        <span className="min-w-0 flex-1 break-words font-semibold">{s.name}</span>
                        <span className="shrink-0 tabular-nums text-gray-500">
                            <span className="font-black text-[#07116f]">{nf(s.count)}</span> ({pct(s.count, total)}%)
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

const REASON_PREVIEW = 6;

function ReasonBars({ items, emptyText }) {
    const [showAll, setShowAll] = useState(false);
    const sorted = [...items].sort((a, b) => b.count - a.count);
    const total = sorted.reduce((t, it) => t + it.count, 0);

    if (total === 0) {
        return <p className="mt-6 rounded-xl bg-[#f6f9ff] px-4 py-10 text-center text-sm text-gray-500">{emptyText}</p>;
    }

    const max = sorted[0].count;
    const list = showAll ? sorted : sorted.slice(0, REASON_PREVIEW);
    const hidden = sorted.length - list.length;

    return (
        <>
            <ol className="mt-5 space-y-4">
                {list.map((r, i) => (
                    <li key={r.name}>
                        <div className="flex items-start justify-between gap-3 text-sm">
                            <span className="flex min-w-0 gap-2">
                                <span className="w-5 shrink-0 text-right font-black tabular-nums text-gray-400">{i + 1}.</span>
                                <span className="min-w-0 break-words font-semibold">{r.name}</span>
                            </span>
                            <span className="shrink-0 tabular-nums text-gray-500">
                                <span className="font-black text-[#07116f]">{nf(r.count)}</span> ครั้ง
                            </span>
                        </div>
                        <div className="ml-7 mt-1.5 h-2.5 rounded-full bg-rose-50">
                            <div className="h-2.5 rounded-full bg-rose-500" style={{ width: `${(r.count / max) * 100}%` }} />
                        </div>
                    </li>
                ))}
            </ol>
            {(hidden > 0 || showAll) && sorted.length > REASON_PREVIEW && (
                <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="mt-5 w-full rounded-xl bg-[#f6f9ff] px-4 py-2.5 text-sm font-bold hover:bg-[#eaf1ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5bff]"
                >
                    {showAll ? "แสดงน้อยลง" : `ดูทั้งหมด (อีก ${nf(hidden)} เหตุผล)`}
                </button>
            )}
        </>
    );
}

function Skeleton() {
    return (
        <div className="space-y-6" aria-busy="true" aria-label="กำลังโหลดรายงาน">
            <div className="h-64 animate-pulse rounded-2xl bg-white/70" />
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="h-72 animate-pulse rounded-2xl bg-white/70 lg:col-span-2" />
                <div className="h-72 animate-pulse rounded-2xl bg-white/70" />
            </div>
        </div>
    );
}

/* ---------- หน้าหลัก ---------- */

function StaffReport() {
    // null = ให้ backend เลือกภาคล่าสุด, "all" = ทุกภาค, "2569-1" = ภาคที่เลือก
    const [requestKey, setRequestKey] = useState(null);
    const [reloadTick, setReloadTick] = useState(0);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [faculty, setFaculty] = useState(ALL_FACULTIES);
    const [statusFilter, setStatusFilter] = useState("all");
    const [query, setQuery] = useState("");
    const [visible, setVisible] = useState(PAGE_SIZE);

    useEffect(() => {
        let cancelled = false;

        let params = {};
        if (requestKey === "all") params = { scope: "all" };
        else if (requestKey) {
            const [academicYear, semester] = requestKey.split("-");
            params = { academicYear, semester };
        }

        fetchStaffReport(params)
            .then((result) => {
                if (cancelled) return;
                setReport(result.data);
                setError("");
            })
            .catch((e) => {
                if (!cancelled) setError(e.message || "โหลดข้อมูลรายงานไม่สำเร็จ");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [requestKey, reloadTick]);

    const changeTerm = (key) => {
        setLoading(true);
        setRequestKey(key);
        setFaculty(ALL_FACULTIES);
        setVisible(PAGE_SIZE);
    };

    const reload = () => {
        setLoading(true);
        setReloadTick((n) => n + 1);
    };

    const allRows = useMemo(() => report?.rows ?? [], [report]);
    const rejectedDocuments = report?.rejectedDocuments ?? [];
    const rejectReasons = report?.rejectReasons ?? [];

    // คณะทั้งหมด + จำนวนแต่ละสถานะ (เรียงจากคณะที่มีผู้กู้มากสุด)
    const faculties = useMemo(() => {
        const map = new Map();
        for (const r of allRows) {
            if (!map.has(r.faculty)) map.set(r.faculty, { name: r.faculty, ...emptyCounts() });
            map.get(r.faculty)[r.status] += 1;
        }
        return [...map.values()]
            .map((f) => ({ ...f, total: STATUS_KEYS.reduce((s, k) => s + f[k], 0) }))
            .sort((a, b) => b.total - a.total);
    }, [allRows]);

    // ถ้าคณะที่เลือกไม่มีในภาคนี้ ถือว่าเลือก "ทั้งหมด"
    const activeFaculty = faculty === ALL_FACULTIES || faculties.some((f) => f.name === faculty) ? faculty : ALL_FACULTIES;

    const facultyRows = useMemo(
        () => (activeFaculty === ALL_FACULTIES ? allRows : allRows.filter((r) => r.faculty === activeFaculty)),
        [allRows, activeFaculty]
    );

    const totals = useMemo(() => {
        const t = emptyCounts();
        facultyRows.forEach((r) => (t[r.status] += 1));
        return t;
    }, [facultyRows]);

    const grand = facultyRows.length;
    const submitted = grand - totals.missing;
    const checked = totals.approved + totals.revise;

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        return facultyRows.filter(
            (r) =>
                (statusFilter === "all" || r.status === statusFilter) &&
                (!q || (r.name || "").toLowerCase().includes(q) || (r.studentCode || "").toLowerCase().includes(q))
        );
    }, [facultyRows, statusFilter, query]);

    const currentTermLabel = termLabel(report?.term);

    const exportExcel = () => {
        const today = new Date().toLocaleDateString("th-TH", { dateStyle: "long" });
        const facList = activeFaculty === ALL_FACULTIES ? faculties : faculties.filter((f) => f.name === activeFaculty);

        const summary = [
            ["รายงานผลการตรวจสอบเอกสารนักศึกษาผู้กู้ยืม"],
            [`ภาคเรียน: ${currentTermLabel}`],
            [`คณะ: ${activeFaculty}`],
            [`วันที่ออกรายงาน: ${today}`],
            [],
            ["สถานะ", "จำนวน (ราย)", "ร้อยละ"],
            ...STATUS_KEYS.map((k) => [STATUS[k].label, totals[k], grand ? Number(((totals[k] / grand) * 100).toFixed(1)) : 0]),
            ["รวมทั้งหมด", grand, grand ? 100 : 0],
        ];

        const byFaculty = [
            ["คณะ", ...STATUS_KEYS.map((k) => STATUS[k].label), "รวม", "ร้อยละที่ผ่าน"],
            ...facList.map((f) => [
                f.name,
                ...STATUS_KEYS.map((k) => f[k]),
                f.total,
                f.total ? Number(((f.approved / f.total) * 100).toFixed(1)) : 0,
            ]),
        ];

        const documentSheet = [["ประเภทเอกสารที่ถูกตีกลับ", "จำนวนครั้ง"], ...rejectedDocuments.map((r) => [r.name, r.count])];
        const reasonSheet = [["เหตุผลที่ถูกตีกลับ", "จำนวนครั้ง"], ...rejectReasons.map((r) => [r.name, r.count])];

        const students = [
            ["รหัสนักศึกษา", "ชื่อ-สกุล", "คณะ", "ประเภทผู้กู้", "ภาคเรียน", "สถานะ", "ส่งเอกสารล่าสุด", "หมายเหตุ"],
            ...rows.map((r) => [r.studentCode, r.name, r.faculty, r.loanType, r.term, STATUS[r.status].label, formatDate(r.submittedAt), r.note]),
        ];

        const sheet = (data, widths) => {
            const ws = XLSX.utils.aoa_to_sheet(data);
            ws["!cols"] = widths.map((wch) => ({ wch }));
            return ws;
        };

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, sheet(summary, [28, 14, 10]), "สรุปภาพรวม");
        XLSX.utils.book_append_sheet(wb, sheet(byFaculty, [30, 16, 14, 14, 18, 8, 14]), "แยกตามคณะ");
        XLSX.utils.book_append_sheet(wb, sheet(documentSheet, [36, 14]), "เอกสารที่ถูกตีกลับ");
        XLSX.utils.book_append_sheet(wb, sheet(reasonSheet, [48, 14]), "เหตุผลที่ถูกตีกลับ");
        XLSX.utils.book_append_sheet(wb, sheet(students, [16, 26, 28, 22, 10, 18, 16, 36]), "รายชื่อนักศึกษา");

        const stamp = new Date().toISOString().slice(0, 10);
        const termPart = report?.term ? `_${report.term.semester}-${report.term.academicYear}` : "_ทุกภาค";
        XLSX.writeFile(wb, `รายงานผลการตรวจสอบเอกสาร${termPart}_${stamp}.xlsx`);
    };

    const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5bff] focus-visible:ring-offset-2";
    const selectedTermValue = requestKey ?? termKey(report?.term);

    return (
        <main className="min-h-screen bg-[#eef5ff] px-5 py-8 text-[#07116f] sm:px-8 lg:px-10">
            <div className="mx-auto w-full max-w-[1600px] space-y-6">
                {/* หัวหน้า */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-black sm:text-3xl">รายงาน</h1>
                        <p className="mt-2 text-sm text-gray-500 sm:text-base">
                            สรุปผลการตรวจสอบเอกสารของนักศึกษาผู้กู้ยืม
                            {report?.generatedAt && (
                                <span className="ml-1 text-gray-400">
                                    (ข้อมูล ณ {new Date(report.generatedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.)
                                </span>
                            )}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <label className="sr-only" htmlFor="report-term">เลือกภาคเรียน</label>
                        <select
                            id="report-term"
                            value={selectedTermValue}
                            onChange={(e) => changeTerm(e.target.value)}
                            disabled={!report}
                            className={`rounded-xl border border-[#c9d8f5] bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${focus}`}
                        >
                            {(report?.terms ?? []).map((t) => (
                                <option key={termKey(t)} value={termKey(t)}>{termLabel(t)}</option>
                            ))}
                            <option value="all">ทุกภาคเรียน</option>
                        </select>

                        <label className="sr-only" htmlFor="report-faculty">เลือกคณะ</label>
                        <select
                            id="report-faculty"
                            value={activeFaculty}
                            onChange={(e) => {
                                setFaculty(e.target.value);
                                setVisible(PAGE_SIZE);
                            }}
                            disabled={!report}
                            className={`max-w-[260px] rounded-xl border border-[#c9d8f5] bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${focus}`}
                        >
                            <option value={ALL_FACULTIES}>ทุกคณะ</option>
                            {faculties.map((f) => (
                                <option key={f.name} value={f.name}>{f.name}</option>
                            ))}
                        </select>

                        <button
                            type="button"
                            onClick={reload}
                            disabled={loading}
                            className={`rounded-xl border border-[#c9d8f5] bg-white px-4 py-2.5 text-sm font-bold hover:bg-[#f6f9ff] disabled:opacity-50 ${focus}`}
                        >
                            {loading ? "กำลังโหลด..." : "รีเฟรช"}
                        </button>

                        <button
                            type="button"
                            onClick={exportExcel}
                            disabled={!report || grand === 0}
                            className={`rounded-xl bg-[#07116f] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0c1a9a] disabled:cursor-not-allowed disabled:bg-[#b9c3e3] ${focus}`}
                        >
                            ส่งออก Excel
                        </button>
                    </div>
                </div>

                {error && (
                    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                        <span className="font-semibold">{error}</span>
                        <button type="button" onClick={reload} className={`rounded-xl bg-white px-4 py-2 font-bold ring-1 ring-rose-200 hover:bg-rose-100 ${focus}`}>
                            ลองใหม่
                        </button>
                    </div>
                )}

                {loading && !report ? (
                    <Skeleton />
                ) : !report ? null : allRows.length === 0 ? (
                    <section className="rounded-2xl bg-white px-6 py-16 text-center">
                        <p className="text-lg font-black">ยังไม่มีคำร้องใน{currentTermLabel}</p>
                        <p className="mt-2 text-sm text-gray-500">เลือกภาคเรียนอื่น หรือรอให้นักศึกษายื่นคำขอกู้ก่อน</p>
                    </section>
                ) : (
                    <div className={`space-y-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
                        {/* ภาพรวม */}
                        <section className="rounded-2xl bg-white p-6 sm:p-8">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                                <p className="text-sm font-semibold text-gray-500">
                                    ผู้กู้ยืม{currentTermLabel}
                                    {activeFaculty !== ALL_FACULTIES && ` คณะ${activeFaculty}`}
                                </p>
                                <p className="text-sm text-gray-500">
                                    ตรวจเสร็จแล้ว {pct(checked, submitted)}% ของคนที่ส่งเอกสารครบ ({nf(checked)} จาก {nf(submitted)} ราย)
                                </p>
                            </div>
                            <p className="mt-1 text-5xl font-black tabular-nums sm:text-6xl">
                                {nf(grand)} <span className="text-xl font-bold text-gray-500 sm:text-2xl">ราย</span>
                            </p>
                            <div className="mt-6">
                                <StackedBar counts={totals} className="h-5" />
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                                {STATUS_KEYS.map((k) => {
                                    const active = statusFilter === k;
                                    return (
                                        <button
                                            key={k}
                                            type="button"
                                            aria-pressed={active}
                                            onClick={() => {
                                                setStatusFilter(active ? "all" : k);
                                                setVisible(PAGE_SIZE);
                                            }}
                                            className={`rounded-xl border p-4 text-left transition-colors ${focus} ${active ? "border-[#07116f] bg-[#eef5ff]" : "border-[#dbe6fb] hover:bg-[#f6f9ff]"}`}
                                        >
                                            <span className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                                                <span className={`h-2.5 w-2.5 rounded-full ${STATUS[k].dot}`} />
                                                {STATUS[k].label}
                                            </span>
                                            <span className="mt-2 block text-3xl font-black tabular-nums">{nf(totals[k])}</span>
                                            <span className="text-xs text-gray-500">{pct(totals[k], grand)}% ของทั้งหมด</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* ซ้าย: สถานะแยกตามคณะ / ขวา: การตีกลับ (ประเภทเอกสาร + เหตุผล) */}
                        <div className="grid items-start gap-6 lg:grid-cols-2">
                            <section className="rounded-2xl bg-white p-6 sm:p-8">
                                <h2 className="text-lg font-black">สถานะแยกตามคณะ</h2>
                                <p className="mt-1 text-sm text-gray-500">กดชื่อคณะเพื่อดูเฉพาะคณะนั้น</p>
                                <ul className="mt-5 space-y-5">
                                    {faculties.map((f) => {
                                        const isActive = activeFaculty === f.name;
                                        const dim = activeFaculty !== ALL_FACULTIES && !isActive;
                                        return (
                                            <li key={f.name} className={dim ? "opacity-40" : ""}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFaculty(isActive ? ALL_FACULTIES : f.name);
                                                        setVisible(PAGE_SIZE);
                                                    }}
                                                    className={`w-full rounded-lg text-left ${focus}`}
                                                >
                                                    <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
                                                        <span className={`font-bold ${isActive ? "underline underline-offset-4" : ""}`}>{f.name}</span>
                                                        <span className="shrink-0 tabular-nums text-gray-500">
                                                            ผ่าน {pct(f.approved, f.total)}% จาก {nf(f.total)} ราย
                                                        </span>
                                                    </div>
                                                    <StackedBar counts={f} className="h-3" />
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>

                            <div className="space-y-6">
                                <section className="rounded-2xl bg-white p-6 sm:p-8">
                                    <h2 className="text-lg font-black">ประเภทเอกสารที่ถูกตีกลับ</h2>
                                    <p className="mt-1 text-sm text-gray-500">นับทุกครั้งที่เจ้าหน้าที่ตีกลับ ใน{currentTermLabel}</p>
                                    <PieChart items={rejectedDocuments} emptyText="ยังไม่มีการตีกลับเอกสาร" />
                                </section>

                                <section className="rounded-2xl bg-white p-6 sm:p-8">
                                    <h2 className="text-lg font-black">เหตุผลที่ถูกตีกลับ</h2>
                                    <p className="mt-1 text-sm text-gray-500">จากหมายเหตุที่เจ้าหน้าที่เขียน เรียงจากที่พบบ่อยที่สุด</p>
                                    <ReasonBars items={rejectReasons} emptyText="ยังไม่มีการตีกลับเอกสาร" />
                                </section>
                            </div>
                        </div>

                        {/* ตารางรายชื่อ */}
                        <section className="rounded-2xl bg-white p-6 sm:p-8">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <h2 className="text-lg font-black">รายชื่อนักศึกษา</h2>
                                    <p className="mt-1 text-sm text-gray-500">พบ {nf(rows.length)} ราย</p>
                                </div>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <div className="flex flex-wrap gap-2" role="group" aria-label="กรองตามสถานะ">
                                        {[["all", "ทั้งหมด"], ...STATUS_KEYS.map((k) => [k, STATUS[k].short])].map(([k, label]) => (
                                            <button
                                                key={k}
                                                type="button"
                                                aria-pressed={statusFilter === k}
                                                onClick={() => {
                                                    setStatusFilter(k);
                                                    setVisible(PAGE_SIZE);
                                                }}
                                                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${focus} ${statusFilter === k ? "bg-[#07116f] text-white" : "bg-[#eef5ff] hover:bg-[#dfeaff]"}`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="search"
                                        value={query}
                                        onChange={(e) => {
                                            setQuery(e.target.value);
                                            setVisible(PAGE_SIZE);
                                        }}
                                        placeholder="ค้นหาชื่อหรือรหัสนักศึกษา"
                                        aria-label="ค้นหานักศึกษา"
                                        className={`w-full rounded-xl border border-[#c9d8f5] px-4 py-2 text-sm sm:w-64 ${focus}`}
                                    />
                                </div>
                            </div>

                            <div className="mt-5 overflow-x-auto">
                                <table className="w-full min-w-[860px] text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-[#dbe6fb] text-gray-500">
                                            <th className="py-3 pr-4 font-semibold">รหัสนักศึกษา</th>
                                            <th className="py-3 pr-4 font-semibold">ชื่อ-สกุล</th>
                                            <th className="py-3 pr-4 font-semibold">คณะ</th>
                                            <th className="py-3 pr-4 font-semibold">ประเภทผู้กู้</th>
                                            <th className="py-3 pr-4 font-semibold">สถานะ</th>
                                            <th className="py-3 pr-4 font-semibold">ส่งเอกสารล่าสุด</th>
                                            <th className="py-3 font-semibold">หมายเหตุ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.slice(0, visible).map((r) => (
                                            <tr key={r.applicationId} className="border-b border-[#eef2fb] last:border-0 hover:bg-[#f6f9ff]">
                                                <td className="py-3.5 pr-4 tabular-nums">{r.studentCode}</td>
                                                <td className="py-3.5 pr-4 font-bold">{r.name}</td>
                                                <td className="py-3.5 pr-4">{r.faculty}</td>
                                                <td className="py-3.5 pr-4 text-gray-600">
                                                    {r.loanType}
                                                    {requestKey === "all" && <span className="ml-1 text-xs text-gray-400">({r.term})</span>}
                                                </td>
                                                <td className="py-3.5 pr-4"><StatusBadge status={r.status} /></td>
                                                <td className="py-3.5 pr-4 tabular-nums">{formatDate(r.submittedAt)}</td>
                                                <td className="max-w-[280px] py-3.5 text-gray-600">{r.note}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {rows.length === 0 && (
                                    <div className="py-12 text-center">
                                        <p className="font-bold">ไม่พบรายชื่อที่ตรงกับเงื่อนไข</p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setStatusFilter("all");
                                                setQuery("");
                                                setFaculty(ALL_FACULTIES);
                                            }}
                                            className={`mt-3 rounded-xl bg-[#eef5ff] px-4 py-2 text-sm font-semibold hover:bg-[#dfeaff] ${focus}`}
                                        >
                                            ล้างตัวกรอง
                                        </button>
                                    </div>
                                )}
                            </div>

                            {rows.length > visible && (
                                <div className="mt-5 text-center">
                                    <button
                                        type="button"
                                        onClick={() => setVisible((v) => v + PAGE_SIZE)}
                                        className={`rounded-xl border border-[#c9d8f5] px-5 py-2.5 text-sm font-bold hover:bg-[#f6f9ff] ${focus}`}
                                    >
                                        แสดงเพิ่ม (เหลืออีก {nf(rows.length - visible)} ราย)
                                    </button>
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}

export default StaffReport;