import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์ได้"));

    reader.readAsDataURL(file);
  });
}

function Eligibility({ setPage }) {
  const { selectedStudent, updateSelectedStudent } = useApp();

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

  // เมนู "คำขอกู้ยืมเงิน กยศ." รวมคัดกรอง+อัปโหลดเป็นจุดเดียวแล้ว —
  // ถ้าคัดกรองผ่านไปแล้วก่อนหน้านี้ ไม่ต้องให้กรอกซ้ำ ข้ามไปหน้าอัปโหลด
  // เอกสารตรงๆ เลย (แต่ถ้ายังไม่เคยผ่าน ค่อยแสดงฟอร์มคัดกรองตามปกติ)
  useEffect(() => {
    if (selectedStudent?.eligibilityCompleted) {
      setPage("uploadDocuments");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent?.id, selectedStudent?.eligibilityCompleted]);

  const semesterTwo = Number(selectedStudent?.semester) === 2;

  const minHours =
    selectedStudent?.loanTypeCode === "NEW_BORROWER" ? 2 : 36;

  const handleCheck = async () => {
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
            value={semesterTwo ? "ไม่ต้องตรวจ" : "ไม่น้อยกว่า 1.80"}
          />
          <StatCard
            icon="🤝"
            label="เกณฑ์จิตอาสา"
            value={semesterTwo ? "ไม่ต้องตรวจ" : `${minHours} ชั่วโมง`}
          />
        </div>

        {semesterTwo ? (
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
          </div>
        )}

        {result && !result.pass && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <p className="text-sm font-black">กรุณาตรวจสอบข้อมูลต่อไปนี้</p>
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
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
            ✅ {result.message}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pb-2">
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

export default Eligibility;