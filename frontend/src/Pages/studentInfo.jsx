import { useState } from "react";

const initialFormData = {
  prefix: "นางสาว",
  firstName: "",
  lastName: "",
  citizenId: "",
  birthDate: "",
  nationality: "ไทย",
  religion: "",
  maritalStatus: "โสด",
  phone: "",
  email: "",
  address: "",
  province: "",
  postalCode: "",

  studentCode: "",
  faculty: "",
  major: "",
  yearLevel: "",
  academicYear: "2569",
  semester: "1",

  fatherPrefix: "นาย",
  fatherFirstName: "",
  fatherLastName: "",
  fatherCitizenId: "",
  fatherOccupation: "",
  fatherMonthlyIncome: "",
  fatherPhone: "",
  fatherStatus: "มีชีวิตอยู่",

  motherPrefix: "นาง",
  motherFirstName: "",
  motherLastName: "",
  motherCitizenId: "",
  motherOccupation: "",
  motherMonthlyIncome: "",
  motherPhone: "",
  motherStatus: "มีชีวิตอยู่",

  guardianRelation: "",
  guardianPrefix: "",
  guardianFirstName: "",
  guardianLastName: "",
  guardianCitizenId: "",
  guardianOccupation: "",
  guardianMonthlyIncome: "",
  guardianPhone: "",

  totalFamilyIncome: "",
  numberOfFamilyMembers: "",
  numberOfStudyingMembers: "",

  loanTypeCode: "",
  loanTypeName: "",
  gpax: "",
  volunteerHours: "",
  eligibilityStatus: "ยังไม่ได้ตรวจสอบ",
};

function getInitialStudentForm(studentData) {
  try {
    const savedStudent = localStorage.getItem(
      "selectedMockStudent"
    );

    if (savedStudent) {
      const parsedStudent = JSON.parse(savedStudent);

      return {
        ...initialFormData,
        ...parsedStudent,
      };
    }
  } catch (error) {
    console.error(
      "ไม่สามารถโหลดข้อมูลนักศึกษาได้:",
      error
    );
  }

  if (!studentData) {
    return {
      ...initialFormData,
    };
  }

  const fullName =
    studentData.fullname ||
    studentData.fullName ||
    "";

  const nameParts = fullName
    .replace(/^(นาย|นางสาว|นาง)/, "")
    .trim()
    .split(/\s+/);

  return {
    ...initialFormData,

    firstName: nameParts[0] || "",
    lastName: nameParts.slice(1).join(" "),

    studentCode:
      studentData.studentCode ||
      studentData.studentId ||
      "",

    birthDate:
      studentData.birthDate ||
      studentData.birthdate ||
      "",

    faculty: studentData.faculty || "",
    major: studentData.major || "",

    yearLevel:
      studentData.yearLevel ||
      studentData.year ||
      "",
  };
}

