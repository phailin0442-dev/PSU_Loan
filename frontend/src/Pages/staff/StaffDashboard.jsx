import { useMemo, useState } from "react";
import {
  getBorrowerTypeLabel,
  normalizeStatus,
  requiresQualificationCheck,
} from "../../rules/documentRules";

/*
|--------------------------------------------------------------------------
| Staff Dashboard
|--------------------------------------------------------------------------
*/

function StaffDashboard({
  students = [],
  openStudentReview,
}) {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("ทั้งหมด");

  const [previewDocument, setPreviewDocument] =
    useState(null);

  /*
  |--------------------------------------------------------------------------
  | ข้อมูลสรุป
  |--------------------------------------------------------------------------
  */

  const summary = useMemo(() => {
    return students.reduce(
      (result, student) => {
        const status = normalizeStatus(
          student.status
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
        total: students.length,
        pending: 0,
        rejected: 0,
        approved: 0,
      }
    );
  }, [students]);

  /*
  |--------------------------------------------------------------------------
  | ค้นหาและกรองสถานะ
  |--------------------------------------------------------------------------
  */

  const filteredStudents = useMemo(() => {
    const keyword = searchText
      .trim()
      .toLowerCase();

    return students.filter((student) => {
      const normalizedStatus =
        normalizeStatus(student.status);

      const matchesStatus =
        statusFilter === "ทั้งหมด" ||
        normalizedStatus === statusFilter;

      const searchableText = [
        student.studentId,
        student.studentCode,
        student.fullName,
        student.firstName,
        student.lastName,
        student.faculty,
        student.major,
        getBorrowerTypeLabel(
          student.borrowerTypeCode,
          student.borrowerType
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !keyword ||
        searchableText.includes(keyword);

      return matchesStatus && matchesSearch;
    });
  }, [
    students,
    searchText,
    statusFilter,
  ]);

  /*
  |--------------------------------------------------------------------------
  | เปิดดูหลักฐาน
  |--------------------------------------------------------------------------
  */

  const handlePreview = (
    student,
    documentType
  ) => {
    const document = findQualificationDocument(
      student,
      documentType
    );

    if (!document) {
      alert(
        documentType === "GPAX_EVIDENCE"
          ? "นักศึกษายังไม่ได้แนบหลักฐาน GPAX"
          : "นักศึกษายังไม่ได้แนบหลักฐานชั่วโมงจิตอาสา"
      );

      return;
    }

    const previewUrl =
      getDocumentPreviewUrl(document);

    if (!previewUrl) {
      alert(
        "พบข้อมูลเอกสาร แต่ไม่พบ URL สำหรับเปิดดูไฟล์"
      );

      return;
    }

    setPreviewDocument({
      title:
        documentType === "GPAX_EVIDENCE"
          ? "หลักฐาน GPAX"
          : "หลักฐานชั่วโมงจิตอาสา",
      fileName:
        document.fileName ||
        document.filename ||
        document.name ||
        "ไฟล์หลักฐาน",
      mimeType:
        document.mimeType ||
        document.mime_type ||
        document.type ||
        "",
      url: previewUrl,
      temporaryUrl:
        document instanceof File,
    });
  };

  const closePreview = () => {
    if (
      previewDocument?.temporaryUrl &&
      previewDocument?.url
    ) {
      URL.revokeObjectURL(
        previewDocument.url
      );
    }

    setPreviewDocument(null);
  };

  return (
    <div className="min-h-screen bg-[#eef5ff] text-[#07116f]">
      {/* หัวข้อหน้า */}

      <header className="border-b border-gray-100 bg-white shadow-sm">
        <div className="mx-auto w-full max-w-[1600px] px-5 py-6 sm:px-8 lg:px-10">
          <h1 className="text-2xl font-black sm:text-3xl">
            Dashboard เจ้าหน้าที่
          </h1>

          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            ตรวจสอบข้อมูลคุณสมบัติและหลักฐานของนักศึกษาผู้กู้ยืม
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-5 py-7 sm:px-8 lg:px-10">
        {/* การ์ดสรุป */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="นักศึกษาทั้งหมด"
            value={summary.total}
            icon="👥"
            description="ผู้ยื่นคำขอทั้งหมด"
          />

          <SummaryCard
            label="รอตรวจสอบ"
            value={summary.pending}
            icon="⏳"
            description="รายการที่รอเจ้าหน้าที่ตรวจ"
          />

          <SummaryCard
            label="ต้องแก้ไข"
            value={summary.rejected}
            icon="⚠️"
            description="รายการที่ส่งกลับให้นักศึกษา"
          />

          <SummaryCard
            label="ตรวจผ่านแล้ว"
            value={summary.approved}
            icon="✅"
            description="รายการที่ตรวจสอบเรียบร้อย"
          />
        </section>

        {/* รายชื่อนักศึกษา */}

        <section className="mt-7 overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5 sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-xl font-black sm:text-2xl">
                  รายชื่อนักศึกษา
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  ค้นหาและตรวจสอบหลักฐาน GPAX
                  กับชั่วโมงจิตอาสา
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
                <div className="relative w-full sm:min-w-[340px]">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    🔍
                  </span>

                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) =>
                      setSearchText(
                        event.target.value
                      )
                    }
                    placeholder="ค้นหาชื่อ รหัสนักศึกษา คณะ หรือสาขา"
                    className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value
                    )
                  }
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 font-bold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="ทั้งหมด">
                    ทุกสถานะ
                  </option>

                  <option value="รอตรวจสอบ">
                    รอตรวจสอบ
                  </option>

                  <option value="ต้องแก้ไข">
                    ต้องแก้ไข
                  </option>

                  <option value="ผ่าน">
                    ตรวจผ่านแล้ว
                  </option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                แสดง{" "}
                <span className="font-black text-[#07116f]">
                  {filteredStudents.length}
                </span>{" "}
                จาก{" "}
                <span className="font-black text-[#07116f]">
                  {students.length}
                </span>{" "}
                รายการ
              </p>

              {(searchText ||
                statusFilter !==
                "ทั้งหมด") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchText("");
                      setStatusFilter(
                        "ทั้งหมด"
                      );
                    }}
                    className="text-sm font-black text-blue-600 transition hover:text-blue-800"
                  >
                    ล้างตัวกรอง
                  </button>
                )}
            </div>
          </div>

          {/* ตาราง */}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px] text-left">
              <thead>
                <tr className="bg-[#f7f9fc] text-sm text-gray-500">
                  <th className="px-6 py-4">
                    นักศึกษา
                  </th>

                  <th className="px-5 py-4 text-center">
                    ภาคเรียน
                  </th>

                  <th className="px-5 py-4">
                    ประเภทผู้กู้
                  </th>

                  <th className="px-5 py-4 text-center">
                    GPAX
                  </th>

                  <th className="px-5 py-4 text-center">
                    หลักฐาน GPAX
                  </th>

                  <th className="px-5 py-4 text-center">
                    ชั่วโมงจิตอาสา
                  </th>

                  <th className="px-5 py-4 text-center">
                    หลักฐานจิตอาสา
                  </th>

                  <th className="px-5 py-4 text-center">
                    สถานะ
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-20 text-center"
                    >
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
                        🔎
                      </div>

                      <p className="mt-4 font-black text-gray-700">
                        ไม่พบข้อมูลนักศึกษา
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        ลองเปลี่ยนคำค้นหาหรือสถานะที่เลือก
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(
                    (student) => {
                      const checkQualification =
                        requiresQualificationCheck(
                          student.semester
                        );

                      const gpaxDocument =
                        findQualificationDocument(
                          student,
                          "GPAX_EVIDENCE"
                        );

                      const volunteerDocument =
                        findQualificationDocument(
                          student,
                          "VOLUNTEER_EVIDENCE"
                        );

                      return (
                        <tr
                          key={
                            student.id ||
                            student.studentId
                          }
                          onDoubleClick={() =>
                            openStudentReview?.(
                              student
                            )
                          }
                          className="border-t border-gray-100 transition hover:bg-blue-50/50"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-black text-blue-700">
                                {getStudentInitial(
                                  student
                                )}
                              </div>

                              <div>
                                <p className="font-black text-gray-900">
                                  {getStudentName(
                                    student
                                  )}
                                </p>

                                <p className="mt-1 text-sm text-gray-500">
                                  {student.studentId ||
                                    student.studentCode ||
                                    "-"}
                                </p>

                                {(student.faculty ||
                                  student.major) && (
                                    <p className="mt-1 max-w-[270px] truncate text-xs text-gray-400">
                                      {[
                                        student.faculty,
                                        student.major,
                                      ]
                                        .filter(
                                          Boolean
                                        )
                                        .join(
                                          " • "
                                        )}
                                    </p>
                                  )}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-5 text-center font-black">
                            {formatSemester(
                              student
                            )}
                          </td>

                          <td className="px-5 py-5">
                            <p className="max-w-[230px] font-bold">
                              {getBorrowerTypeLabel(
                                student.borrowerTypeCode ||
                                student.loanTypeCode,
                                student.borrowerType ||
                                student.loanTypeName
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-5 text-center">
                            {checkQualification ? (
                              <ValueBadge
                                value={
                                  student.gpax ??
                                  "-"
                                }
                                valid={
                                  Number(
                                    student.gpax
                                  ) >= 1.8
                                }
                              />
                            ) : (
                              <NotRequiredBadge />
                            )}
                          </td>

                          <td className="px-5 py-5 text-center">
                            {checkQualification ? (
                              <EvidenceButton
                                available={
                                  Boolean(
                                    gpaxDocument
                                  )
                                }
                                onClick={() =>
                                  handlePreview(
                                    student,
                                    "GPAX_EVIDENCE"
                                  )
                                }
                              />
                            ) : (
                              <NotRequiredBadge />
                            )}
                          </td>

                          <td className="px-5 py-5 text-center">
                            {checkQualification ? (
                              <ValueBadge
                                value={`${student.volunteerHours ??
                                  "-"
                                  } ชม.`}
                                valid={
                                  Number(
                                    student.volunteerHours
                                  ) > 0
                                }
                              />
                            ) : (
                              <NotRequiredBadge />
                            )}
                          </td>

                          <td className="px-5 py-5 text-center">
                            {checkQualification ? (
                              <EvidenceButton
                                available={
                                  Boolean(
                                    volunteerDocument
                                  )
                                }
                                onClick={() =>
                                  handlePreview(
                                    student,
                                    "VOLUNTEER_EVIDENCE"
                                  )
                                }
                              />
                            ) : (
                              <NotRequiredBadge />
                            )}
                          </td>

                          <td className="px-5 py-5 text-center">
                            <StatusBadge
                              status={
                                student.status
                              }
                            />
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Modal ดูเอกสาร */}

      {previewDocument && (
        <DocumentPreviewModal
          document={previewDocument}
          onClose={closePreview}
        />
      )}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| ค้นหาเอกสารคุณสมบัติ
|--------------------------------------------------------------------------
*/

function findQualificationDocument(
  student,
  documentType
) {
  const possibleDocuments = [
    ...(Array.isArray(
      student?.qualificationDocuments
    )
      ? student.qualificationDocuments
      : []),

    ...(Array.isArray(student?.documents)
      ? student.documents
      : []),
  ];

  const matchedDocument =
    possibleDocuments.find((document) => {
      const code =
        document?.code ||
        document?.documentCode ||
        document?.document_type ||
        document?.documentType ||
        document?.category ||
        document?.typeCode;

      return code === documentType;
    });

  if (matchedDocument) {
    return matchedDocument;
  }

  if (documentType === "GPAX_EVIDENCE") {
    return (
      student?.gpaxFile ||
      student?.loanData?.gpaxFile ||
      student?.eligibility?.gpaxFile ||
      null
    );
  }

  if (
    documentType === "VOLUNTEER_EVIDENCE"
  ) {
    return (
      student?.volunteerFile ||
      student?.loanData?.volunteerFile ||
      student?.eligibility?.volunteerFile ||
      null
    );
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| หา URL ของไฟล์
|--------------------------------------------------------------------------
*/

function getDocumentPreviewUrl(document) {
  if (!document) return "";

  if (document instanceof File) {
    return URL.createObjectURL(document);
  }

  if (
    document.file instanceof File
  ) {
    return URL.createObjectURL(
      document.file
    );
  }

  return (
    document.previewUrl ||
    document.fileUrl ||
    document.url ||
    document.dataUrl ||
    document.path ||
    document.file_path ||
    document.file?.previewUrl ||
    document.file?.url ||
    ""
  );
}

/*
|--------------------------------------------------------------------------
| Components
|--------------------------------------------------------------------------
*/

function SummaryCard({
  label,
  value,
  icon,
  description,
}) {
  return (
    <article className="rounded-3xl border border-white bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-500">
            {label}
          </p>

          <p className="mt-2 text-4xl font-black text-[#07116f]">
            {value}
          </p>

          <p className="mt-2 text-xs text-gray-400">
            {description}
          </p>
        </div>

        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
          {icon}
        </div>
      </div>
    </article>
  );
}

function EvidenceButton({
  available,
  onClick,
}) {
  if (!available) {
    return (
      <span className="inline-flex rounded-full bg-gray-100 px-3 py-2 text-xs font-black text-gray-400">
        ยังไม่มีไฟล์
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 transition hover:border-blue-600 hover:bg-blue-600 hover:text-white"
    >
      <span>👁</span>
      <span>ดูหลักฐาน</span>
    </button>
  );
}

function ValueBadge({ value, valid }) {
  return (
    <span
      className={`inline-flex min-w-[76px] justify-center rounded-full px-3 py-1.5 text-sm font-black ${valid
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
        }`}
    >
      {value}
    </span>
  );
}

function NotRequiredBadge() {
  return (
    <span className="inline-flex rounded-full bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-500">
      ไม่ตรวจ
    </span>
  );
}

function StatusBadge({ status }) {
  const value = normalizeStatus(status);

  const styles = {
    ผ่าน:
      "border-green-200 bg-green-100 text-green-700",
    ต้องแก้ไข:
      "border-red-200 bg-red-100 text-red-700",
    รอตรวจสอบ:
      "border-yellow-200 bg-yellow-100 text-yellow-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${styles[value] ||
        styles["รอตรวจสอบ"]
        }`}
    >
      {value}
    </span>
  );
}

function DocumentPreviewModal({
  document,
  onClose,
}) {
  const isPdf =
    document.mimeType
      ?.toLowerCase()
      .includes("pdf") ||
    document.fileName
      ?.toLowerCase()
      .endsWith(".pdf") ||
    document.url
      ?.toLowerCase()
      .includes(".pdf");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-xl font-black text-[#07116f]">
              {document.title}
            </h2>

            <p className="mt-1 truncate text-sm text-gray-500">
              {document.fileName}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <a
              href={document.url}
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-xl border border-blue-200 px-4 py-2 text-sm font-black text-blue-700 transition hover:bg-blue-50 sm:inline-flex"
            >
              เปิดในแท็บใหม่
            </a>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl font-black text-gray-600 transition hover:bg-red-100 hover:text-red-600"
              aria-label="ปิดหน้าต่าง"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-gray-100 p-3 sm:p-5">
          {isPdf ? (
            <iframe
              src={document.url}
              title={document.title}
              className="h-full w-full rounded-2xl bg-white"
            />
          ) : (
            <div className="flex h-full items-center justify-center overflow-auto rounded-2xl bg-white p-4">
              <img
                src={document.url}
                alt={document.title}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Helper Functions
|--------------------------------------------------------------------------
*/

function getStudentName(student) {
  if (student?.fullName) {
    return student.fullName;
  }

  const name = [
    student?.prefix,
    student?.firstName,
    student?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return name || "ไม่ระบุชื่อ";
}

function getStudentInitial(student) {
  const name = getStudentName(student)
    .replace(/^(นาย|นางสาว|นาง)/, "")
    .trim();

  return name.charAt(0) || "น";
}

function formatSemester(student) {
  const semester =
    student?.semester ?? "-";

  const academicYear =
    student?.academicYear;

  if (academicYear) {
    return `${semester}/${academicYear}`;
  }

  return semester;
}

export default StaffDashboard;