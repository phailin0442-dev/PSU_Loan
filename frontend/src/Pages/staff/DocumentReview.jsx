import { useMemo, useState } from "react";
import {
    DOCUMENT_TYPES,
    getBorrowerTypeLabel,
    getDocumentByCategory,
    getRequiredDocumentCategories,
    normalizeStatus,
    requiresQualificationCheck,
} from "./documentRules";

function DocumentReview({
    student,
    setPage,
    onSave,
}) {
    const requiredCategories =
        getRequiredDocumentCategories(student);

    const [documents, setDocuments] = useState(
        student?.documents?.map((document) => ({
            ...document,
            status:
                document.status || "รอตรวจสอบ",
            remark: document.remark || "",
        })) || []
    );

    const firstRequiredDocument =
        requiredCategories
            .map((category) =>
                getDocumentByCategory(
                    documents,
                    category
                )
            )
            .find(Boolean);

    const [activeDocumentId, setActiveDocumentId] =
        useState(firstRequiredDocument?.id || null);

    const activeDocument = useMemo(
        () =>
            documents.find(
                (document) =>
                    document.id === activeDocumentId
            ),
        [documents, activeDocumentId]
    );

    const requiredRows = useMemo(
        () =>
            requiredCategories.map((category) => ({
                category,
                name: DOCUMENT_TYPES[category],
                document: getDocumentByCategory(
                    documents,
                    category
                ),
            })),
        [documents, requiredCategories]
    );

    const summary = useMemo(() => {
        return requiredRows.reduce(
            (result, row) => {
                if (!row.document) {
                    result.missing += 1;
                    return result;
                }

                const status = normalizeStatus(
                    row.document.status
                );

                if (status === "ผ่าน") {
                    result.approved += 1;
                } else if (status === "ต้องแก้ไข") {
                    result.rejected += 1;
                } else {
                    result.pending += 1;
                }

                return result;
            },
            {
                approved: 0,
                rejected: 0,
                pending: 0,
                missing: 0,
            }
        );
    }, [requiredRows]);

    const updateDocument = (
        documentId,
        updates
    ) => {
        setDocuments((currentDocuments) =>
            currentDocuments.map((document) =>
                document.id === documentId
                    ? {
                        ...document,
                        ...updates,
                    }
                    : document
            )
        );
    };

    const handleApprove = () => {
        if (!activeDocument) return;

        updateDocument(activeDocument.id, {
            status: "ผ่าน",
            remark: "",
        });
    };

    const handleReject = () => {
        if (!activeDocument) return;

        if (!activeDocument.remark.trim()) {
            alert(
                "กรุณาระบุหมายเหตุที่ต้องการให้นักศึกษาแก้ไข"
            );
            return;
        }

        updateDocument(activeDocument.id, {
            status: "ต้องแก้ไข",
        });
    };

    const handleSave = () => {
        const updatedStudent = {
            ...student,
            documents,
            status:
                summary.missing > 0 ||
                    summary.rejected > 0
                    ? "ต้องแก้ไข"
                    : summary.pending > 0
                        ? "รอตรวจสอบ"
                        : "ผ่าน",
        };

        onSave?.(updatedStudent);
    };

    const checkQualification =
        requiresQualificationCheck(
            student?.semester
        );

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

                    <button
                        type="button"
                        onClick={() =>
                            setPage?.("studentList")
                        }
                        className="rounded-xl border border-[#07116f] px-4 py-2.5 font-black"
                    >
                        ← กลับรายชื่อนักศึกษา
                    </button>
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
                                {student?.fullName || "-"}
                            </h2>
                            <p className="mt-2 text-gray-500">
                                รหัสนักศึกษา{" "}
                                {student?.studentId || "-"}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <InfoBadge
                                label={`ภาคเรียนที่ ${student?.semester || "-"
                                    }`}
                            />
                            <InfoBadge
                                label={getBorrowerTypeLabel(
                                    student?.borrowerTypeCode,
                                    student?.borrowerType
                                )}
                            />
                            <InfoBadge
                                label={`อายุ ${student?.age ?? "-"
                                    } ปี`}
                            />
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <InfoCard
                            label="คณะ"
                            value={student?.faculty || "-"}
                        />
                        <InfoCard
                            label="สาขา"
                            value={student?.major || "-"}
                        />
                        <InfoCard
                            label="GPAX"
                            value={
                                checkQualification
                                    ? student?.gpax ?? "-"
                                    : "ภาคเรียนนี้ไม่ตรวจ"
                            }
                        />
                        <InfoCard
                            label="ชั่วโมงจิตอาสา"
                            value={
                                checkQualification
                                    ? `${student?.volunteerHours ??
                                    "-"
                                    } ชั่วโมง`
                                    : "ภาคเรียนนี้ไม่ตรวจ"
                            }
                        />
                    </div>

                    {student?.age < 20 && (
                        <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-orange-800">
                            <p className="font-black">
                                นักศึกษาอายุไม่ครบ 20 ปีบริบูรณ์
                            </p>
                            <p className="mt-1 text-sm">
                                ระบบเพิ่มรูปถ่ายผู้ปกครองและสำเนาบัตรประจำตัวประชาชนผู้ปกครองให้อัตโนมัติ
                            </p>
                        </div>
                    )}

                    {Number(student?.semester) === 2 && (
                        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-800">
                            <p className="font-black">
                                ภาคเรียนที่ 2
                            </p>
                            <p className="mt-1 text-sm">
                                ไม่ตรวจ GPAX และชั่วโมงจิตอาสา ตรวจเฉพาะใบเบิกเงินและสำเนาบัตรประจำตัวประชาชนผู้กู้ รวมเอกสารผู้ปกครองเมื่ออายุไม่ครบ 20 ปี
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
                            ระบบคำนวณตามภาคเรียน ประเภทผู้กู้ และอายุ
                        </p>

                        <div className="mt-5 space-y-3">
                            {requiredRows.map((row) => (
                                <button
                                    key={row.category}
                                    type="button"
                                    disabled={!row.document}
                                    onClick={() =>
                                        row.document &&
                                        setActiveDocumentId(
                                            row.document.id
                                        )
                                    }
                                    className={`w-full rounded-2xl border p-4 text-left ${!row.document
                                            ? "cursor-not-allowed border-red-200 bg-red-50"
                                            : activeDocument?.id ===
                                                row.document.id
                                                ? "border-[#07116f] bg-blue-50"
                                                : "border-gray-100 hover:bg-blue-50/40"
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-black">
                                                {row.name}
                                            </p>
                                            <p className="mt-1 text-sm text-gray-500">
                                                {row.document?.fileName ||
                                                    "ยังไม่ได้อัปโหลด"}
                                            </p>
                                        </div>

                                        {row.document ? (
                                            <StatusBadge
                                                status={
                                                    row.document.status
                                                }
                                            />
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
                        {activeDocument ? (
                            <>
                                <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-blue-500">
                                            เอกสารที่กำลังตรวจ
                                        </p>
                                        <h2 className="mt-2 text-2xl font-black">
                                            {activeDocument.name}
                                        </h2>
                                        <p className="mt-2 text-sm text-gray-500">
                                            {
                                                activeDocument.fileName
                                            }
                                        </p>
                                    </div>

                                    <StatusBadge
                                        status={
                                            activeDocument.status
                                        }
                                    />
                                </div>

                                <div className="mt-6 flex min-h-[420px] items-center justify-center rounded-3xl border-2 border-dashed border-blue-100 bg-[#f8fbff] p-8 text-center">
                                    <div>
                                        <div className="text-7xl">
                                            📑
                                        </div>
                                        <p className="mt-5 text-lg font-black">
                                            พื้นที่แสดงตัวอย่างเอกสาร
                                        </p>
                                        <p className="mt-2 text-sm text-gray-500">
                                            เมื่อเชื่อม Backend แล้วให้ใส่ URL ไฟล์จริงในส่วนนี้
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                alert(
                                                    `เปิดไฟล์: ${activeDocument.fileName}`
                                                )
                                            }
                                            className="mt-5 rounded-xl border border-[#07116f] px-5 py-3 font-black"
                                        >
                                            เปิดดูไฟล์
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <label className="mb-2 block font-black">
                                        หมายเหตุสำหรับนักศึกษา
                                    </label>

                                    <textarea
                                        rows="4"
                                        value={
                                            activeDocument.remark
                                        }
                                        onChange={(event) =>
                                            updateDocument(
                                                activeDocument.id,
                                                {
                                                    remark:
                                                        event.target.value,
                                                }
                                            )
                                        }
                                        placeholder="เช่น ภาพไม่ชัด เอกสารไม่ครบ หรือลายเซ็นไม่ครบ"
                                        className="w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />
                                </div>

                                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                    <button
                                        type="button"
                                        onClick={handleApprove}
                                        className="rounded-xl bg-green-600 px-5 py-3 font-black text-white"
                                    >
                                        ✓ ผ่าน
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleReject}
                                        className="rounded-xl bg-red-600 px-5 py-3 font-black text-white"
                                    >
                                        ✕ ต้องแก้ไข
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            updateDocument(
                                                activeDocument.id,
                                                {
                                                    status:
                                                        "รอตรวจสอบ",
                                                    remark: "",
                                                }
                                            )
                                        }
                                        className="rounded-xl border border-gray-200 px-5 py-3 font-black text-gray-600"
                                    >
                                        รีเซ็ตผล
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex min-h-[600px] items-center justify-center text-center">
                                <div>
                                    <div className="text-6xl">
                                        📭
                                    </div>
                                    <p className="mt-4 text-lg font-black text-gray-600">
                                        กรุณาเลือกเอกสารที่มีไฟล์
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
                            บันทึกผลการตรวจสอบ
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
            <p className="text-sm text-gray-400">
                {label}
            </p>
            <p className="mt-1 font-black">
                {value}
            </p>
        </div>
    );
}

function SummaryBox({
    label,
    value,
    className,
}) {
    return (
        <div
            className={`rounded-2xl p-4 text-center ${className}`}
        >
            <p className="text-2xl font-black">
                {value}
            </p>
            <p className="mt-1 text-sm font-bold">
                {label}
            </p>
        </div>
    );
}

function StatusBadge({ status }) {
    const value = normalizeStatus(status);

    const styles = {
        ผ่าน: "bg-green-100 text-green-700",
        ต้องแก้ไข: "bg-red-100 text-red-700",
        รอตรวจสอบ:
            "bg-yellow-100 text-yellow-700",
    };

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${styles[value]}`}
        >
            {value}
        </span>
    );
}

export default DocumentReview;
