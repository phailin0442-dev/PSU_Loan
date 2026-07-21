function StaffDashboard({ students, setPage, openStudentReview }) {
  const pendingCount = students.filter(
    (student) => student.status === "รอตรวจสอบ"
  ).length;

  const revisionCount = students.filter(
    (student) => student.status === "ต้องแก้ไข"
  ).length;

  const approvedCount = students.filter(
    (student) => student.status === "ผ่าน"
  ).length;

  return (
    <div className="min-h-screen bg-[#eef5ff] text-[#07116f]">
      <header className="sticky top-0 z-50 w-full bg-white shadow-sm">
        <div className="flex min-h-20 w-full items-center justify-between px-6 py-4 lg:px-12">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">
              PSU Smart Loan
            </h1>

            <p className="text-sm text-gray-500">
              ระบบตรวจสอบเอกสารสำหรับเจ้าหน้าที่
            </p>
          </div>

          <nav className="flex items-center gap-4">
            <button
              type="button"
              className="font-bold text-[#07116f]"
            >
              ภาพรวม
            </button>

            <button
              type="button"
              onClick={() => setPage("studentList")}
              className="rounded-xl bg-[#07116f] px-5 py-2.5 font-bold text-white"
            >
              รายชื่อนักศึกษา
            </button>
          </nav>
        </div>
      </header>

      <main className="w-full px-6 py-8 lg:px-12">
        <section className="mb-8">
          <h2 className="text-3xl font-black">ภาพรวมการตรวจสอบเอกสาร</h2>

          <p className="mt-2 text-gray-500">
            ตรวจสอบคำร้อง เอกสาร และผลการดำเนินงานของนักศึกษา
          </p>
        </section>

        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="คำร้องทั้งหมด"
            value={students.length}
            detail="นักศึกษาที่ส่งเอกสาร"
            icon="👥"
          />

          <SummaryCard
            title="รอตรวจสอบ"
            value={pendingCount}
            detail="คำร้องที่ยังไม่ได้ตรวจ"
            icon="⏳"
          />

          <SummaryCard
            title="ต้องแก้ไข"
            value={revisionCount}
            detail="เอกสารที่ส่งกลับแก้ไข"
            icon="📝"
          />

          <SummaryCard
            title="ผ่านแล้ว"
            value={approvedCount}
            detail="คำร้องที่ตรวจเรียบร้อย"
            icon="✅"
          />
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black">รายการล่าสุด</h2>

              <p className="text-sm text-gray-500">
                นักศึกษาที่ส่งเอกสารเข้ามาล่าสุด
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPage("studentList")}
              className="w-fit rounded-xl border border-[#07116f] px-5 py-2 font-bold hover:bg-blue-50"
            >
              ดูทั้งหมด
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-[#07116f] text-white">
                <tr>
                  <th className="px-6 py-4">รหัสนักศึกษา</th>
                  <th className="px-6 py-4">ชื่อ-นามสกุล</th>
                  <th className="px-6 py-4">ประเภทผู้กู้</th>
                  <th className="px-6 py-4">วันที่ส่ง</th>
                  <th className="px-6 py-4">สถานะ</th>
                  <th className="px-6 py-4 text-center">จัดการ</th>
                </tr>
              </thead>

              <tbody>
                {students.slice(0, 5).map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-gray-100 hover:bg-blue-50/40"
                  >
                    <td className="px-6 py-4">{student.studentId}</td>

                    <td className="px-6 py-4 font-bold">
                      {student.fullName}
                    </td>

                    <td className="px-6 py-4">
                      {student.borrowerType}
                    </td>

                    <td className="px-6 py-4">
                      {student.submittedDate}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={student.status} />
                    </td>

                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => openStudentReview(student)}
                        className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700"
                      >
                        ตรวจสอบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function SummaryCard({ title, value, detail, icon }) {
  return (
    <article className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-gray-500">{title}</p>

          <p className="mt-2 text-4xl font-black text-[#07116f]">
            {value}
          </p>

          <p className="mt-2 text-sm text-gray-400">{detail}</p>
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
          {icon}
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }) {
  const classes = {
    รอตรวจสอบ: "bg-yellow-100 text-yellow-700",
    ต้องแก้ไข: "bg-red-100 text-red-700",
    ผ่าน: "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${
        classes[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
}

export default StaffDashboard;