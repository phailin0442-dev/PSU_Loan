import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  DOCUMENT_TYPES,
  mapBackendCodeToCategory,
} from "../rules/documentRules";
import { uploadStudentDocument } from "../services/api";

function UploadDocuments({ setPage }) {
  const {
    selectedStudent,
    refreshSelectedStudentDetail,
  } = useApp();

  const [files, setFiles] = useState({});
  const [uploadingCategory, setUploadingCategory] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // เอกสารที่ต้องมีช่อง "อัปโหลด" ในหน้านี้ มี 2 กรณี:
  //   1) ยังไม่เคยอัปโหลดเลย (ไม่มี documentId)
  //   2) เคยอัปโหลดแล้วแต่เจ้าหน้าที่ตีกลับ (status === REVISION_REQUIRED)
  //      ต้องเปิดให้แก้ไข/อัปโหลดใหม่ทับได้
  // ส่วนที่ "ผ่าน" หรือ "รอตรวจสอบ" (เจ้าหน้าที่ยังไม่ตัดสิน) ยังคงล็อกไว้
  // ไม่ให้แก้พร่ำเพรื่อระหว่างรอผลตรวจ — ใช้ requirementId จริงจาก backend
  // เสมอ เพื่อให้ requirementId ที่ส่งไป POST ตรงกับที่ backend คาดหวัง
  //
  // ไม่รวม GPAX_EVIDENCE / VOLUNTEER_EVIDENCE เพราะสองรายการนี้อัปโหลดไป
  // แล้วตั้งแต่หน้า "คัดกรองคุณสมบัติ" (Eligibility) ไม่ต้องให้อัปโหลดซ้ำ
  const PRESCREEN_CATEGORIES = ["GPAX_EVIDENCE", "VOLUNTEER_EVIDENCE"];

  const pendingRequirements = useMemo(() => {
    return (selectedStudent?.requiredDocuments || [])
      .filter(
        (item) => !item.documentId || item.status === "REVISION_REQUIRED"
      )
      .filter(
        (item) => !PRESCREEN_CATEGORIES.includes(item.documentCode)
      )
      .map((item) => ({
        requirementId: item.requirementId,
        category: mapBackendCodeToCategory(item.documentCode),
        name: item.documentType,
        isReupload: Boolean(item.documentId),
        previousFileName: item.fileName || "",
        rejectReason: item.note || "",
      }));
  }, [selectedStudent]);

  // เอกสารที่ "ผ่าน" หรือ "รอตรวจสอบ" อยู่ — โชว์แบบล็อก แก้ไม่ได้
  // (ที่ถูกตีกลับจะย้ายไปอยู่ในโซนอัปโหลดด้านบนแทน ไม่ต้องโชว์ซ้ำตรงนี้)
  const uploadedDocuments = [
    ...(selectedStudent?.qualificationDocuments || []),
    ...(selectedStudent?.documents || []),
  ].filter((doc) => doc.status !== "ต้องแก้ไข");

  const required = pendingRequirements;

  const selectedCount = required.filter(
    (item) => files[item.requirementId]
  ).length;

  const progress =
    required.length > 0
      ? Math.round((selectedCount / required.length) * 100)
      : 100;

  const handleFileChange = (requirementId, file) => {
    setFiles((current) => ({
      ...current,
      [requirementId]: file,
    }));

    setMessage("");
    setMessageType("");
  };

  const handleRemoveFile = (requirementId) => {
    setFiles((current) => {
      const updated = { ...current };
      delete updated[requirementId];
      return updated;
    });

    setMessage("");
    setMessageType("");
  };

  const handleUploadOne = async (requirementId) => {
    const file = files[requirementId];

    if (!file) return;

    if (!selectedStudent?.studentUserId) {
      setMessage(
        "ไม่พบรหัสผู้ใช้ของนักศึกษา (studentUserId) กรุณาโหลดหน้าใหม่อีกครั้ง"
      );
      setMessageType("error");
      return;
    }

    setUploadingCategory(requirementId);
    setMessage("");
    setMessageType("");

    try {
      await uploadStudentDocument(selectedStudent.id, {
        file,
        requirementId,
        uploadedBy: selectedStudent.studentUserId,
      });

      setFiles((current) => {
        const updated = { ...current };
        delete updated[requirementId];
        return updated;
      });

      await refreshSelectedStudentDetail();

      setMessage("อัปโหลดเอกสารสำเร็จ");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "อัปโหลดเอกสารไม่สำเร็จ");
      setMessageType("error");
    } finally {
      setUploadingCategory(null);
    }
  };

  const handleSubmitAll = async () => {
    const toUpload = required.filter((item) => files[item.requirementId]);

    if (toUpload.length === 0) {
      setMessage("กรุณาเลือกไฟล์อย่างน้อย 1 รายการก่อน");
      setMessageType("error");
      return;
    }

    for (const item of toUpload) {
      await handleUploadOne(item.requirementId);
    }

    if (pendingRequirements.length === toUpload.length) {
      setTimeout(() => {
        if (setPage) setPage("status");
      }, 800);
    }
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
                  {selectedStudent?.fullName || "ไม่พบชื่อนักศึกษา"}
                  {" · "}
                  {selectedStudent?.loanTypeName ||
                    "ยังไม่ได้ระบุประเภทผู้กู้"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white/15 px-5 py-4 ring-1 ring-white/20">
              <p className="text-xs font-bold text-blue-100">
                เอกสารที่ยังต้องส่ง
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
            label="ยังต้องอัปโหลด"
            value={`${required.length} รายการ`}
          />

          <SummaryCard
            icon="📄"
            label="อัปโหลดแล้ว (จาก backend)"
            value={`${uploadedDocuments.length} รายการ`}
          />

          <SummaryCard
            icon="✅"
            label="เลือกไฟล์ไว้แล้ว (ยังไม่ส่ง)"
            value={`${selectedCount} รายการ`}
          />
        </section>

        {uploadedDocuments.length > 0 && (
          <section className="mt-7 overflow-hidden rounded-[28px] bg-white shadow-sm">
            <div className="bg-[#eef5ff] px-6 py-4 lg:px-8">
              <h2 className="font-black text-[#07116f]">
                เอกสารที่ส่งแล้ว
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {uploadedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-4 px-6 py-4 lg:px-8"
                >
                  <div className="min-w-0">
                    <p className="font-black text-[#07116f]">{doc.name}</p>
                    <p className="mt-1 truncate text-sm text-gray-400">
                      {doc.fileName}
                    </p>
                    {doc.remark && (
                      <p className="mt-1 text-sm text-red-600">
                        หมายเหตุ: {doc.remark}
                      </p>
                    )}
                  </div>
                  <StatusPill status={doc.status} />
                </div>
              ))}
            </div>
          </section>
        )}

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
                {selectedCount}/{required.length}
              </div>
            </div>
          </div>

          <div className="p-6 lg:p-8">
            <div className="rounded-2xl bg-[#f8fbff] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-black text-[#07116f]">
                    ความคืบหน้าการเลือกไฟล์
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    เลือกไฟล์แล้วกด "อัปโหลด" ทีละรายการ หรือกด
                    "ส่งทั้งหมดที่เลือกไว้" ด้านล่าง
                  </p>
                </div>
                <p className="text-2xl font-black text-blue-600">
                  {progress}%
                </p>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-blue-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#07116f] to-[#0646ff] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {required.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
                <div className="text-5xl">🎉</div>
                <p className="mt-4 text-xl font-black text-gray-600">
                  ส่งเอกสารครบทุกรายการแล้ว
                </p>
                <p className="mt-2 text-sm text-gray-400">
                  รอเจ้าหน้าที่ตรวจสอบเอกสารที่ส่งไป
                </p>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-5">
                {required.map((item, index) => (
                  <DocumentUploadCard
                    key={item.requirementId}
                    number={index + 1}
                    title={DOCUMENT_TYPES[item.category] || item.name}
                    file={files[item.requirementId]}
                    uploading={uploadingCategory === item.requirementId}
                    isReupload={item.isReupload}
                    previousFileName={item.previousFileName}
                    rejectReason={item.rejectReason}
                    onChange={(file) =>
                      handleFileChange(item.requirementId, file)
                    }
                    onRemove={() => handleRemoveFile(item.requirementId)}
                    onUpload={() => handleUploadOne(item.requirementId)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {message && (
          <div
            className={`mt-6 rounded-3xl border p-5 ${messageType === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
              }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${messageType === "success" ? "bg-green-100" : "bg-red-100"
                  }`}
              >
                {messageType === "success" ? "✅" : "⚠️"}
              </div>

              <div>
                <p className="font-black">
                  {messageType === "success"
                    ? "ทำรายการสำเร็จ"
                    : "ทำรายการไม่สำเร็จ"}
                </p>
                <p className="mt-1 text-sm font-semibold">{message}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setPage?.("eligibility")}
            className="h-14 rounded-2xl border border-gray-200 bg-white px-8 font-black text-gray-700 shadow-sm transition hover:bg-gray-50 hover:shadow-md"
          >
            ← กลับหน้าคัดกรอง
          </button>

          <button
            type="button"
            onClick={handleSubmitAll}
            disabled={selectedCount === 0}
            className="h-14 rounded-2xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-10 font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-72"
          >
            ส่งทั้งหมดที่เลือกไว้ →
          </button>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <div className="rounded-[24px] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-500">{label}</p>
          <p className="mt-2 text-xl font-black text-[#07116f]">{value}</p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-2xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const styles = {
    ผ่าน: "bg-green-100 text-green-700",
    ต้องแก้ไข: "bg-red-100 text-red-700",
    รอตรวจสอบ: "bg-yellow-100 text-yellow-700",
  };

  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${styles[status] || "bg-gray-100 text-gray-700"
        }`}
    >
      {status}
    </span>
  );
}

function DocumentUploadCard({
  number,
  title,
  file,
  uploading,
  isReupload,
  previousFileName,
  rejectReason,
  onChange,
  onRemove,
  onUpload,
}) {
  return (
    <div
      className={`overflow-hidden rounded-[24px] border-2 transition ${file
          ? "border-green-300 bg-green-50"
          : isReupload
            ? "border-red-200 bg-red-50/40"
            : "border-gray-100 bg-white hover:border-blue-300"
        }`}
    >
      <div className="flex items-center gap-4 border-b border-gray-100 px-5 py-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-black ${file
              ? "bg-green-100 text-green-700"
              : isReupload
                ? "bg-red-100 text-red-700"
                : "bg-blue-100 text-blue-700"
            }`}
        >
          {file ? "✓" : isReupload ? "!" : number}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-black text-[#07116f]">{title}</p>
            {isReupload && !file && (
              <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-xs font-black text-red-700">
                ต้องแก้ไข
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-400">เอกสารบังคับ</p>
        </div>
      </div>

      {isReupload && !file && (
        <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-white p-3">
          {previousFileName && (
            <p className="text-xs text-gray-400">
              ไฟล์เดิม: {previousFileName}
            </p>
          )}
          <p className="mt-1 text-sm font-black text-red-600">
            เหตุผลที่เจ้าหน้าที่ตีกลับ:{" "}
            {rejectReason || "ไม่ระบุเหตุผล"}
          </p>
        </div>
      )}

      <div className="p-5">
        <label className="block cursor-pointer">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            disabled={uploading}
            onChange={(event) =>
              onChange(event.target.files?.[0] || null)
            }
          />

          <div
            className={`flex min-h-44 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition ${file
                ? "border-green-300 bg-white/70"
                : "border-blue-200 bg-blue-50/50 hover:border-blue-500 hover:bg-blue-50"
              }`}
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full text-3xl ${file ? "bg-green-100" : "bg-blue-100"
                }`}
            >
              {file ? "📄" : "📎"}
            </div>

            <p
              className={`mt-4 max-w-full break-all font-black ${file ? "text-green-700" : "text-[#07116f]"
                }`}
            >
              {file ? file.name : "คลิกเพื่อเลือกไฟล์"}
            </p>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              {file
                ? "เลือกไฟล์เรียบร้อยแล้ว กด \"อัปโหลด\" ด้านล่าง"
                : "อัปโหลดเอกสารให้เห็นข้อมูลครบถ้วนและชัดเจน"}
            </p>

            <span className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-bold text-gray-500 shadow-sm">
              PDF, JPG, JPEG หรือ PNG
            </span>
          </div>
        </label>

        {file && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-white p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-gray-700">
                {file.name}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {formatFileSize(file.size)}
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={onUpload}
                disabled={uploading}
                className="rounded-xl bg-[#07116f] px-4 py-2 text-sm font-black text-white transition hover:bg-blue-900 disabled:opacity-50"
              >
                {uploading
                  ? "กำลังอัปโหลด..."
                  : isReupload
                    ? "อัปโหลดใหม่"
                    : "อัปโหลด"}
              </button>

              <button
                type="button"
                onClick={onRemove}
                disabled={uploading}
                className="rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:opacity-50"
              >
                ลบไฟล์
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatFileSize(size) {
  if (!size) return "ไม่ทราบขนาดไฟล์";
  if (size < 1024) return `${size} Bytes`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default UploadDocuments;