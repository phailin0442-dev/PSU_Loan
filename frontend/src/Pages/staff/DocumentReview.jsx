import { useEffect, useMemo, useState } from "react";
import {
    getBorrowerTypeLabel,
    mapBackendStatusToLabel,
    requiresQualificationCheck,
} from "../../rules/documentRules";
import {
    fetchDocumentHistory,
    fetchStaffList,
    fetchStaffStudentDetail,
    reviewDocument,
} from "../../services/api";

function DocumentReview({ student, setPage, onSave }) {
    const applicationId = student?.id;

    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    // ชั่วคราวจนกว่าจะมีระบบ auth จริง — backend ต้องรู้ว่าใครเป็นคนตรวจ
    // ดึงรายชื่อเจ้าหน้าที่จริงมาให้เลือกจาก dropdown แทนพิมพ์ ID เอง
    // (staff_id เดาไม่ได้เพราะผูกกับ users.user_id ที่เดินเลขข้าม role)
    const [staffList, setStaffList] = useState([]);
    const [staffId, setStaffId] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadStaffList() {
            try {
                const result = await fetchStaffList();
                if (cancelled) return;

                setStaffList(result.data || []);

                if (result.data?.length) {
                    setStaffId(String(result.data[0].staffId));
                }
            } catch (error) {
                if (!cancelled) {
                    setActionError(
                        error.message || "โหลดรายชื่อเจ้าหน้าที่ไม่สำเร็จ"
                    );
                }
            }
        }

        loadStaffList();

        return () => {
            cancelled = true;
        };
    }, []);

    const [activeRequirementId, setActiveRequirementId] = useState(null);
    const [noteDraft, setNoteDraft] = useState("");
    const [actionError, setActionError] = useState("");
    const [savingAction, setSavingAction] = useState(false);

    const [history, setHistory] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const loadDetail = async () => {
        if (!applicationId) return;

        setLoading(true);
        setLoadError("");

        try {
            const result = await fetchStaffStudentDetail(applicationId);
            setDetail(result.data);

            setActiveRequirementId((current) => {
                if (
                    current &&
                    (result.data.documents || []).some(
                        (row) => row.requirementId === current
                    )
                ) {
                    return current;
                }

                const firstWithFile = (result.data.documents || []).find(
                    (row) => row.id
                );

                return (
                    firstWithFile?.requirementId ??
                    result.data.documents?.[0]?.requirementId ??
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
        loadDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [applicationId]);

    const requiredRows = detail?.documents || [];

    const activeRow =
        requiredRows.find(
            (row) => row.requirementId === activeRequirementId
        ) || null;

    useEffect(() => {
        setNoteDraft(activeRow?.note || "");
        setActionError("");
        setShowHistory(false);
        setHistory(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeRow?.requirementId]);

    const summary = useMemo(() => {
        return requiredRows.reduce(
            (result, row) => {
                if (!row.id) {
                    result.missing += 1;
                    return result;
                }

                if (row.status === "APPROVED") {
                    result.approved += 1;
                } else if (row.status === "REVISION_REQUIRED") {
                    result.rejected += 1;
                } else {
                    result.pending += 1;
                }

                return result;
            },
            { approved: 0, rejected: 0, pending: 0, missing: 0 }
        );
    }, [requiredRows]);

    const validateStaffId = () => {
        const parsed = Number(staffId);

        if (!Number.isInteger(parsed) || parsed <= 0) {
            setActionError("กรุณาระบุรหัสเจ้าหน้าที่ (staffId) ให้ถูกต้อง");
            return null;
        }

        return parsed;
    };

    const handleReviewAction = async (statusLabel) => {
        if (!activeRow?.id) return;

        if (statusLabel === "ต้องแก้ไข" && !noteDraft.trim()) {
            setActionError(
                "กรุณาระบุหมายเหตุที่ต้องการให้นักศึกษาแก้ไข"
            );
            return;
        }

        const parsedStaffId = validateStaffId();
        if (!parsedStaffId) return;

        setActionError("");
        setSavingAction(true);

        try {
            await reviewDocument(applicationId, activeRow.id, {
                status: statusLabel,
                note: noteDraft.trim(),
                staffId: parsedStaffId,
            });

            await loadDetail();
        } catch (error) {
            setActionError(error.message || "บันทึกผลไม่สำเร็จ");
        } finally {
            setSavingAction(false);
        }
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
                <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
                    <div className="text-5xl">⚠️</div>
                    <p className="mt-4 font-black text-red-600">{loadError}</p>
                    <button
                        type="button"
                        onClick={loadDetail}
                        className="mt-5 rounded-xl bg-[#07116f] px-6 py-3 font-black text-white"
                    >
                        ลองอีกครั้ง
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#eef5ff] text-[#07116f]">
            <header className="sticky top-0 z-40 border-b border-gray-100 bg-white shadow-sm">
                <div className="flex min-h-20 items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
                    <div>
                        <p className="text-sm font-bold text-blue-500">
                            PSU Smart Loan
                        </p>
                        <h1 className="mt-1 text-2xl font-black">
                            ตรวจสอบข้อมูลและเอกสารนักศึกษา
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
                            <span className="mr-2 font-bold text-gray-500">
                                ผู้ตรวจ
                            </span>
                            <select
                                value={staffId}
                                onChange={(event) =>
                                    setStaffId(event.target.value)
                                }
                                className="max-w-[220px] cursor-pointer bg-transparent font-black text-[#07116f] outline-none"
                            >
                                {staffList.length === 0 && (
                                    <option value="">
                                        ไม่พบเจ้าหน้าที่ในระบบ
                                    </option>
                                )}
                                {staffList.map((staff) => (
                                    <option
                                        key={staff.staffId}
                                        value={staff.staffId}
                                    >
                                        {staff.fullName}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <button
                            type="button"
                            onClick={() => setPage?.("studentList")}
                            className="rounded-xl border border-[#07116f] px-4 py-2.5 font-black"
                        >
                            ← กลับรายชื่อนักศึกษา
                        </button>
                    </div>
                </div>
            </header>

            <main className="px-5 py-7 sm:px-8 lg:px-10">
                <section className="rounded-3xl bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <p className="text-sm font-bold text-blue-500">
                                ข้อมูลนักศึกษา
                            </p>
                            <h2 className="mt-2 text-2xl font-black">
                                {detail?.fullName || student?.fullName || "-"}
                            </h2>
                            <p className="mt-2 text-gray-500">
                                รหัสนักศึกษา{" "}
                                {detail?.studentId || student?.studentId || "-"}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <InfoBadge
                                label={`ภาคเรียนที่ ${detail?.semester || "-"
                                    }`}
                            />
                            <InfoBadge
                                label={getBorrowerTypeLabel(
                                    detail?.borrowerCode || detail?.borrowerType
                                )}
                            />
                            <InfoBadge
                                label={`อายุ ${detail?.age ?? "-"} ปี`}
                            />
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                        <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-orange-800">
                            <p className="font-black">
                                นักศึกษาอายุไม่ครบ 20 ปีบริบูรณ์
                            </p>
                            <p className="mt-1 text-sm">
                                ระบบเพิ่มรูปถ่ายผู้ปกครองและสำเนาบัตรประจำตัวประชาชนผู้ปกครองให้อัตโนมัติ
                            </p>
                        </div>
                    )}
                </section>

                <section className="mt-6 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                    <div className="rounded-3xl bg-white p-5 shadow-sm">
                        <h2 className="text-xl font-black">
                            เอกสารที่ต้องตรวจ
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            ดึงตรงจากฐานข้อมูล (document_requirements) ตามภาคเรียน
                            ประเภทผู้กู้ และอายุ
                        </p>

                        <div className="mt-5 space-y-3">
                            {requiredRows.map((row) => (
                                <button
                                    key={row.requirementId}
                                    type="button"
                                    onClick={() =>
                                        setActiveRequirementId(
                                            row.requirementId
                                        )
                                    }
                                    className={`w-full rounded-2xl border p-4 text-left ${!row.id
                                            ? "border-red-200 bg-red-50"
                                            : activeRequirementId ===
                                                row.requirementId
                                                ? "border-[#07116f] bg-blue-50"
                                                : "border-gray-100 hover:bg-blue-50/40"
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-black">
                                                {row.documentType}
                                            </p>
                                            <p className="mt-1 text-sm text-gray-500">
                                                {row.fileName ||
                                                    "ยังไม่ได้อัปโหลด"}
                                            </p>
                                            {row.rejectionCount > 0 && (
                                                <p className="mt-1 text-xs font-black text-red-500">
                                                    ตีกลับแล้ว {row.rejectionCount} ครั้ง
                                                </p>
                                            )}
                                        </div>

                                        {row.id ? (
                                            <StatusBadge status={row.status} />
                                        ) : (
                                            <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-black text-red-700">
                                                ขาดเอกสาร
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl bg-white p-6 shadow-sm">
                        {activeRow?.id ? (
                            <>
                                <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-blue-500">
                                            เอกสารที่กำลังตรวจ
                                        </p>
                                        <h2 className="mt-2 text-2xl font-black">
                                            {activeRow.documentType}
                                        </h2>
                                        <p className="mt-2 text-sm text-gray-500">
                                            {activeRow.fileName}
                                        </p>
                                        {activeRow.rejectionCount > 0 && (
                                            <p className="mt-2 text-sm font-black text-red-500">
                                                ตีกลับไปแล้วทั้งหมด{" "}
                                                {activeRow.rejectionCount} ครั้ง
                                            </p>
                                        )}
                                    </div>

                                    <StatusBadge status={activeRow.status} />
                                </div>

                                <DocumentPreview
                                    filePath={activeRow.filePath}
                                    mimeType={activeRow.mimeType}
                                />

                                <div className="mt-6">
                                    <label className="mb-2 block font-black">
                                        หมายเหตุสำหรับนักศึกษา
                                    </label>

                                    <textarea
                                        rows="4"
                                        value={noteDraft}
                                        onChange={(event) =>
                                            setNoteDraft(event.target.value)
                                        }
                                        placeholder="เช่น ภาพไม่ชัด เอกสารไม่ครบ หรือลายเซ็นไม่ครบ"
                                        className="w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                </div>

                                {actionError && (
                                    <p className="mt-3 text-sm font-black text-red-600">
                                        {actionError}
                                    </p>
                                )}

                                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleReviewAction("ผ่าน")
                                        }
                                        disabled={savingAction}
                                        className="rounded-xl bg-green-600 px-5 py-3 font-black text-white disabled:opacity-50"
                                    >
                                        ✓ ผ่าน
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleReviewAction("ต้องแก้ไข")
                                        }
                                        disabled={savingAction}
                                        className="rounded-xl bg-red-600 px-5 py-3 font-black text-white disabled:opacity-50"
                                    >
                                        ✕ ต้องแก้ไข (ตีกลับ)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleReviewAction("รอตรวจสอบ")
                                        }
                                        disabled={savingAction}
                                        className="rounded-xl border border-gray-200 px-5 py-3 font-black text-gray-600 disabled:opacity-50"
                                    >
                                        รีเซ็ตผล
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleToggleHistory}
                                    className="mt-5 text-sm font-black text-blue-600 underline"
                                >
                                    {showHistory
                                        ? "ซ่อนประวัติการตีกลับ"
                                        : "ดูประวัติการตีกลับทั้งหมด"}
                                </button>

                                {showHistory && (
                                    <div className="mt-3 rounded-2xl bg-gray-50 p-4">
                                        {historyLoading ? (
                                            <p className="text-sm text-gray-500">
                                                กำลังโหลด...
                                            </p>
                                        ) : history?.data?.length ? (
                                            <ul className="space-y-2">
                                                {history.data.map((item) => (
                                                    <li
                                                        key={`${item.documentId}-${item.round}`}
                                                        className="rounded-xl bg-white p-3 text-sm shadow-sm"
                                                    >
                                                        <p className="font-black">
                                                            ครั้งที่ {item.round} —{" "}
                                                            {mapBackendStatusToLabel(
                                                                item.newStatus
                                                            )}{" "}
                                                            (เวอร์ชัน {item.versionNo})
                                                        </p>
                                                        {item.reason && (
                                                            <p className="mt-1 text-gray-500">
                                                                เหตุผล: {item.reason}
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
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-gray-500">
                                                ยังไม่เคยมีการตรวจเอกสารนี้
                                            </p>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex min-h-[400px] items-center justify-center text-center">
                                <div>
                                    <div className="text-6xl">📭</div>
                                    <p className="mt-4 text-lg font-black text-gray-600">
                                        {activeRow
                                            ? "นักศึกษายังไม่ได้อัปโหลดเอกสารนี้"
                                            : "กรุณาเลือกเอกสารที่ต้องการตรวจ"}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
                    <div className="grid gap-3 sm:grid-cols-4">
                        <SummaryBox
                            label="ผ่าน"
                            value={summary.approved}
                            className="bg-green-50 text-green-700"
                        />
                        <SummaryBox
                            label="ต้องแก้ไข"
                            value={summary.rejected}
                            className="bg-red-50 text-red-700"
                        />
                        <SummaryBox
                            label="รอตรวจ"
                            value={summary.pending}
                            className="bg-yellow-50 text-yellow-700"
                        />
                        <SummaryBox
                            label="ขาดเอกสาร"
                            value={summary.missing}
                            className="bg-gray-100 text-gray-700"
                        />
                    </div>

                    <div className="mt-6 flex justify-end border-t border-gray-100 pt-5">
                        <button
                            type="button"
                            onClick={handleSave}
                            className="rounded-xl bg-[#07116f] px-7 py-3 font-black text-white"
                        >
                            เสร็จสิ้น กลับไปหน้ารายชื่อ
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
}

function InfoBadge({ label }) {
    return (
        <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
            {label}
        </span>
    );
}

function InfoCard({ label, value }) {
    return (
        <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="mt-1 font-black">{value}</p>
        </div>
    );
}

function SummaryBox({ label, value, className }) {
    return (
        <div className={`rounded-2xl p-4 text-center ${className}`}>
            <p className="text-2xl font-black">{value}</p>
            <p className="mt-1 text-sm font-bold">{label}</p>
        </div>
    );
}

function StatusBadge({ status }) {
    const value = mapBackendStatusToLabel(status);

    const styles = {
        ผ่าน: "bg-green-100 text-green-700",
        ต้องแก้ไข: "bg-red-100 text-red-700",
        รอตรวจสอบ: "bg-yellow-100 text-yellow-700",
    };

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${styles[value] || "bg-gray-100 text-gray-700"
                }`}
        >
            {value}
        </span>
    );
}

function DocumentPreview({ filePath, mimeType }) {
    const baseUrl =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

    if (!filePath) {
        return (
            <div className="mt-6 flex min-h-[300px] items-center justify-center rounded-3xl border-2 border-dashed border-blue-100 bg-[#f8fbff] p-8 text-center">
                <p className="font-black text-gray-400">ไม่พบไฟล์เอกสาร</p>
            </div>
        );
    }

    const fileUrl = `${baseUrl}${filePath}`;
    const isImage = (mimeType || "").startsWith("image/");
    const isPdf = mimeType === "application/pdf";

    return (
        <div className="mt-6 overflow-hidden rounded-3xl border-2 border-blue-100 bg-[#f8fbff]">
            {isImage ? (
                <div className="flex max-h-[520px] items-center justify-center bg-gray-50 p-3">
                    <img
                        src={fileUrl}
                        alt="เอกสารที่อัปโหลด"
                        className="max-h-[500px] w-auto rounded-xl object-contain shadow-sm"
                    />
                </div>
            ) : isPdf ? (
                <iframe
                    src={fileUrl}
                    title="เอกสาร PDF"
                    className="h-[560px] w-full"
                />
            ) : (
                <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
                    <div className="text-7xl">📑</div>
                    <p className="mt-4 font-black text-gray-500">
                        ไม่รองรับการแสดงตัวอย่างไฟล์ประเภทนี้
                    </p>
                </div>
            )}

            <div className="flex justify-end border-t border-blue-100 bg-white/60 px-4 py-2">
                <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-black text-blue-700 underline"
                >
                    เปิดในแท็บใหม่ / ดาวน์โหลด
                </a>
            </div>
        </div>
    );
}

export default DocumentReview;