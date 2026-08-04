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
  const [submitting, setSubmitting] = useState(false);
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

  const progress = `${selectedCount}/${required.length}`;
  const progressPercent =
    required.length > 0
      ? Math.round((selectedCount / required.length) * 100)
      : 100;
  const allSelected = required.length > 0 && selectedCount === required.length;

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

  // ฟังก์ชันภายในสำหรับอัปโหลดทีละไฟล์ — เรียกจาก handleSubmitAll เท่านั้น
  // (ไม่มีปุ่มอัปโหลดแยกรายไฟล์แล้ว ต้องเลือกไฟล์ให้ครบทุกช่องก่อน
  // ถึงจะกดปุ่ม "ส่งทั้งหมด" ได้ ตามที่ต้องการให้เอกสารส่งถึงมือ
  // เจ้าหน้าที่ครบชุดเสมอ ส่วนความถูกต้องของแต่ละไฟล์ค่อยให้เจ้าหน้าที่
  // ตรวจทีหลังตามปกติ)
  const uploadOneFile = async (requirementId) => {
    const file = files[requirementId];

    if (!file) return { requirementId, ok: false };

    setUploadingCategory(requirementId);

    try {
      await uploadStudentDocument(selectedStudent.id, {
        file,
        requirementId,
        uploadedBy: selectedStudent.studentUserId,
      });

      return { requirementId, ok: true };
    } catch (error) {
      return {
        requirementId,
        ok: false,
        error: error.message || "อัปโหลดเอกสารไม่สำเร็จ",
      };
    }
  };

  const handleSubmitAll = async () => {
    if (!selectedStudent?.studentUserId) {
      setMessage(
        "ไม่พบรหัสผู้ใช้ของนักศึกษา (studentUserId) กรุณาโหลดหน้าใหม่อีกครั้ง"
      );
      setMessageType("error");
      return;
    }

    // บังคับว่าต้องเลือกไฟล์ครบทุกช่องก่อน ถึงจะกดส่งได้ (ตามที่ต้องการให้
    // เอกสารชุดที่ส่งถึงเจ้าหน้าที่ครบสมบูรณ์เสมอ ไม่ใช่ส่งแค่บางไฟล์)
    if (!allSelected) {
      setMessage(
        `กรุณาเลือกไฟล์ให้ครบทุกรายการก่อนส่ง (ตอนนี้เลือกแล้ว ${selectedCount}/${required.length})`
      );
      setMessageType("error");
      return;
    }

    setMessage("");
    setMessageType("");
    setSubmitting(true);

    const results = await Promise.all(
      required.map((item) => uploadOneFile(item.requirementId))
    );

    setUploadingCategory(null);
    setSubmitting(false);

    const failed = results.filter((result) => !result.ok);

    if (failed.length === 0) {
      setFiles({});
      await refreshSelectedStudentDetail();

      setMessage("ส่งเอกสารครบทุกรายการสำเร็จ");
      setMessageType("success");

      setTimeout(() => {
        if (setPage) setPage("status");
      }, 800);
    } else {
      // ลบเฉพาะไฟล์ที่อัปโหลดสำเร็จออกจาก state เหลือแค่ที่พังไว้ให้แก้/ลองใหม่
      setFiles((current) => {
        const updated = { ...current };
        results
          .filter((result) => result.ok)
          .forEach((result) => delete updated[result.requirementId]);
        return updated;
      });

      await refreshSelectedStudentDetail();

      setMessage(
        `ส่งไม่สำเร็จ ${failed.length} ไฟล์ (${failed
          .map((f) => f.error)
          .join(", ")}) — กรุณาเลือกไฟล์ใหม่สำหรับรายการที่ยังค้างแล้วลองอีกครั้ง`
      );
      setMessageType("error");
    }
  };

  return (
    <main className="h-full w-full overflow-y-auto px-4 py-4 lg:px-6">
      <section className="mx-auto flex max-w-5xl flex-col gap-3">
        {/* Header แบบบางเรียว */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-5 py-3 text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg">
              📂
            </div>
            <div>
              <h1 className="text-base font-black leading-tight">
                เอกสารของฉัน
              </h1>
              <p className="text-xs leading-tight text-blue-100">
                {selectedStudent?.fullName || "ไม่พบชื่อนักศึกษา"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="rounded-full bg-white/15 px-3 py-1.5">
              ต้องส่ง {required.length}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1.5">
              ส่งแล้ว {uploadedDocuments.length}
            </span>
            <span className="rounded-full bg-white/25 px-3 py-1.5">
              เลือกแล้ว {progress}
            </span>
          </div>
        </div>

        {/* แถบความคืบหน้า */}
        {required.length > 0 && (
          <div className="rounded-xl bg-white px-4 py-2.5 shadow-sm">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-bold text-gray-500">
                เลือกไฟล์ให้ครบก่อนถึงจะส่งได้
              </span>
              <span className="font-black text-blue-600">{progress}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#07116f] to-[#0646ff] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* รายการเอกสารที่ต้องอัปโหลด — แบบลิสต์เลขลำดับ เส้นประนำสายตา */}
        {required.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-6 text-center">
            <p className="text-2xl">🎉</p>
            <p className="mt-1 text-sm font-black text-gray-600">
              ส่งเอกสารครบทุกรายการแล้ว
            </p>
          </div>
        ) : (
          <div className="flex flex-col rounded-xl bg-white px-4 py-1 shadow-sm">
            {required.map((item, index) => (
              <ListUploadRow
                key={item.requirementId}
                number={index + 1}
                title={DOCUMENT_TYPES[item.category] || item.name}
                file={files[item.requirementId]}
                uploading={
                  submitting && uploadingCategory === item.requirementId
                }
                isReupload={item.isReupload}
                rejectReason={item.rejectReason}
                onChange={(file) =>
                  handleFileChange(item.requirementId, file)
                }
                onRemove={() => handleRemoveFile(item.requirementId)}
              />
            ))}
          </div>
        )}

        {/* เอกสารที่ส่งแล้ว — แถวกระชับ */}
        {uploadedDocuments.length > 0 && (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="bg-[#eef5ff] px-4 py-2">
              <h2 className="text-sm font-black text-[#07116f]">
                เอกสารที่ส่งแล้ว
              </h2>
            </div>
            <div className="max-h-40 divide-y divide-gray-100 overflow-y-auto">
              {uploadedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 px-4 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#07116f]">
                      {doc.name}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      {doc.fileName}
                    </p>
                  </div>
                  <StatusPill status={doc.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {message && (
          <div
            className={`rounded-xl border px-4 py-2.5 text-xs font-bold ${messageType === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
              }`}
          >
            {message}
          </div>
        )}

        {/* Action bar ล่างสุด */}
        <div className="flex items-center justify-between gap-3 pb-2">
          <button
            type="button"
            onClick={() => setPage?.("eligibility")}
            className="h-11 rounded-xl border border-gray-200 bg-white px-5 text-sm font-black text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            ← กลับ
          </button>

          <button
            type="button"
            onClick={handleSubmitAll}
            disabled={!allSelected || submitting}
            className="h-11 flex-1 max-w-xs rounded-xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-6 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "กำลังส่ง..."
              : required.length === 0
                ? "ไม่มีเอกสารที่ต้องส่ง"
                : `ส่งเอกสารทั้งหมด (${progress}) →`}
          </button>
        </div>
      </section>
    </main>
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
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${styles[status] || "bg-gray-100 text-gray-700"
        }`}
    >
      {status}
    </span>
  );
}

// แถวลิสต์แบบมีเลขลำดับ + เส้นประนำสายตาไปหาปุ่ม "แนบไฟล์"
// รูปแบบ: 1  ชื่อเอกสาร ...................... [แนบไฟล์]
function ListUploadRow({
  number,
  title,
  file,
  uploading,
  isReupload,
  rejectReason,
  onChange,
  onRemove,
}) {
  const needsFix = isReupload && !file;

  return (
    <div
      className={`my-1.5 flex items-center gap-2 rounded-lg py-2.5 ${needsFix
          ? "border-2 border-red-300 bg-red-50/60 px-3"
          : "border-b border-gray-100 px-1"
        }`}
    >
      {/* เลขลำดับ */}
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${file
            ? "bg-green-100 text-green-700"
            : isReupload
              ? "bg-red-100 text-red-700"
              : "bg-blue-100 text-blue-700"
          }`}
      >
        {file ? "✓" : isReupload ? "!" : number}
      </span>

      {/* ชื่อเอกสาร */}
      <span className="shrink-0 max-w-[45%] truncate text-sm font-bold text-[#07116f]">
        {title}
        {needsFix && (
          <span
            className="ml-1.5 rounded-full bg-red-200 px-2 py-0.5 text-[10px] font-black text-red-800"
            title={rejectReason}
          >
            ต้องแก้ไข
          </span>
        )}
      </span>

      {/* เส้นประนำสายตา */}
      <span
        className={`mx-1 flex-1 border-b-2 border-dotted ${needsFix ? "border-red-300" : "border-gray-300"
          }`}
      />

      {/* ปุ่มแนบไฟล์ / สถานะไฟล์ที่เลือก */}
      {!file ? (
        <label className="shrink-0 cursor-pointer">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            disabled={uploading}
            onChange={(event) =>
              onChange(event.target.files?.[0] || null)
            }
          />
          <span className="inline-flex items-center gap-1 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50 px-3 py-1.5 text-xs font-black text-blue-700 hover:border-blue-500 hover:bg-blue-50">
            📎 แนบไฟล์
          </span>
        </label>
      ) : (
        <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-green-50 px-2.5 py-1.5">
          <span className="max-w-28 truncate text-xs font-bold text-green-700">
            {uploading ? "กำลังส่ง..." : file.name}
          </span>
          <button
            type="button"
            onClick={onRemove}
            disabled={uploading}
            className="shrink-0 text-xs font-black text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            ✕
          </button>
        </span>
      )}
    </div>
  );
}

export default UploadDocuments;