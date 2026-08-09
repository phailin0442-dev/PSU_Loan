import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";

const loanTypeLabels = {
    NEW: "ผู้กู้รายใหม่",
    CONTINUING_SPECIAL:
        "ผู้กู้ต่อเนื่องกรณีพิเศษ",
    CONTINUING_YEAR:
        "ผู้กู้ต่อเนื่องเลื่อนชั้นปี",
};

function StudentInfo({ setPage }) {
    const {
        selectedStudent,
        updateSelectedStudent,
        myProfile,
        saveMyProfile,
    } = useApp();

    const [formData, setFormData] =
        useState(selectedStudent || {});

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

    const [message, setMessage] =
        useState("");

    const [messageType, setMessageType] =
        useState("");

    // รวม effect เดียว — เดิมแยกเป็น 2 effect (จาก selectedStudent กับ
    // myProfile) ซึ่งแย่งกันเขียนทับ formData เวลา selectedStudent เปลี่ยน
    // (แม้ค่ายังเป็น null เหมือนเดิม) จะรีเซ็ตทับข้อมูลที่ myProfile เพิ่ง
    // เติมไปแล้ว ทำให้ข้อมูลหาย/บันทึกไม่ได้ — รวมเป็นตัวเดียวรันพร้อมกัน
    // เสมอ กัน race condition นี้
    useEffect(() => {
        setMessage("");
        setMessageType("");

        setFormData((current) => {
            // เริ่มจาก selectedStudent (ถ้ามีคำร้องอยู่แล้ว จะมีข้อมูล
            // ทุกแท็บรวมทั้งบิดา/มารดา/ครอบครัวที่เป็น local state)
            const base = { ...current, ...(selectedStudent || {}) };

            // myProfile คือข้อมูลจริงจาก student_profiles (ไม่ผูกกับคำร้อง)
            // ใช้ทับแท็บ "ข้อมูลส่วนบุคคล"/"การศึกษา" เสมอ เพราะเป็นข้อมูล
            // จริงจาก backend มีให้ใช้ตั้งแต่สมัครสมาชิกเสร็จ
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
                citizenId:
                    myProfile.citizenId && !/^0+$/.test(myProfile.citizenId)
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
                    myProfile.loanTypeCode &&
                        myProfile.loanTypeCode !== "-"
                        ? myProfile.loanTypeCode
                        : base.loanTypeCode || "",
            };
        });
    }, [selectedStudent, myProfile]);

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

        // แม็ปฟิลด์บังคับไปยังแท็บที่ฟิลด์นั้นอยู่ ใช้กระโดดไปแท็บที่ขาด
        // ข้อมูลให้อัตโนมัติ จะได้ไม่งงว่ากรอกไม่ครบตรงไหน
        //
        // หมายเหตุ: ตัด semester/loanTypeCode ออกจากฟิลด์บังคับตรงนี้แล้ว
        // เพราะย้ายไปเก็บตอน "สร้างคำร้องกู้ยืม" (หน้าคำขอกู้ยืมเงิน กยศ.)
        // แทน — หน้านี้เก็บแค่ "ข้อมูลส่วนตัว" ที่ผูกกับ student_profiles
        // ตรงๆ ซึ่งมีอยู่แล้วตั้งแต่สมัครสมาชิกเสร็จ ไม่ต้องรอมีคำร้องก่อน
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

        const missingFields =
            requiredFields.filter(
                (field) =>
                    !String(
                        formData[field] ?? ""
                    ).trim()
            );

        if (missingFields.length > 0) {
            const firstMissingTab = Math.min(
                ...missingFields.map(
                    (field) => requiredFieldTabs[field]
                )
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

        const fullName =
            `${formData.prefix || ""}${formData.firstName || ""
                } ${formData.lastName || ""
                }`.trim();

        const selectedLoanTypeLabel =
            loanTypeLabels[
            formData.loanTypeCode
            ] || "-";

        // บันทึกจริงลง student_profiles ก่อน (ไม่ผูกกับคำร้อง ใช้ได้เสมอ)
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

        // หมายเหตุ: เอา updateSelectedStudent() ที่เคยอยู่ตรงนี้ออกแล้ว —
        // ของเดิมบังคับรีเซ็ต eligibilityCompleted/documentsCompleted เป็น
        // false ทุกครั้งที่บันทึกข้อมูลส่วนตัว ทั้งที่ไม่ควรมีผลต่อกัน
        // เลย (เป็นโค้ดเก่าตกค้างจากตอนยังไม่เชื่อม backend จริง) ตอนนี้
        // saveMyProfile() ข้างบนบันทึกจริงลง student_profiles แล้ว และ
        // ข้อมูลคำร้อง (ถ้ามี) ก็ดึงจาก backend ตรงๆ อยู่แล้ว ไม่ต้องแตะ
        // สถานะคัดกรอง/เอกสารจากหน้านี้เลย

        setMessage(
            "บันทึกข้อมูลเรียบร้อยแล้ว"
        );

        setMessageType("success");

        alert("✅ บันทึกข้อมูลเรียบร้อยแล้ว");

        setTimeout(() => {
            setPage("eligibility");
        }, 700);
    };

    return (
        <main className="w-full px-6 py-8 lg:px-12">
            <section className="mx-auto max-w-7xl">
                <div className="overflow-hidden rounded-[32px] bg-gradient-to-r from-[#07116f] to-[#0646ff] shadow-lg">
                    <div className="flex flex-col gap-6 p-8 text-white md:flex-row md:items-center md:justify-between lg:p-10">
                        <div className="flex items-center gap-5">
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/15 text-4xl ring-1 ring-white/20">
                                ✏️
                            </div>

                            <div>
                                <p className="text-sm font-black text-blue-100">
                                    แบบฟอร์มข้อมูลนักศึกษา
                                </p>

                                <h1 className="mt-2 text-3xl font-black md:text-4xl">
                                    แก้ไขข้อมูลนักศึกษา
                                </h1>

                                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                                    ตรวจสอบและแก้ไขข้อมูลส่วนบุคคล
                                    ข้อมูลการศึกษา
                                    และข้อมูลครอบครัวให้ครบถ้วน
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setPage(
                                    "studentProfiles"
                                )
                            }
                            className="rounded-2xl bg-white px-7 py-3.5 font-black text-[#07116f] shadow transition hover:bg-blue-50"
                        >
                            ← กลับหน้าข้อมูล
                        </button>
                    </div>
                </div>

                <div className="mt-6 flex items-start gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-5 text-orange-700">
                    <span className="text-2xl">
                        ⚠️
                    </span>

                    <div>
                        <p className="font-black">
                            การแก้ไขข้อมูลมีผลต่อการคัดกรอง
                        </p>

                        <p className="mt-1 text-sm leading-6">
                            เมื่อบันทึกข้อมูลใหม่
                            ระบบจะล้างผลคัดกรองและรายการเอกสารเดิม
                            เพื่อให้ตรวจสอบเงื่อนไขใหม่อีกครั้ง
                        </p>
                    </div>
                </div>

                <div
                    className="mt-7 flex flex-col gap-6 lg:flex-row lg:items-start"
                >
                    {/* Sidebar เลือกหัวข้อ */}
                    <nav className="flex gap-2 overflow-x-auto rounded-2xl bg-white p-3 shadow-sm lg:sticky lg:top-6 lg:w-64 lg:shrink-0 lg:flex-col lg:overflow-visible">
                        {sections.map((section, index) => (
                            <button
                                key={section.label}
                                type="button"
                                onClick={() =>
                                    setActiveSection(index)
                                }
                                className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-black transition lg:shrink ${activeSection === index
                                        ? "bg-[#07116f] text-white shadow-md"
                                        : "text-gray-600 hover:bg-blue-50"
                                    }`}
                            >
                                <span className="text-lg">
                                    {section.icon}
                                </span>
                                <span className="whitespace-nowrap lg:whitespace-normal">
                                    {section.label}
                                </span>
                            </button>
                        ))}
                    </nav>

                    {/* เนื้อหาของแท็บที่เลือก */}
                    <div className="min-w-0 flex-1 space-y-6">
                        {activeSection === 0 && (
                            <FormSection
                                icon="👤"
                                title="ข้อมูลส่วนบุคคล"
                                subtitle="ข้อมูลทั่วไปของนักศึกษาผู้ยื่นคำขอกู้"
                            >
                                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                    <SelectInput
                                        label="คำนำหน้าชื่อ"
                                        required
                                        name="prefix"
                                        value={
                                            formData.prefix
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        options={[
                                            {
                                                value: "",
                                                label: "เลือกคำนำหน้าชื่อ",
                                            },
                                            {
                                                value: "นาย",
                                                label: "นาย",
                                            },
                                            {
                                                value: "นางสาว",
                                                label: "นางสาว",
                                            },
                                            {
                                                value: "นาง",
                                                label: "นาง",
                                            },
                                        ]}
                                    />

                                    <Input
                                        label="ชื่อ"
                                        required
                                        name="firstName"
                                        value={
                                            formData.firstName
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="กรอกชื่อ"
                                    />

                                    <Input
                                        label="นามสกุล"
                                        required
                                        name="lastName"
                                        value={
                                            formData.lastName
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="กรอกนามสกุล"
                                    />

                                    <Input
                                        label="เลขประจำตัวประชาชน"
                                        required
                                        name="citizenId"
                                        value={
                                            formData.citizenId
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="เลขประจำตัวประชาชน 13 หลัก"
                                        maxLength={13}
                                        inputMode="numeric"
                                    />

                                    <Input
                                        label="วันเดือนปีเกิด"
                                        required
                                        name="birthDate"
                                        type="date"
                                        value={
                                            formData.birthDate
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />

                                    <Input
                                        label="สัญชาติ"
                                        name="nationality"
                                        value={
                                            formData.nationality
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="เช่น ไทย"
                                    />

                                    <Input
                                        label="ศาสนา"
                                        name="religion"
                                        value={
                                            formData.religion
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="ระบุศาสนา"
                                    />

                                    <SelectInput
                                        label="สถานภาพ"
                                        name="maritalStatus"
                                        value={
                                            formData.maritalStatus
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        options={[
                                            {
                                                value: "",
                                                label: "เลือกสถานภาพ",
                                            },
                                            {
                                                value: "โสด",
                                                label: "โสด",
                                            },
                                            {
                                                value: "สมรส",
                                                label: "สมรส",
                                            },
                                            {
                                                value: "หย่าร้าง",
                                                label: "หย่าร้าง",
                                            },
                                            {
                                                value: "หม้าย",
                                                label: "หม้าย",
                                            },
                                        ]}
                                    />

                                    <Input
                                        label="หมายเลขโทรศัพท์"
                                        required
                                        name="phone"
                                        value={
                                            formData.phone
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="08XXXXXXXX"
                                        inputMode="tel"
                                    />

                                    <Input
                                        label="อีเมล"
                                        required
                                        name="email"
                                        type="email"
                                        value={
                                            formData.email
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="example@email.com"
                                    />

                                    <Input
                                        label="จังหวัด"
                                        required
                                        name="province"
                                        value={
                                            formData.province
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="ระบุจังหวัด"
                                    />

                                    <Input
                                        label="รหัสไปรษณีย์"
                                        required
                                        name="postalCode"
                                        value={
                                            formData.postalCode
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="รหัสไปรษณีย์"
                                        maxLength={5}
                                        inputMode="numeric"
                                    />

                                    <div className="md:col-span-2 xl:col-span-3">
                                        <Textarea
                                            label="ที่อยู่ปัจจุบัน"
                                            required
                                            name="address"
                                            value={
                                                formData.address
                                            }
                                            onChange={
                                                handleChange
                                            }
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
                                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                    <Input
                                        label="รหัสนักศึกษา"
                                        name="studentId"
                                        value={
                                            formData.studentId
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="กรอกรหัสนักศึกษา"
                                        disabled
                                    />

                                    <Input
                                        label="คณะ"
                                        required
                                        name="faculty"
                                        value={
                                            formData.faculty
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="ระบุคณะ"
                                    />

                                    <Input
                                        label="สาขาวิชา"
                                        required
                                        name="major"
                                        value={
                                            formData.major
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="ระบุสาขาวิชา"
                                    />

                                    <SelectInput
                                        label="ชั้นปี"
                                        required
                                        name="yearLevel"
                                        value={
                                            formData.yearLevel
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        options={[
                                            {
                                                value: "",
                                                label: "เลือกชั้นปี",
                                            },
                                            {
                                                value: "1",
                                                label: "ชั้นปีที่ 1",
                                            },
                                            {
                                                value: "2",
                                                label: "ชั้นปีที่ 2",
                                            },
                                            {
                                                value: "3",
                                                label: "ชั้นปีที่ 3",
                                            },
                                            {
                                                value: "4",
                                                label: "ชั้นปีที่ 4",
                                            },
                                            {
                                                value: "5",
                                                label: "ชั้นปีที่ 5",
                                            },
                                            {
                                                value: "6",
                                                label: "ชั้นปีที่ 6",
                                            },
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
                                    onChange={
                                        handleChange
                                    }
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
                                    onChange={
                                        handleChange
                                    }
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
                                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                    <SelectInput
                                        label="ความสัมพันธ์กับนักศึกษา"
                                        name="guardianRelation"
                                        value={
                                            formData.guardianRelation
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        options={[
                                            {
                                                value: "",
                                                label: "เลือกความสัมพันธ์",
                                            },
                                            {
                                                value: "บิดา",
                                                label: "บิดา",
                                            },
                                            {
                                                value: "มารดา",
                                                label: "มารดา",
                                            },
                                            {
                                                value: "ปู่",
                                                label: "ปู่",
                                            },
                                            {
                                                value: "ย่า",
                                                label: "ย่า",
                                            },
                                            {
                                                value: "ตา",
                                                label: "ตา",
                                            },
                                            {
                                                value: "ยาย",
                                                label: "ยาย",
                                            },
                                            {
                                                value: "ลุง",
                                                label: "ลุง",
                                            },
                                            {
                                                value: "ป้า",
                                                label: "ป้า",
                                            },
                                            {
                                                value: "น้า",
                                                label: "น้า",
                                            },
                                            {
                                                value: "อา",
                                                label: "อา",
                                            },
                                            {
                                                value: "อื่น ๆ",
                                                label: "อื่น ๆ",
                                            },
                                        ]}
                                    />

                                    <SelectInput
                                        label="คำนำหน้าชื่อ"
                                        name="guardianPrefix"
                                        value={
                                            formData.guardianPrefix
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        options={[
                                            {
                                                value: "",
                                                label: "เลือกคำนำหน้าชื่อ",
                                            },
                                            {
                                                value: "นาย",
                                                label: "นาย",
                                            },
                                            {
                                                value: "นาง",
                                                label: "นาง",
                                            },
                                            {
                                                value: "นางสาว",
                                                label: "นางสาว",
                                            },
                                        ]}
                                    />

                                    <Input
                                        label="ชื่อ"
                                        name="guardianFirstName"
                                        value={
                                            formData.guardianFirstName
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="กรอกชื่อผู้ปกครอง"
                                    />

                                    <Input
                                        label="นามสกุล"
                                        name="guardianLastName"
                                        value={
                                            formData.guardianLastName
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="กรอกนามสกุลผู้ปกครอง"
                                    />

                                    <Input
                                        label="เลขประจำตัวประชาชน"
                                        name="guardianCitizenId"
                                        value={
                                            formData.guardianCitizenId
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="เลขประจำตัวประชาชน 13 หลัก"
                                        maxLength={13}
                                        inputMode="numeric"
                                    />

                                    <Input
                                        label="อาชีพ"
                                        name="guardianOccupation"
                                        value={
                                            formData.guardianOccupation
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="ระบุอาชีพ"
                                    />

                                    <Input
                                        label="รายได้ต่อเดือน"
                                        name="guardianMonthlyIncome"
                                        type="number"
                                        min="0"
                                        value={
                                            formData.guardianMonthlyIncome
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="จำนวนเงิน"
                                    />

                                    <Input
                                        label="หมายเลขโทรศัพท์"
                                        name="guardianPhone"
                                        value={
                                            formData.guardianPhone
                                        }
                                        onChange={
                                            handleChange
                                        }
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
                                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                    <Input
                                        label="รายได้รวมของครอบครัวต่อเดือน"
                                        name="totalFamilyIncome"
                                        type="number"
                                        min="0"
                                        value={
                                            formData.totalFamilyIncome
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="จำนวนเงิน"
                                        suffix="บาท"
                                    />

                                    <Input
                                        label="จำนวนสมาชิกในครอบครัว"
                                        name="numberOfFamilyMembers"
                                        type="number"
                                        min="1"
                                        value={
                                            formData.numberOfFamilyMembers
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="จำนวนสมาชิก"
                                        suffix="คน"
                                    />

                                    <Input
                                        label="จำนวนสมาชิกที่กำลังศึกษา"
                                        name="numberOfStudyingMembers"
                                        type="number"
                                        min="0"
                                        value={
                                            formData.numberOfStudyingMembers
                                        }
                                        onChange={
                                            handleChange
                                        }
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
                                <div className="grid gap-5 md:grid-cols-2">
                                    <SelectInput
                                        label="ประเภทผู้กู้"
                                        required
                                        name="loanTypeCode"
                                        value={
                                            formData.loanTypeCode
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        options={[
                                            {
                                                value: "NEW",
                                                label: "ผู้กู้รายใหม่",
                                            },
                                            {
                                                value:
                                                    "CONTINUING_SPECIAL",
                                                label: "ผู้กู้ต่อเนื่องกรณีพิเศษ",
                                            },
                                            {
                                                value:
                                                    "CONTINUING_YEAR",
                                                label: "ผู้กู้ต่อเนื่องเลื่อนชั้นปี",
                                            },
                                        ]}
                                    />

                                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                                        <p className="text-sm font-black text-blue-700">
                                            ประเภทที่เลือก
                                        </p>

                                        <p className="mt-2 font-black text-[#07116f]">
                                            {loanTypeLabels[
                                                formData.loanTypeCode
                                            ] ||
                                                "ยังไม่ได้เลือกประเภทผู้กู้"}
                                        </p>

                                        <p className="mt-2 text-sm leading-6 text-gray-500">
                                            ระบบจะคำนวณรายการเอกสารตามประเภทผู้กู้
                                            ภาคการศึกษา และอายุของนักศึกษา
                                        </p>
                                    </div>
                                </div>
                            </FormSection>
                        )}

                        {message && (
                            <div
                                className={`rounded-2xl border p-5 font-black ${messageType ===
                                    "success"
                                    ? "border-green-200 bg-green-50 text-green-700"
                                    : "border-red-200 bg-red-50 text-red-700"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">
                                        {messageType ===
                                            "success"
                                            ? "✅"
                                            : "⚠️"}
                                    </span>

                                    <p>{message}</p>
                                </div>
                            </div>
                        )}

                        <div className="sticky bottom-4 z-20 rounded-[24px] border border-gray-100 bg-white/95 p-4 shadow-xl backdrop-blur">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPage(
                                                "studentProfiles"
                                            )
                                        }
                                        className="h-14 rounded-2xl border border-gray-200 bg-white px-6 font-black text-gray-700 transition hover:bg-gray-50"
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
                                        className="h-14 rounded-2xl border border-gray-200 bg-white px-6 font-black text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        ← ก่อนหน้า
                                    </button>
                                </div>

                                {activeSection < sections.length - 1 ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setActiveSection((current) =>
                                                Math.min(
                                                    current + 1,
                                                    sections.length - 1
                                                )
                                            )
                                        }
                                        className="h-14 rounded-2xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-10 font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
                                    >
                                        ถัดไป →
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleSubmit({
                                                preventDefault: () => { },
                                            })
                                        }
                                        className="h-14 rounded-2xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-10 font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
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

function ParentFields({
    type,
    formData,
    onChange,
    defaultPrefix,
}) {
    const prefixName = `${type}Prefix`;
    const firstName = `${type}FirstName`;
    const lastName = `${type}LastName`;
    const citizenId = `${type}CitizenId`;
    const occupation = `${type}Occupation`;
    const monthlyIncome =
        `${type}MonthlyIncome`;
    const phone = `${type}Phone`;
    const status = `${type}Status`;

    return (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <SelectInput
                label="คำนำหน้าชื่อ"
                name={prefixName}
                value={
                    formData[prefixName] ||
                    defaultPrefix
                }
                onChange={onChange}
                options={[
                    {
                        value: "",
                        label: "เลือกคำนำหน้าชื่อ",
                    },
                    {
                        value: "นาย",
                        label: "นาย",
                    },
                    {
                        value: "นาง",
                        label: "นาง",
                    },
                    {
                        value: "นางสาว",
                        label: "นางสาว",
                    },
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
                value={
                    formData[occupation]
                }
                onChange={onChange}
                placeholder="ระบุอาชีพ"
            />

            <Input
                label="รายได้ต่อเดือน"
                name={monthlyIncome}
                type="number"
                min="0"
                value={
                    formData[monthlyIncome]
                }
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
                    {
                        value: "",
                        label: "เลือกสถานภาพ",
                    },
                    {
                        value: "มีชีวิตอยู่",
                        label: "มีชีวิตอยู่",
                    },
                    {
                        value: "เสียชีวิต",
                        label: "เสียชีวิต",
                    },
                    {
                        value: "ไม่ทราบสถานภาพ",
                        label: "ไม่ทราบสถานภาพ",
                    },
                ]}
            />
        </div>
    );
}

function FormSection({
    icon,
    title,
    subtitle,
    children,
}) {
    return (
        <section className="overflow-hidden rounded-[28px] bg-white shadow-sm">
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

            <div className="p-6 lg:p-8">
                {children}
            </div>
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
            <span className="text-sm font-black text-[#07116f]">
                {label}

                {required && (
                    <span className="ml-1 text-red-500">
                        *
                    </span>
                )}
            </span>

            <div className="relative mt-2">
                <input
                    name={name}
                    type={type}
                    value={value ?? ""}
                    onChange={onChange}
                    placeholder={placeholder}
                    required={required}
                    className={`h-13 w-full rounded-xl border border-gray-200 bg-[#f8fbff] px-4 font-semibold text-gray-800 outline-none transition placeholder:font-normal placeholder:text-gray-400 hover:border-blue-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 ${suffix
                        ? "pr-16"
                        : ""
                        }`}
                    {...inputProps}
                />

                {suffix && (
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
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
}) {
    return (
        <label className="block min-w-0">
            <span className="text-sm font-black text-[#07116f]">
                {label}

                {required && (
                    <span className="ml-1 text-red-500">
                        *
                    </span>
                )}
            </span>

            <div className="relative mt-2">
                <select
                    name={name}
                    value={value ?? ""}
                    onChange={onChange}
                    required={required}
                    className="h-13 w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-[#f8fbff] px-4 pr-10 font-semibold text-gray-800 outline-none transition hover:border-blue-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                >
                    {options.map((option) => (
                        <option
                            key={option.value}
                            value={option.value}
                        >
                            {option.label}
                        </option>
                    ))}
                </select>

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#07116f]">
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
    placeholder = "",
}) {
    return (
        <label className="block">
            <span className="text-sm font-black text-[#07116f]">
                {label}

                {required && (
                    <span className="ml-1 text-red-500">
                        *
                    </span>
                )}
            </span>

            <textarea
                name={name}
                value={value ?? ""}
                onChange={onChange}
                required={required}
                placeholder={placeholder}
                rows={4}
                className="mt-2 w-full resize-y rounded-xl border border-gray-200 bg-[#f8fbff] px-4 py-3 font-semibold text-gray-800 outline-none transition placeholder:font-normal placeholder:text-gray-400 hover:border-blue-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
        </label>
    );
}

export default StudentInfo;