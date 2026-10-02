import { useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import {
    getBorrowerTypeLabel,
    mapBackendStatusToLabel,
    requiresQualificationCheck,
} from "../../rules/documentRules";
import {
    fetchDocumentHistory,
    fetchStaffStudentDetail,
    reviewDocument,
} from "../../services/api";

/*
|--------------------------------------------------------------------------
| เหตุผลที่ตีกลับ (เลือกได้หลายข้อ + อื่น ๆ พิมพ์เอง)
| ข้อความที่เลือกจะถูกรวมเป็นหมายเหตุเดียว ส่งไปเก็บใน latest_remark
| และนักศึกษาเห็นในหน้า "ติดตามสถานะ"
|--------------------------------------------------------------------------
*/
const REJECT_REASONS = [
    { key: "blurry", label: "ภาพไม่ชัดเจน อ่านข้อความไม่ได้" },
    { key: "incomplete", label: "เอกสารไม่ครบทุกหน้า" },
    { key: "cropped", label: "ภาพถูกตัดขอบ ข้อมูลบางส่วนหายไป" },
    { key: "signature", label: "ไม่มีลายเซ็น หรือลายเซ็นไม่ครบ" },
    { key: "certify", label: "ไม่ได้รับรองสำเนาถูกต้อง" },
    { key: "wrongdoc", label: "ส่งผิดประเภทเอกสาร" },
    {
        key: "mismatch",
        label: "ข้อมูลในเอกสารไม่ตรงกับที่ยื่น (ชื่อ-สกุล / เลขบัตร)",
    },
    { key: "expired", label: "เอกสารหมดอายุ หรือไม่ใช่ฉบับล่าสุด" },
    { key: "format", label: "ไฟล์เปิดไม่ได้ หรือรูปแบบไฟล์ไม่ถูกต้อง" },
    { key: "other", label: "อื่น ๆ (ระบุเอง)" },
];

const AUTO_DECIDED_CODES = ["GPAX_EVIDENCE", "VOLUNTEER_EVIDENCE"];

// สถานะของเอกสารแต่ละใบ (ใช้กำหนดสีกรอบ/ป้าย)
function getDocState(row) {
    if (!row.id) return "missing";
    if (AUTO_DECIDED_CODES.includes(row.documentCode)) return "auto";
    if (row.status === "APPROVED") return "pass";
    if (row.status === "REVISION_REQUIRED" || row.status === "REJECTED") {
        return "revise";
    }
    return "pending";
}

const STATE_UI = {
    pass: {
        label: "ผ่านแล้ว",
        icon: "✓",
        bar: "border-l-green-500",
        badge: "bg-green-100 text-green-700",
        band: "bg-green-600",
        frame: "border-green-300",
    },
    revise: {
        label: "ต้องแก้ไข",
        icon: "✕",
        bar: "border-l-red-500",
        badge: "bg-red-100 text-red-700",
        band: "bg-red-600",
        frame: "border-red-300",
    },
    pending: {
        label: "รอตรวจสอบ",
        icon: "●",
        bar: "border-l-amber-400",
        badge: "bg-amber-100 text-amber-800",
        band: "bg-amber-500",
        frame: "border-amber-300",
    },
    missing: {
        label: "ยังไม่ได้ส่ง",
        icon: "!",
        bar: "border-l-gray-400",
        badge: "bg-gray-200 text-gray-700",
        band: "bg-gray-500",
        frame: "border-gray-300",
    },
    auto: {
        label: "ระบบตรวจอัตโนมัติ",
        icon: "✓",
        bar: "border-l-blue-400",
        badge: "bg-blue-100 text-blue-700",
        band: "bg-blue-600",
        frame: "border-blue-300",
    },
};

function DocumentReview({ student, setPage, onSave }) {
    const { currentUser } = useApp();
    const applicationId = student?.id;

    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    // ผู้ตรวจยึดจากบัญชีที่ login อยู่ตรงๆ
    const staffId = currentUser?.userId;
    const [activeRequirementId, setActiveRequirementId] = useState(null);

    // โหมดตีกลับ: แสดงกรอบเลือกเหตุผล
    const [reviseMode, setReviseMode] = useState(false);
    const [reasonKeys, setReasonKeys] = useState([]);
    const [otherText, setOtherText] = useState("");

    const [actionError, setActionError] = useState("");
    const [savingAction, setSavingAction] = useState(false);
    const [toast, setToast] = useState("");

    const [history, setHistory] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const showToast = (message) => {
        setToast(message);
        setTimeout(() => setToast(""), 3000);
    };

    // advance = true: หลังตรวจเสร็จ เลื่อนไปเอกสารถัดไปที่ยังรอตรวจ
    const loadDetail = async ({ advance = false } = {}) => {
        if (!applicationId) return;

        setLoading(true);
        setLoadError("");

        try {
            const result = await fetchStaffStudentDetail(applicationId);
            const rows = result.data.documents || [];
            setDetail(result.data);

            setActiveRequirementId((current) => {
                const currentIndex = rows.findIndex(
                    (row) => row.requirementId === current
                );

                if (advance && currentIndex >= 0) {
                    const ordered = [
                        ...rows.slice(currentIndex + 1),
                        ...rows.slice(0, currentIndex + 1),
                    ];
                    const next = ordered.find(
                        (row) => getDocState(row) === "pending"
                    );

                    if (next) return next.requirementId;
                }

                if (currentIndex >= 0) return current;

                const firstPending = rows.find(
                    (row) => getDocState(row) === "pending"
                );
                const firstWithFile = rows.find((row) => row.id);

                return (
                    firstPending?.requirementId ??
                    firstWithFile?.requirementId ??
                    rows[0]?.requirementId ??
                    null
                );
            });
        } catch (error) {
            setLoadError(error.message || "โหลดข้อมูลไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // โหลดข้อมูลจาก API เมื่อเปลี่ยนคำร้อง — เป็นกรณีที่ใช้ effect ได้ถูกต้อง
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [applicationId]);

    const requiredRows = useMemo(() => detail?.documents || [], [detail]);

    const activeRow =
        requiredRows.find(
            (row) => row.requirementId === activeRequirementId
        ) || null;

    const activeState = activeRow ? getDocState(activeRow) : null;

    // สรุปจำนวนแต่ละสถานะ ใช้ทำแถบความคืบหน้า
    const counts = useMemo(() => {
        const result = { pass: 0, revise: 0, pending: 0, missing: 0 };

        requiredRows.forEach((row) => {
            const state = getDocState(row);
            if (state === "pass" || state === "auto") result.pass += 1;
            else result[state] += 1;
        });

        return result;
    }, [requiredRows]);

    const totalDocs = requiredRows.length;
    const progressPercent = totalDocs
        ? Math.round((counts.pass / totalDocs) * 100)
        : 0;

    // รีเซ็ตกรอบตีกลับ/ประวัติเมื่อเปลี่ยนเอกสาร — ทำระหว่าง render แทน useEffect
    // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
    const [prevRequirementId, setPrevRequirementId] = useState(
        activeRow?.requirementId
    );

    if (prevRequirementId !== activeRow?.requirementId) {
        setPrevRequirementId(activeRow?.requirementId);
        setReviseMode(false);
        setReasonKeys([]);
        setOtherText("");
        setActionError("");
        setShowHistory(false);
        setHistory(null);
    }

    const toggleReason = (key) => {
        setActionError("");
        setReasonKeys((current) =>
            current.includes(key)
                ? current.filter((item) => item !== key)
                : [...current, key]
        );
    };

    // รวมเหตุผลที่เลือก + ข้อความอื่น ๆ เป็นหมายเหตุเดียว
    const buildNote = () => {
        const parts = REJECT_REASONS.filter(
            (reason) =>
                reason.key !== "other" && reasonKeys.includes(reason.key)
        ).map((reason) => reason.label);

        if (reasonKeys.includes("other") && otherText.trim()) {
            parts.push(otherText.trim());
        }

        return parts.join(" / ");
    };

    const noteDraft = buildNote();

    const submitReview = async (statusLabel, note = "") => {
        if (!activeRow?.id) return;

        const parsedStaffId = Number(staffId);

        if (!Number.isInteger(parsedStaffId) || parsedStaffId <= 0) {
            setActionError(
                "ไม่พบรหัสเจ้าหน้าที่ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่"
            );
            return;
        }

        setActionError("");
        setSavingAction(true);

        try {
            await reviewDocument(applicationId, activeRow.id, {
                status: statusLabel,
                note,
                staffId: parsedStaffId,
            });

            setReviseMode(false);
            setReasonKeys([]);
            setOtherText("");

            await loadDetail({ advance: statusLabel !== "รอตรวจสอบ" });

            showToast(
                statusLabel === "ผ่าน"
                    ? "บันทึกแล้ว: เอกสารผ่าน"
                    : statusLabel === "ต้องแก้ไข"
                        ? "บันทึกแล้ว: ตีกลับให้นักศึกษาแก้ไข"
                        : "รีเซ็ตเป็นรอตรวจสอบแล้ว"
            );
        } catch (error) {
            setActionError(error.message || "บันทึกผลไม่สำเร็จ");
        } finally {
            setSavingAction(false);
        }
    };

    const handleConfirmRevise = () => {
        if (reasonKeys.length === 0) {
            setActionError("กรุณาเลือกเหตุผลที่ตีกลับอย่างน้อย 1 ข้อ");
            return;
        }

        if (reasonKeys.includes("other") && !otherText.trim()) {
            setActionError("กรุณาพิมพ์เหตุผลในช่อง \"อื่น ๆ\"");
            return;
        }

        submitReview("ต้องแก้ไข", noteDraft);
    };

    const handleToggleHistory = async () => {
        if (!activeRow?.requirementId) return;

        if (showHistory) {
            setShowHistory(false);
            return;
        }

        setShowHistory(true);
        setHistoryLoading(true);

        try {
            const result = await fetchDocumentHistory(
                applicationId,
                activeRow.requirementId
            );
            setHistory(result);
        } catch (error) {
            setActionError(error.message || "โหลดประวัติไม่สำเร็จ");
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleSave = () => {
        onSave?.({
            ...student,
            applicationStatus: detail?.status || student?.applicationStatus,
        });
    };

    const checkQualification = requiresQualificationCheck(
        detail?.semester ?? student?.semester
    );

    if (loading && !detail) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#eef5ff]">
                <p className="font-black text-[#07116f]">กำลังโหลดข้อมูล...</p>
            </div>
        );
    }

    if (loadError && !detail) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#eef5ff] px-6">
                <div className="rounded-3xl border-2 border-red-200 bg-white p-8 text-center shadow-sm">
                    <div className="text-5xl">⚠️</div>
                    <p className="mt-4 font-black text-red-600">{loadError}</p>
                    <button
                        type="button"
                        onClick={() => loadDetail()}
                        className="mt-5 rounded-xl bg-[#07116f] px-6 py-3 font-black text-white"
                    >
                        ลองอีกครั้ง
                    </button>
                </div>
            </div>
        );
    }

    const allReviewed =
        totalDocs > 0 &&
        counts.pending === 0 &&
        counts.missing === 0 &&
        counts.revise === 0;

    return (
        <div className="min-h-screen bg-[#eef5ff] pb-10 text-[#07116f]">
            {toast && (
                <div
                    role="status"
                    className="fixed right-5 top-24 z-50 rounded-2xl border-2 border-green-300 bg-white px-5 py-3 font-black text-green-700 shadow-lg"
                >
                    ✓ {toast}
                </div>
            )}

            <header className="sticky top-0 z-40 border-b-2 border-[#07116f]/10 bg-white shadow-sm">
                <div className="flex min-h-20 flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-10">
                    <div>
                        <p className="text-sm font-bold text-blue-500">
                            PSU Smart Loan
                        </p>
                        <h1 className="mt-1 text-2xl font-black">
                            ตรวจสอบข้อมูลและเอกสารนักศึกษา
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="rounded-xl border-2 border-gray-200 px-3 py-2 text-sm">
                            <span className="mr-2 font-bold text-gray-500">
                                ผู้ตรวจ
                            </span>
                            <span className="font-black text-[#07116f]">
                                {currentUser?.fullName || "-"}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => setPage?.("studentList")}
                            className="rounded-xl border-2 border-[#07116f] px-4 py-2.5 font-black hover:bg-blue-50"
                        >
                            ← กลับรายชื่อนักศึกษา
                        </button>
                    </div>
                </div>
            </header>

            <main className="space-y-6 px-5 py-7 sm:px-8 lg:px-10">
                {/* ============ ข้อมูลนักศึกษา ============ */}
                <section className="overflow-hidden rounded-3xl border-2 border-blue-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#07116f] px-6 py-4 text-white">
                        <div>
                            <p className="text-sm font-bold text-blue-200">
                                ข้อมูลนักศึกษา
                            </p>
                            <h2 className="text-2xl font-black">
                                {detail?.fullName || student?.fullName || "-"}
                            </h2>
                            <p className="text-sm text-blue-100">
                                รหัสนักศึกษา{" "}
                                {detail?.studentId || student?.studentId || "-"}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <InfoBadge
                                label={`ภาคเรียนที่ ${detail?.semester || "-"}`}
                            />
                            <InfoBadge
                                label={getBorrowerTypeLabel(
                                    detail?.borrowerCode || detail?.borrowerType
                                )}
                            />
                            <InfoBadge label={`อายุ ${detail?.age ?? "-"} ปี`} />
                        </div>
                    </div>

                    <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
                        <InfoCard label="คณะ" value={detail?.faculty || "-"} />
                        <InfoCard label="สาขา" value={detail?.major || "-"} />
                        <InfoCard
                            label="GPAX"
                            value={
                                checkQualification
                                    ? detail?.gpax ?? "-"
                                    : "ภาคเรียนนี้ไม่ตรวจ"
                            }
                        />
                        <InfoCard
                            label="ชั่วโมงจิตอาสา"
                            value={
                                checkQualification
                                    ? `${detail?.volunteerHours ?? "-"} ชั่วโมง`
                                    : "ภาคเรียนนี้ไม่ตรวจ"
                            }
                        />
                    </div>

                    {detail?.age < 20 && (
                        <div className="mx-6 mb-6 rounded-2xl border-2 border-orange-200 bg-orange-50 p-4 text-orange-800">
                            <p className="font-black">
                                นักศึกษาอายุไม่ครบ 20 ปีบริบูรณ์
                            </p>
                            <p className="mt-1 text-sm">
                                ระบบเพิ่มรูปถ่ายผู้ปกครองและสำเนาบัตรประจำตัวประชาชนผู้ปกครองให้อัตโนมัติ
                            </p>
                        </div>
                    )}
                </section>

                {/* ============ ความคืบหน้าการตรวจ ============ */}
                <section className="rounded-3xl border-2 border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-black">
                            ความคืบหน้าการตรวจเอกสาร
                        </h2>
                        <p className="text-sm font-black text-gray-500">
                            ผ่านแล้ว {counts.pass} จาก {totalDocs} รายการ
                        </p>
                    </div>

                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-100">
                        <div
                            className="h-full rounded-full bg-green-500 transition-all"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <CountTile
                            label="ผ่านแล้ว"
                            value={counts.pass}
                            className="border-green-200 bg-green-50 text-green-700"
                        />
                        <CountTile
                            label="รอตรวจสอบ"
                            value={counts.pending}
                            className="border-amber-200 bg-amber-50 text-amber-800"
                        />
                        <CountTile
                            label="ต้องแก้ไข"
                            value={counts.revise}
                            className="border-red-200 bg-red-50 text-red-700"
                        />
                        <CountTile
                            label="ยังไม่ได้ส่ง"
                            value={counts.missing}
                            className="border-gray-200 bg-gray-50 text-gray-600"
                        />
                    </div>

                    {allReviewed && (
                        <p className="mt-4 rounded-xl border-2 border-green-200 bg-green-50 px-4 py-3 text-sm font-black text-green-700">
                            ✓ ตรวจครบทุกรายการแล้ว เอกสารผ่านทั้งหมด
                        </p>
                    )}
                </section>

                <section className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
                    {/* ============ รายการเอกสาร ============ */}
                    <div className="h-fit overflow-hidden rounded-3xl border-2 border-gray-200 bg-white shadow-sm">
                        <div className="border-b-2 border-gray-100 bg-gray-50 px-5 py-4">
                            <h2 className="text-lg font-black">
                                เอกสารที่ต้องตรวจ
                            </h2>
                            <p className="text-sm text-gray-500">
                                เลือกเอกสารเพื่อดูไฟล์และตรวจ
                            </p>
                        </div>

                        <div className="space-y-3 p-4">
                            {requiredRows.map((row, index) => {
                                const state = getDocState(row);
                                const ui = STATE_UI[state];
                                const selected =
                                    activeRequirementId === row.requirementId;

                                return (
                                    <button
                                        key={row.requirementId}
                                        type="button"
                                        onClick={() =>
                                            setActiveRequirementId(
                                                row.requirementId
                                            )
                                        }
                                        className={`w-full rounded-2xl border-2 border-l-8 p-4 text-left transition ${ui.bar} ${selected
                                            ? "border-[#07116f] bg-blue-50 shadow-md"
                                            : "border-gray-200 bg-white hover:bg-blue-50/40"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-black">
                                                    {index + 1}.{" "}
                                                    {row.documentType}
                                                </p>
                                                <p className="mt-1 break-all text-sm text-gray-500">
                                                    {row.fileName ||
                                                        "ยังไม่ได้อัปโหลด"}
                                                </p>
                                                {row.rejectionCount > 0 && (
                                                    <p className="mt-1 text-xs font-black text-red-500">
                                                        ตีกลับแล้ว{" "}
                                                        {row.rejectionCount} ครั้ง
                                                    </p>
                                                )}
                                            </div>

                                            <span
                                                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${ui.badge}`}
                                            >
                                                {ui.icon} {ui.label}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ============ พื้นที่ตรวจเอกสาร ============ */}
                    <div className="space-y-6">
                        {activeRow ? (
                            <>
                                {/* หัวเอกสาร */}
                                <div
                                    className={`overflow-hidden rounded-3xl border-2 bg-white shadow-sm ${STATE_UI[activeState].frame}`}
                                >
                                    <div
                                        className={`flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-white ${STATE_UI[activeState].band}`}
                                    >
                                        <p className="text-sm font-bold">
                                            เอกสารที่กำลังตรวจ
                                        </p>
                                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-black text-[#07116f]">
                                            {STATE_UI[activeState].icon}{" "}
                                            {STATE_UI[activeState].label}
                                        </span>
                                    </div>

                                    <div className="px-6 py-5">
                                        <h2 className="text-2xl font-black">
                                            {activeRow.documentType}
                                        </h2>
                                        <p className="mt-1 break-all text-sm text-gray-500">
                                            {activeRow.fileName ||
                                                "ยังไม่ได้อัปโหลด"}
                                        </p>
                                        {activeRow.rejectionCount > 0 && (
                                            <p className="mt-2 text-sm font-black text-red-500">
                                                ตีกลับไปแล้วทั้งหมด{" "}
                                                {activeRow.rejectionCount} ครั้ง
                                            </p>
                                        )}

                                        {activeState === "revise" &&
                                            activeRow.note && (
                                                <div className="mt-4 rounded-2xl border-2 border-red-200 bg-red-50 p-4">
                                                    <p className="text-sm font-black text-red-700">
                                                        เหตุผลที่ตีกลับล่าสุด
                                                    </p>
                                                    <p className="mt-1 text-sm text-red-700">
                                                        {activeRow.note}
                                                    </p>
                                                </div>
                                            )}
                                    </div>
                                </div>

                                {activeRow.id ? (
                                    <>
                                        {/* ตัวอย่างเอกสาร */}
                                        <DocumentPreview
                                            filePath={activeRow.filePath}
                                            mimeType={activeRow.mimeType}
                                        />

                                        {/* ผลการตรวจ */}
                                        {activeState === "auto" ? (
                                            <div className="flex items-start gap-3 rounded-3xl border-2 border-blue-200 bg-blue-50 p-5">
                                                <span className="text-xl">
                                                    ℹ️
                                                </span>
                                                <p className="text-sm font-bold text-blue-700">
                                                    เอกสารนี้เป็นหลักฐานประกอบ
                                                    ระบบตัดสินผ่าน/ไม่ผ่านอัตโนมัติจากเกณฑ์คัดกรองคุณสมบัติแล้ว
                                                    ไม่ต้องกดอนุมัติ/ตีกลับซ้ำ
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="overflow-hidden rounded-3xl border-2 border-[#07116f] bg-white shadow-sm">
                                                <div className="bg-[#07116f] px-6 py-3 text-white">
                                                    <h3 className="text-lg font-black">
                                                        ผลการตรวจ
                                                    </h3>
                                                </div>

                                                <div className="space-y-5 p-6">
                                                    {!reviseMode && (
                                                        <div className="grid gap-3 sm:grid-cols-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    submitReview(
                                                                        "ผ่าน"
                                                                    )
                                                                }
                                                                disabled={
                                                                    savingAction
                                                                }
                                                                className="rounded-2xl bg-green-600 px-5 py-4 text-lg font-black text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
                                                            >
                                                                ✓ ผ่าน
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setReviseMode(
                                                                        true
                                                                    );
                                                                    setActionError(
                                                                        ""
                                                                    );
                                                                }}
                                                                disabled={
                                                                    savingAction
                                                                }
                                                                className="rounded-2xl bg-red-600 px-5 py-4 text-lg font-black text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                                                            >
                                                                ✕ ตีกลับให้แก้ไข
                                                            </button>
                                                        </div>
                                                    )}

                                                    {reviseMode && (
                                                        <div className="rounded-2xl border-2 border-red-300 bg-red-50/60 p-5">
                                                            <h4 className="text-base font-black text-red-700">
                                                                เลือกเหตุผลที่ตีกลับ
                                                            </h4>
                                                            <p className="mt-1 text-sm text-red-600">
                                                                เลือกได้หลายข้อ
                                                            </p>

                                                            <div className="mt-4 grid gap-2 md:grid-cols-2">
                                                                {REJECT_REASONS.map(
                                                                    (reason) => {
                                                                        const checked =
                                                                            reasonKeys.includes(
                                                                                reason.key
                                                                            );

                                                                        return (
                                                                            <label
                                                                                key={
                                                                                    reason.key
                                                                                }
                                                                                className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-white px-4 py-3 text-sm font-bold ${checked
                                                                                    ? "border-red-500 text-red-700"
                                                                                    : "border-gray-200 text-gray-700 hover:border-red-300"
                                                                                    }`}
                                                                            >
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={
                                                                                        checked
                                                                                    }
                                                                                    onChange={() =>
                                                                                        toggleReason(
                                                                                            reason.key
                                                                                        )
                                                                                    }
                                                                                    className="mt-0.5 h-4 w-4 accent-red-600"
                                                                                />
                                                                                <span>
                                                                                    {
                                                                                        reason.label
                                                                                    }
                                                                                </span>
                                                                            </label>
                                                                        );
                                                                    }
                                                                )}
                                                            </div>

                                                            {reasonKeys.includes(
                                                                "other"
                                                            ) && (
                                                                    <textarea
                                                                        rows="3"
                                                                        value={
                                                                            otherText
                                                                        }
                                                                        onChange={(
                                                                            event
                                                                        ) => {
                                                                            setOtherText(
                                                                                event
                                                                                    .target
                                                                                    .value
                                                                            );
                                                                            setActionError(
                                                                                ""
                                                                            );
                                                                        }}
                                                                        maxLength={
                                                                            300
                                                                        }
                                                                        autoFocus
                                                                        placeholder="พิมพ์เหตุผลเพิ่มเติม เช่น กรุณาถ่ายใหม่ให้เห็นเลขที่บัตรชัดเจน"
                                                                        className="mt-3 w-full resize-none rounded-xl border-2 border-red-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500"
                                                                    />
                                                                )}

                                                            {noteDraft && (
                                                                <div className="mt-4 rounded-xl border-2 border-dashed border-red-300 bg-white p-4">
                                                                    <p className="text-xs font-black text-gray-400">
                                                                        ข้อความที่นักศึกษาจะเห็น
                                                                    </p>
                                                                    <p className="mt-1 text-sm font-bold text-red-700">
                                                                        {
                                                                            noteDraft
                                                                        }
                                                                    </p>
                                                                </div>
                                                            )}

                                                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={
                                                                        handleConfirmRevise
                                                                    }
                                                                    disabled={
                                                                        savingAction
                                                                    }
                                                                    className="rounded-xl bg-red-600 px-5 py-3 font-black text-white hover:bg-red-700 disabled:opacity-50"
                                                                >
                                                                    {savingAction
                                                                        ? "กำลังบันทึก..."
                                                                        : "ยืนยันตีกลับ"}
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setReviseMode(
                                                                            false
                                                                        );
                                                                        setReasonKeys(
                                                                            []
                                                                        );
                                                                        setOtherText(
                                                                            ""
                                                                        );
                                                                        setActionError(
                                                                            ""
                                                                        );
                                                                    }}
                                                                    disabled={
                                                                        savingAction
                                                                    }
                                                                    className="rounded-xl border-2 border-gray-300 bg-white px-5 py-3 font-black text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                                                                >
                                                                    ยกเลิก
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {actionError && (
                                                        <p
                                                            role="alert"
                                                            className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700"
                                                        >
                                                            {actionError}
                                                        </p>
                                                    )}

                                                    {!reviseMode &&
                                                        activeState !==
                                                        "pending" && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    submitReview(
                                                                        "รอตรวจสอบ"
                                                                    )
                                                                }
                                                                disabled={
                                                                    savingAction
                                                                }
                                                                className="text-sm font-black text-gray-500 underline disabled:opacity-50"
                                                            >
                                                                รีเซ็ตเป็นรอตรวจสอบ
                                                            </button>
                                                        )}
                                                </div>
                                            </div>
                                        )}

                                        {/* ประวัติ */}
                                        <div className="overflow-hidden rounded-3xl border-2 border-gray-200 bg-white shadow-sm">
                                            <button
                                                type="button"
                                                onClick={handleToggleHistory}
                                                className="flex w-full items-center justify-between bg-gray-50 px-6 py-4 text-left font-black hover:bg-gray-100"
                                            >
                                                <span>
                                                    ประวัติการตรวจ/ตีกลับของเอกสารนี้
                                                </span>
                                                <span className="text-blue-600">
                                                    {showHistory ? "ซ่อน ▲" : "ดู ▼"}
                                                </span>
                                            </button>

                                            {showHistory && (
                                                <div className="border-t-2 border-gray-100 p-5">
                                                    {historyLoading ? (
                                                        <p className="text-sm text-gray-500">
                                                            กำลังโหลด...
                                                        </p>
                                                    ) : history?.data?.length ? (
                                                        <ul className="space-y-3">
                                                            {history.data.map(
                                                                (item) => (
                                                                    <li
                                                                        key={`${item.documentId}-${item.round}`}
                                                                        className="rounded-xl border-2 border-gray-100 bg-gray-50 p-4 text-sm"
                                                                    >
                                                                        <p className="font-black">
                                                                            ครั้งที่{" "}
                                                                            {
                                                                                item.round
                                                                            }{" "}
                                                                            —{" "}
                                                                            {mapBackendStatusToLabel(
                                                                                item.newStatus
                                                                            )}{" "}
                                                                            (ส่งครั้งที่{" "}
                                                                            {
                                                                                item.versionNo
                                                                            }
                                                                            )
                                                                        </p>
                                                                        {item.reason && (
                                                                            <p className="mt-1 text-gray-600">
                                                                                เหตุผล:{" "}
                                                                                {
                                                                                    item.reason
                                                                                }
                                                                            </p>
                                                                        )}
                                                                        <p className="mt-1 text-xs text-gray-400">
                                                                            {item.reviewedByName ||
                                                                                "-"}{" "}
                                                                            ·{" "}
                                                                            {item.reviewedAt
                                                                                ? new Date(
                                                                                    item.reviewedAt
                                                                                ).toLocaleString(
                                                                                    "th-TH"
                                                                                )
                                                                                : "-"}
                                                                        </p>
                                                                    </li>
                                                                )
                                                            )}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-sm text-gray-500">
                                                            ยังไม่เคยมีการตรวจเอกสารนี้
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex min-h-[260px] items-center justify-center rounded-3xl border-2 border-dashed border-gray-300 bg-white p-8 text-center">
                                        <div>
                                            <div className="text-6xl">📭</div>
                                            <p className="mt-4 text-lg font-black text-gray-600">
                                                นักศึกษายังไม่ได้อัปโหลดเอกสารนี้
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex min-h-[400px] items-center justify-center rounded-3xl border-2 border-dashed border-gray-300 bg-white text-center">
                                <div>
                                    <div className="text-6xl">📭</div>
                                    <p className="mt-4 text-lg font-black text-gray-600">
                                        กรุณาเลือกเอกสารที่ต้องการตรวจ
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-gray-200 bg-white p-5 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setPage?.("studentList")}
                        className="rounded-xl border-2 border-[#07116f] px-6 py-3 font-black hover:bg-blue-50"
                    >
                        ← กลับรายชื่อนักศึกษา
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        className="rounded-xl bg-[#07116f] px-7 py-3 font-black text-white hover:bg-[#0a1a9a]"
                    >
                        บันทึก
                    </button>
                </section>
            </main>
        </div>
    );
}

function InfoBadge({ label }) {
    return (
        <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black text-white">
            {label}
        </span>
    );
}

function InfoCard({ label, value }) {
    return (
        <div className="rounded-2xl border-2 border-gray-100 bg-gray-50 p-4">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="mt-1 font-black">{value}</p>
        </div>
    );
}

function CountTile({ label, value, className }) {
    return (
        <div className={`rounded-2xl border-2 px-4 py-3 ${className}`}>
            <p className="text-2xl font-black">{value}</p>
            <p className="text-xs font-black">{label}</p>
        </div>
    );
}

function DocumentPreview({ filePath, mimeType }) {
    const baseUrl =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

    if (!filePath) {
        return (
            <div className="flex min-h-[260px] items-center justify-center rounded-3xl border-2 border-dashed border-blue-200 bg-[#f8fbff] p-8 text-center">
                <p className="font-black text-gray-400">ไม่พบไฟล์เอกสาร</p>
            </div>
        );
    }

    const fileUrl = `${baseUrl}${filePath}`;
    const isImage = (mimeType || "").startsWith("image/");
    const isPdf = mimeType === "application/pdf";

    return (
        <div className="overflow-hidden rounded-3xl border-2 border-blue-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-blue-100 bg-blue-50 px-6 py-3">
                <h3 className="font-black">ตัวอย่างเอกสาร</h3>
                <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-black text-blue-700 underline"
                >
                    เปิดในแท็บใหม่ / ดาวน์โหลด
                </a>
            </div>

            <div className="bg-[#f8fbff]">
                {isImage ? (
                    <div className="flex max-h-[560px] items-center justify-center p-4">
                        <img
                            src={fileUrl}
                            alt="เอกสารที่อัปโหลด"
                            className="max-h-[520px] w-auto rounded-xl border border-gray-200 object-contain shadow-sm"
                        />
                    </div>
                ) : isPdf ? (
                    <iframe
                        src={fileUrl}
                        title="เอกสาร PDF"
                        className="h-[560px] w-full"
                    />
                ) : (
                    <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
                        <div className="text-7xl">📑</div>
                        <p className="mt-4 font-black text-gray-500">
                            ไม่รองรับการแสดงตัวอย่างไฟล์ประเภทนี้
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DocumentReview;