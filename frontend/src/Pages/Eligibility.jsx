import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import {
    fetchApplicationPeriods,
    fetchStudentDetail,
    uploadStudentDocument,
} from "../services/api";

// แปลงวันที่ให้อ่านง่าย เช่น "9 ส.ค. 2569" แทน ISO timestamp ดิบๆ
function formatThaiDate(dateStr) {
    if (!dateStr) return "-";

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(date);
}

/*
|--------------------------------------------------------------------------
| เกณฑ์คัดกรอง — ใช้ชุดเดียวกันทั้งหน้า (ตรงกับ backend)
|--------------------------------------------------------------------------
|   - GPAX ต้อง "มากกว่า" 1.80
|   - ผู้กู้รายใหม่: จิตอาสาต้อง "มากกว่า" 1 ชั่วโมง
|   - ผู้กู้ต่อเนื่อง: จิตอาสาต้อง "มากกว่าหรือเท่ากับ" 36 ชั่วโมง
*/
const MIN_GPAX = 1.8;

function minHoursOf(loanTypeCode) {
    return loanTypeCode === "NEW" ? 1 : 36;
}

function isGpaxPassed(gpax) {
    return Number(gpax) > MIN_GPAX;
}

function isHoursPassed(hours, loanTypeCode) {
    const value = Number(hours);
    return loanTypeCode === "NEW" ? value > 1 : value >= 36;
}

function hoursCriteriaTextOf(loanTypeCode) {
    return loanTypeCode === "NEW" ? "มากกว่า 1 ชั่วโมง" : "ตั้งแต่ 36 ชั่วโมงขึ้นไป";
}

// รหัสเอกสารหลักฐานคัดกรองใน backend
const GPAX_CODE = "GPAX_EVIDENCE";
const VOLUNTEER_CODE = "VOLUNTEER_EVIDENCE";

// ขนาด/ระยะที่ใช้ร่วมกันทั้งหน้า (ชุดเดียวกับหน้าข้อมูลของฉัน / แก้ไขข้อมูล)
const PAGE_MAIN = "w-full px-4 py-6 sm:px-6 lg:px-10 2xl:px-14";
const PAGE_WRAP = "mx-auto flex w-full max-w-[1440px] flex-col gap-5";
const CARD = "overflow-hidden rounded-2xl bg-white shadow-sm";
const PRIMARY_BTN =
    "h-12 rounded-xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-8 text-base font-black text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50";

