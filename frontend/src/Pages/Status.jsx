import { useEffect } from "react";
import { useApp } from "../context/AppContext";

// 4 ขั้นตอนตามที่ต้องการ: ข้อมูลส่วนตัว -> คัดกรอง -> อัปโหลดเอกสาร ->
// ตรวจเอกสาร (ตรวจโดยเจ้าหน้าที่) แต่ละขั้นคำนวณจากข้อมูลจริงของ backend
function getSteps(student) {
    const statusCode = student?.applicationStatusCode;

    const personalDone = Boolean(student?.studentInfoCompleted);

    // ใช้ค่าสถานะดิบตรงๆ แยกให้ชัดเจนระหว่าง "ยังไม่ตรวจ" / "ผ่าน" /
    // "ไม่ผ่าน" — ห้ามใช้ eligibilityCompleted เพราะ true ทั้ง PASSED
    // และ FAILED (เป็นบั๊กที่เคยเจอมาแล้วในหน้าอื่น)
    const rawEligibilityStatus = student?.eligibilityStatus;
    const eligibilityPassed =
        rawEligibilityStatus === "PASSED" || rawEligibilityStatus === "NOT_REQUIRED";
    const eligibilityFailed = rawEligibilityStatus === "FAILED";
    const eligibilityDone = eligibilityPassed; // ใช้คำว่า "เสร็จ" เฉพาะตอนผ่านจริงเท่านั้น

    // ไม่ผ่านคัดกรอง = ตันอยู่ตรงนั้นเลย ห้ามให้ขั้นถัดไปดูเหมือนกำลัง
    // ดำเนินการอยู่ (เพราะความจริงไปต่อไม่ได้แล้ว)
    const uploadDone = Boolean(student?.documentsCompleted);

    const reviewApproved = [
        "DOCUMENT_APPROVED",
        "QUEUE_BOOKED",
        "SIGNED",
        "CENTRAL_SUBMITTED",
        "COMPLETED",
    ].includes(statusCode);

    const reviewNeedsFix = statusCode === "REVISION_REQUIRED";
    const reviewInProgress = statusCode === "DOCUMENT_REVIEW";

    return [
        {
            label: "ข้อมูลส่วนตัว",
            done: personalDone,
            statusText: personalDone ? "เสร็จแล้ว" : "ยังไม่ได้กรอก",
        },
        {
            label: "คัดกรอง",
            done: eligibilityDone,
            needsFix: eligibilityFailed,
            statusText: eligibilityDone
                ? "ผ่านแล้ว"
                : eligibilityFailed
                    ? "ไม่ผ่านเกณฑ์"
                    : personalDone
                        ? "กำลังดำเนินการ"
                        : "รอดำเนินการ",
        },
        {
            label: "อัปโหลดเอกสาร",
            done: uploadDone,
            statusText: uploadDone
                ? "เสร็จแล้ว"
                : eligibilityFailed
                    ? "ไม่สามารถดำเนินการต่อได้"
                    : eligibilityDone
                        ? "กำลังดำเนินการ"
                        : "รอดำเนินการ",
        },
        {
            label: "ตรวจเอกสาร",
            done: reviewApproved,
            needsFix: reviewNeedsFix,
            statusText: reviewApproved
                ? "ผ่านการตรวจสอบ"
                : reviewNeedsFix
                    ? "ต้องแก้ไขเอกสาร"
                    : reviewInProgress
                        ? "กำลังดำเนินการ"
                        : uploadDone
                            ? "รอเจ้าหน้าที่ตรวจ"
                            : "รอดำเนินการ",
        },
    ];
}

