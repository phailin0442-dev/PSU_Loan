import { useState } from "react";
<<<<<<< HEAD
import { useApp } from "../context/AppContext";

const loanTypeLabels = {
    NEW: "ผู้กู้รายใหม่",
    CONTINUING_SPECIAL: "ผู้กู้ต่อเนื่องกรณีพิเศษ",
    CONTINUING_YEAR: "ผู้กู้ต่อเนื่องเลื่อนชั้นปี",
};

// รวมข้อมูลคำร้อง (selectedStudent) กับข้อมูลส่วนตัวจริง (myProfile จาก student_profiles)
function mergeProfileIntoForm(current, selectedStudent, myProfile) {
    const base = { ...current, ...(selectedStudent || {}) };

    if (!myProfile) return base;

    return {
        ...base,
        studentId: myProfile.studentId || base.studentId || "",
        prefix:
            myProfile.prefix && myProfile.prefix !== "-"
                ? myProfile.prefix
                : base.prefix || "",
        firstName: myProfile.firstName || base.firstName || "",
        lastName: myProfile.lastName || base.lastName || "",
        // เลขที่ระบบใส่ให้ตอนสมัคร (เติม 0 ด้านหน้า) ถือว่ายังไม่ได้กรอก
        citizenId:
            myProfile.citizenId && !/^0{6}/.test(myProfile.citizenId)
                ? myProfile.citizenId
                : base.citizenId || "",
        birthDate:
            myProfile.birthDate &&
            String(myProfile.birthDate).slice(0, 10) !== "2000-01-01"
                ? String(myProfile.birthDate).slice(0, 10)
                : base.birthDate || "",
        phone: myProfile.phone || base.phone || "",
        email: myProfile.email || base.email || "",
        faculty:
            myProfile.faculty && myProfile.faculty !== "-"
                ? myProfile.faculty
                : base.faculty || "",
        major:
            myProfile.major && myProfile.major !== "-"
                ? myProfile.major
                : base.major || "",
        yearLevel: myProfile.yearLevel || base.yearLevel || "",
        province:
            myProfile.province && myProfile.province !== "-"
                ? myProfile.province
                : base.province || "",
        postalCode:
            myProfile.postalCode && myProfile.postalCode !== "00000"
                ? myProfile.postalCode
                : base.postalCode || "",
        address:
            myProfile.houseNo && myProfile.houseNo !== "-"
                ? myProfile.houseNo
                : base.address || "",
        loanTypeCode:
            myProfile.loanTypeCode && myProfile.loanTypeCode !== "-"
                ? myProfile.loanTypeCode
                : base.loanTypeCode || "",
    };
}

