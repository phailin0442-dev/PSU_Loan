import { useEffect, useState } from "react";

function calculateAge(birthDate) {
  if (!birthDate) {
    return 0;
  }

  let day;
  let month;
  let year;

  if (birthDate.includes("/")) {
    const parts = birthDate.split("/").map(Number);

    day = parts[0];
    month = parts[1];
    year = parts[2];
  } else if (birthDate.includes("-")) {
    const parts = birthDate.split("-").map(Number);

    year = parts[0];
    month = parts[1];
    day = parts[2];
  } else {
    return 0;
  }

  if (!day || !month || !year) {
    return 0;
  }

  if (year > 2400) {
    year -= 543;
  }

  const birth = new Date(year, month - 1, day);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();

  const monthDifference =
    today.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }

  return age > 0 && age < 120 ? age : 0;
}

function formatThaiDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  let date;

  if (dateValue.includes("/")) {
    const [day, month, yearValue] =
      dateValue.split("/").map(Number);

    const year =
      yearValue > 2400
        ? yearValue - 543
        : yearValue;

    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateValue);
  }

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

function StudentProfiles({
  goProtectedPage,
  setPage,
}) {
  const [role, setRole] = useState("student");
  const [student, setStudent] = useState(null);

  useEffect(() => {
    function loadStudent() {
      try {
        const savedStudent = localStorage.getItem(
          "selectedMockStudent"
        );

        if (!savedStudent) {
          setStudent(null);
          return;
        }

        const parsedStudent =
          JSON.parse(savedStudent);

        setStudent(parsedStudent);
      } catch (error) {
        console.error(
          "ไม่สามารถอ่านข้อมูลนักศึกษาได้:",
          error
        );

        setStudent(null);
      }
    }

    loadStudent();

    const handleStudentChanged = (event) => {
      if (event.detail) {
        setStudent(event.detail);
        return;
      }

      loadStudent();
    };

    window.addEventListener(
      "mockStudentChanged",
      handleStudentChanged
    );

    window.addEventListener(
      "storage",
      loadStudent
    );

    return () => {
      window.removeEventListener(
        "mockStudentChanged",
        handleStudentChanged
      );

      window.removeEventListener(
        "storage",
        loadStudent
      );
    };
  }, []);

  const navigateToPage = (targetPage) => {
    if (goProtectedPage) {
      goProtectedPage(targetPage);
      return;
    }

    if (setPage) {
      setPage(targetPage);
    }
  };

  const handleRoleChange = (event) => {
    const selectedRole = event.target.value;

    setRole(selectedRole);

    if (selectedRole === "staff") {
      navigateToPage("staffDashboard");
      return;
    }

    navigateToPage("home");
  };

  const studentMenus = [
    {
      id: 1,
      label: "หน้าหลัก",
      page: "home",
    },
    {
      id: 2,
      label: "ข้อมูลของฉัน",
      page: "StudentProfiles",
    },
    {
      id: 3,
      label: "การคัดกรอง",
      page: "eligibility",
    },
    {
      id: 4,
      label: "เอกสารของฉัน",
      page: "myDocuments",
    },
    {
      id: 5,
      label: "จองคิว",
      page: "booking",
    },
    {
      id: 6,
      label: "ติดตามสถานะ",
      page: "status",
    },
  ];

  if (!student) {
    return (
      <div className="min-h-screen bg-[#eef5ff] text-[#07116f]">
        <Navbar
          studentMenus={studentMenus}
          role={role}
          handleRoleChange={handleRoleChange}
          navigateToPage={navigateToPage}
        />

        <main className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-6 py-12">
          <div className="w-full max-w-lg rounded-3xl bg-white p-10 text-center shadow">
            <div className="text-6xl">👤</div>

            <h2 className="mt-5 text-2xl font-black">
              ยังไม่มีข้อมูลนักศึกษา
            </h2>

            <p className="mt-3 text-gray-500">
              กรุณากรอกข้อมูลส่วนบุคคลก่อนดำเนินการ
            </p>

            <button
              type="button"
              onClick={() =>
                navigateToPage("studentInfo")
              }
              className="mt-7 rounded-xl bg-[#07116f] px-7 py-3 font-black text-white transition hover:bg-[#101c8c]"
            >
              กรอกข้อมูลส่วนบุคคล
            </button>
          </div>
        </main>
      </div>
    );
  }

  const age =
    student.age ||
    calculateAge(
      student.birthDate ||
        student.birthdate
    );

  const eligibilityStatus =
    student.eligibilityStatus ||
    student.eligibility_status ||
    "ยังไม่ได้ตรวจสอบ";

  const gpax =
    student.gpax ?? "-";

  const volunteerHours =
    student.volunteerHours ??
    student.volunteer_hours ??
    "-";

  const loanTypeName =
    student.loanTypeName ||
    student.loanTypeText ||
    student.loan_type_name ||
    "-";

  const minimumVolunteerHours =
    student.loanTypeCode ===
      "NEW_BORROWER" ||
    student.loanType === "new"
      ? 2
      : 36;

  const personalData = {
    prefix:
      student.prefix || "-",

    firstName:
      student.firstName ||
      student.first_name ||
      "-",

    lastName:
      student.lastName ||
      student.last_name ||
      "-",

    citizenId:
      student.citizenId ||
      student.citizen_id ||
      student.nationalId ||
      "-",

    birthDate:
      student.birthDate ||
      student.birthdate ||
      "-",

    age,

    nationality:
      student.nationality || "ไทย",

    religion:
      student.religion || "-",

    maritalStatus:
      student.maritalStatus ||
      student.marital_status ||
      "โสด",

    phone:
      student.phone || "-",

    email:
      student.email || "-",

    address:
      student.address ||
      student.currentAddress ||
      student.current_address ||
      "-",

    province:
      student.province || "-",

    postalCode:
      student.postalCode ||
      student.postal_code ||
      "-",
  };

  const educationData = {
    studentCode:
      student.studentCode ||
      student.student_code ||
      "-",

    faculty:
      student.faculty || "-",

    major:
      student.major || "-",

    yearLevel:
      student.yearLevel ||
      student.year_level ||
      "-",

    academicYear:
      student.academicYear ||
      student.academic_year ||
      "2569",

    semester:
      student.semester || 1,
  };

  const fatherData = {
    prefix:
      student.fatherPrefix ||
      student.father_prefix ||
      "นาย",

    firstName:
      student.fatherFirstName ||
      student.father_first_name ||
      "-",

    lastName:
      student.fatherLastName ||
      student.father_last_name ||
      "-",

    citizenId:
      student.fatherCitizenId ||
      student.father_citizen_id ||
      "-",

    occupation:
      student.fatherOccupation ||
      student.father_occupation ||
      "-",

    monthlyIncome:
      student.fatherMonthlyIncome ||
      student.father_monthly_income ||
      "-",

    phone:
      student.fatherPhone ||
      student.father_phone ||
      "-",

    status:
      student.fatherStatus ||
      student.father_status ||
      "มีชีวิตอยู่",
  };

  const motherData = {
    prefix:
      student.motherPrefix ||
      student.mother_prefix ||
      "นาง",

    firstName:
      student.motherFirstName ||
      student.mother_first_name ||
      "-",

    lastName:
      student.motherLastName ||
      student.mother_last_name ||
      "-",

    citizenId:
      student.motherCitizenId ||
      student.mother_citizen_id ||
      "-",

    occupation:
      student.motherOccupation ||
      student.mother_occupation ||
      "-",

    monthlyIncome:
      student.motherMonthlyIncome ||
      student.mother_monthly_income ||
      "-",

    phone:
      student.motherPhone ||
      student.mother_phone ||
      "-",

    status:
      student.motherStatus ||
      student.mother_status ||
      "มีชีวิตอยู่",
  };

  const guardianData = {
    relation:
      student.guardianRelation ||
      student.guardian_relation ||
      "-",

    prefix:
      student.guardianPrefix ||
      student.guardian_prefix ||
      "-",

    firstName:
      student.guardianFirstName ||
      student.guardian_first_name ||
      "-",

    lastName:
      student.guardianLastName ||
      student.guardian_last_name ||
      "-",

    citizenId:
      student.guardianCitizenId ||
      student.guardian_citizen_id ||
      "-",

    occupation:
      student.guardianOccupation ||
      student.guardian_occupation ||
      "-",

    monthlyIncome:
      student.guardianMonthlyIncome ||
      student.guardian_monthly_income ||
      "-",

    phone:
      student.guardianPhone ||
      student.guardian_phone ||
      "-",
  };

  const familyData = {
    totalFamilyIncome:
      student.totalFamilyIncome ||
      student.total_family_income ||
      "-",

    numberOfFamilyMembers:
      student.numberOfFamilyMembers ||
      student.number_of_family_members ||
      "-",

    numberOfStudyingMembers:
      student.numberOfStudyingMembers ||
      student.number_of_studying_members ||
      "-",
  };

  return (
    <div className="min-h-screen bg-[#eef5ff] text-[#07116f]">
      <Navbar
        studentMenus={studentMenus}
        role={role}
        handleRoleChange={handleRoleChange}
        navigateToPage={navigateToPage}
      />

      <main className="w-full px-6 py-8 lg:px-12">
        <section className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 rounded-3xl bg-gradient-to-r from-[#07116f] to-[#0646ff] p-7 text-white shadow-lg md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/20 text-4xl">
                👩‍🎓
              </div>

              <div>
                <p className="text-sm font-bold text-blue-100">
                  ข้อมูลนักศึกษาผู้กู้ยืมเงิน
                </p>

                <h1 className="mt-1 text-2xl font-black md:text-3xl">
                  {personalData.prefix}
                  {personalData.firstName}{" "}
                  {personalData.lastName}
                </h1>

                <p className="mt-2 text-sm text-blue-100">
                  รหัสนักศึกษา{" "}
                  {educationData.studentCode} ·{" "}
                  {educationData.faculty}
                </p>
              </div>
            </div>

            <button
                type="button"
                onClick={() =>
                  navigateToPage(
                    "studentInfo"
                  )
                }
              className="rounded-xl bg-white px-7 py-3 font-black text-[#07116f] shadow transition hover:bg-blue-50"
            >
              ✏️ แก้ไขข้อมูล
            </button>
          </div>

          <section className="mt-7 overflow-hidden rounded-3xl bg-white shadow-sm">
            <SectionHeader
              icon="✅"
              title="ข้อมูลการคัดกรองคุณสมบัติ"
              subtitle="ผลการตรวจสอบคุณสมบัติเบื้องต้นของผู้กู้ยืม"
            />

            <div className="p-7">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <ScreeningCard
                  title="ประเภทผู้กู้"
                  value={loanTypeName}
                  icon="👤"
                />

                <ScreeningCard
                  title="เกรดเฉลี่ยสะสม"
                  value={
                    gpax === "-"
                      ? "-"
                      : Number(gpax).toFixed(2)
                  }
                  subtext="เกณฑ์ขั้นต่ำ 1.80"
                  icon="🎓"
                />

                <ScreeningCard
                  title="ชั่วโมงจิตอาสา"
                  value={
                    volunteerHours === "-"
                      ? "-"
                      : `${volunteerHours} ชั่วโมง`
                  }
                  subtext={`เกณฑ์ขั้นต่ำ ${minimumVolunteerHours} ชั่วโมง`}
                  icon="🤝"
                />

                <ScreeningCard
                  title="ผลการคัดกรอง"
                  value={eligibilityStatus}
                  icon={
                    eligibilityStatus === "ผ่าน"
                      ? "✅"
                      : "⏳"
                  }
                  status={
                    eligibilityStatus === "ผ่าน"
                      ? "success"
                      : eligibilityStatus ===
                          "ไม่ผ่าน"
                        ? "danger"
                        : "pending"
                  }
                />
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-3">
                <InfoBox
                  label="ปีการศึกษา"
                  value={
                    educationData.academicYear
                  }
                />

                <InfoBox
                  label="ภาคการศึกษา"
                  value={`ภาคการศึกษาที่ ${educationData.semester}`}
                />

                <InfoBox
                  label="เงื่อนไขผู้ปกครอง"
                  value={
                    age < 20
                      ? "อายุต่ำกว่า 20 ปี ต้องใช้เอกสารผู้ปกครอง"
                      : "อายุครบ 20 ปีบริบูรณ์"
                  }
                />
              </div>

              {eligibilityStatus !== "ผ่าน" && (
                <div className="mt-6 rounded-2xl border border-orange-300 bg-orange-50 p-5 text-orange-700">
                  <p className="font-black">
                    ยังไม่ผ่านการคัดกรอง
                  </p>

                  <p className="mt-1 text-sm">
                    กรุณาตรวจสอบข้อมูล GPAX
                    ชั่วโมงจิตอาสา
                    และหลักฐานให้ครบถ้วน
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      navigateToPage(
                        "eligibility"
                      )
                    }
                    className="mt-4 rounded-xl bg-orange-600 px-5 py-2.5 font-bold text-white transition hover:bg-orange-700"
                  >
                    ไปหน้าการคัดกรอง
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="mt-7 overflow-hidden rounded-3xl bg-white shadow-sm">
            <SectionHeader
              icon="👤"
              title="ข้อมูลส่วนบุคคล"
              subtitle="ข้อมูลผู้กู้ยืมตามแบบคำขอกู้ยืมเงิน กยศ.102"
            />

            <div className="grid gap-x-8 gap-y-5 p-7 md:grid-cols-2 xl:grid-cols-3">
              <DataItem
                label="คำนำหน้าชื่อ"
                value={personalData.prefix}
              />

              <DataItem
                label="ชื่อ"
                value={
                  personalData.firstName
                }
              />

              <DataItem
                label="นามสกุล"
                value={
                  personalData.lastName
                }
              />

              <DataItem
                label="เลขประจำตัวประชาชน"
                value={formatCitizenId(
                  personalData.citizenId
                )}
                important
              />

              <DataItem
                label="วันเดือนปีเกิด"
                value={formatThaiDate(
                  personalData.birthDate
                )}
              />

              <DataItem
                label="อายุ"
                value={
                  age ? `${age} ปี` : "-"
                }
              />

              <DataItem
                label="สัญชาติ"
                value={
                  personalData.nationality
                }
              />

              <DataItem
                label="ศาสนา"
                value={personalData.religion}
              />

              <DataItem
                label="สถานภาพ"
                value={
                  personalData.maritalStatus
                }
              />

              <DataItem
                label="หมายเลขโทรศัพท์"
                value={personalData.phone}
              />

              <DataItem
                label="อีเมล"
                value={personalData.email}
              />

              <DataItem
                label="รหัสไปรษณีย์"
                value={
                  personalData.postalCode
                }
              />

              <div className="md:col-span-2 xl:col-span-3">
                <DataItem
                  label="ที่อยู่ปัจจุบัน"
                  value={
                    personalData.address
                  }
                />
              </div>
            </div>
          </section>

          <section className="mt-7 overflow-hidden rounded-3xl bg-white shadow-sm">
            <SectionHeader
              icon="🏫"
              title="ข้อมูลการศึกษา"
              subtitle="ข้อมูลการศึกษาของนักศึกษาผู้ยื่นคำขอ"
            />

            <div className="grid gap-x-8 gap-y-5 p-7 md:grid-cols-2 xl:grid-cols-3">
              <DataItem
                label="รหัสนักศึกษา"
                value={
                  educationData.studentCode
                }
                important
              />

              <DataItem
                label="คณะ"
                value={
                  educationData.faculty
                }
              />

              <DataItem
                label="สาขาวิชา"
                value={educationData.major}
              />

              <DataItem
                label="ชั้นปี"
                value={`ชั้นปีที่ ${educationData.yearLevel}`}
              />

              <DataItem
                label="ปีการศึกษา"
                value={
                  educationData.academicYear
                }
              />

              <DataItem
                label="ภาคการศึกษา"
                value={`ภาคการศึกษาที่ ${educationData.semester}`}
              />
            </div>
          </section>

          <section className="mt-7 overflow-hidden rounded-3xl bg-white shadow-sm">
            <SectionHeader
              icon="👪"
              title="ข้อมูลครอบครัว"
              subtitle="ข้อมูลบิดา มารดา และผู้ปกครองตามแบบ กยศ.102"
            />

            <div className="p-7">
              <FamilyPersonCard
                title="ข้อมูลบิดา"
                icon="👨"
                data={fatherData}
                type="parent"
              />

              <FamilyPersonCard
                title="ข้อมูลมารดา"
                icon="👩"
                data={motherData}
                type="parent"
              />

              <FamilyPersonCard
                title="ข้อมูลผู้ปกครอง"
                icon="🧑"
                data={guardianData}
                type="guardian"
              />

              <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-6">
                <h3 className="text-lg font-black">
                  ข้อมูลรายได้ของครอบครัว
                </h3>

                <div className="mt-5 grid gap-5 md:grid-cols-3">
                  <DataItem
                    label="รายได้รวมของครอบครัวต่อเดือน"
                    value={
                      familyData.totalFamilyIncome ===
                      "-"
                        ? "-"
                        : `${Number(
                            familyData.totalFamilyIncome
                          ).toLocaleString(
                            "th-TH"
                          )} บาท`
                    }
                  />

                  <DataItem
                    label="จำนวนสมาชิกในครอบครัว"
                    value={
                      familyData.numberOfFamilyMembers ===
                      "-"
                        ? "-"
                        : `${familyData.numberOfFamilyMembers} คน`
                    }
                  />

                  <DataItem
                    label="จำนวนสมาชิกที่กำลังศึกษา"
                    value={
                      familyData.numberOfStudyingMembers ===
                      "-"
                        ? "-"
                        : `${familyData.numberOfStudyingMembers} คน`
                    }
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() =>
                navigateToPage("home")
              }
              className="h-14 rounded-2xl border border-gray-200 bg-white px-8 font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:shadow-md"
            >
              ← กลับหน้าหลัก
            </button>

            <div className="flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  navigateToPage(
                    "studentInfo"
                  )
                }
                className="h-14 rounded-2xl border-2 border-[#07116f] bg-white px-8 font-black text-[#07116f] transition hover:bg-blue-50"
              >
                ✏️ แก้ไขข้อมูล
              </button>

              <button
                type="button"
                onClick={() =>
                  navigateToPage(
                    "eligibility"
                  )
                }
                className="h-14 rounded-2xl bg-gradient-to-r from-[#0646ff] to-[#006dff] px-8 font-black text-white shadow-lg transition hover:shadow-xl"
              >
                ไปหน้าการคัดกรอง →
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Navbar({
  studentMenus,
  role,
  student,
  handleRoleChange,
  navigateToPage,
}) {
  const studentCode =
    student?.studentCode ||
    student?.student_code ||
    student?.studentId ||
    "6610110003";

  const loanTypeName =
    student?.loanTypeName ||
    student?.loanTypeText ||
    student?.loan_type_name ||
    "ผู้กู้รายเก่าต่อเนื่อง";

  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-sm">
      <div className="flex min-h-20 w-full flex-col gap-5 px-6 py-4 lg:px-12 xl:flex-row xl:items-center xl:justify-between">
        {/* ชื่อระบบ */}
        <button
          type="button"
          onClick={() => navigateToPage("home")}
          className="shrink-0 text-left"
        >
          <h1 className="text-2xl font-black text-[#07116f] md:text-3xl">
            PSU Smart Loan
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตหาดใหญ่
          </p>
        </button>

        {/* เมนู */}
        <nav className="flex flex-wrap items-center gap-2 font-bold">
          {studentMenus.map((menu) => {
            const active =
              menu.page === "StudentProfiles";

            return (
              <button
                key={menu.id}
                type="button"
                onClick={() =>
                  navigateToPage(menu.page)
                }
                className={`rounded-lg px-2 py-2 transition ${
                  active
                    ? "bg-blue-50 text-blue-600"
                    : "text-[#07116f] hover:bg-blue-50 hover:text-blue-500"
                }`}
              >
                {menu.label}
              </button>
            );
          })}

          {/* ข้อมูลนักศึกษาที่เลือก */}
          <div className="relative ml-1">
            <select
              value={studentCode}
              onChange={() => {}}
              aria-label="นักศึกษาที่กำลังใช้งาน"
              className="max-w-[325px] cursor-pointer appearance-none rounded-full border-2 border-[#07116f] bg-white py-2 pl-4 pr-10 text-sm font-bold text-[#07116f] outline-none transition hover:bg-blue-50 focus:ring-4 focus:ring-blue-200"
            >
              <option value={studentCode}>
                {studentCode} - {loanTypeName}
              </option>
            </select>

            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#07116f]">
              ▼
            </span>
          </div>

          {/* เลือกบทบาท */}
          <div className="relative">
            <select
              value={role}
              onChange={handleRoleChange}
              aria-label="เลือกบทบาทผู้ใช้งาน"
              className="cursor-pointer appearance-none rounded-full bg-[#07116f] py-2 pl-5 pr-11 font-semibold text-white outline-none transition hover:bg-[#101c8c] focus:ring-4 focus:ring-blue-200"
            >
              <option value="student">
                👤 นักศึกษา
              </option>

              <option value="staff">
                🛠️ เจ้าหน้าที่
              </option>
            </select>

            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white">
              ▼
            </span>
          </div>
        </nav>
      </div>
    </header>
  );
}