function Eligibility({ setPage }) {
    const {
        selectedStudent,
        updateSelectedStudent,
        hasOwnApplication,
        createNewApplication,
        currentUser,
    } = useApp();

    // เก็บผลลัพธ์ตอนเพิ่งสร้างคำร้องสำเร็จไว้ที่ระดับบนสุดนี้ — พอสร้างสำเร็จ
    // hasOwnApplication จะเปลี่ยนทันที ทำให้ NewApplicationForm ถูก unmount
    const [justCreatedResult, setJustCreatedResult] = useState(null);

    const [gpax, setGpax] = useState(selectedStudent?.gpax ?? "");
    const [hours, setHours] = useState(selectedStudent?.volunteerHours ?? "");
    const [gpaxFile, setGpaxFile] = useState(null);
    const [hoursFile, setHoursFile] = useState(null);
    const [result, setResult] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // รีเซ็ตฟอร์มเมื่อเปลี่ยนคำร้อง — ทำระหว่าง render แทน useEffect ตามแนวทางของ React
    // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
    const [prevStudent, setPrevStudent] = useState(selectedStudent);
    if (prevStudent !== selectedStudent) {
        setPrevStudent(selectedStudent);
        setGpax(selectedStudent?.gpax ?? "");
        setHours(selectedStudent?.volunteerHours ?? "");
        setGpaxFile(null);
        setHoursFile(null);
        setResult(null);
    }

    // ใช้ค่าสถานะดิบ (PASSED/FAILED/NOT_REQUIRED/PENDING) ตรงๆ
    const rawEligibilityStatus = selectedStudent?.eligibilityStatus;
    // ผ่านจริง หรือไม่ต้องตรวจ (เทอม 2) ถือว่าไปต่อหน้าอัปโหลดเอกสารได้
    const alreadyPassed =
        rawEligibilityStatus === "PASSED" ||
        rawEligibilityStatus === "NOT_REQUIRED";
    const alreadyFailed = rawEligibilityStatus === "FAILED";

    const semesterTwo = Number(selectedStudent?.semester) === 2;

    const loanTypeCode = selectedStudent?.loanTypeCode;
    const minHours = minHoursOf(loanTypeCode);

    const handleCheck = async () => {
        if (selectedStudent?.periodOpen === false) {
            setResult({
                pass: false,
                errors: [
                    selectedStudent?.periodMessage || "ยังไม่เปิดให้ยื่นเอกสารในขณะนี้",
                ],
            });
            return;
        }

        // เทอม 2 ไม่ต้องคัดกรอง — ใช้รหัส NOT_REQUIRED ให้ตรงกับที่ App.jsx เช็ค
        // ไม่สั่งเปลี่ยนหน้าเอง หน้าจะเปลี่ยนเป็นการ์ด "ผ่านแล้ว" พร้อมปุ่มไปอัปโหลดเอกสาร
        if (semesterTwo) {
            updateSelectedStudent({
                ...selectedStudent,
                eligibilityCompleted: true,
                eligibilityStatus: "NOT_REQUIRED",
                applicationStatus: "รออัปโหลดเอกสาร",
            });
            return;
        }

        const errors = [];

        if (gpax === "" || gpax === null || gpax === undefined) {
            errors.push("กรุณากรอกเกรดเฉลี่ยสะสม GPAX");
        } else if (!isGpaxPassed(gpax)) {
            errors.push("GPAX ต้องมากกว่า 1.80");
        }

        if (hours === "" || hours === null || hours === undefined) {
            errors.push("กรุณากรอกจำนวนชั่วโมงจิตอาสา");
        } else if (!isHoursPassed(hours, loanTypeCode)) {
            errors.push(`ชั่วโมงจิตอาสาต้อง${hoursCriteriaTextOf(loanTypeCode)}`);
        }

        if (!gpaxFile) errors.push("กรุณาแนบไฟล์หลักฐาน GPAX");
        if (!hoursFile) errors.push("กรุณาแนบไฟล์หลักฐานชั่วโมงจิตอาสา");

        if (errors.length > 0) {
            setResult({ pass: false, errors });
            return;
        }

        // หา requirementId จริงของหลักฐาน 2 รายการจากคำร้องนี้
        const requiredDocs = selectedStudent?.requiredDocuments || [];
        const gpaxRequirement = requiredDocs.find((doc) => doc.documentCode === GPAX_CODE);
        const hoursRequirement = requiredDocs.find((doc) => doc.documentCode === VOLUNTEER_CODE);

        if (!gpaxRequirement || !hoursRequirement) {
            setResult({
                pass: false,
                errors: [
                    "ไม่พบรายการเอกสาร GPAX หรือจิตอาสาในคำร้องนี้ กรุณาโหลดหน้าใหม่ หรือติดต่อเจ้าหน้าที่",
                ],
            });
            return;
        }

        // อัปโหลดไฟล์ขึ้น backend จริง (เดิมเก็บไว้แค่ในหน้าเว็บ ทำให้หน้าสถานะขึ้นว่ายังไม่ได้ส่ง)
        setSubmitting(true);

        try {
            await uploadStudentDocument(selectedStudent.id, {
                file: gpaxFile,
                requirementId: gpaxRequirement.requirementId,
                uploadedBy: selectedStudent.studentUserId,
            });

            await uploadStudentDocument(selectedStudent.id, {
                file: hoursFile,
                requirementId: hoursRequirement.requirementId,
                uploadedBy: selectedStudent.studentUserId,
            });
        } catch (err) {
            setSubmitting(false);
            setResult({
                pass: false,
                errors: [`อัปโหลดหลักฐานไม่สำเร็จ ${err?.message || ""} กรุณาลองใหม่อีกครั้ง`.trim()],
            });
            return;
        }

        setSubmitting(false);

        // ใช้รหัส PASSED ให้ตรงกับที่ App.jsx เช็ค — หน้าจะเปลี่ยนเป็นการ์ด "ผ่านแล้ว" เอง
        updateSelectedStudent({
            ...selectedStudent,
            gpax: Number(gpax),
            volunteerHours: Number(hours),
            eligibilityCompleted: true,
            eligibilityStatus: "PASSED",
            applicationStatus: "รออัปโหลดเอกสาร",
        });
    };

    // จังหวะที่เพิ่งสร้างคำร้องสำเร็จ
    if (justCreatedResult) {
        const uploadProblems = justCreatedResult.uploadProblems || [];

        return (
            <main className={PAGE_MAIN}>
                <section className={PAGE_WRAP}>
                    <PageHeader subtitle="ขั้นตอนการคัดกรองคุณสมบัติ" title={currentUser?.fullName || "-"} />

                    <section className={CARD}>
                        <SectionHeader
                            icon="✅"
                            title="ผ่านการคัดกรองคุณสมบัติแล้ว"
                            subtitle="สร้างคำร้องกู้ยืมสำเร็จแล้ว ขั้นตอนถัดไปคืออัปโหลดเอกสาร"
                        />

                        {uploadProblems.length > 0 && (
                            <div className="mx-5 mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-base font-bold text-amber-800 lg:mx-8">
                                อัปโหลด {uploadProblems.join(" และ ")} ไม่สำเร็จ ระบบจะให้แนบรายการนี้อีกครั้งในหน้าอัปโหลดเอกสาร
                            </div>
                        )}

                        <ResultBody
                            icon="✅"
                            tone="green"
                            text="คำร้องนี้ผ่านการคัดกรองคุณสมบัติเบื้องต้นเรียบร้อยแล้ว กดปุ่มด้านล่างเพื่อไปอัปโหลดเอกสารประกอบ"
                            action={
                                <button type="button" onClick={() => setPage("uploadDocuments")} className={PRIMARY_BTN}>
                                    ไปหน้าอัปโหลดเอกสาร →
                                </button>
                            }
                        />
                    </section>
                </section>
            </main>
        );
    }

    // ถ้าบัญชีนี้ยังไม่มีคำร้องเลย ให้ไปหน้าสร้างคำร้องก่อน
    if (!hasOwnApplication) {
        return (
            <NewApplicationForm
                setPage={setPage}
                currentUser={currentUser}
                createNewApplication={createNewApplication}
                onCreated={setJustCreatedResult}
            />
        );
    }

    return (
        <main className={PAGE_MAIN}>
            <section className={PAGE_WRAP}>
                <PageHeader
                    subtitle="ขั้นตอนการคัดกรองคุณสมบัติ"
                    title={selectedStudent?.fullName || "ไม่พบชื่อนักศึกษา"}
                    chips={[
                        `ภาคเรียนที่ ${selectedStudent?.semester || "-"}`,
                        selectedStudent?.loanTypeName || "-",
                    ]}
                />

                {/* การ์ดสรุป 4 ใบ */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard icon="🎓" label="ประเภทผู้กู้" value={selectedStudent?.loanTypeName || "-"} />
                    <StatCard icon="📚" label="ภาคการศึกษา" value={`ภาคเรียนที่ ${selectedStudent?.semester || "-"}`} />
                    <StatCard icon="📊" label="เกณฑ์ GPAX" value={semesterTwo ? "ไม่ต้องตรวจ" : "มากกว่า 1.80"} />
                    <StatCard
                        icon="🤝"
                        label="เกณฑ์จิตอาสา"
                        value={semesterTwo ? "ไม่ต้องตรวจ" : hoursCriteriaTextOf(loanTypeCode)}
                    />
                </div>

                {alreadyPassed ? (
                    <div className={CARD}>
                        <SectionHeader
                            icon="✅"
                            title="ผ่านการคัดกรองคุณสมบัติแล้ว"
                            subtitle="สามารถไปขั้นตอนอัปโหลดเอกสารได้เลย"
                        />
                        <ResultBody
                            icon="✅"
                            tone="green"
                            text="คำร้องนี้ผ่านการคัดกรองคุณสมบัติเบื้องต้นเรียบร้อยแล้ว กดปุ่มด้านล่างเพื่อไปอัปโหลดเอกสารประกอบ"
                            action={
                                <button type="button" onClick={() => setPage("uploadDocuments")} className={PRIMARY_BTN}>
                                    ไปหน้าอัปโหลดเอกสาร →
                                </button>
                            }
                        />
                    </div>
                ) : alreadyFailed ? (
                    <div className={CARD}>
                        <SectionHeader
                            icon="⚠️"
                            title="ไม่ผ่านเกณฑ์คัดกรองคุณสมบัติ"
                            subtitle="GPAX หรือชั่วโมงจิตอาสายังไม่ถึงเกณฑ์ที่กำหนด"
                        />
                        <ResultBody
                            icon="⚠️"
                            tone="red"
                            text={`คำร้องของภาคการศึกษานี้ไม่ผ่านเกณฑ์คัดกรองคุณสมบัติเบื้องต้น (GPAX: ${selectedStudent?.gpax ?? "-"
                                }, ชั่วโมงจิตอาสา: ${selectedStudent?.volunteerHours ?? "-"} ชั่วโมง) กรุณาติดต่อเจ้าหน้าที่หากมีข้อสงสัยเกี่ยวกับผลการคัดกรอง`}
                        />
                    </div>
                ) : selectedStudent?.periodOpen === false ? (
                    <div className={CARD}>
                        <SectionHeader
                            icon="🚫"
                            title="ยังไม่เปิดให้ยื่นเอกสาร"
                            subtitle="เจ้าหน้าที่ยังไม่เปิดช่วงเวลารับยื่นกู้สำหรับเทอมนี้"
                        />
                        <ResultBody
                            icon="🚫"
                            tone="red"
                            heading="ไม่สามารถคัดกรองได้ เนื่องจากยังไม่เปิดให้ยื่นเอกสาร"
                            text={selectedStudent?.periodMessage || "กรุณารอประกาศเปิดรับยื่นกู้จากเจ้าหน้าที่"}
                        />
                    </div>
                ) : semesterTwo ? (
                    <div className={CARD}>
                        <SectionHeader
                            icon="✅"
                            title="ผลการคัดกรอง"
                            subtitle="ภาคเรียนที่ 2 ไม่ต้องตรวจสอบคุณสมบัติ"
                        />
                        <ResultBody
                            icon="✅"
                            tone="green"
                            heading="ภาคเรียนที่ 2 ไม่ต้องคัดกรอง"
                            text="ไม่ต้องกรอก GPAX และชั่วโมงจิตอาสา กดปุ่มด้านล่างเพื่อยืนยัน แล้วไปอัปโหลดเอกสาร"
                            action={
                                <button type="button" onClick={handleCheck} className={PRIMARY_BTN}>
                                    ยืนยันและไปขั้นตอนอัปโหลดเอกสาร →
                                </button>
                            }
                        />
                    </div>
                ) : (
                    <div className={CARD}>
                        <SectionHeader
                            icon="📝"
                            title="ข้อมูลคัดกรองคุณสมบัติ"
                            subtitle="กรอก GPAX และชั่วโมงจิตอาสา พร้อมแนบหลักฐานประกอบ"
                        />

                        <div className="grid gap-4 p-5 lg:grid-cols-2 lg:p-8">
                            <CriterionCard
                                number={1}
                                title="เกรดเฉลี่ยสะสม (GPAX)"
                                criteria="มากกว่า 1.80"
                                value={gpax}
                                onChange={setGpax}
                                inputProps={{ step: "0.01", min: "0", max: "4", placeholder: "เช่น 2.48" }}
                                passed={gpax === "" ? null : isGpaxPassed(gpax)}
                                fileLabel="หลักฐานผลการเรียน (ใบแสดงผลการเรียน)"
                                file={gpaxFile}
                                onFileChange={setGpaxFile}
                            />

                            <CriterionCard
                                number={2}
                                title="ชั่วโมงจิตอาสา"
                                criteria={hoursCriteriaTextOf(loanTypeCode)}
                                unit="ชั่วโมง"
                                value={hours}
                                onChange={setHours}
                                inputProps={{ min: "0", placeholder: `เช่น ${minHours === 1 ? 2 : minHours}` }}
                                passed={hours === "" ? null : isHoursPassed(hours, loanTypeCode)}
                                fileLabel="หลักฐานชั่วโมงจิตอาสา"
                                file={hoursFile}
                                onFileChange={setHoursFile}
                            />
                        </div>

                        {result && !result.pass && (
                            <div className="mx-5 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 lg:mx-8">
                                <p className="text-base font-black">กรุณาตรวจสอบข้อมูลต่อไปนี้</p>
                                <ul className="mt-1.5 space-y-1">
                                    {result.errors.map((error, index) => (
                                        <li key={`${error}-${index}`} className="flex items-start gap-1.5 text-sm font-semibold">
                                            <span>•</span>
                                            <span>{error}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-5 lg:px-8">
                            <button
                                type="button"
                                onClick={() => setPage("studentProfiles")}
                                className="h-12 rounded-xl border border-gray-200 bg-white px-6 text-base font-black text-gray-700 shadow-sm transition hover:bg-gray-50"
                            >
                                ← กลับ
                            </button>

                            <button
                                type="button"
                                onClick={handleCheck}
                                disabled={submitting}
                                className={`${PRIMARY_BTN} flex-1 sm:max-w-xs`}
                            >
                                {submitting ? "กำลังอัปโหลดหลักฐาน..." : "ตรวจสอบคุณสมบัติ →"}
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}

/* ---------- ส่วนประกอบย่อย ---------- */

function PageHeader({ subtitle, title, note, chips = [] }) {
    return (
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#07116f] to-[#0646ff] shadow-md">
            <div className="flex items-center gap-4 p-6 text-white lg:px-8">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15 text-3xl ring-1 ring-white/20">
                    📋
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-blue-100">{subtitle}</p>
                    <h1 className="mt-1 truncate text-2xl font-black leading-tight md:text-3xl">{title}</h1>
                    {note && <p className="mt-1.5 text-base text-blue-100">{note}</p>}
                    {chips.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {chips.map((chip) => (
                                <span key={chip} className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold">
                                    {chip}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ResultBody({ icon, tone, heading, text, action }) {
    const toneBg = tone === "green" ? "bg-green-100" : "bg-red-100";
    const toneText = tone === "green" ? "text-green-700" : "text-red-700";

    return (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full text-3xl ${toneBg}`}>{icon}</div>
            {heading && <h2 className={`text-xl font-black ${toneText}`}>{heading}</h2>}
            <p className="max-w-xl text-base leading-7 text-gray-600">{text}</p>
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}

function StatCard({ icon, label, value }) {
    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm lg:p-5">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-500">{label}</p>
                    <p className="mt-1 truncate text-base font-black text-[#07116f]">{value}</p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xl">
                    {icon}
                </div>
            </div>
        </div>
    );
}

function SectionHeader({ icon, title, subtitle }) {
    return (
        <div className="bg-[#07116f] px-5 py-4 text-white lg:px-8">
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl">
                    {icon}
                </div>
                <div>
                    <h2 className="text-lg font-black md:text-xl">{title}</h2>
                    <p className="mt-0.5 text-sm text-blue-100">{subtitle}</p>
                </div>
            </div>
        </div>
    );
}

function formatFileSize(bytes) {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// การ์ดเกณฑ์ 1 ข้อ: ช่องกรอกค่า + บอกเกณฑ์ + ผลผ่าน/ไม่ผ่านทันที + แนบหลักฐานของข้อนั้นในการ์ดเดียวกัน
function CriterionCard({ number, title, criteria, unit, value, onChange, inputProps, passed, fileLabel, file, onFileChange }) {
    const border =
        passed === false ? "border-red-200" : passed && file ? "border-green-200" : "border-gray-200";

    return (
        <div className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition ${border}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#07116f] text-sm font-black text-white">
                        {number}
                    </span>
                    <div>
                        <p className="text-lg font-black text-[#07116f]">{title}</p>
                        <p className="text-sm text-gray-500">เกณฑ์: {criteria}</p>
                    </div>
                </div>
                <CriteriaChip passed={passed} />
            </div>

            <label className="mt-4 block">
                <span className="sr-only">{title}</span>
                <div className="relative">
                    <input
                        type="number"
                        inputMode="decimal"
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        {...inputProps}
                        className={`h-12 w-full rounded-xl border bg-[#f8fbff] px-4 text-lg font-bold text-gray-800 outline-none transition placeholder:text-base placeholder:font-normal placeholder:text-gray-400 focus:bg-white focus:ring-4 ${passed === false
                            ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                            : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                            } ${unit ? "pr-20" : ""}`}
                    />
                    {unit && (
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                            {unit}
                        </span>
                    )}
                </div>
            </label>

            <p className="mb-2 mt-4 text-sm font-bold text-gray-600">
                แนบ{fileLabel} <span className="text-red-500">*</span>
            </p>
            <FileDrop file={file} onChange={onFileChange} />
        </div>
    );
}

function CriteriaChip({ passed }) {
    if (passed === null || passed === undefined) {
        return <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-500">ยังไม่กรอก</span>;
    }
    return passed ? (
        <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">✓ ผ่านเกณฑ์</span>
    ) : (
        <span className="shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">ยังไม่ถึงเกณฑ์</span>
    );
}

// ช่องแนบไฟล์: ยังไม่แนบ = กล่องเส้นประกดได้ทั้งกล่อง / แนบแล้ว = แสดงชื่อไฟล์ ขนาด ปุ่มเปลี่ยนและลบ
function FileDrop({ file, onChange }) {
    const [dragging, setDragging] = useState(false);

    const pick = (event) => {
        onChange(event.target.files?.[0] || null);
        event.target.value = "";
    };

    if (file) {
        return (
            <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-xl shadow-sm">
                    {file.type === "application/pdf" ? "📄" : "🖼️"}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-green-800">{file.name}</p>
                    <p className="text-xs text-green-700">{formatFileSize(file.size)} · แนบแล้ว</p>
                </div>
                <label className="shrink-0 cursor-pointer rounded-lg px-2.5 py-1.5 text-sm font-black text-blue-700 hover:bg-white">
                    เปลี่ยน
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={pick} />
                </label>
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-black text-red-600 hover:bg-white"
                >
                    ลบ
                </button>
            </div>
        );
    }

    return (
        <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) onChange(dropped);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-5 text-center transition ${dragging ? "border-blue-500 bg-blue-50" : "border-blue-200 bg-[#f8fbff] hover:border-blue-400 hover:bg-blue-50"
                }`}
        >
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={pick} />
            <span className="text-2xl">📎</span>
            <span className="text-sm font-black text-blue-700">กดเพื่อเลือกไฟล์ หรือลากไฟล์มาวาง</span>
            <span className="text-xs text-gray-500">รองรับ PDF, JPG, PNG</span>
        </label>
    );
}

// ฟอร์มสร้างคำร้องกู้ยืมใหม่ — โผล่เฉพาะบัญชีที่ยังไม่มีคำร้องเลย
function NewApplicationForm({ setPage, currentUser, createNewApplication, onCreated }) {
    const { myProfile } = useApp();

    // ประเภทผู้กู้ดึงจากหน้า "ข้อมูลของฉัน" ถ้ายังไม่ตั้งไว้ใช้ "ผู้กู้รายใหม่"
    const loanTypeCode =
        myProfile?.loanTypeCode && myProfile.loanTypeCode !== "-" ? myProfile.loanTypeCode : "NEW";
    const [gpax, setGpax] = useState("");
    const [hours, setHours] = useState("");
    const [gpaxFile, setGpaxFile] = useState(null);
    const [hoursFile, setHoursFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // ช่วงเวลาที่เจ้าหน้าที่เปิดรับจริง
    const [periods, setPeriods] = useState([]);
    const [periodId, setPeriodId] = useState("");
    const [periodsLoading, setPeriodsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        // เปลี่ยน state เฉพาะหลังได้คำตอบจาก backend (periodsLoading เริ่มเป็น true อยู่แล้ว)
        fetchApplicationPeriods()
            .then((result) => {
                if (cancelled) return;
                const openPeriods = (result.data || []).filter((period) => period.isOpen);
                setPeriods(openPeriods);

                // เลือกช่วงที่ "วันนี้" อยู่ในช่วงก่อน ถ้าไม่เจอใช้ตัวแรกที่เปิดอยู่
                const today = new Date();
                const matching = openPeriods.find(
                    (period) => today >= new Date(period.startDate) && today <= new Date(period.endDate)
                );
                const chosen = matching || openPeriods[0];
                if (chosen) setPeriodId(String(chosen.periodId));
            })
            .catch(() => {
                if (!cancelled) setError("ไม่สามารถโหลดช่วงเวลาเปิดรับยื่นกู้ได้");
            })
            .finally(() => {
                if (!cancelled) setPeriodsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const selectedPeriod = periods.find((period) => String(period.periodId) === periodId);

    const academicYear = selectedPeriod?.academicYear || "";
    const semester = selectedPeriod?.semester || 1;
    const semesterOne = Number(semester) === 1;

    const handleSubmit = async () => {
        setError("");

        if (!selectedPeriod) {
            setError("ไม่พบช่วงเวลาที่เปิดรับยื่นกู้ในขณะนี้");
            return;
        }

        if (semesterOne && (!gpax || !hours)) {
            setError("กรุณากรอก GPAX และชั่วโมงจิตอาสาให้ครบ (บังคับสำหรับเทอม 1)");
            return;
        }

        if (semesterOne && (!gpaxFile || !hoursFile)) {
            setError("กรุณาแนบไฟล์หลักฐาน GPAX และชั่วโมงจิตอาสาให้ครบ");
            return;
        }

        // เช็คเกณฑ์ฝั่งหน้าเว็บก่อนเสมอ (ใช้เกณฑ์เดียวกับ backend) — ถ้าไม่ผ่าน ห้ามสร้างคำร้อง
        if (semesterOne) {
            const gpaxPassed = isGpaxPassed(gpax);
            const hoursPassed = isHoursPassed(hours, loanTypeCode);

            if (!gpaxPassed || !hoursPassed) {
                const reasons = [];
                if (!gpaxPassed) reasons.push("GPAX ต้องมากกว่า 1.80");
                if (!hoursPassed) reasons.push(`ชั่วโมงจิตอาสาต้อง${hoursCriteriaTextOf(loanTypeCode)}`);

                setError(`ยังไม่ผ่านเกณฑ์คุณสมบัติเบื้องต้น: ${reasons.join(", ")} กรุณาแก้ไขข้อมูลแล้วลองอีกครั้ง`);
                return;
            }
        }

        setSubmitting(true);

        let result;

        try {
            result = await createNewApplication({
                studentUserId: currentUser?.userId,
                loanTypeCode,
                academicYear,
                semester: Number(semester),
                gpax: semesterOne ? Number(gpax) : null,
                volunteerHours: semesterOne ? Number(hours) : null,
            });
        } catch (err) {
            setError(err.message || "สร้างคำร้องไม่สำเร็จ");
            setSubmitting(false);
            return;
        }

        // อัปโหลดไฟล์หลักฐาน GPAX / จิตอาสา ผูกกับคำร้องที่เพิ่งสร้าง
        // เดิมถ้าหา requirement ไม่เจอหรืออัปโหลดพัง ระบบจะข้ามไปเงียบๆ
        // ตอนนี้จะเก็บรายการที่ไม่สำเร็จไว้แจ้งผู้ใช้ และหน้าอัปโหลดเอกสารจะบังคับให้แนบใหม่
        const uploadProblems = [];

        if (semesterOne) {
            const evidences = [
                { code: GPAX_CODE, file: gpaxFile, label: "หลักฐาน GPAX" },
                { code: VOLUNTEER_CODE, file: hoursFile, label: "หลักฐานชั่วโมงจิตอาสา" },
            ];

            try {
                const detail = await fetchStudentDetail(result.applicationId);
                const requiredDocs = detail?.data?.requiredDocuments || detail?.requiredDocuments || [];

                for (const evidence of evidences) {
                    const requirement = requiredDocs.find((doc) => doc.documentCode === evidence.code);

                    if (!requirement) {
                        uploadProblems.push(evidence.label);
                        continue;
                    }

                    try {
                        await uploadStudentDocument(result.applicationId, {
                            file: evidence.file,
                            requirementId: requirement.requirementId,
                            uploadedBy: currentUser?.userId,
                        });
                    } catch {
                        uploadProblems.push(evidence.label);
                    }
                }
            } catch {
                evidences.forEach((evidence) => uploadProblems.push(evidence.label));
            }
        }

        setSubmitting(false);
        onCreated({ ...result, uploadProblems });
    };

    const currentSummary = [
        { icon: "🎓", label: "ประเภทผู้กู้", value: loanTypeLabelOf(loanTypeCode) },
        {
            icon: "📚",
            label: "ภาคการศึกษา",
            value: selectedPeriod
                ? `ปี ${academicYear} เทอม ${semester}`
                : periodsLoading
                    ? "กำลังโหลด..."
                    : "ไม่มีช่วงเปิดรับ",
        },
        { icon: "📊", label: "เกณฑ์ GPAX", value: semesterOne ? "มากกว่า 1.80" : "ไม่ต้องตรวจ" },
        {
            icon: "🤝",
            label: "เกณฑ์จิตอาสา",
            value: semesterOne ? hoursCriteriaTextOf(loanTypeCode) : "ไม่ต้องตรวจ",
        },
    ];

    // ผลเทียบเกณฑ์แบบทันที (เกณฑ์เดียวกับที่ตรวจตอนกดส่ง)
    const gpaxPassed = gpax === "" ? null : isGpaxPassed(gpax);
    const hoursPassed = hours === "" ? null : isHoursPassed(hours, loanTypeCode);

    return (
        <main className={PAGE_MAIN}>
            <section className={PAGE_WRAP}>
                <PageHeader
                    subtitle="คำขอกู้ยืมเงิน กยศ."
                    title={currentUser?.fullName || "-"}
                    note="บัญชีนี้ยังไม่มีคำร้องกู้ยืม กรุณากรอกข้อมูลเพื่อเริ่มคำร้องใหม่"
                />

                {/* การ์ดสรุป 4 ใบ */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {currentSummary.map((item) => (
                        <StatCard key={item.label} {...item} />
                    ))}
                </div>

                <section className={CARD}>
                    <SectionHeader
                        icon="📝"
                        title="สร้างคำร้องกู้ยืมเงิน กยศ."
                        subtitle="กรอกข้อมูลคัดกรองคุณสมบัติเบื้องต้น"
                    />

                    {/* ข้อมูลที่ระบบกำหนดให้ (ไม่ต้องกรอก) */}
                    <div className="grid gap-3 border-b border-gray-100 bg-[#f8fbff] p-5 sm:grid-cols-2 lg:px-8">
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
                            <div>
                                <p className="text-sm font-bold text-gray-500">ประเภทผู้กู้</p>
                                <p className="text-base font-black text-[#07116f]">{loanTypeLabelOf(loanTypeCode)}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPage("studentInfo")}
                                className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-black text-blue-700 hover:bg-blue-50"
                            >
                                แก้ไข
                            </button>
                        </div>

                        <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                            <p className="text-sm font-bold text-gray-500">ช่วงเวลาที่เปิดรับยื่นกู้</p>
                            {periodsLoading ? (
                                <p className="text-base text-gray-400">กำลังโหลด...</p>
                            ) : !selectedPeriod ? (
                                <p className="text-base font-black text-red-600">ไม่มีช่วงเวลาเปิดรับในขณะนี้</p>
                            ) : (
                                <p className="text-base font-black text-[#07116f]">
                                    ปีการศึกษา {selectedPeriod.academicYear} ภาคเรียนที่ {selectedPeriod.semester}
                                    <span className="ml-2 text-sm font-bold text-green-700">
                                        เปิดรับ {formatThaiDate(selectedPeriod.startDate)} – {formatThaiDate(selectedPeriod.endDate)}
                                    </span>
                                </p>
                            )}
                        </div>
                    </div>

                    {semesterOne ? (
                        <>
                            <div className="px-5 pt-5 lg:px-8">
                                <p className="text-base font-black text-[#07116f]">กรอกข้อมูลและแนบหลักฐานให้ครบทั้ง 2 ข้อ</p>
                                <p className="text-sm text-gray-500">ระบบจะบอกผลเทียบกับเกณฑ์ให้ทันทีที่กรอก</p>
                            </div>

                            <div className="grid gap-4 p-5 lg:grid-cols-2 lg:px-8">
                                <CriterionCard
                                    number={1}
                                    title="เกรดเฉลี่ยสะสม (GPAX)"
                                    criteria="มากกว่า 1.80"
                                    value={gpax}
                                    onChange={setGpax}
                                    inputProps={{ step: "0.01", min: "0", max: "4", placeholder: "เช่น 2.48" }}
                                    passed={gpaxPassed}
                                    fileLabel="หลักฐานผลการเรียน (ใบแสดงผลการเรียน)"
                                    file={gpaxFile}
                                    onFileChange={setGpaxFile}
                                />

                                <CriterionCard
                                    number={2}
                                    title="ชั่วโมงจิตอาสา"
                                    criteria={hoursCriteriaTextOf(loanTypeCode)}
                                    unit="ชั่วโมง"
                                    value={hours}
                                    onChange={setHours}
                                    inputProps={{ min: "0", placeholder: loanTypeCode === "NEW" ? "เช่น 2" : "เช่น 36" }}
                                    passed={hoursPassed}
                                    fileLabel="หลักฐานชั่วโมงจิตอาสา"
                                    file={hoursFile}
                                    onFileChange={setHoursFile}
                                />
                            </div>
                        </>
                    ) : (
                        selectedPeriod && (
                            <div className="m-5 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 lg:mx-8">
                                <span className="text-xl">ℹ️</span>
                                <p className="text-base font-bold text-blue-700">
                                    ภาคเรียนที่ 2 ไม่ต้องคัดกรองคุณสมบัติ ไม่ต้องกรอก GPAX ชั่วโมงจิตอาสา หรือแนบหลักฐาน
                                    กด "สร้างคำร้อง" ด้านล่างได้เลย
                                </p>
                            </div>
                        )
                    )}

                    {error && (
                        <p role="alert" className="mx-5 mb-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base font-bold text-red-700 lg:mx-8">
                            {error}
                        </p>
                    )}

                    {/* ปุ่มส่ง (ถ้ากรอกไม่ครบ จะแจ้งข้อความด้านบนตอนกด) */}
                    <div className="flex justify-end border-t border-gray-100 px-5 py-5 lg:px-8">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting || !selectedPeriod}
                            className={`${PRIMARY_BTN} w-full sm:w-auto sm:px-10`}
                        >
                            {submitting ? "กำลังสร้างคำร้อง..." : "สร้างคำร้อง →"}
                        </button>
                    </div>

                </section>
            </section>
        </main>
    );
}

function loanTypeLabelOf(code) {
    const labels = {
        NEW: "ผู้กู้รายใหม่",
        CONTINUING_SPECIAL: "ผู้กู้ต่อเนื่องกรณีพิเศษ",
        CONTINUING_YEAR: "ผู้กู้ต่อเนื่องเลื่อนชั้นปี",
    };

    return labels[code] || "-";
}

export default Eligibility;