function StudentInfo({ setPage }) {
    const { selectedStudent, myProfile, saveMyProfile } = useApp();

    const [formData, setFormData] = useState(selectedStudent || {});
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");

    // แท็บที่เปิดอยู่ตอนนี้ (0-6) — ให้กรอกทีละหัวข้อแทนเลื่อนยาว
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

    // เติมข้อมูลลงฟอร์มทุกครั้งที่ selectedStudent หรือ myProfile เปลี่ยน
    // ทำระหว่าง render (เก็บค่าก่อนหน้าไว้เทียบ) แทน useEffect ตามแนวทางของ React
    // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
    const [prevSources, setPrevSources] = useState({ selectedStudent: undefined, myProfile: undefined });

    if (prevSources.selectedStudent !== selectedStudent || prevSources.myProfile !== myProfile) {
        setPrevSources({ selectedStudent, myProfile });
        setMessage("");
        setMessageType("");
        setFormData((current) => mergeProfileIntoForm(current, selectedStudent, myProfile));
    }

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((current) => ({
            ...current,
            [name]: value,
        }));

        if (message) {
            setMessage("");
            setMessageType("");
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        // แม็ปฟิลด์บังคับไปยังแท็บที่ฟิลด์นั้นอยู่ ใช้กระโดดไปแท็บที่ขาดข้อมูลให้อัตโนมัติ
        const requiredFieldTabs = {
            prefix: 0,
            firstName: 0,
            lastName: 0,
            citizenId: 0,
            birthDate: 0,
            phone: 0,
            email: 0,
            address: 0,
            province: 0,
            postalCode: 0,
            faculty: 1,
            major: 1,
            yearLevel: 1,
        };

        const requiredFields = Object.keys(requiredFieldTabs);

        const missingFields = requiredFields.filter(
            (field) => !String(formData[field] ?? "").trim()
        );

        if (missingFields.length > 0) {
            const firstMissingTab = Math.min(
                ...missingFields.map((field) => requiredFieldTabs[field])
            );

            setActiveSection(firstMissingTab);

            const fieldLabels = {
                prefix: "คำนำหน้า",
                firstName: "ชื่อ",
                lastName: "นามสกุล",
                citizenId: "เลขบัตรประชาชน",
                birthDate: "วันเกิด",
                phone: "เบอร์โทร",
                email: "อีเมล",
                address: "ที่อยู่",
                province: "จังหวัด",
                postalCode: "รหัสไปรษณีย์",
                faculty: "คณะ",
                major: "สาขาวิชา",
                yearLevel: "ชั้นปี",
            };

            setMessage(
                `กรุณากรอกข้อมูลให้ครบ ยังขาด: ${missingFields
                    .map((field) => fieldLabels[field] || field)
                    .join(", ")}`
            );
            setMessageType("error");
            return;
        }

        // บันทึกจริงลง student_profiles (ไม่ผูกกับคำร้อง ใช้ได้เสมอ)
        setMessage("");
        setMessageType("");

        try {
            await saveMyProfile({
                citizenId: formData.citizenId,
                prefix: formData.prefix,
                firstName: formData.firstName,
                lastName: formData.lastName,
                birthDate: formData.birthDate,
                phone: formData.phone,
                faculty: formData.faculty,
                major: formData.major,
                yearLevel: Number(formData.yearLevel),
                houseNo: formData.address,
                subdistrict: myProfile?.subdistrict || "-",
                district: myProfile?.district || "-",
                province: formData.province,
                postalCode: formData.postalCode,
                loanTypeCode: formData.loanTypeCode || null,
            });
        } catch (error) {
            setMessage(
                error.message || "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
            );
            setMessageType("error");
            return;
        }

        setMessage("บันทึกข้อมูลเรียบร้อยแล้ว");
        setMessageType("success");

        alert("✅ บันทึกข้อมูลเรียบร้อยแล้ว");

        setTimeout(() => {
            setPage("eligibility");
        }, 700);
    };

    return (
        <main className="w-full px-4 py-6 sm:px-6 lg:px-10 2xl:px-14">
            <section className="mx-auto w-full max-w-[1440px]">
                {/* ส่วนหัว */}
                <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#07116f] to-[#0646ff] shadow-md">
                    <div className="flex flex-col gap-5 p-6 text-white sm:flex-row sm:items-center sm:justify-between lg:px-8">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15 text-3xl ring-1 ring-white/20">
                                ✏️
                            </div>

                            <div className="min-w-0">
                                <p className="text-xs font-bold text-blue-100">
                                    แบบฟอร์มข้อมูลนักศึกษา
                                </p>

                                <h1 className="mt-1 text-2xl font-black md:text-[1.75rem]">
                                    แก้ไขข้อมูลนักศึกษา
                                </h1>

                                <p className="mt-1 max-w-2xl text-xs leading-5 text-blue-100 sm:text-sm">
                                    ตรวจสอบและแก้ไขข้อมูลส่วนบุคคล ข้อมูลการศึกษา
                                    และข้อมูลครอบครัวให้ครบถ้วน
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setPage("studentProfiles")}
                            className="shrink-0 self-start rounded-xl bg-white px-5 py-2.5 text-sm font-black text-[#07116f] shadow-sm transition hover:bg-blue-50 sm:self-auto"
                        >
                            ← กลับหน้าข้อมูล
                        </button>
                    </div>
                </div>

                <div className="mt-4 flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-orange-700">
                    <span className="text-xl">⚠️</span>

                    <div>
                        <p className="text-sm font-black">
                            การแก้ไขข้อมูลมีผลต่อการคัดกรอง
                        </p>

                        <p className="mt-0.5 text-xs leading-5">
                            เมื่อบันทึกข้อมูลใหม่
                            ระบบจะล้างผลคัดกรองและรายการเอกสารเดิม
                            เพื่อให้ตรวจสอบเงื่อนไขใหม่อีกครั้ง
                        </p>
                    </div>
                </div>

                <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-stretch">
                    {/* Sidebar เลือกหัวข้อ */}
                    <nav className="flex gap-1.5 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm lg:sticky lg:top-6 lg:w-60 lg:shrink-0 lg:flex-col lg:self-start lg:overflow-visible xl:w-64">
                        {sections.map((section, index) => (
                            <button
                                key={section.label}
                                type="button"
                                onClick={() => setActiveSection(index)}
                                className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition lg:shrink ${
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
                    <div className="flex min-w-0 flex-1 flex-col gap-4">
                        {activeSection === 0 && (
                            <FormSection
                                icon="👤"
                                title="ข้อมูลส่วนบุคคล"
                                subtitle="ข้อมูลทั่วไปของนักศึกษาผู้ยื่นคำขอกู้"
                            >
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    <SelectInput
                                        label="คำนำหน้าชื่อ"
                                        required
                                        name="prefix"
                                        value={formData.prefix}
                                        onChange={handleChange}
                                        options={[
                                            { value: "", label: "เลือกคำนำหน้าชื่อ" },
                                            { value: "นาย", label: "นาย" },
                                            { value: "นางสาว", label: "นางสาว" },
                                            { value: "นาง", label: "นาง" },
                                        ]}
                                    />

                                    <Input
                                        label="ชื่อ"
                                        required
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        placeholder="กรอกชื่อ"
                                    />

                                    <Input
                                        label="นามสกุล"
                                        required
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        placeholder="กรอกนามสกุล"
                                    />

                                    <Input
                                        label="เลขประจำตัวประชาชน"
                                        required
                                        name="citizenId"
                                        value={formData.citizenId}
                                        onChange={handleChange}
                                        placeholder="เลขประจำตัวประชาชน 13 หลัก"
                                        maxLength={13}
                                        inputMode="numeric"
                                    />

                                    <Input
                                        label="วันเดือนปีเกิด"
                                        required
                                        name="birthDate"
                                        type="date"
                                        value={formData.birthDate}
                                        onChange={handleChange}
                                    />

                                    <Input
                                        label="สัญชาติ"
                                        name="nationality"
                                        value={formData.nationality}
                                        onChange={handleChange}
                                        placeholder="เช่น ไทย"
                                    />

                                    <Input
                                        label="ศาสนา"
                                        name="religion"
                                        value={formData.religion}
                                        onChange={handleChange}
                                        placeholder="ระบุศาสนา"
                                    />

                                    <SelectInput
                                        label="สถานภาพ"
                                        name="maritalStatus"
                                        value={formData.maritalStatus}
                                        onChange={handleChange}
                                        options={[
                                            { value: "", label: "เลือกสถานภาพ" },
                                            { value: "โสด", label: "โสด" },
                                            { value: "สมรส", label: "สมรส" },
                                            { value: "หย่าร้าง", label: "หย่าร้าง" },
                                            { value: "หม้าย", label: "หม้าย" },
                                        ]}
                                    />

                                    <Input
                                        label="หมายเลขโทรศัพท์"
                                        required
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="08XXXXXXXX"
                                        inputMode="tel"
                                    />

                                    <Input
                                        label="อีเมล"
                                        required
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="example@email.com"
                                    />

                                    <Input
                                        label="จังหวัด"
                                        required
                                        name="province"
                                        value={formData.province}
                                        onChange={handleChange}
                                        placeholder="ระบุจังหวัด"
                                    />

                                    <Input
                                        label="รหัสไปรษณีย์"
                                        required
                                        name="postalCode"
                                        value={formData.postalCode}
                                        onChange={handleChange}
                                        placeholder="รหัสไปรษณีย์"
                                        maxLength={5}
                                        inputMode="numeric"
                                    />

                                    <div className="md:col-span-2 xl:col-span-3">
                                        <Textarea
                                            label="ที่อยู่ปัจจุบัน"
                                            required
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            placeholder="บ้านเลขที่ หมู่ ถนน ตำบล อำเภอ จังหวัด"
                                        />
                                    </div>
                                </div>
                            </FormSection>
                        )}

                        {activeSection === 1 && (
                            <FormSection
                                icon="🏫"
                                title="ข้อมูลการศึกษา"
                                subtitle="ข้อมูลสถานภาพนักศึกษาและภาคการศึกษาปัจจุบัน"
                            >
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    <Input
                                        label="รหัสนักศึกษา"
                                        name="studentId"
                                        value={formData.studentId}
                                        onChange={handleChange}
                                        placeholder="กรอกรหัสนักศึกษา"
                                        disabled
                                    />

                                    <Input
                                        label="คณะ"
                                        required
                                        name="faculty"
                                        value={formData.faculty}
                                        onChange={handleChange}
                                        placeholder="ระบุคณะ"
                                    />

                                    <Input
                                        label="สาขาวิชา"
                                        required
                                        name="major"
                                        value={formData.major}
                                        onChange={handleChange}
                                        placeholder="ระบุสาขาวิชา"
                                    />

                                    <SelectInput
                                        label="ชั้นปี"
                                        required
                                        name="yearLevel"
                                        value={formData.yearLevel}
                                        onChange={handleChange}
                                        options={[
                                            { value: "", label: "เลือกชั้นปี" },
                                            { value: "1", label: "ชั้นปีที่ 1" },
                                            { value: "2", label: "ชั้นปีที่ 2" },
                                            { value: "3", label: "ชั้นปีที่ 3" },
                                            { value: "4", label: "ชั้นปีที่ 4" },
                                            { value: "5", label: "ชั้นปีที่ 5" },
                                            { value: "6", label: "ชั้นปีที่ 6" },
                                        ]}
                                    />
                                </div>
                            </FormSection>
                        )}

                        {activeSection === 2 && (
                            <FormSection
                                icon="👨"
                                title="ข้อมูลบิดา"
                                subtitle="ข้อมูลส่วนบุคคล อาชีพ และรายได้ของบิดา"
                            >
                                <ParentFields
                                    type="father"
                                    formData={formData}
                                    onChange={handleChange}
                                    defaultPrefix="นาย"
                                />
                            </FormSection>
                        )}

                        {activeSection === 3 && (
                            <FormSection
                                icon="👩"
                                title="ข้อมูลมารดา"
                                subtitle="ข้อมูลส่วนบุคคล อาชีพ และรายได้ของมารดา"
                            >
                                <ParentFields
                                    type="mother"
                                    formData={formData}
                                    onChange={handleChange}
                                    defaultPrefix="นาง"
                                />
                            </FormSection>
                        )}

                        {activeSection === 4 && (
                            <FormSection
                                icon="🧑"
                                title="ข้อมูลผู้ปกครอง"
                                subtitle="กรอกกรณีผู้ปกครองไม่ใช่บิดาหรือมารดา หรือเป็นผู้ดูแลหลัก"
                            >
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    <SelectInput
                                        label="ความสัมพันธ์กับนักศึกษา"
                                        name="guardianRelation"
                                        value={formData.guardianRelation}
                                        onChange={handleChange}
                                        options={[
                                            { value: "", label: "เลือกความสัมพันธ์" },
                                            { value: "บิดา", label: "บิดา" },
                                            { value: "มารดา", label: "มารดา" },
                                            { value: "ปู่", label: "ปู่" },
                                            { value: "ย่า", label: "ย่า" },
                                            { value: "ตา", label: "ตา" },
                                            { value: "ยาย", label: "ยาย" },
                                            { value: "ลุง", label: "ลุง" },
                                            { value: "ป้า", label: "ป้า" },
                                            { value: "น้า", label: "น้า" },
                                            { value: "อา", label: "อา" },
                                            { value: "อื่น ๆ", label: "อื่น ๆ" },
                                        ]}
                                    />

                                    <SelectInput
                                        label="คำนำหน้าชื่อ"
                                        name="guardianPrefix"
                                        value={formData.guardianPrefix}
                                        onChange={handleChange}
                                        options={[
                                            { value: "", label: "เลือกคำนำหน้าชื่อ" },
                                            { value: "นาย", label: "นาย" },
                                            { value: "นาง", label: "นาง" },
                                            { value: "นางสาว", label: "นางสาว" },
                                        ]}
                                    />

                                    <Input
                                        label="ชื่อ"
                                        name="guardianFirstName"
                                        value={formData.guardianFirstName}
                                        onChange={handleChange}
                                        placeholder="กรอกชื่อผู้ปกครอง"
                                    />

                                    <Input
                                        label="นามสกุล"
                                        name="guardianLastName"
                                        value={formData.guardianLastName}
                                        onChange={handleChange}
                                        placeholder="กรอกนามสกุลผู้ปกครอง"
                                    />

                                    <Input
                                        label="เลขประจำตัวประชาชน"
                                        name="guardianCitizenId"
                                        value={formData.guardianCitizenId}
                                        onChange={handleChange}
                                        placeholder="เลขประจำตัวประชาชน 13 หลัก"
                                        maxLength={13}
                                        inputMode="numeric"
                                    />

                                    <Input
                                        label="อาชีพ"
                                        name="guardianOccupation"
                                        value={formData.guardianOccupation}
                                        onChange={handleChange}
                                        placeholder="ระบุอาชีพ"
                                    />

                                    <Input
                                        label="รายได้ต่อเดือน"
                                        name="guardianMonthlyIncome"
                                        type="number"
                                        min="0"
                                        value={formData.guardianMonthlyIncome}
                                        onChange={handleChange}
                                        placeholder="จำนวนเงิน"
                                        suffix="บาท"
                                    />

                                    <Input
                                        label="หมายเลขโทรศัพท์"
                                        name="guardianPhone"
                                        value={formData.guardianPhone}
                                        onChange={handleChange}
                                        placeholder="08XXXXXXXX"
                                        inputMode="tel"
                                    />
                                </div>
                            </FormSection>
                        )}

                        {activeSection === 5 && (
                            <FormSection
                                icon="🏠"
                                title="ข้อมูลครอบครัว"
                                subtitle="ข้อมูลรายได้และจำนวนสมาชิกภายในครอบครัว"
                            >
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    <Input
                                        label="รายได้รวมของครอบครัวต่อเดือน"
                                        name="totalFamilyIncome"
                                        type="number"
                                        min="0"
                                        value={formData.totalFamilyIncome}
                                        onChange={handleChange}
                                        placeholder="จำนวนเงิน"
                                        suffix="บาท"
                                    />

                                    <Input
                                        label="จำนวนสมาชิกในครอบครัว"
                                        name="numberOfFamilyMembers"
                                        type="number"
                                        min="1"
                                        value={formData.numberOfFamilyMembers}
                                        onChange={handleChange}
                                        placeholder="จำนวนสมาชิก"
                                        suffix="คน"
                                    />

                                    <Input
                                        label="จำนวนสมาชิกที่กำลังศึกษา"
                                        name="numberOfStudyingMembers"
                                        type="number"
                                        min="0"
                                        value={formData.numberOfStudyingMembers}
                                        onChange={handleChange}
                                        placeholder="จำนวนสมาชิก"
                                        suffix="คน"
                                    />
                                </div>
                            </FormSection>
                        )}

                        {activeSection === 6 && (
                            <FormSection
                                icon="📋"
                                title="ข้อมูลการกู้ยืม"
                                subtitle="ข้อมูลที่ใช้กำหนดเงื่อนไขการคัดกรองและรายการเอกสาร"
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <SelectInput
                                        label="ประเภทผู้กู้"
                                        required
                                        name="loanTypeCode"
                                        value={formData.loanTypeCode}
                                        onChange={handleChange}
                                        options={[
                                            { value: "NEW", label: "ผู้กู้รายใหม่" },
                                            { value: "CONTINUING_SPECIAL", label: "ผู้กู้ต่อเนื่องกรณีพิเศษ" },
                                            { value: "CONTINUING_YEAR", label: "ผู้กู้ต่อเนื่องเลื่อนชั้นปี" },
                                        ]}
                                    />

                                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                                        <p className="text-xs font-black text-blue-700">
                                            ประเภทที่เลือก
                                        </p>

                                        <p className="mt-1 text-sm font-black text-[#07116f]">
                                            {loanTypeLabels[formData.loanTypeCode] ||
                                                "ยังไม่ได้เลือกประเภทผู้กู้"}
                                        </p>

                                        <p className="mt-1 text-xs leading-5 text-gray-500">
                                            ระบบจะคำนวณรายการเอกสารตามประเภทผู้กู้
                                            ภาคการศึกษา และอายุของนักศึกษา
                                        </p>
                                    </div>
                                </div>
                            </FormSection>
                        )}

                        {message && (
                            <div
                                className={`rounded-xl border px-4 py-3 text-sm font-black ${
                                    messageType === "success"
                                        ? "border-green-200 bg-green-50 text-green-700"
                                        : "border-red-200 bg-red-50 text-red-700"
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className="text-lg">
                                        {messageType === "success" ? "✅" : "⚠️"}
                                    </span>

                                    <p>{message}</p>
                                </div>
                            </div>
                        )}

                        {/* แถบปุ่มด้านล่าง */}
                        <div className="sticky bottom-4 z-20 rounded-2xl border border-gray-100 bg-white/95 p-3 shadow-lg backdrop-blur">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPage("studentProfiles")}
                                        className="h-11 rounded-xl border border-gray-200 bg-white px-5 text-sm font-black text-gray-700 transition hover:bg-gray-50"
                                    >
                                        ยกเลิก
                                    </button>

                                    <button
                                        type="button"
                                        disabled={activeSection === 0}
                                        onClick={() =>
                                            setActiveSection((current) =>
                                                Math.max(current - 1, 0)
                                            )
                                        }
                                        className="h-11 rounded-xl border border-gray-200 bg-white px-5 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        ← ก่อนหน้า
                                    </button>
                                </div>

                                <span className="hidden text-xs font-bold text-gray-400 sm:block">
                                    {activeSection + 1} / {sections.length}
                                </span>

                                {activeSection < sections.length - 1 ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setActiveSection((current) =>
                                                Math.min(current + 1, sections.length - 1)
                                            )
                                        }
                                        className="h-11 rounded-xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-7 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                                    >
                                        ถัดไป →
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleSubmit({
                                                preventDefault: () => {},
                                            })
                                        }
                                        className="h-11 rounded-xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-7 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                                    >
                                        💾 บันทึกข้อมูลนักศึกษา
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

function ParentFields({ type, formData, onChange, defaultPrefix }) {
    const prefixName = `${type}Prefix`;
    const firstName = `${type}FirstName`;
    const lastName = `${type}LastName`;
    const citizenId = `${type}CitizenId`;
    const occupation = `${type}Occupation`;
    const monthlyIncome = `${type}MonthlyIncome`;
    const phone = `${type}Phone`;
    const status = `${type}Status`;

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SelectInput
                label="คำนำหน้าชื่อ"
                name={prefixName}
                value={formData[prefixName] || defaultPrefix}
                onChange={onChange}
                options={[
                    { value: "", label: "เลือกคำนำหน้าชื่อ" },
                    { value: "นาย", label: "นาย" },
                    { value: "นาง", label: "นาง" },
                    { value: "นางสาว", label: "นางสาว" },
                ]}
            />

            <Input
                label="ชื่อ"
                name={firstName}
                value={formData[firstName]}
                onChange={onChange}
                placeholder="กรอกชื่อ"
            />

            <Input
                label="นามสกุล"
                name={lastName}
                value={formData[lastName]}
                onChange={onChange}
                placeholder="กรอกนามสกุล"
            />

            <Input
                label="เลขประจำตัวประชาชน"
                name={citizenId}
                value={formData[citizenId]}
                onChange={onChange}
                placeholder="เลขประจำตัวประชาชน 13 หลัก"
                maxLength={13}
                inputMode="numeric"
            />

            <Input
                label="อาชีพ"
                name={occupation}
                value={formData[occupation]}
                onChange={onChange}
                placeholder="ระบุอาชีพ"
            />

            <Input
                label="รายได้ต่อเดือน"
                name={monthlyIncome}
                type="number"
                min="0"
                value={formData[monthlyIncome]}
                onChange={onChange}
                placeholder="จำนวนเงิน"
                suffix="บาท"
            />

            <Input
                label="หมายเลขโทรศัพท์"
                name={phone}
                value={formData[phone]}
                onChange={onChange}
                placeholder="08XXXXXXXX"
                inputMode="tel"
            />

            <SelectInput
                label="สถานภาพ"
                name={status}
                value={formData[status]}
                onChange={onChange}
                options={[
                    { value: "", label: "เลือกสถานภาพ" },
                    { value: "มีชีวิตอยู่", label: "มีชีวิตอยู่" },
                    { value: "เสียชีวิต", label: "เสียชีวิต" },
                    { value: "ไม่ทราบสถานภาพ", label: "ไม่ทราบสถานภาพ" },
                ]}
            />
        </div>
    );
}

function FormSection({ icon, title, subtitle, children }) {
    return (
        <section className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
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

            <div className="flex-1 p-5 lg:p-6">{children}</div>
        </section>
    );
}

function Input({
    label,
    name,
    value,
    onChange,
    type = "text",
    required = false,
    placeholder = "",
    suffix = "",
    ...inputProps
}) {
    return (
        <label className="block min-w-0">
            <span className="text-xs font-black text-[#07116f] sm:text-sm">
                {label}

                {required && <span className="ml-1 text-red-500">*</span>}
            </span>

            <div className="relative mt-1.5">
                <input
                    name={name}
                    type={type}
                    value={value ?? ""}
                    onChange={onChange}
                    placeholder={placeholder}
                    required={required}
                    className={`h-11 w-full rounded-xl border border-gray-200 bg-[#f8fbff] px-3.5 text-sm font-semibold text-gray-800 outline-none transition placeholder:font-normal placeholder:text-gray-400 hover:border-blue-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${
                        suffix ? "pr-14" : ""
                    }`}
                    {...inputProps}
                />

                {suffix && (
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                        {suffix}
                    </span>
                )}
            </div>
        </label>
    );
}

function SelectInput({ label, name, value, onChange, options, required = false }) {
    return (
        <label className="block min-w-0">
            <span className="text-xs font-black text-[#07116f] sm:text-sm">
                {label}

                {required && <span className="ml-1 text-red-500">*</span>}
            </span>

            <div className="relative mt-1.5">
                <select
                    name={name}
                    value={value ?? ""}
                    onChange={onChange}
                    required={required}
                    className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-[#f8fbff] px-3.5 pr-9 text-sm font-semibold text-gray-800 outline-none transition hover:border-blue-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-[#07116f]">
                    ▼
                </span>
            </div>
        </label>
    );
}

function Textarea({ label, name, value, onChange, required = false, placeholder = "" }) {
    return (
        <label className="block">
            <span className="text-xs font-black text-[#07116f] sm:text-sm">
                {label}

                {required && <span className="ml-1 text-red-500">*</span>}
            </span>

            <textarea
                name={name}
                value={value ?? ""}
                onChange={onChange}
                required={required}
                placeholder={placeholder}
                rows={3}
                className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 bg-[#f8fbff] px-3.5 py-2.5 text-sm font-semibold text-gray-800 outline-none transition placeholder:font-normal placeholder:text-gray-400 hover:border-blue-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
        </label>
    );
=======

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
>>>>>>> 48a7d434ce692b2dcfb0093176389538de32d049
}

export default StudentInfo;