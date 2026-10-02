import { useMemo, useState } from "react";
import * as XLSX from "xlsx"; // ติดตั้งด้วย: npm install xlsx

/* ---------- ข้อมูลตัวอย่าง (เปลี่ยนเป็นข้อมูลจาก API ภายหลัง) ---------- */

const STATUS = {
    approved: { label: "ผ่านการตรวจสอบ", short: "ผ่าน", bar: "bg-emerald-500", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
    pending: { label: "รอตรวจสอบ", short: "รอตรวจ", bar: "bg-amber-400", dot: "bg-amber-400", badge: "bg-amber-50 text-amber-800 ring-amber-600/20" },
    revise: { label: "ส่งกลับแก้ไข", short: "แก้ไข", bar: "bg-rose-500", dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700 ring-rose-600/20" },
    missing: { label: "ยังไม่ส่งเอกสาร", short: "ยังไม่ส่ง", bar: "bg-slate-300", dot: "bg-slate-300", badge: "bg-slate-100 text-slate-600 ring-slate-500/20" },
};
const STATUS_KEYS = Object.keys(STATUS);

const FACULTIES = [
    { name: "วิศวกรรมศาสตร์", approved: 212, pending: 48, revise: 21, missing: 19 },
    { name: "วิทยาศาสตร์และเทคโนโลยี", approved: 168, pending: 52, revise: 30, missing: 25 },
    { name: "บริหารธุรกิจ", approved: 190, pending: 37, revise: 18, missing: 40 },
    { name: "ศึกษาศาสตร์", approved: 121, pending: 29, revise: 12, missing: 14 },
    { name: "มนุษยศาสตร์และสังคมศาสตร์", approved: 96, pending: 33, revise: 27, missing: 31 },
];

const REASONS = [
    { text: "สำเนาบัตรประชาชนไม่ชัดเจน", count: 26 },
    { text: "ลายมือชื่อผู้ปกครองไม่ครบ", count: 21 },
    { text: "ใบรับรองรายได้หมดอายุ", count: 17 },
    { text: "ข้อมูลไม่ตรงกับแบบฟอร์ม", count: 12 },
    { text: "ไฟล์เปิดไม่ได้", count: 5 },
];

const ROWS = [
    { id: "6501234501", name: "สมชาย ใจดี", faculty: "วิศวกรรมศาสตร์", status: "approved", date: "24 ก.ย. 2569", note: "-" },
    { id: "6501234502", name: "วิภา รักเรียน", faculty: "บริหารธุรกิจ", status: "revise", date: "24 ก.ย. 2569", note: "ใบรับรองรายได้หมดอายุ" },
    { id: "6501234503", name: "ธนกร แสงทอง", faculty: "วิทยาศาสตร์และเทคโนโลยี", status: "pending", date: "25 ก.ย. 2569", note: "-" },
    { id: "6501234504", name: "พิมพ์ชนก สุขใจ", faculty: "ศึกษาศาสตร์", status: "approved", date: "23 ก.ย. 2569", note: "-" },
    { id: "6501234505", name: "อนุชา พงษ์ไพร", faculty: "มนุษยศาสตร์และสังคมศาสตร์", status: "missing", date: "-", note: "ยังไม่ส่งเอกสาร" },
    { id: "6501234506", name: "กมลชนก เจริญผล", faculty: "วิศวกรรมศาสตร์", status: "revise", date: "26 ก.ย. 2569", note: "สำเนาบัตรประชาชนไม่ชัดเจน" },
    { id: "6501234507", name: "ปฏิภาณ ศรีสุข", faculty: "บริหารธุรกิจ", status: "pending", date: "27 ก.ย. 2569", note: "-" },
    { id: "6501234508", name: "ณัฐธิดา บุญมา", faculty: "วิทยาศาสตร์และเทคโนโลยี", status: "approved", date: "22 ก.ย. 2569", note: "-" },
];

const nf = (n) => n.toLocaleString("th-TH");

/* ---------- ส่วนประกอบย่อย ---------- */

function StackedBar({ counts, className = "h-4" }) {
    const total = STATUS_KEYS.reduce((s, k) => s + counts[k], 0) || 1;
    return (
        <div className={`flex w-full overflow-hidden rounded-full bg-slate-100 ${className}`} role="img"
            aria-label={STATUS_KEYS.map((k) => `${STATUS[k].short} ${counts[k]}`).join(" ")}>
            {STATUS_KEYS.map((k) => (
                <div key={k} className={`${STATUS[k].bar} h-full`} style={{ width: `${(counts[k] / total) * 100}%` }} />
            ))}
        </div>
    );
}

function StatusBadge({ status }) {
    const s = STATUS[status];
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {s.short}
        </span>
    );
}

/* ---------- หน้าหลัก ---------- */

function StaffReport() {
    const [faculty, setFaculty] = useState("ทั้งหมด");
    const [statusFilter, setStatusFilter] = useState("all");
    const [query, setQuery] = useState("");

    const totals = useMemo(() => {
        const list = faculty === "ทั้งหมด" ? FACULTIES : FACULTIES.filter((f) => f.name === faculty);
        const t = { approved: 0, pending: 0, revise: 0, missing: 0 };
        list.forEach((f) => STATUS_KEYS.forEach((k) => (t[k] += f[k])));
        return t;
    }, [faculty]);

    const grand = STATUS_KEYS.reduce((s, k) => s + totals[k], 0);
    const submitted = grand - totals.missing;
    const checked = totals.approved + totals.revise;
    const checkedPct = submitted ? Math.round((checked / submitted) * 100) : 0;

    const rows = useMemo(() => {
        const q = query.trim();
        return ROWS.filter(
            (r) =>
                (faculty === "ทั้งหมด" || r.faculty === faculty) &&
                (statusFilter === "all" || r.status === statusFilter) &&
                (!q || r.name.includes(q) || r.id.includes(q))
        );
    }, [faculty, statusFilter, query]);

    // ส่งออกเป็น Excel (.xlsx) 4 ชีต ตามคณะที่เลือกอยู่ในขณะนั้น
    const exportExcel = () => {
        const today = new Date().toLocaleDateString("th-TH", { dateStyle: "long" });
        const facList = faculty === "ทั้งหมด" ? FACULTIES : FACULTIES.filter((f) => f.name === faculty);

        const summary = [
            ["รายงานผลการตรวจสอบเอกสารนักศึกษาผู้กู้ยืม"],
            [`คณะ: ${faculty}`],
            [`วันที่ออกรายงาน: ${today}`],
            [],
            ["สถานะ", "จำนวน (ราย)", "ร้อยละ"],
            ...STATUS_KEYS.map((k) => [STATUS[k].label, totals[k], grand ? Number(((totals[k] / grand) * 100).toFixed(1)) : 0]),
            ["รวมทั้งหมด", grand, 100],
        ];

        const byFaculty = [
            ["คณะ", "ผ่านการตรวจสอบ", "รอตรวจสอบ", "ส่งกลับแก้ไข", "ยังไม่ส่งเอกสาร", "รวม", "ร้อยละที่ผ่าน"],
            ...facList.map((f) => {
                const total = STATUS_KEYS.reduce((s, k) => s + f[k], 0);
                return [f.name, f.approved, f.pending, f.revise, f.missing, total, Number(((f.approved / total) * 100).toFixed(1))];
            }),
        ];

        const reasons = [["สาเหตุที่ส่งกลับแก้ไข", "จำนวน (ราย)"], ...REASONS.map((r) => [r.text, r.count])];

        const students = [
            ["รหัสนักศึกษา", "ชื่อ-สกุล", "คณะ", "สถานะ", "วันที่ส่ง", "หมายเหตุ"],
            ...rows.map((r) => [r.id, r.name, r.faculty, STATUS[r.status].label, r.date, r.note]),
        ];

        const sheet = (data, widths) => {
            const ws = XLSX.utils.aoa_to_sheet(data);
            ws["!cols"] = widths.map((wch) => ({ wch }));
            return ws;
        };

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, sheet(summary, [28, 14, 10]), "สรุปภาพรวม");
        XLSX.utils.book_append_sheet(wb, sheet(byFaculty, [30, 16, 14, 14, 16, 8, 14]), "แยกตามคณะ");
        XLSX.utils.book_append_sheet(wb, sheet(reasons, [36, 14]), "สาเหตุส่งกลับ");
        XLSX.utils.book_append_sheet(wb, sheet(students, [16, 24, 28, 18, 14, 32]), "รายชื่อนักศึกษา");

        const stamp = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `รายงานผลการตรวจสอบเอกสาร_${stamp}.xlsx`);
    };

    const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5bff] focus-visible:ring-offset-2";

    return (
        <main className="min-h-screen bg-[#eef5ff] px-5 py-8 text-[#07116f] sm:px-8 lg:px-10">
            <div className="mx-auto w-full max-w-[1600px] space-y-6">
                {/* หัวหน้า */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-black sm:text-3xl">รายงาน</h1>
                        <p className="mt-2 text-sm text-gray-500 sm:text-base">
                            สรุปภาพรวมและผลการตรวจสอบเอกสารของนักศึกษาผู้กู้ยืม
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="sr-only" htmlFor="faculty">เลือกคณะ</label>
                        <select id="faculty" value={faculty} onChange={(e) => setFaculty(e.target.value)}
                            className={`rounded-xl border border-[#c9d8f5] bg-white px-4 py-2.5 text-sm font-semibold ${focus}`}>
                            <option>ทั้งหมด</option>
                            {FACULTIES.map((f) => <option key={f.name}>{f.name}</option>)}
                        </select>
                        <button onClick={exportExcel}
                            className={`rounded-xl bg-[#07116f] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0c1a9a] ${focus}`}>
                            ส่งออก Excel
                        </button>
                    </div>
                </div>

                {/* ภาพรวมสถานะ: แถบเดียวที่บอกทั้งหมด */}
                <section className="rounded-2xl bg-white p-6 sm:p-8">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                        <p className="text-sm font-semibold text-gray-500">ผู้กู้ยืมทั้งหมด</p>
                        <p className="text-sm text-gray-500">
                            ตรวจเสร็จแล้ว {checkedPct}% ของเอกสารที่ส่งมา ({nf(checked)} จาก {nf(submitted)} ราย)
                        </p>
                    </div>
                    <p className="mt-1 text-5xl font-black tabular-nums sm:text-6xl">
                        {nf(grand)} <span className="text-xl font-bold text-gray-500 sm:text-2xl">ราย</span>
                    </p>
                    <div className="mt-6"><StackedBar counts={totals} className="h-5" /></div>

                    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {STATUS_KEYS.map((k) => {
                            const active = statusFilter === k;
                            return (
                                <button key={k} aria-pressed={active}
                                    onClick={() => setStatusFilter(active ? "all" : k)}
                                    className={`rounded-xl border p-4 text-left transition-colors ${focus} ${active ? "border-[#07116f] bg-[#eef5ff]" : "border-[#dbe6fb] hover:bg-[#f6f9ff]"}`}>
                                    <span className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                                        <span className={`h-2.5 w-2.5 rounded-full ${STATUS[k].dot}`} />
                                        {STATUS[k].label}
                                    </span>
                                    <span className="mt-2 block text-3xl font-black tabular-nums">{nf(totals[k])}</span>
                                    <span className="text-xs text-gray-500">{grand ? Math.round((totals[k] / grand) * 100) : 0}% ของทั้งหมด</span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* แยกตามคณะ + เหตุผลที่ส่งกลับ */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <section className="rounded-2xl bg-white p-6 sm:p-8 lg:col-span-2">
                        <h2 className="text-lg font-black">สถานะแยกตามคณะ</h2>
                        <ul className="mt-5 space-y-5">
                            {FACULTIES.map((f) => {
                                const total = STATUS_KEYS.reduce((s, k) => s + f[k], 0);
                                const dim = faculty !== "ทั้งหมด" && faculty !== f.name;
                                return (
                                    <li key={f.name} className={dim ? "opacity-40" : ""}>
                                        <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
                                            <span className="font-bold">{f.name}</span>
                                            <span className="tabular-nums text-gray-500">
                                                ผ่าน {Math.round((f.approved / total) * 100)}% · {nf(total)} ราย
                                            </span>
                                        </div>
                                        <StackedBar counts={f} className="h-3" />
                                    </li>
                                );
                            })}
                        </ul>
                    </section>

                    <section className="rounded-2xl bg-white p-6 sm:p-8">
                        <h2 className="text-lg font-black">สาเหตุที่ส่งกลับแก้ไข</h2>
                        <p className="mt-1 text-sm text-gray-500">เรียงจากที่พบบ่อยที่สุด</p>
                        <ul className="mt-5 space-y-4">
                            {REASONS.map((r) => (
                                <li key={r.text}>
                                    <div className="flex items-baseline justify-between gap-3 text-sm">
                                        <span className="font-semibold">{r.text}</span>
                                        <span className="font-black tabular-nums">{r.count}</span>
                                    </div>
                                    <div className="mt-1.5 h-2 rounded-full bg-rose-50">
                                        <div className="h-2 rounded-full bg-rose-500" style={{ width: `${(r.count / REASONS[0].count) * 100}%` }} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>

                {/* ตารางรายชื่อ */}
                <section className="rounded-2xl bg-white p-6 sm:p-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <h2 className="text-lg font-black">รายชื่อนักศึกษา</h2>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="flex flex-wrap gap-2" role="group" aria-label="กรองตามสถานะ">
                                {[["all", "ทั้งหมด"], ...STATUS_KEYS.map((k) => [k, STATUS[k].short])].map(([k, label]) => (
                                    <button key={k} aria-pressed={statusFilter === k} onClick={() => setStatusFilter(k)}
                                        className={`rounded-full px-4 py-1.5 text-sm font-semibold ${focus} ${statusFilter === k ? "bg-[#07116f] text-white" : "bg-[#eef5ff] hover:bg-[#dfeaff]"}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                                placeholder="ค้นหาชื่อหรือรหัสนักศึกษา" aria-label="ค้นหานักศึกษา"
                                className={`w-full rounded-xl border border-[#c9d8f5] px-4 py-2 text-sm sm:w-64 ${focus}`} />
                        </div>
                    </div>

                    <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-[#dbe6fb] text-gray-500">
                                    <th className="py-3 pr-4 font-semibold">รหัสนักศึกษา</th>
                                    <th className="py-3 pr-4 font-semibold">ชื่อ-สกุล</th>
                                    <th className="py-3 pr-4 font-semibold">คณะ</th>
                                    <th className="py-3 pr-4 font-semibold">สถานะ</th>
                                    <th className="py-3 pr-4 font-semibold">วันที่ส่ง</th>
                                    <th className="py-3 font-semibold">หมายเหตุ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr key={r.id} className="border-b border-[#eef2fb] last:border-0 hover:bg-[#f6f9ff]">
                                        <td className="py-3.5 pr-4 tabular-nums">{r.id}</td>
                                        <td className="py-3.5 pr-4 font-bold">{r.name}</td>
                                        <td className="py-3.5 pr-4">{r.faculty}</td>
                                        <td className="py-3.5 pr-4"><StatusBadge status={r.status} /></td>
                                        <td className="py-3.5 pr-4 tabular-nums">{r.date}</td>
                                        <td className="py-3.5 text-gray-600">{r.note}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {rows.length === 0 && (
                            <div className="py-12 text-center">
                                <p className="font-bold">ไม่พบรายชื่อที่ตรงกับเงื่อนไข</p>
                                <button onClick={() => { setStatusFilter("all"); setQuery(""); setFaculty("ทั้งหมด"); }}
                                    className={`mt-3 rounded-xl bg-[#eef5ff] px-4 py-2 text-sm font-semibold hover:bg-[#dfeaff] ${focus}`}>
                                    ล้างตัวกรอง
                                </button>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}

export default StaffReport;