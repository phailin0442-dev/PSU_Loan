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

  return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(
    5,
    10
  )}-${digits.slice(10, 12)}-${digits.slice(12)}`;
}

function formatMoney(value) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return value;
  }

  return `${numberValue.toLocaleString("th-TH")} บาท`;
}

function getFullName(prefix, firstName, lastName) {
  const values = [prefix, firstName, lastName].filter(
    (value) => value && value !== "-"
  );

  return values.length > 0
    ? `${values[0] || ""}${values[1] || ""} ${
        values.slice(2).join(" ") || ""
      }`.trim()
    : "-";
}

function loanTypeLabelOf(code) {
  const labels = {
    NEW: "ผู้กู้รายใหม่",
    CONTINUING_SPECIAL: "ผู้กู้ต่อเนื่องกรณีพิเศษ",
    CONTINUING_YEAR: "ผู้กู้ต่อเนื่องเลื่อนชั้นปี",
  };

  return labels[code] || "-";
}

// แปลรหัสผลคัดกรองจากฐานข้อมูลเป็นภาษาไทย (เดิมขึ้นเป็น NOT_REQUIRED ตรง ๆ)
function eligibilityLabelOf(value) {
  const labels = {
    PASSED: "ผ่านเกณฑ์",
    FAILED: "ไม่ผ่านเกณฑ์",
    NOT_REQUIRED: "ไม่ต้องคัดกรอง",
    PENDING: "รอตรวจสอบ",
  };

  return labels[value] || value || "ยังไม่ได้ตรวจสอบ";
}

function StudentProfiles({ setPage }) {
  const { selectedStudent: rawSelectedStudent, myProfile } = useApp();

  const hasNoApplicationYet = !rawSelectedStudent;

  // ผสาน myProfile (ข้อมูลส่วนตัวจริงจาก student_profiles โดยตรง) เข้ากับ
  // rawSelectedStudent (ข้อมูลคำร้องจาก v_application_overview) เสมอ —
  // myProfile เป็นแหล่งข้อมูลที่ถูกต้องสำหรับฟิลด์ส่วนตัวเสมอ
  const personalFieldsFromProfile = myProfile
    ? {
        fullName: `${
          myProfile.prefix && myProfile.prefix !== "-" ? myProfile.prefix : ""
        }${myProfile.firstName || ""} ${myProfile.lastName || ""}`.trim(),
        // เลขที่ระบบใส่ให้ตอนสมัคร (เติม 0 ด้านหน้า) ถือว่ายังไม่ได้กรอก
        citizenId:
          myProfile.citizenId && !/^0{6}/.test(myProfile.citizenId)
            ? myProfile.citizenId
            : "-",
        birthDate:
          myProfile.birthDate &&
          String(myProfile.birthDate).slice(0, 10) !== "2000-01-01"
            ? myProfile.birthDate
            : null,
        phone: myProfile.phone || "-",
        email: myProfile.email || "-",
        address:
          myProfile.houseNo && myProfile.houseNo !== "-"
            ? myProfile.houseNo
            : "-",
        province:
          myProfile.province && myProfile.province !== "-"
            ? myProfile.province
            : "-",
        postalCode:
          myProfile.postalCode && myProfile.postalCode !== "00000"
            ? myProfile.postalCode
            : "-",
        studentCode: myProfile.studentId || "-",
        studentId: myProfile.studentId || "-",
        faculty:
          myProfile.faculty && myProfile.faculty !== "-"
            ? myProfile.faculty
            : "-",
        major:
          myProfile.major && myProfile.major !== "-" ? myProfile.major : "-",
        yearLevel:
          myProfile.yearLevel && myProfile.yearLevel !== "-"
            ? myProfile.yearLevel
            : null,
        loanTypeName:
          myProfile.loanTypeCode && myProfile.loanTypeCode !== "-"
            ? loanTypeLabelOf(myProfile.loanTypeCode)
            : "-",
      }
    : {};

  // ฟิลด์ที่เกี่ยวกับคำร้องโดยตรง ใช้ค่าจาก rawSelectedStudent เท่านั้น
  const applicationFallback = rawSelectedStudent
    ? {}
    : {
        academicYear: "-",
        semester: "-",
        applicationStatus: "ยังไม่มีคำร้อง",
        eligibilityStatus: "ยังไม่ได้ตรวจสอบ",
        gpax: null,
        volunteerHours: null,
      };

  const selectedStudent = {
    ...applicationFallback,
    ...(rawSelectedStudent || {}),
    ...personalFieldsFromProfile,
  };

  // แท็บที่เปิดอยู่ตอนนี้ (0-6)
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

  const status = selectedStudent.applicationStatus || "ยังไม่ได้ดำเนินการ";
  const eligibilityText = eligibilityLabelOf(selectedStudent.eligibilityStatus);
  const age = selectedStudent.age ?? "-";

  const personalRows = [
    ["ชื่อ-นามสกุล", selectedStudent.fullName],
    ["เลขประจำตัวประชาชน", formatCitizenId(selectedStudent.citizenId)],
    ["วันเดือนปีเกิด", formatThaiDate(selectedStudent.birthDate)],
    ["อายุ", age === "-" ? "-" : `${age} ปี`],
    ["สัญชาติ", selectedStudent.nationality],
    ["ศาสนา", selectedStudent.religion],
    ["สถานภาพ", selectedStudent.maritalStatus],
    ["หมายเลขโทรศัพท์", selectedStudent.phone],
    ["อีเมล", selectedStudent.email],
    ["ที่อยู่ปัจจุบัน", selectedStudent.address],
    ["จังหวัด", selectedStudent.province],
    ["รหัสไปรษณีย์", selectedStudent.postalCode],
  ];

  const educationRows = [
    ["รหัสนักศึกษา", selectedStudent.studentId || selectedStudent.studentCode],
    ["คณะ", selectedStudent.faculty],
    ["สาขาวิชา", selectedStudent.major],
    [
      "ชั้นปี",
      selectedStudent.yearLevel ? `ชั้นปีที่ ${selectedStudent.yearLevel}` : "-",
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
    ["เลขประจำตัวประชาชน", formatCitizenId(selectedStudent.fatherCitizenId)],
    ["อาชีพ", selectedStudent.fatherOccupation],
    ["รายได้ต่อเดือน", formatMoney(selectedStudent.fatherMonthlyIncome)],
    ["หมายเลขโทรศัพท์", selectedStudent.fatherPhone],
    ["สถานภาพ", selectedStudent.fatherStatus],
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
    ["เลขประจำตัวประชาชน", formatCitizenId(selectedStudent.motherCitizenId)],
    ["อาชีพ", selectedStudent.motherOccupation],
    ["รายได้ต่อเดือน", formatMoney(selectedStudent.motherMonthlyIncome)],
    ["หมายเลขโทรศัพท์", selectedStudent.motherPhone],
    ["สถานภาพ", selectedStudent.motherStatus],
  ];

  const guardianRows = [
    ["ความสัมพันธ์กับนักศึกษา", selectedStudent.guardianRelation],
    [
      "ชื่อ-นามสกุล",
      getFullName(
        selectedStudent.guardianPrefix,
        selectedStudent.guardianFirstName,
        selectedStudent.guardianLastName
      ),
    ],
    ["เลขประจำตัวประชาชน", formatCitizenId(selectedStudent.guardianCitizenId)],
    ["อาชีพ", selectedStudent.guardianOccupation],
    ["รายได้ต่อเดือน", formatMoney(selectedStudent.guardianMonthlyIncome)],
    ["หมายเลขโทรศัพท์", selectedStudent.guardianPhone],
  ];

  const familyRows = [
    ["รายได้รวมของครอบครัวต่อเดือน", formatMoney(selectedStudent.totalFamilyIncome)],
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
    <main className="w-full px-4 py-6 sm:px-6 lg:px-10 2xl:px-14">
      <section className="mx-auto w-full max-w-[1440px]">
        {hasNoApplicationYet && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <span className="text-lg">ℹ️</span>
            <p className="text-sm font-bold text-blue-700">
              บัญชีนี้ยังไม่มีคำร้องกู้ยืม แสดงข้อมูลเท่าที่กรอกไว้จากหน้า
              "ข้อมูลของฉัน" เท่านั้น
            </p>
          </div>
        )}

        {/* ส่วนหัว */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#07116f] to-[#0646ff] shadow-md">
          <div className="flex flex-col gap-5 p-6 text-white sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15 text-3xl ring-1 ring-white/20">
                👩‍🎓
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold text-blue-100">
                  ข้อมูลนักศึกษาผู้กู้ยืมเงิน
                </p>

                <h1 className="mt-1 truncate text-2xl font-black md:text-[1.75rem]">
                  {selectedStudent.fullName || "-"}
                </h1>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                    รหัส{" "}
                    {selectedStudent.studentId ||
                      selectedStudent.studentCode ||
                      "-"}
                  </span>

                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                    {selectedStudent.loanTypeName || "-"}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPage("studentInfo")}
              className="shrink-0 self-start rounded-xl bg-white px-5 py-2.5 text-sm font-black text-[#07116f] shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50 sm:self-auto"
            >
              ✏️ แก้ไขข้อมูล
            </button>
          </div>
        </div>

        {/* การ์ดสรุป 4 ใบ */}
        <section className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <SummaryCard
            icon="🎓"
            label="ประเภทผู้กู้"
            value={selectedStudent.loanTypeName}
          />

          <SummaryCard
            icon="📚"
            label="ภาคการศึกษา"
            value={
              selectedStudent.semester && selectedStudent.semester !== "-"
                ? `ภาคเรียน ${selectedStudent.semester}`
                : "-"
            }
          />

          <SummaryCard icon="✅" label="ผลคัดกรอง" value={eligibilityText} />

          <SummaryCard icon="📄" label="สถานะคำขอ" value={status} status />
        </section>

        {Number(age) < 20 && (
          <section className="mt-4 flex items-start gap-3 rounded-xl border border-pink-200 bg-pink-50 px-4 py-3 text-pink-700">
            <span className="text-2xl">👪</span>

            <div>
              <p className="text-sm font-black">นักศึกษาอายุต่ำกว่า 20 ปี</p>

              <p className="mt-0.5 text-xs leading-5">
                ระบบจะกำหนดให้ใช้เอกสารของผู้ปกครองเพิ่มเติมโดยอัตโนมัติ
              </p>
            </div>
          </section>
        )}

        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-stretch">
          {/* Sidebar เลือกหัวข้อ */}
          <nav className="flex gap-1.5 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm lg:w-60 lg:shrink-0 lg:flex-col lg:justify-between lg:overflow-visible xl:w-64">
            {sections.map((section, index) => (
              <button
                key={section.label}
                type="button"
                onClick={() => setActiveSection(index)}
                className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition lg:flex-1 lg:shrink ${
                  activeSection === index
                    ? "bg-[#07116f] text-white shadow-sm"
                    : "text-gray-600 hover:bg-blue-50"
                }`}
              >
                <span className="text-base">{section.icon}</span>
                <span className="whitespace-nowrap lg:whitespace-normal">
                  {section.label}
                </span>
              </button>
            ))}
          </nav>

          {/* เนื้อหาของแท็บที่เลือก */}
          <div className="flex min-w-0 flex-1 flex-col">
            {activeSection === 0 && (
              <ProfileSection
                icon="👤"
                title="ข้อมูลส่วนบุคคล"
                subtitle="ข้อมูลทั่วไปและข้อมูลการติดต่อของนักศึกษา"
                rows={personalRows}
              />
            )}

            {activeSection === 1 && (
              <ProfileSection
                icon="🏫"
                title="ข้อมูลการศึกษา"
                subtitle="ข้อมูลสถานภาพนักศึกษาและภาคการศึกษาปัจจุบัน"
                rows={educationRows}
              />
            )}

            {activeSection === 2 && (
              <ProfileSection
                icon="👨"
                title="ข้อมูลบิดา"
                subtitle="ข้อมูลส่วนบุคคล อาชีพ และรายได้ของบิดา"
                rows={fatherRows}
              />
            )}

            {activeSection === 3 && (
              <ProfileSection
                icon="👩"
                title="ข้อมูลมารดา"
                subtitle="ข้อมูลส่วนบุคคล อาชีพ และรายได้ของมารดา"
                rows={motherRows}
              />
            )}

            {activeSection === 4 && (
              <ProfileSection
                icon="🧑"
                title="ข้อมูลผู้ปกครอง"
                subtitle="กรณีผู้ปกครองไม่ใช่บิดาหรือมารดา"
                rows={guardianRows}
                emptyText="ยังไม่ได้ระบุข้อมูลผู้ปกครองเพิ่มเติม"
              />
            )}

            {activeSection === 5 && (
              <ProfileSection
                icon="🏠"
                title="ข้อมูลครอบครัว"
                subtitle="รายได้และจำนวนสมาชิกภายในครอบครัว"
                rows={familyRows}
              />
            )}

            {activeSection === 6 && (
              <section className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
                <SectionHeader
                  icon="📋"
                  title="ข้อมูลการกู้ยืม"
                  subtitle="ข้อมูลที่ใช้กำหนดขั้นตอนการคัดกรองและรายการเอกสาร"
                />

                <div className="grid flex-1 content-start gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4 lg:p-6">
                  <InfoCard label="ประเภทผู้กู้" value={selectedStudent.loanTypeName} />

                  <InfoCard label="GPAX" value={selectedStudent.gpax ?? "-"} />

                  <InfoCard
                    label="ชั่วโมงจิตอาสา"
                    value={
                      selectedStudent.volunteerHours !== null &&
                      selectedStudent.volunteerHours !== undefined
                        ? `${selectedStudent.volunteerHours} ชั่วโมง`
                        : "-"
                    }
                  />

                  <InfoCard label="ผลการคัดกรอง" value={eligibilityText} />
                </div>
              </section>
            )}

            {/* ปุ่มก่อนหน้า/ถัดไป */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={activeSection === 0}
                onClick={() =>
                  setActiveSection((current) => Math.max(current - 1, 0))
                }
                className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm font-black text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← ก่อนหน้า
              </button>

              <span className="text-xs font-bold text-gray-400">
                {activeSection + 1} / {sections.length}
              </span>

              <button
                type="button"
                disabled={activeSection === sections.length - 1}
                onClick={() =>
                  setActiveSection((current) =>
                    Math.min(current + 1, sections.length - 1)
                  )
                }
                className="h-10 rounded-xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ถัดไป →
              </button>
            </div>
          </div>
        </div>

        {/* ปุ่มล่างสุด */}
        <div className="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => setPage("home")}
            className="h-11 rounded-xl border border-gray-200 bg-white px-6 text-sm font-black text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            ← กลับหน้าหลัก
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setPage("studentInfo")}
              className="h-11 rounded-xl border-2 border-[#07116f] bg-white px-6 text-sm font-black text-[#07116f] transition hover:bg-blue-50"
            >
              ✏️ แก้ไขข้อมูล
            </button>

            <button
              type="button"
              onClick={() => setPage("eligibility")}
              className="h-11 rounded-xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-6 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              ไปหน้าคัดกรอง →
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProfileSection({ icon, title, subtitle, rows, emptyText }) {
  const hasInformation = rows.some(
    ([, value]) => value && value !== "-" && value !== "0 บาท"
  );

  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
      <SectionHeader icon={icon} title={title} subtitle={subtitle} />

      {hasInformation ? (
        <div className="grid flex-1 content-start gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 lg:p-6">
          {rows.map(([label, value]) => (
            <InfoCard key={label} label={label} value={value} />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 p-5 lg:p-6">
          <div className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center">
            <div className="text-3xl">📝</div>

            <p className="mt-2 text-sm font-black text-gray-600">
              {emptyText || "ยังไม่มีข้อมูล"}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              สามารถเพิ่มข้อมูลได้จากหน้าแก้ไขข้อมูล
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryCard({ icon, label, value, status = false }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-gray-500">{label}</p>

          <p
            className={`mt-1 truncate text-sm font-black ${
              status ? "text-blue-600" : "text-[#07116f]"
            }`}
          >
            {value || "-"}
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
    <div className="bg-[#07116f] px-5 py-4 text-white lg:px-6">
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

function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-[#f8fbff] px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50">
      <p className="text-xs font-bold text-gray-500">{label}</p>

      <p className="mt-1 break-words text-sm font-black text-[#07116f]">
        {value ?? "-"}
      </p>
    </div>
  );
}

export default StudentProfiles;