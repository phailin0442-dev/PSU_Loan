import { useState } from "react";
import { useApp } from "../context/AppContext";

function formatThaiDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatCitizenId(value) {
  if (!value) {
    return "-";
  }

  const digits = String(value).replace(/\D/g, "");

  if (digits.length !== 13) {
    return value;
  }

  return `${digits.slice(0, 1)}-${digits.slice(
    1,
    5
  )}-${digits.slice(5, 10)}-${digits.slice(
    10,
    12
  )}-${digits.slice(12)}`;
}

function formatMoney(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "-";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return value;
  }

  return `${numberValue.toLocaleString(
    "th-TH"
  )} บาท`;
}

function getFullName(
  prefix,
  firstName,
  lastName
) {
  const values = [
    prefix,
    firstName,
    lastName,
  ].filter(
    (value) =>
      value &&
      value !== "-"
  );

  return values.length > 0
    ? `${values[0] || ""}${values[1] || ""
      } ${values.slice(2).join(" ") ||
      ""
      }`.trim()
    : "-";
}

function StudentProfiles({ setPage }) {
  const { selectedStudent } = useApp();

  // แท็บที่เปิดอยู่ตอนนี้ (0-6) — ให้ดูทีละหัวข้อแทนเลื่อนยาว
  const [activeSection, setActiveSection] = useState(0);

  const sections = [
    { icon: "👤", label: "ข้อมูลส่วนบุคคล" },
    { icon: "🏫", label: "ข้อมูลการศึกษา" },
    { icon: "👨", label: "ข้อมูลบิดา" },
    { icon: "👩", label: "ข้อมูลมารดา" },
    { icon: "🧑", label: "ข้อมูลผู้ปกครอง" },
    { icon: "🏠", label: "ข้อมูลครอบครัว" },
    { icon: "📋", label: "ข้อมูลการกู้ยืม" },
  ];

  const status =
    selectedStudent.applicationStatus ||
    "ยังไม่ได้ดำเนินการ";

  const age =
    selectedStudent.age ?? "-";

  const personalRows = [
    [
      "ชื่อ-นามสกุล",
      selectedStudent.fullName,
    ],
    [
      "เลขประจำตัวประชาชน",
      formatCitizenId(
        selectedStudent.citizenId
      ),
    ],
    [
      "วันเดือนปีเกิด",
      formatThaiDate(
        selectedStudent.birthDate
      ),
    ],
    [
      "อายุ",
      age === "-"
        ? "-"
        : `${age} ปี`,
    ],
    [
      "สัญชาติ",
      selectedStudent.nationality,
    ],
    [
      "ศาสนา",
      selectedStudent.religion,
    ],
    [
      "สถานภาพ",
      selectedStudent.maritalStatus,
    ],
    [
      "หมายเลขโทรศัพท์",
      selectedStudent.phone,
    ],
    [
      "อีเมล",
      selectedStudent.email,
    ],
    [
      "ที่อยู่ปัจจุบัน",
      selectedStudent.address,
    ],
    [
      "จังหวัด",
      selectedStudent.province,
    ],
    [
      "รหัสไปรษณีย์",
      selectedStudent.postalCode,
    ],
  ];

  const educationRows = [
    [
      "รหัสนักศึกษา",
      selectedStudent.studentId ||
      selectedStudent.studentCode,
    ],
    [
      "คณะ",
      selectedStudent.faculty,
    ],
    [
      "สาขาวิชา",
      selectedStudent.major,
    ],
    [
      "ชั้นปี",
      selectedStudent.yearLevel
        ? `ชั้นปีที่ ${selectedStudent.yearLevel}`
        : "-",
    ],
    [
      "ปีการศึกษา",
      selectedStudent.academicYear,
    ],
    [
      "ภาคการศึกษา",
      selectedStudent.semester
        ? `ภาคการศึกษาที่ ${selectedStudent.semester}`
        : "-",
    ],
  ];

  const fatherRows = [
    [
      "ชื่อ-นามสกุล",
      getFullName(
        selectedStudent.fatherPrefix,
        selectedStudent.fatherFirstName,
        selectedStudent.fatherLastName
      ),
    ],
    [
      "เลขประจำตัวประชาชน",
      formatCitizenId(
        selectedStudent.fatherCitizenId
      ),
    ],
    [
      "อาชีพ",
      selectedStudent.fatherOccupation,
    ],
    [
      "รายได้ต่อเดือน",
      formatMoney(
        selectedStudent.fatherMonthlyIncome
      ),
    ],
    [
      "หมายเลขโทรศัพท์",
      selectedStudent.fatherPhone,
    ],
    [
      "สถานภาพ",
      selectedStudent.fatherStatus,
    ],
  ];

  const motherRows = [
    [
      "ชื่อ-นามสกุล",
      getFullName(
        selectedStudent.motherPrefix,
        selectedStudent.motherFirstName,
        selectedStudent.motherLastName
      ),
    ],
    [
      "เลขประจำตัวประชาชน",
      formatCitizenId(
        selectedStudent.motherCitizenId
      ),
    ],
    [
      "อาชีพ",
      selectedStudent.motherOccupation,
    ],
    [
      "รายได้ต่อเดือน",
      formatMoney(
        selectedStudent.motherMonthlyIncome
      ),
    ],
    [
      "หมายเลขโทรศัพท์",
      selectedStudent.motherPhone,
    ],
    [
      "สถานภาพ",
      selectedStudent.motherStatus,
    ],
  ];

  const guardianRows = [
    [
      "ความสัมพันธ์กับนักศึกษา",
      selectedStudent.guardianRelation,
    ],
    [
      "ชื่อ-นามสกุล",
      getFullName(
        selectedStudent.guardianPrefix,
        selectedStudent.guardianFirstName,
        selectedStudent.guardianLastName
      ),
    ],
    [
      "เลขประจำตัวประชาชน",
      formatCitizenId(
        selectedStudent.guardianCitizenId
      ),
    ],
    [
      "อาชีพ",
      selectedStudent.guardianOccupation,
    ],
    [
      "รายได้ต่อเดือน",
      formatMoney(
        selectedStudent.guardianMonthlyIncome
      ),
    ],
    [
      "หมายเลขโทรศัพท์",
      selectedStudent.guardianPhone,
    ],
  ];

  const familyRows = [
    [
      "รายได้รวมของครอบครัวต่อเดือน",
      formatMoney(
        selectedStudent.totalFamilyIncome
      ),
    ],
    [
      "จำนวนสมาชิกในครอบครัว",
      selectedStudent.numberOfFamilyMembers
        ? `${selectedStudent.numberOfFamilyMembers} คน`
        : "-",
    ],
    [
      "จำนวนสมาชิกที่กำลังศึกษา",
      selectedStudent.numberOfStudyingMembers
        ? `${selectedStudent.numberOfStudyingMembers} คน`
        : "-",
    ],
  ];

  return (
    <main className="w-full px-6 py-8 lg:px-12">
      <section className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[32px] bg-gradient-to-r from-[#07116f] to-[#0646ff] shadow-lg">
          <div className="flex flex-col gap-6 p-8 text-white lg:flex-row lg:items-center lg:justify-between lg:p-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white/15 text-5xl ring-1 ring-white/20">
                👩‍🎓
              </div>

              <div>
                <p className="text-sm font-black text-blue-100">
                  ข้อมูลนักศึกษาผู้กู้ยืมเงิน
                </p>

                <h1 className="mt-2 text-3xl font-black md:text-4xl">
                  {selectedStudent.fullName ||
                    "-"}
                </h1>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
                    รหัส{" "}
                    {selectedStudent.studentId ||
                      selectedStudent.studentCode ||
                      "-"}
                  </span>

                  <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
                    {selectedStudent.loanTypeName ||
                      "-"}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setPage("studentInfo")
              }
              className="rounded-2xl bg-white px-7 py-4 font-black text-[#07116f] shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              ✏️ แก้ไขข้อมูล
            </button>
          </div>
        </div>

        <section className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon="🎓"
            label="ประเภทผู้กู้"
            value={
              selectedStudent.loanTypeName
            }
          />

          <SummaryCard
            icon="📚"
            label="ภาคการศึกษา"
            value={
              selectedStudent.semester
                ? `ภาคเรียน ${selectedStudent.semester}`
                : "-"
            }
          />

          <SummaryCard
            icon="✅"
            label="ผลคัดกรอง"
            value={
              selectedStudent.eligibilityStatus ||
              "ยังไม่ได้ตรวจสอบ"
            }
          />

          <SummaryCard
            icon="📄"
            label="สถานะคำขอ"
            value={status}
            status
          />
        </section>

        {Number(age) < 20 && (
          <section className="mt-6 flex items-start gap-4 rounded-2xl border border-pink-200 bg-pink-50 p-5 text-pink-700">
            <span className="text-3xl">
              👪
            </span>

            <div>
              <p className="font-black">
                นักศึกษาอายุต่ำกว่า 20 ปี
              </p>

              <p className="mt-1 text-sm leading-6">
                ระบบจะกำหนดให้ใช้เอกสารของผู้ปกครองเพิ่มเติมโดยอัตโนมัติ
              </p>
            </div>
          </section>
        )}

        <div className="mt-7 flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Sidebar เลือกหัวข้อ */}
          <nav className="flex gap-2 overflow-x-auto rounded-2xl bg-white p-3 shadow-sm lg:sticky lg:top-6 lg:w-64 lg:shrink-0 lg:flex-col lg:overflow-visible">
            {sections.map((section, index) => (
              <button
                key={section.label}
                type="button"
                onClick={() => setActiveSection(index)}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-black transition lg:shrink ${activeSection === index
                  ? "bg-[#07116f] text-white shadow-md"
                  : "text-gray-600 hover:bg-blue-50"
                  }`}
              >
                <span className="text-lg">{section.icon}</span>
                <span className="whitespace-nowrap lg:whitespace-normal">
                  {section.label}
                </span>
              </button>
            ))}
          </nav>

          {/* เนื้อหาของแท็บที่เลือก */}
          <div className="min-w-0 flex-1">
            {activeSection === 0 && (
              <ProfileSection
                icon="👤"
                title="ข้อมูลส่วนบุคคล"
                subtitle="ข้อมูลทั่วไปและข้อมูลการติดต่อของนักศึกษา"
                rows={personalRows}
                columns="xl:grid-cols-3"
                noMargin
              />
            )}

            {activeSection === 1 && (
              <ProfileSection
                icon="🏫"
                title="ข้อมูลการศึกษา"
                subtitle="ข้อมูลสถานภาพนักศึกษาและภาคการศึกษาปัจจุบัน"
                rows={educationRows}
                columns="xl:grid-cols-3"
                noMargin
              />
            )}

            {activeSection === 2 && (
              <ProfileSection
                icon="👨"
                title="ข้อมูลบิดา"
                subtitle="ข้อมูลส่วนบุคคล อาชีพ และรายได้ของบิดา"
                rows={fatherRows}
                columns="xl:grid-cols-3"
                noMargin
              />
            )}

            {activeSection === 3 && (
              <ProfileSection
                icon="👩"
                title="ข้อมูลมารดา"
                subtitle="ข้อมูลส่วนบุคคล อาชีพ และรายได้ของมารดา"
                rows={motherRows}
                columns="xl:grid-cols-3"
                noMargin
              />
            )}

            {activeSection === 4 && (
              <ProfileSection
                icon="🧑"
                title="ข้อมูลผู้ปกครอง"
                subtitle="กรณีผู้ปกครองไม่ใช่บิดาหรือมารดา"
                rows={guardianRows}
                columns="xl:grid-cols-3"
                emptyText="ยังไม่ได้ระบุข้อมูลผู้ปกครองเพิ่มเติม"
                noMargin
              />
            )}

            {activeSection === 5 && (
              <ProfileSection
                icon="🏠"
                title="ข้อมูลครอบครัว"
                subtitle="รายได้และจำนวนสมาชิกภายในครอบครัว"
                rows={familyRows}
                columns="xl:grid-cols-3"
                noMargin
              />
            )}

            {activeSection === 6 && (
              <section className="overflow-hidden rounded-[28px] bg-white shadow-sm">
                <SectionHeader
                  icon="📋"
                  title="ข้อมูลการกู้ยืม"
                  subtitle="ข้อมูลที่ใช้กำหนดขั้นตอนการคัดกรองและรายการเอกสาร"
                />

                <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4 lg:p-8">
                  <InfoCard
                    label="ประเภทผู้กู้"
                    value={selectedStudent.loanTypeName}
                  />

                  <InfoCard
                    label="GPAX"
                    value={selectedStudent.gpax ?? "-"}
                  />

                  <InfoCard
                    label="ชั่วโมงจิตอาสา"
                    value={
                      selectedStudent.volunteerHours !== null &&
                        selectedStudent.volunteerHours !== undefined
                        ? `${selectedStudent.volunteerHours} ชั่วโมง`
                        : "-"
                    }
                  />

                  <InfoCard
                    label="ผลการคัดกรอง"
                    value={
                      selectedStudent.eligibilityStatus ||
                      "ยังไม่ได้ตรวจสอบ"
                    }
                  />
                </div>
              </section>
            )}

            {/* ปุ่มก่อนหน้า/ถัดไป ไล่ทีละหัวข้อ */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={activeSection === 0}
                onClick={() =>
                  setActiveSection((current) => Math.max(current - 1, 0))
                }
                className="h-11 rounded-xl border border-gray-200 bg-white px-5 text-sm font-black text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← ก่อนหน้า
              </button>

              <button
                type="button"
                disabled={activeSection === sections.length - 1}
                onClick={() =>
                  setActiveSection((current) =>
                    Math.min(current + 1, sections.length - 1)
                  )
                }
                className="h-11 rounded-xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-5 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ถัดไป →
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() =>
              setPage("home")
            }
            className="h-14 rounded-2xl border border-gray-200 bg-white px-8 font-black text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            ← กลับหน้าหลัก
          </button>

          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                setPage(
                  "eligibility"
                )
              }
              className="h-14 rounded-2xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-8 font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              ไปหน้าคัดกรอง →
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProfileSection({
  icon,
  title,
  subtitle,
  rows,
  columns,
  emptyText,
  noMargin,
}) {
  const hasInformation = rows.some(
    ([, value]) =>
      value &&
      value !== "-" &&
      value !== "0 บาท"
  );

  return (
    <section
      className={`overflow-hidden rounded-[28px] bg-white shadow-sm ${noMargin ? "" : "mt-7"
        }`}
    >
      <SectionHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
      />

      {hasInformation ? (
        <div
          className={`grid gap-4 p-6 md:grid-cols-2 ${columns} lg:p-8`}
        >
          {rows.map(
            ([label, value]) => (
              <InfoCard
                key={label}
                label={label}
                value={value}
              />
            )
          )}
        </div>
      ) : (
        <div className="p-8">
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <div className="text-4xl">
              📝
            </div>

            <p className="mt-3 font-black text-gray-600">
              {emptyText ||
                "ยังไม่มีข้อมูล"}
            </p>

            <p className="mt-1 text-sm text-gray-400">
              สามารถเพิ่มข้อมูลได้จากหน้าแก้ไขข้อมูล
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  status = false,
}) {
  return (
    <div className="rounded-[24px] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-500">
            {label}
          </p>

          <p
            className={`mt-2 font-black ${status
              ? "text-blue-600"
              : "text-[#07116f]"
              }`}
          >
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

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-[#f8fbff] p-5 transition hover:border-blue-200 hover:bg-blue-50">
      <p className="text-sm font-bold text-gray-500">
        {label}
      </p>

      <p className="mt-2 break-words font-black text-[#07116f]">
        {value ?? "-"}
      </p>
    </div>
  );
}

export default StudentProfiles;