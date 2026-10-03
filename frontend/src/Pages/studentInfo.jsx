import { useRef, useState } from "react";
import { useApp } from "../context/AppContext";

const loanTypeLabels = {
    NEW: "ผู้กู้รายใหม่",
    CONTINUING_SPECIAL: "ผู้กู้ต่อเนื่องกรณีพิเศษ",
    CONTINUING_YEAR: "ผู้กู้ต่อเนื่องเลื่อนชั้นปี",
};

// ฟิลด์บังคับ -> แท็บที่ฟิลด์นั้นอยู่ (ใช้กระโดดไปแท็บที่ขาดข้อมูลให้อัตโนมัติ)
const REQUIRED_FIELD_TABS = {
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
    loanTypeCode: 6,
};

const FIELD_LABELS = {
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
    loanTypeCode: "ประเภทผู้กู้",
};

const sections = [
    { icon: "👤", label: "ข้อมูลส่วนบุคคล" },
    { icon: "🏫", label: "ข้อมูลการศึกษา" },
    { icon: "👨", label: "ข้อมูลบิดา" },
    { icon: "👩", label: "ข้อมูลมารดา" },
    { icon: "🧑", label: "ข้อมูลผู้ปกครอง" },
    { icon: "🏠", label: "ข้อมูลครอบครัว" },
    { icon: "📋", label: "ข้อมูลการกู้ยืม" },
];

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
    const [saving, setSaving] = useState(false);

    // ช่องที่ผู้ใช้พิมพ์/เลือกเองแล้ว — ข้อมูลจากฐานข้อมูลที่โหลดมาทีหลังห้ามเขียนทับช่องเหล่านี้
    const [touchedFields, setTouchedFields] = useState([]);

    // ช่องที่ขาด/ไม่ถูกต้อง (ใช้ทำกรอบแดงและจุดแดงที่แท็บ)
    const [invalidFields, setInvalidFields] = useState([]);

    // แท็บที่เปิดอยู่ตอนนี้ (0-6) — ให้กรอกทีละหัวข้อแทนเลื่อนยาว
    const [activeSection, setActiveSection] = useState(0);

    // กรอบที่ครอบช่องกรอกทุกแท็บ ใช้อ่านค่าจริงจากหน้าจอตอนกดบันทึก
    const containerRef = useRef(null);

    // เติมข้อมูลลงฟอร์มทุกครั้งที่ selectedStudent หรือ myProfile เปลี่ยน
    // ทำระหว่าง render (เก็บค่าก่อนหน้าไว้เทียบ) แทน useEffect ตามแนวทางของ React
    // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
    const [prevSources, setPrevSources] = useState({ selectedStudent: undefined, myProfile: undefined });

    if (prevSources.selectedStudent !== selectedStudent || prevSources.myProfile !== myProfile) {
        setPrevSources({ selectedStudent, myProfile });
        setMessage("");
        setMessageType("");
        setFormData((current) => {
            const merged = mergeProfileIntoForm(current, selectedStudent, myProfile);

            // ค่าที่ผู้ใช้กรอกเองแล้ว ให้คงไว้ ไม่ให้ข้อมูลจากฐานข้อมูลทับ
            touchedFields.forEach((key) => {
                merged[key] = current[key];
            });

            return merged;
        });
    }

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((current) => ({
            ...current,
            [name]: value,
        }));

        setTouchedFields((current) =>
            current.includes(name) ? current : [...current, name]
        );

        setInvalidFields((current) =>
            current.includes(name) ? current.filter((field) => field !== name) : current
        );

        if (message) {
            setMessage("");
            setMessageType("");
        }
    };

    // อ่านค่าจริงจากช่องกรอกทุกช่อง (ทุกแท็บ) ณ ตอนนี้
    const readDomValues = () => {
        const values = {};
        const root = containerRef.current;

        if (!root) return values;

        root
            .querySelectorAll("input[name], select[name], textarea[name]")
            .forEach((element) => {
                if (element.disabled) return;
                values[element.name] = element.value;
            });

        return values;
    };

    const handleSubmit = async () => {
        if (saving) return;

        // ใช้ค่าที่เห็นอยู่บนหน้าจอจริง ๆ ตอนกดบันทึก (รวมค่าที่เบราว์เซอร์เติมให้ ค่าจากการพิมพ์ภาษาไทย
        // หรือการวาง ที่อาจยังไม่ถูกส่งเข้า state) มาตรวจและบันทึก — กันต้องกดบันทึกสองรอบ
        const latest = { ...formData, ...readDomValues() };
        setFormData(latest);

        const missingFields = Object.keys(REQUIRED_FIELD_TABS).filter(
            (field) => !String(latest[field] ?? "").trim()
        );

        if (missingFields.length > 0) {
            setInvalidFields(missingFields);
            setActiveSection(
                Math.min(...missingFields.map((field) => REQUIRED_FIELD_TABS[field]))
            );
            setMessage(
                `กรุณากรอกข้อมูลให้ครบ ยังขาด: ${missingFields
                    .map((field) => FIELD_LABELS[field] || field)
                    .join(", ")}`
            );
            setMessageType("error");
            return;
        }

        // ตรวจรูปแบบที่ฐานข้อมูลบังคับ จะได้บอกเหตุผลชัดเจนแทนข้อความทั่วไป
        const formatErrors = [];

        if (!/^\d{13}$/.test(String(latest.citizenId).trim())) {
            formatErrors.push({
                field: "citizenId",
                text: "เลขประจำตัวประชาชนต้องเป็นตัวเลข 13 หลัก",
            });
        }

        if (!/^\d{5}$/.test(String(latest.postalCode).trim())) {
            formatErrors.push({
                field: "postalCode",
                text: "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก",
            });
        }

        if (formatErrors.length > 0) {
            setInvalidFields(formatErrors.map((item) => item.field));
            setActiveSection(0);
            setMessage(formatErrors.map((item) => item.text).join(" / "));
            setMessageType("error");
            return;
        }

        // บันทึกจริงลง student_profiles (ไม่ผูกกับคำร้อง ใช้ได้เสมอ)
        setInvalidFields([]);
        setMessage("");
        setMessageType("");
        setSaving(true);

        try {
            await saveMyProfile({
                citizenId: String(latest.citizenId).trim(),
                prefix: latest.prefix,
                firstName: latest.firstName,
                lastName: latest.lastName,
                birthDate: latest.birthDate,
                phone: latest.phone,
                faculty: latest.faculty,
                major: latest.major,
                yearLevel: Number(latest.yearLevel),
                houseNo: latest.address,
                subdistrict: myProfile?.subdistrict || "-",
                district: myProfile?.district || "-",
                province: latest.province,
                postalCode: String(latest.postalCode).trim(),
                loanTypeCode: latest.loanTypeCode || null,
            });

            setTouchedFields([]);
            setMessage("บันทึกข้อมูลเรียบร้อยแล้ว");
            setMessageType("success");

            alert("✅ บันทึกข้อมูลเรียบร้อยแล้ว");

            setTimeout(() => {
                setPage("eligibility");
            }, 700);
        } catch (error) {
            setMessage(
                error.message || "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
            );
            setMessageType("error");
        } finally {
            setSaving(false);
        }
    };

    const isInvalid = (name) => invalidFields.includes(name);

    // ทุกแท็บถูก render ไว้ตลอด (ซ่อนด้วย CSS) เพื่ออ่านค่าจริงได้ครบทุกช่อง
    const tabClass = (index) =>
        activeSection === index ? "flex flex-1 flex-col" : "hidden";

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
                        {sections.map((section, index) => {
                            const hasError = invalidFields.some(
                                (field) => REQUIRED_FIELD_TABS[field] === index
                            );

                            return (
                                <button
                                    key={section.label}
                                    type="button"
                                    onClick={() => setActiveSection(index)}
                                    className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition lg:shrink ${activeSection === index
                                        ? "bg-[#07116f] text-white shadow-sm"
                                        : "text-gray-600 hover:bg-blue-50"
                                        }`}
                                >
                                    <span className="text-base">{section.icon}</span>
                                    <span className="whitespace-nowrap lg:whitespace-normal">
                                        {section.label}
                                    </span>

                                    {hasError && (
                                        <span
                                            className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full bg-red-500"
                                            title="มีช่องที่ต้องกรอก"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* เนื้อหาของแท็บที่เลือก */}
                    <div
                        ref={containerRef}
                        className="flex min-w-0 flex-1 flex-col gap-4"
                    >
                        <div className={tabClass(0)}>
                            <FormSection
                                icon="👤"
                                title="ข้อมูลส่วนบุคคล"
                                subtitle="ข้อมูลทั่วไปของนักศึกษาผู้ยื่นคำขอกู้"
                            >
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    <SelectInput
                                        label="คำนำหน้าชื่อ"
                                        required
                                        invalid={isInvalid("prefix")}
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
                                        invalid={isInvalid("firstName")}
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        placeholder="กรอกชื่อ"
                                    />

                                    <Input
                                        label="นามสกุล"
                                        required
                                        invalid={isInvalid("lastName")}
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        placeholder="กรอกนามสกุล"
                                    />

                                    <Input
                                        label="เลขประจำตัวประชาชน"
                                        required
                                        invalid={isInvalid("citizenId")}
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
                                        invalid={isInvalid("birthDate")}
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
                                        invalid={isInvalid("phone")}
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="08XXXXXXXX"
                                        inputMode="tel"
                                    />

                                    <Input
                                        label="อีเมล"
                                        required
                                        invalid={isInvalid("email")}
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="example@email.com"
                                    />

                                    <Input
                                        label="จังหวัด"
                                        required
                                        invalid={isInvalid("province")}
                                        name="province"
                                        value={formData.province}
                                        onChange={handleChange}
                                        placeholder="ระบุจังหวัด"
                                    />

                                    <Input
                                        label="รหัสไปรษณีย์"
                                        required
                                        invalid={isInvalid("postalCode")}
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
                                            invalid={isInvalid("address")}
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            placeholder="บ้านเลขที่ หมู่ ถนน ตำบล อำเภอ จังหวัด"
                                        />
                                    </div>
                                </div>
                            </FormSection>
                        </div>

                        <div className={tabClass(1)}>
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
                                        invalid={isInvalid("faculty")}
                                        name="faculty"
                                        value={formData.faculty}
                                        onChange={handleChange}
                                        placeholder="ระบุคณะ"
                                    />

                                    <Input
                                        label="สาขาวิชา"
                                        required
                                        invalid={isInvalid("major")}
                                        name="major"
                                        value={formData.major}
                                        onChange={handleChange}
                                        placeholder="ระบุสาขาวิชา"
                                    />

                                    <SelectInput
                                        label="ชั้นปี"
                                        required
                                        invalid={isInvalid("yearLevel")}
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
                        </div>

                        <div className={tabClass(2)}>
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
                        </div>

                        <div className={tabClass(3)}>
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
                        </div>

                        <div className={tabClass(4)}>
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
                        </div>

                        <div className={tabClass(5)}>
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
                        </div>

                        <div className={tabClass(6)}>
                            <FormSection
                                icon="📋"
                                title="ข้อมูลการกู้ยืม"
                                subtitle="ข้อมูลที่ใช้กำหนดเงื่อนไขการคัดกรองและรายการเอกสาร"
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <SelectInput
                                        label="ประเภทผู้กู้"
                                        required
                                        invalid={isInvalid("loanTypeCode")}
                                        name="loanTypeCode"
                                        value={formData.loanTypeCode}
                                        onChange={handleChange}
                                        options={[
                                            { value: "", label: "เลือกประเภทผู้กู้" },
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
                        </div>

                        {message && (
                            <div
                                role={messageType === "error" ? "alert" : "status"}
                                className={`rounded-xl border px-4 py-3 text-sm font-black ${messageType === "success"
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
                                        onClick={handleSubmit}
                                        disabled={saving}
                                        className="h-11 rounded-xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-7 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {saving ? "กำลังบันทึก..." : "💾 บันทึกข้อมูลนักศึกษา"}
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

const FIELD_OK =
    "border-gray-200 bg-[#f8fbff] hover:border-blue-300 focus:border-blue-500 focus:bg-white focus:ring-blue-100";
const FIELD_INVALID =
    "border-red-400 bg-red-50 hover:border-red-500 focus:border-red-500 focus:bg-white focus:ring-red-100";

function Input({
    label,
    name,
    value,
    onChange,
    type = "text",
    required = false,
    invalid = false,
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
                    aria-invalid={invalid || undefined}
                    className={`h-11 w-full rounded-xl border px-3.5 text-sm font-semibold text-gray-800 outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:ring-4 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${invalid ? FIELD_INVALID : FIELD_OK
                        } ${suffix ? "pr-14" : ""}`}
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

function SelectInput({
    label,
    name,
    value,
    onChange,
    options,
    required = false,
    invalid = false,
}) {
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
                    aria-invalid={invalid || undefined}
                    className={`h-11 w-full cursor-pointer appearance-none rounded-xl border px-3.5 pr-9 text-sm font-semibold text-gray-800 outline-none transition focus:ring-4 ${invalid ? FIELD_INVALID : FIELD_OK
                        }`}
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

function Textarea({
    label,
    name,
    value,
    onChange,
    required = false,
    invalid = false,
    placeholder = "",
}) {
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
                aria-invalid={invalid || undefined}
                rows={3}
                className={`mt-1.5 w-full resize-y rounded-xl border px-3.5 py-2.5 text-sm font-semibold text-gray-800 outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:ring-4 ${invalid ? FIELD_INVALID : FIELD_OK
                    }`}
            />
        </label>
    );
}

export default StudentInfo;