function formatDateTime(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("th-TH", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function Status({ setPage }) {
    const { selectedStudent, refreshSelectedStudentDetail } = useApp();

    useEffect(() => {
        refreshSelectedStudentDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStudent?.id]);

    const steps = getSteps(selectedStudent);
    const documentReviewHistory = selectedStudent?.documentReviewHistory || [];

    // หาขั้นที่ "กำลังดำเนินการ" ตอนนี้ (ขั้นแรกที่ยังไม่ done)
    const activeIndex = steps.findIndex((step) => !step.done);

    const needsAttention = steps.some((step) => step.needsFix);

    const latestRejection = documentReviewHistory
        .slice()
        .reverse()
        .find((item) => item.newStatusLabel === "ต้องแก้ไข");

    const latestRemark = latestRejection?.reason || "";

    return (
        <main className="w-full px-4 py-4 lg:px-6">
            <section className="mx-auto flex max-w-6xl flex-col gap-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
                    {/* สถานะคำขอปัจจุบัน */}
                    <div className="flex-1 rounded-[24px] bg-white p-6 shadow-sm lg:p-7">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h1 className="text-xl font-black text-[#07116f]">
                                    สถานะคำขอปัจจุบัน
                                </h1>
                                <p className="mt-1 text-sm text-gray-400">
                                    ปีการศึกษา {selectedStudent?.academicYear || "-"}{" "}
                                    ภาคการศึกษาที่ {selectedStudent?.semester || "-"}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* <button
                                    type="button"
                                    onClick={() => refreshSelectedStudentDetail()}
                                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-[#07116f] transition hover:bg-gray-50"
                                >
                                    🔄 รีเฟรช
                                </button> */}

                                <button
                                    type="button"
                                    onClick={() => setPage?.("studentProfiles")}
                                    className="rounded-xl bg-[#eef5ff] px-4 py-2 text-sm font-black text-[#07116f] transition hover:bg-blue-100"
                                >
                                    ดูรายละเอียดทั้งหมด
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                            {steps.map((step, index) => {
                                const isActive = index === activeIndex;

                                return (
                                    <div
                                        key={step.label}
                                        className="rounded-2xl bg-[#f8fbff] p-4"
                                    >
                                        <div
                                            className={`flex h-11 w-11 items-center justify-center rounded-full text-base font-black ${step.done
                                                ? "bg-green-500 text-white"
                                                : step.needsFix
                                                    ? "bg-red-500 text-white"
                                                    : isActive
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-gray-200 text-gray-400"
                                                }`}
                                        >
                                            {step.done ? "✓" : step.needsFix ? "✕" : index + 1}
                                        </div>

                                        <p className="mt-3 text-sm font-black text-[#07116f]">
                                            {step.label}
                                        </p>

                                        <p
                                            className={`mt-0.5 text-xs font-bold ${step.done
                                                ? "text-green-600"
                                                : step.needsFix
                                                    ? "text-red-600"
                                                    : isActive
                                                        ? "text-blue-600"
                                                        : "text-gray-400"
                                                }`}
                                        >
                                            {step.statusText}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* การแจ้งเตือน */}
                    <div className="flex w-full flex-col justify-between rounded-[24px] bg-[#07116f] p-6 text-white shadow-md lg:w-72 lg:shrink-0">
                        <div>
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xl">
                                🔔
                            </div>

                            <h2 className="mt-4 text-lg font-black">การแจ้งเตือน</h2>

                            <p className="mt-2 text-sm leading-6 text-blue-100">
                                {needsAttention
                                    ? `มีเอกสารที่ต้องแก้ไข กรุณาตรวจสอบหมายเหตุจากเจ้าหน้าที่${latestRemark ? `: "${latestRemark}"` : ""
                                    }`
                                    : "ไม่มีรายการที่ต้องดำเนินการเพิ่มเติมในขณะนี้"}
                            </p>
                        </div>

                        {needsAttention && (
                            <button
                                type="button"
                                onClick={() => setPage?.("uploadDocuments")}
                                className="mt-5 h-12 rounded-xl bg-white font-black text-[#07116f] transition hover:bg-blue-50"
                            >
                                ตรวจสอบเอกสารของฉัน
                            </button>
                        )}
                    </div>
                </div>

                {/* ประวัติการยื่นคำขอ — รายละเอียดการตรวจ/ตีกลับแต่ละไฟล์ */}
                <section className="overflow-hidden rounded-[24px] bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-[#07116f] px-6 py-4 text-white lg:px-8">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg">
                                🕓
                            </div>
                            <h2 className="text-base font-black md:text-lg">
                                ประวัติการยื่นคำขอ
                            </h2>
                        </div>

                        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                            ประเภทการกู้ยืม: {selectedStudent?.loanTypeName || "-"}
                        </span>
                    </div>

                    {documentReviewHistory.length === 0 ? (
                        <div className="px-6 py-10 text-center text-sm text-gray-400 lg:px-8">
                            ยังไม่มีประวัติการตรวจเอกสาร
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-[#f7f9fc] text-xs text-gray-500">
                                        <th className="px-6 py-3 lg:px-8">วันที่/เวลา</th>
                                        <th className="px-4 py-3">ไฟล์เอกสาร</th>
                                        <th className="px-4 py-3 text-center">รอบที่</th>
                                        <th className="px-4 py-3">ผลการตรวจ</th>
                                        <th className="px-4 py-3">ผู้ตรวจ</th>
                                        <th className="px-4 py-3">เหตุผล</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documentReviewHistory
                                        .slice()
                                        .reverse()
                                        .map((item, index) => (
                                            <tr
                                                key={`${item.reviewedAt}-${index}`}
                                                className="border-b border-gray-50 last:border-b-0"
                                            >
                                                <td className="px-6 py-3 text-xs font-bold text-gray-500 lg:px-8">
                                                    {formatDateTime(item.reviewedAt)}
                                                </td>
                                                <td className="px-4 py-3 text-xs font-black text-[#07116f]">
                                                    {item.documentName}
                                                    <span className="ml-1 font-normal text-gray-400">
                                                        (v{item.versionNo})
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center text-xs font-black text-gray-600">
                                                    {item.round}
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 font-black ${item.newStatusLabel === "ผ่าน"
                                                            ? "bg-green-100 text-green-700"
                                                            : item.newStatusLabel === "ต้องแก้ไข"
                                                                ? "bg-red-100 text-red-700"
                                                                : "bg-yellow-100 text-yellow-700"
                                                            }`}
                                                    >
                                                        {item.newStatusLabel}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-500">
                                                    {item.reviewedByName}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-500">
                                                    {item.reason}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </section>
        </main>
    );
}

export default Status;