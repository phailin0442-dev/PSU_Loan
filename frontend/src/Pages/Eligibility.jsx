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

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์ได้"));

    reader.readAsDataURL(file);
  });
}

function Eligibility({ setPage }) {
  const {
    selectedStudent,
    updateSelectedStudent,
    hasOwnApplication,
    createNewApplication,
    currentUser,
  } = useApp();

  // เก็บผลลัพธ์ตอนเพิ่งสร้างคำร้องสำเร็จไว้ที่ระดับบนสุดนี้แทนที่จะ
  // เก็บไว้ใน NewApplicationForm เอง — เพราะพอสร้างสำเร็จ hasOwnApplication
  // จะเปลี่ยนค่าทันที ทำให้ NewApplicationForm ถูกถอดออกจากหน้าจอไปเลย
  // (unmount) ก่อนจะทันโชว์ผล ถ้าเก็บ state ไว้แค่ในนั้นจะหายไปด้วย
  const [justCreatedResult, setJustCreatedResult] = useState(null);

  const [gpax, setGpax] = useState(selectedStudent?.gpax ?? "");
  const [hours, setHours] = useState(selectedStudent?.volunteerHours ?? "");
  const [gpaxFile, setGpaxFile] = useState(null);
  const [hoursFile, setHoursFile] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setGpax(selectedStudent?.gpax ?? "");
    setHours(selectedStudent?.volunteerHours ?? "");
    setGpaxFile(null);
    setHoursFile(null);
    setResult(null);
  }, [selectedStudent]);

  // ถ้าคัดกรองผ่านไปแล้วก่อนหน้านี้ (เข้ามาหน้านี้ซ้ำ) ไม่ต้องเด้งอัตโนมัติ
  // อีกต่อไป (ของเดิมเด้งทันทีโดยไม่รอข้อมูลโหลดเสร็จ เสี่ยงหน้าขาว) —
  // ให้โชว์แบนเนอร์ + ปุ่มกดไปเองแทน เหมือน pattern เดียวกับตอนสร้างคำร้อง
  // ใช้ค่าสถานะดิบตรงๆ (PASSED/FAILED/NOT_REQUIRED/PENDING) แม่นยำที่สุด
  // ไม่ปนกันระหว่าง "ตรวจแล้ว" กับ "ผ่านแล้ว" แบบที่เคยเป็นบั๊กมาก่อน
  const rawEligibilityStatus = selectedStudent?.eligibilityStatus;
  // ผ่านจริง (PASSED) หรือไม่ต้องตรวจเลย (NOT_REQUIRED เทอม 2) ถือว่า
  // ไปต่อหน้าอัปโหลดเอกสารได้ทั้งคู่
  const alreadyPassed =
    rawEligibilityStatus === "PASSED" ||
    rawEligibilityStatus === "NOT_REQUIRED";
  // ไม่ผ่านเกณฑ์จริงๆ (ต่างจาก "ยังไม่ได้ตรวจ")
  const alreadyFailed = rawEligibilityStatus === "FAILED";

  const semesterTwo = Number(selectedStudent?.semester) === 2;

  const minHours =
    selectedStudent?.loanTypeCode === "NEW" ? 1 : 36;

  const handleCheck = async () => {
    if (selectedStudent?.periodOpen === false) {
      setResult({
        pass: false,
        errors: [
          selectedStudent?.periodMessage ||
          "ยังไม่เปิดให้ยื่นเอกสารในขณะนี้",
        ],
      });
      return;
    }

    if (semesterTwo) {
      updateSelectedStudent({
        ...selectedStudent,
        eligibilityCompleted: true,
        eligibilityStatus: "ไม่ต้องตรวจภาคเรียน 2",
        applicationStatus: "รออัปโหลดเอกสาร",
      });

      setPage("uploadDocuments");
      return;
    }

    const errors = [];

    if (gpax === "" || gpax === null || gpax === undefined) {
      errors.push("กรุณากรอกเกรดเฉลี่ยสะสม GPAX");
    } else if (Number(gpax) < 1.8) {
      errors.push("GPAX ต้องไม่ต่ำกว่า 1.80");
    }

    if (hours === "" || hours === null || hours === undefined) {
      errors.push("กรุณากรอกจำนวนชั่วโมงจิตอาสา");
    } else if (Number(hours) < minHours) {
      errors.push(`ชั่วโมงจิตอาสาต้องไม่น้อยกว่า ${minHours} ชั่วโมง`);
    }

    if (!gpaxFile) errors.push("กรุณาแนบไฟล์หลักฐาน GPAX");
    if (!hoursFile) errors.push("กรุณาแนบไฟล์หลักฐานชั่วโมงจิตอาสา");

    if (errors.length > 0) {
      setResult({ pass: false, errors });
      return;
    }

    setSubmitting(true);

    const [gpaxPreviewUrl, hoursPreviewUrl] = await Promise.all([
      fileToDataUrl(gpaxFile),
      fileToDataUrl(hoursFile),
    ]);

    updateSelectedStudent({
      ...selectedStudent,
      gpax: Number(gpax),
      volunteerHours: Number(hours),
      eligibilityCompleted: true,
      eligibilityStatus: "ผ่าน",
      applicationStatus: "รออัปโหลดเอกสาร",
      qualificationDocuments: [
        {
          id: Date.now(),
          category: "GPAX_EVIDENCE",
          name: "หลักฐานผลการเรียน GPAX",
          fileName: gpaxFile.name,
          fileType: gpaxFile.type,
          fileSize: gpaxFile.size,
          previewUrl: gpaxPreviewUrl,
          status: "รอตรวจสอบ",
          remark: "",
        },
        {
          id: Date.now() + 1,
          category: "VOLUNTEER_EVIDENCE",
          name: "หลักฐานชั่วโมงจิตอาสา",
          fileName: hoursFile.name,
          fileType: hoursFile.type,
          fileSize: hoursFile.size,
          previewUrl: hoursPreviewUrl,
          status: "รอตรวจสอบ",
          remark: "",
        },
      ],
    });

    setSubmitting(false);
    setResult({ pass: true, message: "ผ่านการคัดกรอง กำลังไปหน้าอัปโหลดเอกสาร" });

    setTimeout(() => {
      setPage("uploadDocuments");
    }, 600);
  };

  // ต้องเช็คหลัง hooks ทั้งหมดเสมอ (React Hooks Rule)

  // จังหวะที่เพิ่งสร้างคำร้องสำเร็จ (จาก NewApplicationForm เรียก
  // callback ขึ้นมา) — โชว์ผลตรงนี้เลยที่ระดับบนสุด ไม่ต้องพึ่ง
  // hasOwnApplication ที่อาจจะยังไม่อัปเดตทันในรอบ render เดียวกัน
  if (justCreatedResult) {
    const passed =
      justCreatedResult.applicationStatus !== "ELIGIBILITY_FAILED";

    return (
      <main className="w-full overflow-y-auto px-4 py-4 lg:px-6">
        <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-5 rounded-[28px] bg-gradient-to-r from-[#07116f] to-[#0646ff] px-8 py-7 text-white shadow-md">
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15 text-3xl ring-2 ring-white/20">
                📋
              </div>
              <div>
                <p className="text-sm font-bold text-blue-100">
                  ขั้นตอนการคัดกรองคุณสมบัติ
                </p>
                <h1 className="mt-1 text-2xl font-black leading-tight md:text-3xl">
                  {currentUser?.fullName || "-"}
                </h1>
              </div>
            </div>
          </div>

          <section className="overflow-hidden rounded-[24px] bg-white shadow-sm">
            <SectionHeader
              icon="✅"
              title="ผ่านการคัดกรองคุณสมบัติแล้ว"
              subtitle="สร้างคำร้องกู้ยืมสำเร็จแล้ว ขั้นตอนถัดไปคืออัปโหลดเอกสาร"
            />
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">
                ✅
              </div>
              <p className="max-w-md text-sm leading-6 text-gray-500">
                คำร้องนี้ผ่านการคัดกรองคุณสมบัติเบื้องต้นเรียบร้อยแล้ว
                กดปุ่มด้านล่างเพื่อไปอัปโหลดเอกสารประกอบ
              </p>
              <button
                type="button"
                onClick={() => setPage("uploadDocuments")}
                className="h-12 rounded-xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-8 font-black text-white shadow-md transition hover:-translate-y-0.5"
              >
                ไปหน้าอัปโหลดเอกสาร →
              </button>
            </div>
          </section>
        </section>
      </main>
    );
  }

  // ถ้าบัญชีนี้ยังไม่มีคำร้องเลย (เช่นเพิ่ง register ใหม่) ให้ไปหน้า
  // สร้างคำร้องก่อน
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
    <main className="w-full overflow-y-auto px-4 py-4 lg:px-6">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        {/* Header ใหญ่ แบบเดียวกับหน้าข้อมูลของฉัน */}
        <div className="flex flex-wrap items-center justify-between gap-5 rounded-[28px] bg-gradient-to-r from-[#07116f] to-[#0646ff] px-8 py-7 text-white shadow-md">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15 text-3xl ring-2 ring-white/20">
              📋
            </div>
            <div>
              <p className="text-sm font-bold text-blue-100">
                ขั้นตอนการคัดกรองคุณสมบัติ
              </p>
              <h1 className="mt-1 text-2xl font-black leading-tight md:text-3xl">
                {selectedStudent?.fullName || "ไม่พบชื่อนักศึกษา"}
              </h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                  ภาคเรียนที่ {selectedStudent?.semester || "-"}
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                  {selectedStudent?.loanTypeName || "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* การ์ดสรุป 4 ใบ */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon="🎓"
            label="ประเภทผู้กู้"
            value={selectedStudent?.loanTypeName || "-"}
          />
          <StatCard
            icon="📚"
            label="ภาคการศึกษา"
            value={`ภาคเรียนที่ ${selectedStudent?.semester || "-"}`}
          />
          <StatCard
            icon="📊"
            label="เกณฑ์ GPAX"
            value={semesterTwo ? "ไม่ต้องตรวจ" : "มากกว่า 1.80"}
          />
          <StatCard
            icon="🤝"
            label="เกณฑ์จิตอาสา"
            value={
              semesterTwo
                ? "ไม่ต้องตรวจ"
                : `มากกว่า${selectedStudent?.loanTypeCode === "NEW" ? "" : "หรือเท่ากับ"
                } ${minHours} ชั่วโมง`
            }
          />
        </div>

        {alreadyPassed ? (
          <div className="overflow-hidden rounded-[24px] bg-white shadow-sm">
            <SectionHeader
              icon="✅"
              title="ผ่านการคัดกรองคุณสมบัติแล้ว"
              subtitle="สามารถไปขั้นตอนอัปโหลดเอกสารได้เลย"
            />
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">
                ✅
              </div>
              <p className="max-w-md text-sm leading-6 text-gray-500">
                คำร้องนี้ผ่านการคัดกรองคุณสมบัติเบื้องต้นเรียบร้อยแล้ว
                กดปุ่มด้านล่างเพื่อไปอัปโหลดเอกสารประกอบ
              </p>
              <button
                type="button"
                onClick={() => setPage("uploadDocuments")}
                className="h-12 rounded-xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-8 font-black text-white shadow-md transition hover:-translate-y-0.5"
              >
                ไปหน้าอัปโหลดเอกสาร →
              </button>
            </div>
          </div>
        ) : alreadyFailed ? (
          <div className="overflow-hidden rounded-[24px] bg-white shadow-sm">
            <SectionHeader
              icon="⚠️"
              title="ไม่ผ่านเกณฑ์คัดกรองคุณสมบัติ"
              subtitle="GPAX หรือชั่วโมงจิตอาสายังไม่ถึงเกณฑ์ที่กำหนด"
            />
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-3xl">
                ⚠️
              </div>
              <p className="max-w-md text-sm leading-6 text-gray-500">
                คำร้องของภาคการศึกษานี้ไม่ผ่านเกณฑ์คัดกรองคุณสมบัติเบื้องต้น
                (GPAX: {selectedStudent?.gpax ?? "-"}, ชั่วโมงจิตอาสา:{" "}
                {selectedStudent?.volunteerHours ?? "-"} ชั่วโมง)
                กรุณาติดต่อเจ้าหน้าที่หากมีข้อสงสัยเกี่ยวกับผลการคัดกรอง
              </p>
            </div>
          </div>
        ) : selectedStudent?.periodOpen === false ? (
          <div className="overflow-hidden rounded-[24px] bg-white shadow-sm">
            <SectionHeader
              icon="🚫"
              title="ยังไม่เปิดให้ยื่นเอกสาร"
              subtitle="เจ้าหน้าที่ยังไม่เปิดช่วงเวลารับยื่นกู้สำหรับเทอมนี้"
            />
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-3xl">
                🚫
              </div>
              <h2 className="mt-3 text-lg font-black text-red-700">
                ไม่สามารถคัดกรองได้ เนื่องจากยังไม่เปิดให้ยื่นเอกสาร
              </h2>
              <p className="mt-1 max-w-md text-sm leading-6 text-gray-500">
                {selectedStudent?.periodMessage ||
                  "กรุณารอประกาศเปิดรับยื่นกู้จากเจ้าหน้าที่"}
              </p>
            </div>
          </div>
        ) : semesterTwo ? (
          <div className="overflow-hidden rounded-[24px] bg-white shadow-sm">
            <SectionHeader
              icon="✅"
              title="ผลการคัดกรอง"
              subtitle="ภาคเรียนที่ 2 ไม่ต้องตรวจสอบคุณสมบัติ"
            />
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">
                ✅
              </div>
              <h2 className="mt-3 text-lg font-black text-green-700">
                ภาคเรียนที่ 2 ไม่ต้องคัดกรอง
              </h2>
              <p className="mt-1 max-w-md text-sm leading-6 text-gray-500">
                ไม่ต้องกรอก GPAX และชั่วโมงจิตอาสา สามารถไปอัปโหลดเอกสารได้ทันที
              </p>
              <button
                type="button"
                onClick={() => setPage("uploadDocuments")}
                className="mt-5 h-12 rounded-xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-8 font-black text-white shadow-md transition hover:-translate-y-0.5"
              >
                ไปหน้าอัปโหลดเอกสาร →
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[24px] bg-white shadow-sm">
            <SectionHeader
              icon="📝"
              title="ข้อมูลคัดกรองคุณสมบัติ"
              subtitle="กรอก GPAX และชั่วโมงจิตอาสา พร้อมแนบหลักฐานประกอบ"
            />

            <div className="flex flex-col px-6 py-2 lg:px-8">
              {/* GPAX */}
              <ListQualificationRow
                number={1}
                title="เกรดเฉลี่ยสะสม (GPAX)"
                value={gpax}
                onValueChange={setGpax}
                inputProps={{
                  type: "number",
                  step: "0.01",
                  min: "0",
                  max: "4",
                  placeholder: "2.48",
                }}
                file={gpaxFile}
                onFileChange={setGpaxFile}
              />

              {/* ชั่วโมงจิตอาสา */}
              <ListQualificationRow
                number={2}
                title="ชั่วโมงจิตอาสา"
                value={hours}
                onValueChange={setHours}
                inputProps={{
                  type: "number",
                  min: "0",
                  placeholder: String(minHours),
                }}
                file={hoursFile}
                onFileChange={setHoursFile}
              />
            </div>

            {result && !result.pass && (
              <div className="mx-6 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 lg:mx-8">
                <p className="text-sm font-black">
                  กรุณาตรวจสอบข้อมูลต่อไปนี้
                </p>
                <ul className="mt-1.5 space-y-1">
                  {result.errors.map((error, index) => (
                    <li
                      key={`${error}-${index}`}
                      className="flex items-start gap-1.5 text-xs font-semibold"
                    >
                      <span>•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result && result.pass && (
              <div className="mx-6 mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700 lg:mx-8">
                ✅ {result.message}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 px-6 pb-6 lg:px-8">
              <button
                type="button"
                onClick={() => setPage("studentProfiles")}
                className="h-11 rounded-xl border border-gray-200 bg-white px-5 text-sm font-black text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                ← กลับ
              </button>

              <button
                type="button"
                onClick={handleCheck}
                disabled={submitting}
                className="h-11 flex-1 max-w-xs rounded-xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-6 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? "กำลังตรวจสอบ..."
                  : semesterTwo
                    ? "ไปหน้าอัปโหลดเอกสาร →"
                    : "ตรวจสอบคุณสมบัติ →"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

// แถวคัดกรองแบบกระชับ: ไอคอน + หัวข้อ + เกณฑ์ + ช่องกรอกตัวเลข + ปุ่มแนบไฟล์
// รวมอยู่ในบรรทัดเดียว (แทนที่การ์ดใหญ่แยกกัน 2 การ์ดแบบเดิม)
function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-gray-500">{label}</p>
          <p className="mt-1 truncate text-sm font-black text-[#07116f]">
            {value}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg">
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="bg-[#07116f] px-6 py-4 text-white lg:px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-black md:text-lg">{title}</h2>
          <p className="mt-0.5 text-xs text-blue-100">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

// แถวเลขลำดับ + ชื่อ + ช่องกรอกตัวเลข + เส้นประ + ปุ่มแนบไฟล์
// รูปแบบ: 1  เกรดเฉลี่ยสะสม (GPAX)  [___]  ...................  [📎 แนบไฟล์]
function ListQualificationRow({
  number,
  title,
  value,
  onValueChange,
  inputProps,
  file,
  onFileChange,
}) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-100 py-3 last:border-b-0">
      {/* เลขลำดับ */}
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">
        {number}
      </span>

      {/* ชื่อหัวข้อ */}
      <span className="shrink-0 max-w-[35%] truncate text-sm font-bold text-[#07116f]">
        {title}
      </span>

      {/* ช่องกรอกตัวเลข */}
      <input
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        {...inputProps}
        className="h-9 w-20 shrink-0 rounded-lg border border-gray-200 bg-[#f8fbff] px-2 text-sm font-bold text-gray-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
      />

      {/* เส้นประนำสายตา */}
      <span className="mx-1 flex-1 border-b-2 border-dotted border-gray-300" />

      {/* ปุ่มแนบไฟล์ */}
      <CompactFileButton file={file} onChange={onFileChange} />
    </div>
  );
}

// ปุ่มแนบไฟล์ขนาดเล็ก ใช้แทน dropzone ใหญ่แบบเดิม
function CompactFileButton({ file, onChange }) {
  if (file) {
    return (
      <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-green-50 px-2.5 py-1.5">
        <span className="max-w-28 truncate text-xs font-bold text-green-700">
          {file.name}
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="shrink-0 text-xs font-black text-red-500 hover:text-red-700"
        >
          ✕
        </button>
      </span>
    );
  }

  return (
    <label className="shrink-0 cursor-pointer">
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
      />
      <span className="inline-flex items-center gap-1 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50 px-3 py-1.5 text-xs font-black text-blue-700 hover:border-blue-500 hover:bg-blue-50">
        📎 แนบไฟล์
      </span>
    </label>
  );
}

// ฟอร์มสร้างคำร้องกู้ยืมใหม่ — โผล่เฉพาะบัญชีที่ยัง "ไม่มีคำร้องเลย"
// (เช่นเพิ่ง register ใหม่ๆ) เทอม 1 ต้องกรอก GPAX/จิตอาสาไปพร้อมกันเลย
// เพราะ schema บังคับว่าเทอม 1 ต้องมีค่าตั้งแต่สร้างแถวแรก
function NewApplicationForm({
  setPage,
  currentUser,
  createNewApplication,
  onCreated,
}) {
  const { myProfile } = useApp();

  // ดึงประเภทผู้กู้จากหน้า "ข้อมูลของฉัน" (แท็บข้อมูลการกู้ยืม) มาเลย
  // ไม่ต้องให้เลือกซ้ำที่นี่อีก — ถ้ายังไม่เคยตั้งไว้เลย fallback เป็น
  // "ผู้กู้รายใหม่" ไปก่อน
  const loanTypeCode =
    myProfile?.loanTypeCode && myProfile.loanTypeCode !== "-"
      ? myProfile.loanTypeCode
      : "NEW";
  const [gpax, setGpax] = useState("");
  const [hours, setHours] = useState("");
  const [gpaxFile, setGpaxFile] = useState(null);
  const [hoursFile, setHoursFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ดึงช่วงเวลาที่เจ้าหน้าที่เปิดรับจริง (จากหน้า "ตั้งค่า") แทนให้พิมพ์
  // ปี/เทอมเอง กันพิมพ์ผิดหรือเลือกช่วงที่ปิดไปแล้ว
  const [periods, setPeriods] = useState([]);
  const [periodId, setPeriodId] = useState("");
  const [periodsLoading, setPeriodsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPeriods() {
      setPeriodsLoading(true);

      try {
        const result = await fetchApplicationPeriods();
        const openPeriods = (result.data || []).filter(
          (period) => period.isOpen
        );

        if (!cancelled) {
          setPeriods(openPeriods);

          // เลือกช่วงที่ "วันนี้" อยู่ในช่วงจริงๆ ก่อน ถ้าไม่เจอเลยค่อย
          // fallback ไปตัวแรกในลิสต์ที่เปิดอยู่
          const today = new Date();
          const matching = openPeriods.find(
            (period) =>
              today >= new Date(period.startDate) &&
              today <= new Date(period.endDate)
          );

          const chosen = matching || openPeriods[0];

          if (chosen) {
            setPeriodId(String(chosen.periodId));
          }
        }
      } catch (err) {
        if (!cancelled) setError("ไม่สามารถโหลดช่วงเวลาเปิดรับยื่นกู้ได้");
      } finally {
        if (!cancelled) setPeriodsLoading(false);
      }
    }

    loadPeriods();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPeriod = periods.find(
    (period) => String(period.periodId) === periodId
  );

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

    // เช็คเกณฑ์คุณสมบัติฝั่งหน้าเว็บก่อนเสมอ (ก่อนยิงไป backend) —
    // ถ้าไม่ผ่าน ห้ามสร้างคำร้องในฐานข้อมูลเด็ดขาด เพราะสร้างได้แค่
    // ครั้งเดียวต่อคำร้อง/เทอม ถ้าสร้างไปแล้ว "ไม่ผ่าน" ค้างไว้จะกลับมา
    // แก้ไขไม่ได้อีก — ใช้เกณฑ์เดียวกับที่ backend ตัดสินจริงเป๊ะ:
    //   - GPAX ต้อง "มากกว่า" 1.80 ทุกประเภทผู้กู้เหมือนกัน
    //   - ผู้กู้รายใหม่ (NEW): จิตอาสาต้อง "มากกว่า" 1 ชั่วโมง
    //   - ผู้กู้ต่อเนื่อง 2 ประเภท: จิตอาสาต้อง "มากกว่าหรือเท่ากับ" 36 ชม.
    if (semesterOne) {
      const numGpax = Number(gpax);
      const numHours = Number(hours);
      const minVolunteerHours = loanTypeCode === "NEW" ? 1 : 36;

      const gpaxPassed = numGpax > 1.8;
      const hoursPassed =
        loanTypeCode === "NEW"
          ? numHours > minVolunteerHours
          : numHours >= minVolunteerHours;

      if (!gpaxPassed || !hoursPassed) {
        const reasons = [];
        if (!gpaxPassed) reasons.push("GPAX ต้องมากกว่า 1.80");
        if (!hoursPassed) {
          reasons.push(
            loanTypeCode === "NEW"
              ? "ชั่วโมงจิตอาสาต้องมากกว่า 1 ชั่วโมง"
              : "ชั่วโมงจิตอาสาต้องมากกว่าหรือเท่ากับ 36 ชั่วโมง"
          );
        }

        setError(
          `ยังไม่ผ่านเกณฑ์คุณสมบัติเบื้องต้น: ${reasons.join(", ")} กรุณาแก้ไขข้อมูลแล้วลองอีกครั้ง`
        );
        return;
      }
    }

    setSubmitting(true);

    try {
      // ผ่านเกณฑ์แล้วแน่นอนถึงจะมาถึงจุดนี้ — สร้างคำร้องจริง
      // (ยังไม่มีไฟล์แนบ เพราะต้องมี application_id
      //    ก่อนถึงจะอัปโหลดเอกสารผูกกับคำร้องได้)
      const result = await createNewApplication({
        studentUserId: currentUser?.userId,
        loanTypeCode,
        academicYear,
        semester: Number(semester),
        gpax: semesterOne ? Number(gpax) : null,
        volunteerHours: semesterOne ? Number(hours) : null,
      });

      // 2) หา requirementId ของ GPAX_EVIDENCE / VOLUNTEER_EVIDENCE ของ
      //    คำร้องที่เพิ่งสร้าง แล้วอัปโหลดไฟล์แนบทั้ง 2 ไฟล์ต่อทันที
      if (semesterOne && gpaxFile && hoursFile) {
        const detail = await fetchStudentDetail(result.applicationId);
        const requiredDocs = detail.data?.requiredDocuments || [];

        const gpaxRequirement = requiredDocs.find(
          (doc) => doc.documentCode === "GPAX_EVIDENCE"
        );
        const hoursRequirement = requiredDocs.find(
          (doc) => doc.documentCode === "VOLUNTEER_EVIDENCE"
        );

        if (gpaxRequirement) {
          await uploadStudentDocument(result.applicationId, {
            file: gpaxFile,
            requirementId: gpaxRequirement.requirementId,
            uploadedBy: currentUser?.userId,
          });
        }

        if (hoursRequirement) {
          await uploadStudentDocument(result.applicationId, {
            file: hoursFile,
            requirementId: hoursRequirement.requirementId,
            uploadedBy: currentUser?.userId,
          });
        }
      }

      // ยกผลลัพธ์ขึ้นไปให้ parent (Eligibility) เก็บแทน ไม่เก็บไว้ที่
      // state ในนี้เอง เพราะพอสร้างสำเร็จ hasOwnApplication จะเปลี่ยน
      // ทันที ทำให้ component นี้ถูกถอดออกจากหน้าจอ (unmount) ก่อนจะทัน
      // โชว์ผล — ต้องยกไปเก็บที่ระดับบนสุดที่ไม่ถูก unmount แทน
      onCreated(result);
    } catch (err) {
      setError(err.message || "สร้างคำร้องไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
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
    {
      icon: "📊",
      label: "เกณฑ์ GPAX",
      value: semesterOne ? "มากกว่า 1.80" : "ไม่ต้องตรวจ",
    },
    {
      icon: "🤝",
      label: "เกณฑ์จิตอาสา",
      value: semesterOne
        ? loanTypeCode === "NEW"
          ? "มากกว่า 1 ชั่วโมง"
          : "มากกว่าหรือเท่ากับ 36 ชั่วโมง"
        : "ไม่ต้องตรวจ",
    },
  ];

  return (
    <main className="w-full overflow-y-auto px-4 py-4 lg:px-6">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        {/* Header ใหญ่ แบบเดียวกับหน้าอื่นๆ ในแอป */}
        <div className="flex flex-wrap items-center justify-between gap-5 rounded-[28px] bg-gradient-to-r from-[#07116f] to-[#0646ff] px-8 py-7 text-white shadow-md">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15 text-3xl ring-2 ring-white/20">
              📋
            </div>
            <div>
              <p className="text-sm font-bold text-blue-100">
                คำขอกู้ยืมเงิน กยศ.
              </p>
              <h1 className="mt-1 text-2xl font-black leading-tight md:text-3xl">
                {currentUser?.fullName || "-"}
              </h1>
              <p className="mt-2 text-sm text-blue-100">
                บัญชีนี้ยังไม่มีคำร้องกู้ยืม กรุณากรอกข้อมูลเพื่อเริ่มคำร้องใหม่
              </p>
            </div>
          </div>
        </div>

        {/* การ์ดสรุป 4 ใบ — อัปเดตตามค่าที่กำลังกรอกอยู่แบบสด */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {currentSummary.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>

        {/* แถบหัวข้อสีกรมท่า + ฟอร์ม */}
        <section className="overflow-hidden rounded-[24px] bg-white shadow-sm">
          <SectionHeader
            icon="📝"
            title="สร้างคำร้องกู้ยืมเงิน กยศ."
            subtitle="กรอกข้อมูลคัดกรองคุณสมบัติเบื้องต้น"
          />

          <div className="grid gap-5 p-6 sm:grid-cols-2 lg:p-8">
            {/* ดึงประเภทผู้กู้จากหน้า "ข้อมูลของฉัน" มาแสดงเฉยๆ ไม่ต้อง
                เลือกซ้ำที่นี่อีก — ถ้าอยากเปลี่ยนต้องไปแก้ที่หน้านั้น */}
            <div className="block">
              <span className="text-sm font-black text-[#07116f]">
                ประเภทผู้กู้
              </span>
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-[#f8fbff] px-4 py-3">
                <span className="text-sm font-bold text-gray-700">
                  {loanTypeLabelOf(loanTypeCode)}
                </span>
                <button
                  type="button"
                  onClick={() => setPage("studentInfo")}
                  className="text-xs font-black text-blue-600 hover:underline"
                >
                  แก้ไข
                </button>
              </div>
            </div>

            {/* ดึงช่วงเวลาที่เปิดรับจริงจากฐานข้อมูล (หน้าตั้งค่าเจ้าหน้าที่)
                ระบบเลือกช่วงที่ตรงกับวันนี้ให้อัตโนมัติ ไม่ต้องเลือกเอง */}
            <div className="block">
              <span className="text-sm font-black text-[#07116f]">
                ช่วงเวลาที่เปิดรับยื่นกู้
              </span>
              {periodsLoading ? (
                <div className="mt-2 rounded-xl border border-gray-200 bg-[#f8fbff] px-4 py-3 text-sm text-gray-400">
                  กำลังโหลด...
                </div>
              ) : !selectedPeriod ? (
                <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                  ไม่มีช่วงเวลาเปิดรับในขณะนี้
                </div>
              ) : (
                <div className="mt-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                  <p className="text-sm font-black text-green-700">
                    ปีการศึกษา {selectedPeriod.academicYear} ภาคเรียนที่{" "}
                    {selectedPeriod.semester}
                  </p>
                  <p className="mt-0.5 text-xs text-green-600">
                    เปิดรับ {formatThaiDate(selectedPeriod.startDate)} ถึง{" "}
                    {formatThaiDate(selectedPeriod.endDate)}
                  </p>
                </div>
              )}
            </div>

            {semesterOne ? (
              <>
                <label className="block">
                  <span className="text-sm font-black text-[#07116f]">
                    GPAX
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={gpax}
                    onChange={(e) => setGpax(e.target.value)}
                    placeholder="เช่น 2.48"
                    className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-[#f8fbff] px-4 font-bold outline-none focus:border-blue-500 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-[#07116f]">
                    ชั่วโมงจิตอาสา
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    placeholder="เช่น 36"
                    className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-[#f8fbff] px-4 font-bold outline-none focus:border-blue-500 focus:bg-white"
                  />
                </label>
              </>
            ) : (
              selectedPeriod && (
                <div className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <span className="text-lg">ℹ️</span>
                  <p className="text-sm font-bold text-blue-700">
                    ภาคเรียนที่ 2 ไม่ต้องคัดกรองคุณสมบัติ (ไม่ต้องกรอก GPAX /
                    ชั่วโมงจิตอาสา / แนบไฟล์หลักฐาน) ระบบข้ามขั้นตอนนี้ให้
                    อัตโนมัติ กดปุ่ม "สร้างคำร้อง" ด้านล่างได้เลย
                  </p>
                </div>
              )
            )}
          </div>

          {/* แนบไฟล์หลักฐานประกอบ — เอากลับมาตามที่ต้องการ */}
          {semesterOne && (
            <div className="border-t border-gray-100 px-6 py-4 lg:px-8">
              <p className="mb-3 text-sm font-black text-[#07116f]">
                แนบไฟล์หลักฐานประกอบ
              </p>

              <div className="flex flex-col divide-y divide-gray-50">
                <div className="flex items-center gap-3 py-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">
                    1
                  </span>
                  <span className="flex-1 text-sm font-bold text-gray-700">
                    หลักฐานผลการเรียน (GPAX)
                  </span>
                  <CompactFileButton file={gpaxFile} onChange={setGpaxFile} />
                </div>
                <div className="flex items-center gap-3 py-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">
                    2
                  </span>
                  <span className="flex-1 text-sm font-bold text-gray-700">
                    หลักฐานชั่วโมงจิตอาสา
                  </span>
                  <CompactFileButton file={hoursFile} onChange={setHoursFile} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="px-6 pb-2 text-sm font-bold text-red-600 lg:px-8">
              {error}
            </p>
          )}

          <div className="px-6 pb-6 lg:px-8">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-[#07116f] to-[#0646ff] font-black text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-10"
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