function StudentInfo({
  goProtectedPage,
  setPage,
  studentData,
  setStudentData,
  
}) {
  const [formData, setFormData] = useState(() =>
  getInitialStudentForm(studentData)
);

  const [message, setMessage] = useState("");

  

  const navigateToPage = (targetPage) => {
    if (goProtectedPage) {
      goProtectedPage(targetPage);
      return;
    }

    if (setPage) {
      setPage(targetPage);
    }
  };

  const handleChange = (event) => {
  const { name, value } = event.target;

  setFormData((previous) => ({
    ...previous,
    [name]: value,
  }));
};

  const handleLoanTypeChange = (event) => {
    const loanTypeCode = event.target.value;

    const loanTypeNames = {
      NEW_BORROWER: "ผู้กู้รายใหม่",
      CONTINUING_SPECIAL:
        "ผู้กู้ต่อเนื่องกรณีพิเศษ",
      CONTINUING_YEAR:
        "ผู้กู้ต่อเนื่องเลื่อนชั้นปี",
    };

    setFormData((previous) => ({
      ...previous,
      loanTypeCode,
      loanTypeName:
        loanTypeNames[loanTypeCode] || "",
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.studentCode
    ) {
      setMessage(
        "กรุณากรอกชื่อ นามสกุล และรหัสนักศึกษา"
      );
      return;
    }

    const savedData = {
      ...formData,
      studentId: formData.studentCode,
      fullName: `${formData.prefix}${formData.firstName} ${formData.lastName}`,
      fullname: `${formData.prefix}${formData.firstName} ${formData.lastName}`,
      birthdate: formData.birthDate,
    };

    try {
      localStorage.setItem(
        "selectedMockStudent",
        JSON.stringify(savedData)
      );

      if (setStudentData) {
        setStudentData(savedData);
      }

      window.dispatchEvent(
        new CustomEvent("mockStudentChanged", {
          detail: savedData,
        })
      );

      setMessage("บันทึกข้อมูลเรียบร้อยแล้ว");

      setTimeout(() => {
        navigateToPage("StudentProfiles");
      }, 500);
    } catch (error) {
      console.error(
        "ไม่สามารถบันทึกข้อมูลได้:",
        error
      );

      setMessage("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  return (
    <div className="min-h-screen bg-[#eef5ff] text-[#07116f]">
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="mx-auto flex min-h-20 max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={() => navigateToPage("home")}
            className="text-left"
          >
            <h1 className="text-2xl font-black">
              PSU Smart Loan
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              มหาวิทยาลัยสงขลานครินทร์
              วิทยาเขตหาดใหญ่
            </p>
          </button>

          <div className="flex flex-wrap gap-2">
            <NavButton
              label="หน้าหลัก"
              onClick={() =>
                navigateToPage("home")
              }
            />

            <NavButton
              label="ข้อมูลของฉัน"
              onClick={() =>
                navigateToPage(
                  "StudentProfiles"
                )
              }
            />

            <NavButton
              label="การคัดกรอง"
              onClick={() =>
                navigateToPage("eligibility")
              }
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#07116f] to-[#0646ff] p-7 text-white shadow-lg">
          <p className="text-sm font-bold text-blue-100">
            แบบฟอร์มข้อมูลนักศึกษาผู้กู้ยืม
          </p>

          <h2 className="mt-2 text-2xl font-black md:text-3xl">
            กรอกและแก้ไขข้อมูลส่วนบุคคล
          </h2>

          <p className="mt-2 text-blue-100">
            กรุณากรอกข้อมูลให้ครบถ้วนก่อนเข้าสู่ขั้นตอนการคัดกรอง
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-7 space-y-7"
        >
          <FormSection
            title="ข้อมูลส่วนบุคคล"
            subtitle="ข้อมูลของนักศึกษาผู้ยื่นคำขอกู้ยืม"
          >
            <SelectField
              label="คำนำหน้าชื่อ"
              name="prefix"
              value={formData.prefix}
              onChange={handleChange}
              options={[
                ["นาย", "นาย"],
                ["นางสาว", "นางสาว"],
                ["นาง", "นาง"],
              ]}
            />

            <InputField
              label="ชื่อ"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
            />

            <InputField
              label="นามสกุล"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
            />

            <InputField
              label="เลขประจำตัวประชาชน"
              name="citizenId"
              value={formData.citizenId}
              onChange={handleChange}
              maxLength={13}
            />

            <InputField
              label="วันเดือนปีเกิด"
              name="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={handleChange}
            />

            <InputField
              label="สัญชาติ"
              name="nationality"
              value={formData.nationality}
              onChange={handleChange}
            />

            <InputField
              label="ศาสนา"
              name="religion"
              value={formData.religion}
              onChange={handleChange}
            />

            <SelectField
              label="สถานภาพ"
              name="maritalStatus"
              value={formData.maritalStatus}
              onChange={handleChange}
              options={[
                ["โสด", "โสด"],
                ["สมรส", "สมรส"],
                ["หย่าร้าง", "หย่าร้าง"],
                ["หม้าย", "หม้าย"],
              ]}
            />

            <InputField
              label="หมายเลขโทรศัพท์"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />

            <InputField
              label="อีเมล"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />

            <div className="md:col-span-2 xl:col-span-3">
              <TextAreaField
                label="ที่อยู่ปัจจุบัน"
                name="address"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <InputField
              label="จังหวัด"
              name="province"
              value={formData.province}
              onChange={handleChange}
            />

            <InputField
              label="รหัสไปรษณีย์"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
            />
          </FormSection>

          <FormSection
            title="ข้อมูลการศึกษา"
            subtitle="ข้อมูลนักศึกษาปัจจุบัน"
          >
            <InputField
              label="รหัสนักศึกษา"
              name="studentCode"
              value={formData.studentCode}
              onChange={handleChange}
              required
            />

            <InputField
              label="คณะ"
              name="faculty"
              value={formData.faculty}
              onChange={handleChange}
            />

            <InputField
              label="สาขาวิชา"
              name="major"
              value={formData.major}
              onChange={handleChange}
            />

            <SelectField
              label="ชั้นปี"
              name="yearLevel"
              value={formData.yearLevel}
              onChange={handleChange}
              options={[
                ["", "เลือกชั้นปี"],
                ["1", "ชั้นปีที่ 1"],
                ["2", "ชั้นปีที่ 2"],
                ["3", "ชั้นปีที่ 3"],
                ["4", "ชั้นปีที่ 4"],
                ["5", "ชั้นปีที่ 5"],
                ["6", "ชั้นปีที่ 6"],
              ]}
            />

            <InputField
              label="ปีการศึกษา"
              name="academicYear"
              value={formData.academicYear}
              onChange={handleChange}
            />

            <SelectField
              label="ภาคการศึกษา"
              name="semester"
              value={formData.semester}
              onChange={handleChange}
              options={[
                ["1", "ภาคการศึกษาที่ 1"],
                ["2", "ภาคการศึกษาที่ 2"],
              ]}
            />
          </FormSection>

          <FormSection
            title="ข้อมูลประเภทผู้กู้"
            subtitle="ข้อมูลสำหรับใช้กำหนดเงื่อนไขและเอกสาร"
          >
            <SelectField
              label="ประเภทผู้กู้"
              name="loanTypeCode"
              value={formData.loanTypeCode}
              onChange={
                handleLoanTypeChange
              }
              options={[
                ["", "เลือกประเภทผู้กู้"],
                [
                  "NEW_BORROWER",
                  "ผู้กู้รายใหม่",
                ],
                [
                  "CONTINUING_SPECIAL",
                  "ผู้กู้ต่อเนื่องกรณีพิเศษ",
                ],
                [
                  "CONTINUING_YEAR",
                  "ผู้กู้ต่อเนื่องเลื่อนชั้นปี",
                ],
              ]}
            />

            <InputField
              label="เกรดเฉลี่ยสะสม GPAX"
              name="gpax"
              type="number"
              step="0.01"
              min="0"
              max="4"
              value={formData.gpax}
              onChange={handleChange}
            />

            <InputField
              label="ชั่วโมงจิตอาสา"
              name="volunteerHours"
              type="number"
              min="0"
              value={formData.volunteerHours}
              onChange={handleChange}
            />
          </FormSection>

          <FormSection
            title="ข้อมูลบิดา"
            subtitle="ข้อมูลผู้ปกครองฝ่ายบิดา"
          >
            <SelectField
              label="คำนำหน้าชื่อ"
              name="fatherPrefix"
              value={formData.fatherPrefix}
              onChange={handleChange}
              options={[
                ["นาย", "นาย"],
                ["อื่น ๆ", "อื่น ๆ"],
              ]}
            />

            <InputField
              label="ชื่อ"
              name="fatherFirstName"
              value={
                formData.fatherFirstName
              }
              onChange={handleChange}
            />

            <InputField
              label="นามสกุล"
              name="fatherLastName"
              value={
                formData.fatherLastName
              }
              onChange={handleChange}
            />

            <InputField
              label="เลขประจำตัวประชาชน"
              name="fatherCitizenId"
              value={
                formData.fatherCitizenId
              }
              onChange={handleChange}
            />

            <InputField
              label="อาชีพ"
              name="fatherOccupation"
              value={
                formData.fatherOccupation
              }
              onChange={handleChange}
            />

            <InputField
              label="รายได้ต่อเดือน"
              name="fatherMonthlyIncome"
              type="number"
              min="0"
              value={
                formData.fatherMonthlyIncome
              }
              onChange={handleChange}
            />

            <InputField
              label="หมายเลขโทรศัพท์"
              name="fatherPhone"
              value={formData.fatherPhone}
              onChange={handleChange}
            />

            <SelectField
              label="สถานภาพ"
              name="fatherStatus"
              value={formData.fatherStatus}
              onChange={handleChange}
              options={[
                [
                  "มีชีวิตอยู่",
                  "มีชีวิตอยู่",
                ],
                ["เสียชีวิต", "เสียชีวิต"],
                [
                  "ไม่สามารถติดต่อได้",
                  "ไม่สามารถติดต่อได้",
                ],
              ]}
            />
          </FormSection>

          <FormSection
            title="ข้อมูลมารดา"
            subtitle="ข้อมูลผู้ปกครองฝ่ายมารดา"
          >
            <SelectField
              label="คำนำหน้าชื่อ"
              name="motherPrefix"
              value={formData.motherPrefix}
              onChange={handleChange}
              options={[
                ["นาง", "นาง"],
                ["นางสาว", "นางสาว"],
                ["อื่น ๆ", "อื่น ๆ"],
              ]}
            />

            <InputField
              label="ชื่อ"
              name="motherFirstName"
              value={
                formData.motherFirstName
              }
              onChange={handleChange}
            />

            <InputField
              label="นามสกุล"
              name="motherLastName"
              value={
                formData.motherLastName
              }
              onChange={handleChange}
            />

            <InputField
              label="เลขประจำตัวประชาชน"
              name="motherCitizenId"
              value={
                formData.motherCitizenId
              }
              onChange={handleChange}
            />

            <InputField
              label="อาชีพ"
              name="motherOccupation"
              value={
                formData.motherOccupation
              }
              onChange={handleChange}
            />

            <InputField
              label="รายได้ต่อเดือน"
              name="motherMonthlyIncome"
              type="number"
              min="0"
              value={
                formData.motherMonthlyIncome
              }
              onChange={handleChange}
            />

            <InputField
              label="หมายเลขโทรศัพท์"
              name="motherPhone"
              value={formData.motherPhone}
              onChange={handleChange}
            />

            <SelectField
              label="สถานภาพ"
              name="motherStatus"
              value={formData.motherStatus}
              onChange={handleChange}
              options={[
                [
                  "มีชีวิตอยู่",
                  "มีชีวิตอยู่",
                ],
                ["เสียชีวิต", "เสียชีวิต"],
                [
                  "ไม่สามารถติดต่อได้",
                  "ไม่สามารถติดต่อได้",
                ],
              ]}
            />
          </FormSection>

          <FormSection
            title="ข้อมูลผู้ปกครอง"
            subtitle="กรอกเมื่อผู้ปกครองไม่ใช่บิดาหรือมารดา"
          >
            <InputField
              label="ความสัมพันธ์"
              name="guardianRelation"
              value={
                formData.guardianRelation
              }
              onChange={handleChange}
            />

            <InputField
              label="คำนำหน้าชื่อ"
              name="guardianPrefix"
              value={
                formData.guardianPrefix
              }
              onChange={handleChange}
            />

            <InputField
              label="ชื่อ"
              name="guardianFirstName"
              value={
                formData.guardianFirstName
              }
              onChange={handleChange}
            />

            <InputField
              label="นามสกุล"
              name="guardianLastName"
              value={
                formData.guardianLastName
              }
              onChange={handleChange}
            />

            <InputField
              label="เลขประจำตัวประชาชน"
              name="guardianCitizenId"
              value={
                formData.guardianCitizenId
              }
              onChange={handleChange}
            />

            <InputField
              label="อาชีพ"
              name="guardianOccupation"
              value={
                formData.guardianOccupation
              }
              onChange={handleChange}
            />

            <InputField
              label="รายได้ต่อเดือน"
              name="guardianMonthlyIncome"
              type="number"
              min="0"
              value={
                formData.guardianMonthlyIncome
              }
              onChange={handleChange}
            />

            <InputField
              label="หมายเลขโทรศัพท์"
              name="guardianPhone"
              value={
                formData.guardianPhone
              }
              onChange={handleChange}
            />
          </FormSection>

          <FormSection
            title="ข้อมูลรายได้ครอบครัว"
            subtitle="ข้อมูลประกอบการพิจารณาคุณสมบัติ"
          >
            <InputField
              label="รายได้รวมของครอบครัวต่อเดือน"
              name="totalFamilyIncome"
              type="number"
              min="0"
              value={
                formData.totalFamilyIncome
              }
              onChange={handleChange}
            />

            <InputField
              label="จำนวนสมาชิกในครอบครัว"
              name="numberOfFamilyMembers"
              type="number"
              min="0"
              value={
                formData.numberOfFamilyMembers
              }
              onChange={handleChange}
            />

            <InputField
              label="จำนวนสมาชิกที่กำลังศึกษา"
              name="numberOfStudyingMembers"
              type="number"
              min="0"
              value={
                formData.numberOfStudyingMembers
              }
              onChange={handleChange}
            />
          </FormSection>

          {message && (
            <div
              className={`rounded-2xl border p-4 font-bold ${
                message.includes("เรียบร้อย")
                  ? "border-green-300 bg-green-50 text-green-700"
                  : "border-red-300 bg-red-50 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() =>
                navigateToPage(
                  "StudentProfiles"
                )
              }
              className="h-14 rounded-2xl border-2 border-gray-300 bg-white px-8 font-black text-gray-700 transition hover:bg-gray-50"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              className="h-14 rounded-2xl bg-gradient-to-r from-[#0646ff] to-[#006dff] px-10 font-black text-white shadow-lg transition hover:shadow-xl"
            >
              บันทึกข้อมูล
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function FormSection({
  title,
  subtitle,
  children,
}) {
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
      <div className="bg-[#07116f] px-7 py-5 text-white">
        <h3 className="text-xl font-black">
          {title}
        </h3>

        <p className="mt-1 text-sm text-blue-100">
          {subtitle}
        </p>
      </div>

      <div className="grid gap-5 p-7 md:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

function InputField({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  ...props
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-gray-700">
        {label}
        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      <input
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        className="mt-2 h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-gray-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        {...props}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-gray-700">
        {label}
      </span>

      <select
        name={name}
        value={value ?? ""}
        onChange={onChange}
        className="mt-2 h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-gray-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      >
        {options.map(([optionValue, labelText]) => (
          <option
            key={optionValue}
            value={optionValue}
          >
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  name,
  value,
  onChange,
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-gray-700">
        {label}
      </span>

      <textarea
        name={name}
        value={value ?? ""}
        onChange={onChange}
        rows={4}
        className="mt-2 w-full resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function NavButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl px-4 py-2 font-bold transition hover:bg-blue-50 hover:text-blue-600"
    >
      {label}
    </button>
  );
}

export default StudentInfo;