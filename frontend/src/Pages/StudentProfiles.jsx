<<<<<<< HEAD
import { useState } from "react";
import { useApp } from "../context/AppContext";
=======
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
>>>>>>> 48a7d434ce692b2dcfb0093176389538de32d049

function formatThaiDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

<<<<<<< HEAD
  const date = new Date(dateValue);
=======
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
>>>>>>> 48a7d434ce692b2dcfb0093176389538de32d049

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

<<<<<<< HEAD
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
=======
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
>>>>>>> 48a7d434ce692b2dcfb0093176389538de32d049
              </div>
            </div>

            <button
<<<<<<< HEAD
              type="button"
              onClick={() => setPage("studentInfo")}
              className="shrink-0 self-start rounded-xl bg-white px-5 py-2.5 text-sm font-black text-[#07116f] shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50 sm:self-auto"
=======
                type="button"
                onClick={() =>
                  navigateToPage(
                    "studentInfo"
                  )
                }
              className="rounded-xl bg-white px-7 py-3 font-black text-[#07116f] shadow transition hover:bg-blue-50"
>>>>>>> 48a7d434ce692b2dcfb0093176389538de32d049
            >
              ✏️ แก้ไขข้อมูล
            </button>
          </div>
<<<<<<< HEAD
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
=======

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
>>>>>>> 48a7d434ce692b2dcfb0093176389538de32d049
    </div>
  );
}

<<<<<<< HEAD
function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="bg-[#07116f] px-5 py-4 text-white lg:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl">
=======
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
>>>>>>> 48a7d434ce692b2dcfb0093176389538de32d049
          {icon}
        </div>

        <div>
<<<<<<< HEAD
          <h2 className="text-base font-black md:text-lg">{title}</h2>

          <p className="mt-0.5 text-xs text-blue-100">{subtitle}</p>
=======
          <h2 className="text-xl font-black md:text-2xl">
            {title}
          </h2>

          <p className="mt-1 text-sm text-blue-100">
            {subtitle}
          </p>
>>>>>>> 48a7d434ce692b2dcfb0093176389538de32d049
        </div>
      </div>
    </div>
  );
}

<<<<<<< HEAD
function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-[#f8fbff] px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50">
      <p className="text-xs font-bold text-gray-500">{label}</p>

      <p className="mt-1 break-words text-sm font-black text-[#07116f]">
        {value ?? "-"}
=======
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
>>>>>>> 48a7d434ce692b2dcfb0093176389538de32d049
      </p>
    </div>
  );
}

<<<<<<< HEAD
=======
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

>>>>>>> 48a7d434ce692b2dcfb0093176389538de32d049
export default StudentProfiles;