function SectionHeader({
  icon,
  title,
  subtitle,
}) {
  return (
    <div className="border-b border-gray-100 bg-[#07116f] px-7 py-5 text-white">
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

function ScreeningCard({
  title,
  value,
  subtext,
  icon,
  status,
}) {
  let cardClass =
    "border-blue-200 bg-blue-50";

  let valueClass = "text-[#07116f]";

  if (status === "success") {
    cardClass =
      "border-green-300 bg-green-50";

    valueClass = "text-green-700";
  }

  if (status === "danger") {
    cardClass = "border-red-300 bg-red-50";
    valueClass = "text-red-700";
  }

  if (status === "pending") {
    cardClass =
      "border-orange-300 bg-orange-50";

    valueClass = "text-orange-700";
  }

  return (
    <div
      className={`rounded-2xl border p-5 ${cardClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-500">
            {title}
          </p>

          <p
            className={`mt-2 text-lg font-black ${valueClass}`}
          >
            {value}
          </p>
        </div>

        <div className="text-3xl">
          {icon}
        </div>
      </div>

      {subtext && (
        <p className="mt-3 text-xs font-bold text-gray-500">
          {subtext}
        </p>
      )}
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <p className="text-xs font-bold text-gray-500">
        {label}
      </p>

      <p className="mt-2 font-black text-[#07116f]">
        {value}
      </p>
    </div>
  );
}

function DataItem({
  label,
  value,
  important = false,
}) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-bold text-gray-500">
        {label}
      </p>

      <p
        className={`mt-1 break-words ${
          important
            ? "text-lg font-black text-[#07116f]"
            : "font-bold text-gray-800"
        }`}
      >
        {value || "-"}
      </p>
    </div>
  );
}

function FamilyPersonCard({
  title,
  icon,
  data,
  type,
}) {
  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-2xl">
          {icon}
        </div>

        <h3 className="text-lg font-black">
          {title}
        </h3>
      </div>

      <div className="mt-6 grid gap-x-8 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
        {type === "guardian" && (
          <DataItem
            label="ความสัมพันธ์กับนักศึกษา"
            value={data.relation}
          />
        )}

        <DataItem
          label="คำนำหน้าชื่อ"
          value={data.prefix}
        />

        <DataItem
          label="ชื่อ"
          value={data.firstName}
        />

        <DataItem
          label="นามสกุล"
          value={data.lastName}
        />

        <DataItem
          label="เลขประจำตัวประชาชน"
          value={formatCitizenId(
            data.citizenId
          )}
          important
        />

        <DataItem
          label="อาชีพ"
          value={data.occupation}
        />

        <DataItem
          label="รายได้ต่อเดือน"
          value={
            data.monthlyIncome === "-"
              ? "-"
              : `${Number(
                  data.monthlyIncome
                ).toLocaleString(
                  "th-TH"
                )} บาท`
          }
        />

        <DataItem
          label="หมายเลขโทรศัพท์"
          value={data.phone}
        />

        {type === "parent" && (
          <DataItem
            label="สถานภาพ"
            value={data.status}
          />
        )}
      </div>
    </div>
  );
}

export default StudentProfiles;