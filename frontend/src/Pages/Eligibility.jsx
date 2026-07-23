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

  const [gpax, setGpax] = useState(
    selectedStudent?.gpax ?? ""
  );

  const [hours, setHours] = useState(
    selectedStudent?.volunteerHours ?? ""
  );

  const [gpaxFile, setGpaxFile] = useState(null);
  const [hoursFile, setHoursFile] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    setGpax(selectedStudent?.gpax ?? "");
    setHours(
      selectedStudent?.volunteerHours ?? ""
    );

    setGpaxFile(null);
    setHoursFile(null);
    setResult(null);
  }, [selectedStudent]);

  const semesterTwo =
    Number(selectedStudent?.semester) === 2;

  const minHours =
    selectedStudent?.loanTypeCode ===
      "NEW_BORROWER"
      ? 2
      : 36;

  const handleCheck = async () => {
    if (semesterTwo) {
      updateSelectedStudent({
        ...selectedStudent,
        eligibilityCompleted: true,
        eligibilityStatus:
          "ไม่ต้องตรวจภาคเรียน 2",
        applicationStatus:
          "รออัปโหลดเอกสาร",
      });

      setResult({
        pass: true,
        message:
          "ภาคเรียนที่ 2 ไม่ต้องตรวจสอบ GPAX และชั่วโมงจิตอาสา",
      });

      setTimeout(() => {
        setPage("uploadDocuments");
      }, 700);

      return;
    }

    const errors = [];

    if (
      gpax === "" ||
      gpax === null ||
      gpax === undefined
    ) {
      errors.push(
        "กรุณากรอกเกรดเฉลี่ยสะสม GPAX"
      );
    } else if (Number(gpax) < 1.8) {
      errors.push(
        "เกรดเฉลี่ยสะสม GPAX ต้องไม่ต่ำกว่า 1.80"
      );
    }

    if (
      hours === "" ||
      hours === null ||
      hours === undefined
    ) {
      errors.push(
        "กรุณากรอกจำนวนชั่วโมงจิตอาสา"
      );
    } else if (Number(hours) < minHours) {
      errors.push(
        `ชั่วโมงจิตอาสาต้องไม่น้อยกว่า ${minHours} ชั่วโมง`
      );
    }

    if (!gpaxFile) {
      errors.push(
        "กรุณาแนบไฟล์หลักฐาน GPAX"
      );
    }

    if (!hoursFile) {
      errors.push(
        "กรุณาแนบไฟล์หลักฐานชั่วโมงจิตอาสา"
      );
    }

    if (errors.length > 0) {
      setResult({
        pass: false,
        errors,
      });

      return;
    }

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

      applicationStatus:
        "รออัปโหลดเอกสาร",

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

    setResult({
      pass: true,
      message:
        "ผ่านการคัดกรอง กำลังไปยังหน้าอัปโหลดเอกสาร",
    });

    setTimeout(() => {
      setPage("uploadDocuments");
    }, 700);
  };

  return (
    <main className="w-full px-6 py-8 lg:px-12">
      <section className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-[32px] bg-gradient-to-r from-[#07116f] to-[#0646ff] shadow-lg">
          <div className="flex flex-col gap-6 p-8 text-white md:flex-row md:items-center md:justify-between lg:p-10">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/15 text-4xl ring-1 ring-white/20">
                📋
              </div>

              <div>
                <p className="text-sm font-black text-blue-100">
                  ขั้นตอนการตรวจสอบคุณสมบัติ
                </p>

                <h1 className="mt-2 text-3xl font-black md:text-4xl">
                  คัดกรองคุณสมบัติ
                </h1>

                <p className="mt-2 text-sm leading-6 text-blue-100">
                  {selectedStudent?.fullName ||
                    "ไม่พบชื่อนักศึกษา"}
                  {" · "}
                  {selectedStudent?.loanTypeName ||
                    "ยังไม่ได้ระบุประเภทผู้กู้"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white/15 px-5 py-4 ring-1 ring-white/20">
              <p className="text-xs font-bold text-blue-100">
                ภาคการศึกษา
              </p>

              <p className="mt-1 text-xl font-black">
                ภาคเรียนที่{" "}
                {selectedStudent?.semester ||
                  "-"}
              </p>
            </div>
          </div>
        </div>

        <section className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon="🎓"
            label="ประเภทผู้กู้"
            value={
              selectedStudent?.loanTypeName ||
              "-"
            }
          />

          <SummaryCard
            icon="📊"
            label="เกณฑ์ GPAX"
            value="ไม่น้อยกว่า 1.80"
          />

          <SummaryCard
            icon="🤝"
            label="เกณฑ์จิตอาสา"
            value={`${minHours} ชั่วโมง`}
          />

          <SummaryCard
            icon="📚"
            label="ภาคเรียน"
            value={`ภาคเรียนที่ ${selectedStudent?.semester || "-"
              }`}
          />
        </section>

        {semesterTwo ? (
          <section className="mt-7 overflow-hidden rounded-[28px] bg-white shadow-sm">
            <SectionHeader
              icon="✅"
              title="ภาคเรียนที่ 2"
              subtitle="ไม่ต้องตรวจสอบ GPAX และชั่วโมงจิตอาสา"
            />

            <div className="p-6 lg:p-8">
              <div className="flex flex-col items-center justify-center rounded-3xl border border-green-200 bg-green-50 px-6 py-12 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
                  ✅
                </div>

                <h2 className="mt-5 text-2xl font-black text-green-700">
                  ไม่ต้องกรอกข้อมูลคุณสมบัติ
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-7 text-green-600">
                  ภาคเรียนที่ 2
                  นักศึกษาไม่ต้องกรอก GPAX
                  และชั่วโมงจิตอาสา
                  สามารถดำเนินการอัปโหลดเอกสารได้ทันที
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="mt-7 overflow-hidden rounded-[28px] bg-white shadow-sm">
              <SectionHeader
                icon="👤"
                title="ประเภทผู้กู้ยืม"
                subtitle="ระบบใช้ประเภทผู้กู้จากข้อมูลนักศึกษาเพื่อกำหนดเกณฑ์การคัดกรอง"
              />

              <div className="p-6 lg:p-8">
                <div className="grid gap-4 md:grid-cols-3">
                  <LoanTypeOption
                    checked={
                      selectedStudent?.loanTypeCode ===
                      "NEW_BORROWER"
                    }
                    title="ผู้กู้รายใหม่"
                    description="ชั่วโมงจิตอาสาไม่น้อยกว่า 2 ชั่วโมง"
                  />

                  <LoanTypeOption
                    checked={
                      selectedStudent?.loanTypeCode ===
                      "CONTINUING_YEAR"
                    }
                    title="ผู้กู้ต่อเนื่องเลื่อนชั้นปี"
                    description="ชั่วโมงจิตอาสาไม่น้อยกว่า 36 ชั่วโมง"
                  />

                  <LoanTypeOption
                    checked={
                      selectedStudent?.loanTypeCode ===
                      "CONTINUING_SPECIAL"
                    }
                    title="ผู้กู้ต่อเนื่องกรณีพิเศษ"
                    description="ย้ายสาขาหรือกู้เกินหลักสูตร จิตอาสาไม่น้อยกว่า 36 ชั่วโมง"
                  />
                </div>

                <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                  <p className="text-sm font-black text-blue-700">
                    ประเภทผู้กู้ที่ระบบกำลังตรวจสอบ
                  </p>

                  <p className="mt-2 text-lg font-black text-[#07116f]">
                    {selectedStudent?.loanTypeName ||
                      "-"}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    หากต้องการเปลี่ยนประเภทผู้กู้
                    กรุณากลับไปแก้ไขในหน้าข้อมูลนักศึกษา
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-7 grid gap-7 lg:grid-cols-2">
              <QualificationCard
                icon="🎓"
                number="1"
                title="เกรดเฉลี่ยสะสม GPAX"
                description="ผู้กู้ทุกประเภทต้องมี GPAX ไม่ต่ำกว่า 1.80"
              >
                <Input
                  label="เกรดเฉลี่ยสะสม GPAX"
                  value={gpax}
                  onChange={setGpax}
                  type="number"
                  placeholder="เช่น 2.48"
                  step="0.01"
                  min="0"
                  max="4"
                />

                <FileUpload
                  label="แนบไฟล์หลักฐาน GPAX"
                  description="ไฟล์ผลการเรียนหรือภาพหน้าจอผลการศึกษา"
                  file={gpaxFile}
                  onChange={setGpaxFile}
                />
              </QualificationCard>

              <QualificationCard
                icon="🤝"
                number="2"
                title="ชั่วโมงจิตอาสา"
                description={`ประเภทผู้กู้นี้ต้องมีชั่วโมงจิตอาสาไม่น้อยกว่า ${minHours} ชั่วโมง`}
              >
                <Input
                  label="จำนวนชั่วโมงจิตอาสา"
                  value={hours}
                  onChange={setHours}
                  type="number"
                  placeholder={`เช่น ${minHours}`}
                  min="0"
                />

                <FileUpload
                  label="แนบหลักฐานชั่วโมงจิตอาสา"
                  description="ไฟล์ใบรับรองหรือหลักฐานการเข้าร่วมกิจกรรม"
                  file={hoursFile}
                  onChange={setHoursFile}
                />
              </QualificationCard>
            </section>
          </>
        )}

        {result && !result.pass && (
          <div className="mt-7 rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-2xl">
                ⚠️
              </div>

              <div>
                <p className="text-lg font-black">
                  ไม่ผ่านการคัดกรอง
                </p>

                <p className="mt-1 text-sm">
                  กรุณาตรวจสอบและแก้ไขข้อมูลต่อไปนี้
                </p>

                <ul className="mt-4 space-y-2">
                  {result.errors.map(
                    (error, index) => (
                      <li
                        key={`${error}-${index}`}
                        className="flex items-start gap-2 text-sm font-semibold"
                      >
                        <span>•</span>
                        <span>{error}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {result && result.pass && (
          <div className="mt-7 rounded-3xl border border-green-200 bg-green-50 p-6 text-green-700">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-2xl">
                ✅
              </div>

              <div>
                <p className="text-lg font-black">
                  ผ่านการคัดกรอง
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {result.message}
                  ...
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() =>
              setPage("studentProfiles")
            }
            className="h-14 rounded-2xl border border-gray-200 bg-white px-8 font-black text-gray-700 shadow-sm transition hover:bg-gray-50 hover:shadow-md"
          >
            ← กลับหน้าข้อมูล
          </button>

          <button
            type="button"
            onClick={handleCheck}
            className="h-14 rounded-2xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-10 font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl sm:min-w-72"
          >
            {semesterTwo
              ? "ไปหน้าอัปโหลดเอกสาร →"
              : "ตรวจสอบคุณสมบัติ →"}
          </button>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="rounded-[24px] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-500">
            {label}
          </p>

          <p className="mt-2 font-black text-[#07116f]">
            {value || "-"}
          </p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-2xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}) {
  return (
    <div className="bg-[#07116f] px-6 py-5 text-white lg:px-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-2xl">
          {icon}
        </div>

        <div>
          <h2 className="text-xl font-black md:text-2xl">
            {title}
          </h2>

          <p className="mt-1 text-sm text-blue-100">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

function LoanTypeOption({
  checked,
  title,
  description,
}) {
  return (
    <div
      className={`rounded-2xl border-2 p-5 transition ${checked
        ? "border-blue-600 bg-blue-50 shadow-sm"
        : "border-gray-100 bg-gray-50 opacity-60"
        }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${checked
            ? "border-blue-600 bg-blue-600 text-white"
            : "border-gray-300 bg-white"
            }`}
        >
          {checked && (
            <span className="text-xs">
              ✓
            </span>
          )}
        </div>

        <div>
          <p className="font-black text-[#07116f]">
            {title}
          </p>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function QualificationCard({
  icon,
  number,
  title,
  description,
  children,
}) {
  return (
    <section className="overflow-hidden rounded-[28px] bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-[#f8fbff] p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
            {icon}
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-wider text-blue-500">
              หัวข้อที่ {number}
            </p>

            <h2 className="mt-1 text-xl font-black text-[#07116f]">
              {title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6 lg:p-8">
        {children}
      </div>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  ...inputProps
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-[#07116f]">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="mt-2 h-14 w-full rounded-2xl border border-gray-200 bg-[#f8fbff] px-5 font-semibold text-gray-800 outline-none transition placeholder:font-normal placeholder:text-gray-400 hover:border-blue-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
        {...inputProps}
      />
    </label>
  );
}

function FileUpload({
  label,
  description,
  file,
  onChange,
}) {
  return (
    <label className="block cursor-pointer">
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(event) =>
          onChange(
            event.target.files?.[0] ||
            null
          )
        }
      />

      <div
        className={`flex min-h-44 flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 text-center transition ${file
          ? "border-green-400 bg-green-50"
          : "border-blue-200 bg-blue-50/50 hover:border-blue-500 hover:bg-blue-50"
          }`}
      >
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full text-3xl ${file
            ? "bg-green-100"
            : "bg-blue-100"
            }`}
        >
          {file ? "✅" : "📎"}
        </div>

        <p
          className={`mt-4 font-black ${file
            ? "text-green-700"
            : "text-[#07116f]"
            }`}
        >
          {file ? file.name : label}
        </p>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          {file
            ? "เลือกไฟล์เรียบร้อยแล้ว คลิกเพื่อเปลี่ยนไฟล์"
            : description}
        </p>

        <span className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-bold text-gray-500 shadow-sm">
          PDF, JPG, JPEG หรือ PNG
        </span>
      </div>
    </label>
  );
}

export default Eligibility;