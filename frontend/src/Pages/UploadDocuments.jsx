import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  DOCUMENT_TYPES,
  getRequiredDocumentCategories,
} from "../rules/documentRules";

function UploadDocuments({ setPage }) {
  const { selectedStudent, updateSelectedStudent } = useApp();

  const [files, setFiles] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const required = useMemo(
    () => getRequiredDocumentCategories(selectedStudent),
    [selectedStudent]
  );

  const uploadedCount = required.filter(
    (category) => files[category]
  ).length;

  const progress =
    required.length > 0
      ? Math.round((uploadedCount / required.length) * 100)
      : 100;

  const handleFileChange = (category, file) => {
    setFiles((current) => ({
      ...current,
      [category]: file,
    }));

    setMessage("");
    setMessageType("");
  };

  const handleRemoveFile = (category) => {
    setFiles((current) => {
      const updated = { ...current };
      delete updated[category];
      return updated;
    });

    setMessage("");
    setMessageType("");
  };

  const handleSubmit = () => {
    const missing = required.filter(
      (category) => !files[category]
    );

    if (missing.length > 0) {
      setMessage(
        `กรุณาอัปโหลดเอกสารให้ครบ ยังขาดอีก ${missing.length} รายการ`
      );
      setMessageType("error");
      return;
    }

    const documents = required.map(
      (category, index) => ({
        id: Date.now() + index,
        category,
        name:
          DOCUMENT_TYPES[category] ||
          category,
        fileName: files[category].name,
        fileType: files[category].type,
        fileSize: files[category].size,
        status: "รอตรวจสอบ",
        remark: "",
      })
    );

    updateSelectedStudent({
      ...selectedStudent,
      documents,
      documentsCompleted: true,
      applicationStatus:
        "รอตรวจสอบเอกสาร",
    });

    setMessage(
      "ส่งเอกสารเรียบร้อยแล้ว เจ้าหน้าที่จะดำเนินการตรวจสอบต่อไป"
    );
    setMessageType("success");

    setTimeout(() => {
      if (setPage) {
        setPage("status");
      }
    }, 800);
  };

  return (
    <main className="w-full px-6 py-8 lg:px-12">
      <section className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-[32px] bg-gradient-to-r from-[#07116f] to-[#0646ff] shadow-lg">
          <div className="flex flex-col gap-6 p-8 text-white md:flex-row md:items-center md:justify-between lg:p-10">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/15 text-4xl ring-1 ring-white/20">
                📂
              </div>

              <div>
                <p className="text-sm font-black text-blue-100">
                  ขั้นตอนการส่งเอกสาร
                </p>

                <h1 className="mt-2 text-3xl font-black md:text-4xl">
                  เอกสารของฉัน
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
                เอกสารที่ต้องส่ง
              </p>

              <p className="mt-1 text-xl font-black">
                {required.length} รายการ
              </p>
            </div>
          </div>
        </div>

        <section className="mt-7 grid gap-5 md:grid-cols-3">
          <SummaryCard
            icon="📋"
            label="เอกสารทั้งหมด"
            value={`${required.length} รายการ`}
          />

          <SummaryCard
            icon="✅"
            label="อัปโหลดแล้ว"
            value={`${uploadedCount} รายการ`}
          />

          <SummaryCard
            icon="⏳"
            label="ยังขาด"
            value={`${Math.max(
              required.length -
              uploadedCount,
              0
            )} รายการ`}
          />
        </section>

        <section className="mt-7 overflow-hidden rounded-[28px] bg-white shadow-sm">
          <div className="bg-[#07116f] px-6 py-5 text-white lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-2xl">
                  📄
                </div>

                <div>
                  <h2 className="text-xl font-black md:text-2xl">
                    รายการเอกสารที่ต้องอัปโหลด
                  </h2>

                  <p className="mt-1 text-sm text-blue-100">
                    รองรับไฟล์ PDF, JPG, JPEG และ PNG
                  </p>
                </div>
              </div>

              <div className="rounded-full bg-white/15 px-4 py-2 text-sm font-black">
                {uploadedCount}/{required.length}
              </div>
            </div>
          </div>

          <div className="p-6 lg:p-8">
            <div className="rounded-2xl bg-[#f8fbff] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-black text-[#07116f]">
                    ความคืบหน้าการอัปโหลด
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    กรุณาอัปโหลดเอกสารให้ครบทุกช่อง
                  </p>
                </div>

                <p className="text-2xl font-black text-blue-600">
                  {progress}%
                </p>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-blue-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#07116f] to-[#0646ff] transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>

            {required.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
                <div className="text-5xl">
                  📭
                </div>

                <p className="mt-4 text-xl font-black text-gray-600">
                  ไม่พบรายการเอกสารที่ต้องอัปโหลด
                </p>

                <p className="mt-2 text-sm text-gray-400">
                  กรุณาตรวจสอบประเภทผู้กู้ ภาคเรียน
                  และข้อมูลอายุของนักศึกษา
                </p>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-5">
                {required.map(
                  (category, index) => (
                    <DocumentUploadCard
                      key={category}
                      number={index + 1}
                      title={
                        DOCUMENT_TYPES[
                        category
                        ] || category
                      }
                      file={
                        files[category]
                      }
                      onChange={(file) =>
                        handleFileChange(
                          category,
                          file
                        )
                      }
                      onRemove={() =>
                        handleRemoveFile(
                          category
                        )
                      }
                    />
                  )
                )}
              </div>
            )}
          </div>
        </section>

        <div className="mt-6 flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-700">
          <span className="text-2xl">
            💡
          </span>

          <div>
            <p className="font-black">
              ก่อนส่งเอกสาร
            </p>

            <p className="mt-1 text-sm leading-6">
              กรุณาตรวจสอบให้แน่ใจว่าเอกสารชัดเจน
              อ่านได้ครบทุกส่วน และเป็นไฟล์ของนักศึกษาคนนี้
              เมื่อส่งแล้วเอกสารจะเข้าสู่ขั้นตอนตรวจสอบของเจ้าหน้าที่
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`mt-6 rounded-3xl border p-5 ${messageType ===
              "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
              }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${messageType ===
                  "success"
                  ? "bg-green-100"
                  : "bg-red-100"
                  }`}
              >
                {messageType ===
                  "success"
                  ? "✅"
                  : "⚠️"}
              </div>

              <div>
                <p className="font-black">
                  {messageType ===
                    "success"
                    ? "ส่งเอกสารสำเร็จ"
                    : "ยังส่งเอกสารไม่ได้"}
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {message}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() =>
              setPage?.("eligibility")
            }
            className="h-14 rounded-2xl border border-gray-200 bg-white px-8 font-black text-gray-700 shadow-sm transition hover:bg-gray-50 hover:shadow-md"
          >
            ← กลับหน้าคัดกรอง
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              required.length === 0
            }
            className="h-14 rounded-2xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-10 font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-72"
          >
            ส่งเอกสารทั้งหมด →
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

          <p className="mt-2 text-xl font-black text-[#07116f]">
            {value}
          </p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-2xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

