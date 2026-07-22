import { useMemo, useState } from "react";
import {
  getBorrowerTypeLabel,
  getDocumentCompletion,
  normalizeStatus,
  requiresQualificationCheck,
} from "./documentRules";

function StaffDashboard({
  students = [],
  setPage,
  openStudentReview,
}) {
  const [searchText, setSearchText] = useState("");

  const summary = useMemo(() => {
    return students.reduce(
      (result, student) => {
        const status = normalizeStatus(student.status);

        if (status === "ผ่าน") result.approved += 1;
        else if (status === "ต้องแก้ไข") result.rejected += 1;
        else result.pending += 1;

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

  const filteredStudents = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) {
      return students;
    }

    return students.filter((student) =>
      [
        student.studentId,
        student.fullName,
        student.faculty,
        student.major,
        getBorrowerTypeLabel(
          student.borrowerTypeCode,
          student.borrowerType
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [students, searchText]);

  return (
    <div className="min-h-screen bg-[#eef5ff] text-[#07116f]">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col bg-[#07116f] text-white lg:flex">
          <div className="border-b border-white/10 px-7 py-7">
            <h1 className="text-2xl font-black">
              PSU Smart Loan
            </h1>
            <p className="mt-1 text-sm text-blue-200">
              ระบบคัดกรองพร้อมจองคิวผู้กู้ยืมเงินเพื่อการศึกษา
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <nav className="space-y-2">
              <SidebarButton
                icon="🏠"
                label="Dashboard"
                active
              />

              <div className="pt-4">
                <div className="space-y-2">
                  <SidebarButton
                    icon="👥"
                    label="รายชื่อนักศึกษา"
                    onClick={() => setPage?.("studentList")}
                  />
                </div>
              </div>

              <SidebarButton
                icon="📅"
                label="จัดการการจองคิว"
                disabled
                comingSoon
              />
              <SidebarButton
                icon="📢"
                label="อัปเดตสถานะ"
                disabled
                comingSoon
              />
              <SidebarButton
                icon="📈"
                label="รายงาน"
                disabled
                comingSoon
              />
              <SidebarButton
                icon="⚙️"
                label="ตั้งค่าเกณฑ์"
                disabled
                comingSoon
              />
            </nav>
          </div>

          <div className="border-t border-white/10 p-5">
            <div className="mb-4 rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-blue-200">
                ผู้ใช้งาน
              </p>
              <p className="mt-1 font-black">
                เจ้าหน้าที่ กยศ.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPage?.("home")}
              className="w-full rounded-xl bg-white px-5 py-3 font-black text-[#07116f]"
            >
              ← กลับหน้าหลัก
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-gray-100 bg-white px-5 py-5 shadow-sm sm:px-8 lg:px-10">
            <h2 className="text-2xl font-black">
              Dashboard เจ้าหน้าที่
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              ค้นหาและเลือกนักศึกษาเพื่อตรวจสอบข้อมูลและเอกสาร
            </p>
          </header>

          <div className="px-5 py-7 sm:px-8 lg:px-10">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="นักศึกษาทั้งหมด"
                value={summary.total}
                icon="👥"
              />
              <SummaryCard
                label="รอตรวจสอบ"
                value={summary.pending}
                icon="⏳"
              />
              <SummaryCard
                label="ต้องแก้ไข"
                value={summary.rejected}
                icon="⚠️"
              />
              <SummaryCard
                label="ตรวจผ่านแล้ว"
                value={summary.approved}
                icon="✅"
              />
            </section>

            <section className="mt-7 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-black">
                    รายชื่อนักศึกษา
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    ค้นหาจากชื่อ รหัสนักศึกษา คณะ สาขา หรือประเภทผู้กู้
                  </p>
                </div>

                <input
                  type="text"
                  value={searchText}
                  onChange={(event) =>
                    setSearchText(event.target.value)
                  }
                  placeholder="ค้นหานักศึกษา..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 lg:max-w-md"
                />
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-sm text-gray-500">
                      <th className="px-5 py-4">
                        นักศึกษา
                      </th>
                      <th className="px-5 py-4">
                        ภาคเรียน
                      </th>
                      <th className="px-5 py-4">
                        ประเภทผู้กู้
                      </th>
                      <th className="px-5 py-4 text-center">
                        GPAX
                      </th>
                      <th className="px-5 py-4 text-center">
                        จิตอาสา
                      </th>
                      <th className="px-5 py-4 text-center">
                        เอกสารที่ต้องใช้
                      </th>
                      <th className="px-5 py-4 text-center">
                        ความครบถ้วน
                      </th>
                      <th className="px-5 py-4">
                        สถานะ
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td
                          colSpan="9"
                          className="px-5 py-14 text-center text-gray-500"
                        >
                          ไม่พบข้อมูลนักศึกษา
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student) => {
                        const completion =
                          getDocumentCompletion(student);
                        const checkQualification =
                          requiresQualificationCheck(
                            student.semester
                          );

                        return (
                          <tr
                            key={student.id}
                            className="border-b border-gray-100 hover:bg-blue-50/40"
                          >
                            <td className="px-5 py-4">
                              <p className="font-black">
                                {student.fullName}
                              </p>
                              <p className="mt-1 text-sm text-gray-500">
                                {student.studentId}
                              </p>
                            </td>

                            <td className="px-5 py-4 font-black">
                              {student.semester}
                            </td>

                            <td className="px-5 py-4">
                              {getBorrowerTypeLabel(
                                student.borrowerTypeCode,
                                student.borrowerType
                              )}
                            </td>

                            <td className="px-5 py-4 text-center font-black">
                              {checkQualification
                                ? student.gpax ?? "-"
                                : "ไม่ตรวจ"}
                            </td>

                            <td className="px-5 py-4 text-center font-black">
                              {checkQualification
                                ? `${student.volunteerHours ??
                                "-"
                                } ชม.`
                                : "ไม่ตรวจ"}
                            </td>

                            <td className="px-5 py-4 text-center font-black">
                              {completion.required.length} ไฟล์
                            </td>

                            <td className="px-5 py-4 text-center">
                              <CompletionBadge
                                completed={completion.completed}
                                total={completion.required.length}
                                missing={completion.missing.length}
                              />
                            </td>

                            <td className="px-5 py-4">
                              <StatusBadge
                                status={student.status}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarButton({
  icon,
  label,
  active = false,
  onClick,
  disabled = false,
  comingSoon = false,
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-bold transition ${disabled
        ? "cursor-not-allowed text-blue-300/50"
        : active
          ? "bg-white text-[#07116f] shadow"
          : "text-blue-100 hover:bg-white/10 hover:text-white"
        }`}
    >
      <span>{icon}</span>
      <span className="flex-1">{label}</span>

      {comingSoon && (
        <span className="rounded-full bg-white/10 px-2 py-1 text-[10px]">
          เร็ว ๆ นี้
        </span>
      )}
    </button>
  );
}

function SummaryCard({ label, value, icon }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black">
            {value}
          </p>
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

function CompletionBadge({
  completed,
  total,
  missing,
}) {
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-black ${missing === 0
        ? "bg-green-100 text-green-700"
        : "bg-red-100 text-red-700"
        }`}
    >
      {completed}/{total} ไฟล์
    </span>
  );
}

function StatusBadge({ status }) {
  const value = normalizeStatus(status);

  const styles = {
    ผ่าน: "bg-green-100 text-green-700",
    ต้องแก้ไข: "bg-red-100 text-red-700",
    รอตรวจสอบ: "bg-yellow-100 text-yellow-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-black ${styles[value]}`}
    >
      {value}
    </span>
  );
}

export default StaffDashboard;