function DocumentUploadCard({
  number,
  title,
  file,
  onChange,
  onRemove,
}) {
  return (
    <div
      className={`overflow-hidden rounded-[24px] border-2 transition ${file
        ? "border-green-300 bg-green-50"
        : "border-gray-100 bg-white hover:border-blue-300"
        }`}
    >
      <div className="flex items-center gap-4 border-b border-gray-100 px-5 py-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-black ${file
            ? "bg-green-100 text-green-700"
            : "bg-blue-100 text-blue-700"
            }`}
        >
          {file ? "✓" : number}
        </div>

        <div className="min-w-0">
          <p className="font-black text-[#07116f]">
            {title}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            เอกสารบังคับ
          </p>
        </div>
      </div>

      <div className="p-5">
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
            className={`flex min-h-44 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition ${file
              ? "border-green-300 bg-white/70"
              : "border-blue-200 bg-blue-50/50 hover:border-blue-500 hover:bg-blue-50"
              }`}
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full text-3xl ${file
                ? "bg-green-100"
                : "bg-blue-100"
                }`}
            >
              {file ? "📄" : "📎"}
            </div>

            <p
              className={`mt-4 max-w-full break-all font-black ${file
                ? "text-green-700"
                : "text-[#07116f]"
                }`}
            >
              {file
                ? file.name
                : "คลิกเพื่อเลือกไฟล์"}
            </p>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              {file
                ? "เลือกไฟล์เรียบร้อยแล้ว"
                : "อัปโหลดเอกสารให้เห็นข้อมูลครบถ้วนและชัดเจน"}
            </p>

            <span className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-bold text-gray-500 shadow-sm">
              PDF, JPG, JPEG หรือ PNG
            </span>
          </div>
        </label>

        {file && (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-white p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-gray-700">
                {file.name}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                {formatFileSize(
                  file.size
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={onRemove}
              className="shrink-0 rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-600 transition hover:bg-red-100"
            >
              ลบไฟล์
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatFileSize(size) {
  if (!size) {
    return "ไม่ทราบขนาดไฟล์";
  }

  if (size < 1024) {
    return `${size} Bytes`;
  }

  if (size < 1024 * 1024) {
    return `${(
      size / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

export default UploadDocuments;