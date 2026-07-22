import { useEffect, useState } from "react";

const defaultStudent = {
    id: 1,
    studentId: 1001,
    studentCode: "6810110001",
    prefix: "นางสาว",
    firstName: "ณัฐณิชา",
    lastName: "ศรีสุข",
    fullName: "นางสาวณัฐณิชา ศรีสุข",

    birthDate: "2008-02-15",
    age: 18,

    citizenId: "1-9000-00000-00-1",
    phone: "0812345678",
    email: "6810110001@psu.ac.th",

    faculty: "คณะวิทยาศาสตร์",
    major: "วิทยาการคอมพิวเตอร์",
    yearLevel: 1,

    houseNo: "99/1",
    villageNo: "4",
    villageName: "บ้านตัวอย่าง",
    soi: "-",
    road: "กาญจนวนิช",
    subdistrict: "คอหงส์",
    district: "หาดใหญ่",
    province: "สงขลา",
    postalCode: "90110",

    loanTypeCode: "NEW_BORROWER",
    loanTypeName: "ผู้กู้รายใหม่",
    loanTypeGroup: 1,

    academicYear: "2569",
    semester: 1,

    gpax: 3.12,
    volunteerHours: 8,

    eligibilityStatus: "ผ่าน",
    applicationStatus: "ต้องแก้ไขเอกสาร",

    revisionCount: 1,
    documentCount: 6,
    rejectedDocumentCount: 1,

    currentStep: 3,

    latestNotification:
        "กรุณาแก้ไขรูปถ่ายผู้ปกครอง เนื่องจากภาพไม่ชัด",

    requiresParentDocuments: true,
};

function StudentInfo({ goProtectedPage }) {
    const [student, setStudent] = useState(defaultStudent);

    useEffect(() => {
        function loadSelectedStudent() {
            try {
                const savedStudent = localStorage.getItem(
                    "selectedMockStudent"
                );

                if (!savedStudent) {
                    setStudent(defaultStudent);
                    return;
                }

                const parsedStudent =
                    JSON.parse(savedStudent);

                setStudent({
                    ...defaultStudent,
                    ...parsedStudent,
                });
            } catch (error) {
                console.error(
                    "ไม่สามารถอ่านข้อมูลนักศึกษาตัวอย่างได้:",
                    error
                );

                setStudent(defaultStudent);
            }
        }

        loadSelectedStudent();

        window.addEventListener(
            "mockStudentChanged",
            loadSelectedStudent
        );

        return () => {
            window.removeEventListener(
                "mockStudentChanged",
                loadSelectedStudent
            );
        };
    }, []);

    const fullName =
        student.fullName ||
        `${student.prefix || ""}${student.firstName || ""} ${
            student.lastName || ""
        }`.trim();

    const formattedBirthDate = formatThaiDate(
        student.birthDate
    );

    const address = formatAddress(student);

    return (
        <div className="min-h-screen bg-[#eef5ff] text-[#07116f]">
            <header className="sticky top-0 z-50 bg-white shadow-sm">
                <div className="flex min-h-20 flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-12">
                    <div>
                        <h1 className="text-2xl font-black md:text-3xl">
                            PSU Smart Loan
                        </h1>

                        <p className="mt-1 text-sm text-gray-500">
                            ข้อมูลส่วนตัวของนักศึกษา
                        </p>
                    </div>

                    <nav className="flex flex-wrap items-center gap-3 font-bold">
                        <button
                            type="button"
                            onClick={() =>
                                goProtectedPage("home")
                            }
                            className="rounded-xl px-4 py-2 transition hover:bg-blue-50"
                        >
                            หน้าหลัก
                        </button>

                        

                        <button
                            type="button"
                            onClick={() =>
                                goProtectedPage("eligibility")
                            }
                            className="rounded-xl px-4 py-2 transition hover:bg-blue-50"
                        >
                            การคัดกรอง
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                goProtectedPage("myDocuments")
                            }
                            className="rounded-xl px-4 py-2 transition hover:bg-blue-50"
                        >
                            เอกสารของฉัน
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                goProtectedPage("status")
                            }
                            className="rounded-xl px-4 py-2 transition hover:bg-blue-50"
                        >
                            ติดตามสถานะ
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                goProtectedPage("home")
                            }
                            className="rounded-full bg-[#07116f] px-5 py-2 text-white transition hover:bg-[#101c8c]"
                        >
                            👤 นักศึกษา
                        </button>
                    </nav>
                </div>
            </header>

            <main className="px-6 py-8 lg:px-12">
                <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#07116f] to-[#2638b8] p-7 text-white shadow-lg md:p-10">
                    <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white/15 text-5xl ring-4 ring-white/20">
                                👩‍🎓
                            </div>

                            <div>
                                <p className="text-sm font-bold text-blue-200">
                                    ข้อมูลนักศึกษาปัจจุบัน
                                </p>

                                <h2 className="mt-1 text-2xl font-black md:text-3xl">
                                    {fullName}
                                </h2>

                                <p className="mt-2 text-blue-100">
                                    รหัสนักศึกษา{" "}
                                    {student.studentCode}
                                </p>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <StatusBadge>
                                        {student.loanTypeName}
                                    </StatusBadge>

                                    <StatusBadge>
                                        ชั้นปีที่{" "}
                                        {student.yearLevel}
                                    </StatusBadge>

                                    <StatusBadge>
                                        อายุ {student.age} ปี
                                    </StatusBadge>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
                            <p className="text-sm font-bold text-blue-100">
                                สถานะคำขอปัจจุบัน
                            </p>

                            <p className="mt-2 text-xl font-black">
                                {student.applicationStatus}
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    goProtectedPage("status")
                                }
                                className="mt-4 rounded-xl bg-white px-5 py-2 font-black text-[#07116f] transition hover:bg-blue-50"
                            >
                                ดูสถานะทั้งหมด
                            </button>
                        </div>
                    </div>
                </section>

                {student.latestNotification && (
                    <section className="mt-6 flex items-start gap-4 rounded-2xl border border-yellow-300 bg-yellow-100 px-6 py-5 shadow-sm">
                        <span className="text-2xl">
                            🔔
                        </span>

                        <div>
                            <p className="font-black text-yellow-800">
                                การแจ้งเตือนล่าสุด
                            </p>

                            <p className="mt-1 text-yellow-700">
                                {student.latestNotification}
                            </p>
                        </div>
                    </section>
                )}

                <section className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        icon="✅"
                        value={student.eligibilityStatus}
                        label="ผลการคัดกรอง"
                    />

                    <SummaryCard
                        icon="📄"
                        value={student.documentCount}
                        label="เอกสารทั้งหมด"
                    />

                    <SummaryCard
                        icon="✏️"
                        value={`${student.revisionCount} ครั้ง`}
                        label="จำนวนครั้งที่แก้ไข"
                    />

                    <SummaryCard
                        icon="⚠️"
                        value={
                            student.rejectedDocumentCount
                        }
                        label="เอกสารที่ต้องแก้"
                        warning={
                            student.rejectedDocumentCount > 0
                        }
                    />
                </section>

                <section className="mt-8 grid gap-7 xl:grid-cols-3">
                    <div className="space-y-7 xl:col-span-2">
                        <InformationSection
                            title="ข้อมูลส่วนตัว"
                            icon="👤"
                        >
                            <InformationGrid>
                                <InformationItem
                                    label="คำนำหน้าชื่อ"
                                    value={student.prefix}
                                />

                                <InformationItem
                                    label="ชื่อ"
                                    value={student.firstName}
                                />

                                <InformationItem
                                    label="นามสกุล"
                                    value={student.lastName}
                                />

                                <InformationItem
                                    label="รหัสนักศึกษา"
                                    value={student.studentCode}
                                />

                                <InformationItem
                                    label="เลขบัตรประชาชน"
                                    value={
                                        student.citizenId ||
                                        "ยังไม่มีข้อมูล"
                                    }
                                />

                                <InformationItem
                                    label="วันเกิด"
                                    value={formattedBirthDate}
                                />

                                <InformationItem
                                    label="อายุปัจจุบัน"
                                    value={`${student.age} ปี`}
                                />

                                <InformationItem
                                    label="เงื่อนไขผู้ปกครอง"
                                    value={
                                        student.requiresParentDocuments
                                            ? "ต้องใช้เอกสารผู้ปกครอง"
                                            : "ไม่ต้องใช้เอกสารผู้ปกครอง"
                                    }
                                    highlight={
                                        student.requiresParentDocuments
                                    }
                                />
                            </InformationGrid>
                        </InformationSection>

                        <InformationSection
                            title="ข้อมูลการศึกษา"
                            icon="🎓"
                        >
                            <InformationGrid>
                                <InformationItem
                                    label="คณะ"
                                    value={student.faculty}
                                />

                                <InformationItem
                                    label="สาขาวิชา"
                                    value={student.major}
                                />

                                <InformationItem
                                    label="ชั้นปี"
                                    value={`ชั้นปีที่ ${student.yearLevel}`}
                                />

                                <InformationItem
                                    label="ประเภทผู้กู้"
                                    value={
                                        student.loanTypeName
                                    }
                                />

                                <InformationItem
                                    label="ปีการศึกษา"
                                    value={
                                        student.academicYear
                                    }
                                />

                                <InformationItem
                                    label="ภาคการศึกษา"
                                    value={`ภาคการศึกษาที่ ${student.semester}`}
                                />
                            </InformationGrid>
                        </InformationSection>

                        <InformationSection
                            title="ข้อมูลติดต่อและที่อยู่"
                            icon="📍"
                        >
                            <InformationGrid>
                                <InformationItem
                                    label="หมายเลขโทรศัพท์"
                                    value={
                                        student.phone ||
                                        "ยังไม่มีข้อมูล"
                                    }
                                />

                                <InformationItem
                                    label="อีเมล"
                                    value={
                                        student.email ||
                                        "ยังไม่มีข้อมูล"
                                    }
                                />

                                <div className="sm:col-span-2">
                                    <InformationItem
                                        label="ที่อยู่ปัจจุบัน"
                                        value={address}
                                    />
                                </div>
                            </InformationGrid>
                        </InformationSection>
                    </div>

                    <div className="space-y-7">
                        <section className="rounded-3xl bg-white p-7 shadow-sm">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">
                                    📋
                                </span>

                                <div>
                                    <h2 className="text-xl font-black">
                                        ข้อมูลการคัดกรอง
                                    </h2>

                                    <p className="text-sm text-gray-500">
                                        ข้อมูลที่นักศึกษาเคยกรอก
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 space-y-4">
                                <ProgressInformation
                                    label="GPAX"
                                    value={student.gpax}
                                    description="เกณฑ์ขั้นต่ำ 1.80"
                                    passed={
                                        Number(
                                            student.gpax
                                        ) >= 1.8
                                    }
                                />

                                <ProgressInformation
                                    label="ชั่วโมงจิตอาสา"
                                    value={`${student.volunteerHours} ชั่วโมง`}
                                    description={
                                        student.loanTypeGroup ===
                                        1
                                            ? "ผู้กู้รายใหม่ต้องมีอย่างน้อย 2 ชั่วโมง"
                                            : "ผู้กู้ต่อเนื่องต้องมีอย่างน้อย 36 ชั่วโมง"
                                    }
                                    passed={
                                        student.loanTypeGroup ===
                                        1
                                            ? Number(
                                                  student.volunteerHours
                                              ) >= 2
                                            : Number(
                                                  student.volunteerHours
                                              ) >= 36
                                    }
                                />

                                <ProgressInformation
                                    label="ผลการคัดกรอง"
                                    value={
                                        student.eligibilityStatus
                                    }
                                    description="ผลการตรวจสอบล่าสุด"
                                    passed={
                                        student.eligibilityStatus ===
                                        "ผ่าน"
                                    }
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    goProtectedPage(
                                        "eligibility"
                                    )
                                }
                                className="mt-6 w-full rounded-xl bg-[#07116f] px-5 py-3 font-black text-white transition hover:bg-[#101c8c]"
                            >
                                ดูข้อมูลการคัดกรอง
                            </button>
                        </section>

                        <section className="rounded-3xl bg-white p-7 shadow-sm">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">
                                    🧭
                                </span>

                                <div>
                                    <h2 className="text-xl font-black">
                                        ขั้นตอนปัจจุบัน
                                    </h2>

                                    <p className="text-sm text-gray-500">
                                        ขั้นตอนที่{" "}
                                        {student.currentStep} จาก
                                        4
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 space-y-3">
                                <MiniStatusStep
                                    number={1}
                                    label="คัดกรองคุณสมบัติ"
                                    currentStep={
                                        student.currentStep
                                    }
                                />

                                <MiniStatusStep
                                    number={2}
                                    label="อัปโหลดเอกสาร"
                                    currentStep={
                                        student.currentStep
                                    }
                                />

                                <MiniStatusStep
                                    number={3}
                                    label="ตรวจสอบเอกสาร"
                                    currentStep={
                                        student.currentStep
                                    }
                                />

                                <MiniStatusStep
                                    number={4}
                                    label="จองคิวลงนาม"
                                    currentStep={
                                        student.currentStep
                                    }
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    goProtectedPage("status")
                                }
                                className="mt-6 w-full rounded-xl border-2 border-[#07116f] px-5 py-3 font-black transition hover:bg-blue-50"
                            >
                                ดูประวัติสถานะ
                            </button>
                        </section>

                        {student.requiresParentDocuments && (
                            <section className="rounded-3xl border border-pink-300 bg-pink-50 p-7 shadow-sm">
                                <div className="text-4xl">
                                    👪
                                </div>

                                <h2 className="mt-4 text-xl font-black text-pink-700">
                                    นักศึกษาอายุต่ำกว่า 20 ปี
                                </h2>

                                <p className="mt-3 leading-7 text-pink-600">
                                    ระบบจะเพิ่มเอกสารของผู้ปกครอง
                                    ตามเงื่อนไขของประเภทผู้กู้และภาคการศึกษา
                                    โดยอัตโนมัติ
                                </p>

                                <button
                                    type="button"
                                    onClick={() =>
                                        goProtectedPage(
                                            "myDocuments"
                                        )
                                    }
                                    className="mt-5 w-full rounded-xl bg-pink-600 px-5 py-3 font-black text-white transition hover:bg-pink-700"
                                >
                                    ดูเอกสารที่ต้องใช้
                                </button>
                            </section>
                        )}
                    </div>
                </section>

                <section className="mt-8 flex flex-col gap-4 rounded-3xl bg-white p-7 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-black">
                            ต้องการตรวจสอบข้อมูลส่วนอื่นหรือไม่
                        </h2>

                        <p className="mt-1 text-gray-500">
                            เลือกดูข้อมูลการคัดกรอง เอกสาร
                            หรือสถานะคำขอได้จากเมนูด้านล่าง
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() =>
                                goProtectedPage("home")
                            }
                            className="rounded-xl border-2 border-[#07116f] px-5 py-3 font-black transition hover:bg-blue-50"
                        >
                            กลับหน้าหลัก
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                goProtectedPage(
                                    "myDocuments"
                                )
                            }
                            className="rounded-xl bg-[#07116f] px-5 py-3 font-black text-white transition hover:bg-[#101c8c]"
                        >
                            ดูเอกสารของฉัน
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
}

function StatusBadge({ children }) {
    return (
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
            {children}
        </span>
    );
}

function SummaryCard({
    icon,
    value,
    label,
    warning = false,
}) {
    return (
        <div
            className={`rounded-3xl border p-6 shadow-sm ${
                warning
                    ? "border-red-200 bg-red-50"
                    : "border-white bg-white"
            }`}
        >
            <div className="flex items-center justify-between">
                <span className="text-3xl">
                    {icon}
                </span>

                {warning && (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-600">
                        ต้องดำเนินการ
                    </span>
                )}
            </div>

            <p
                className={`mt-5 text-2xl font-black ${
                    warning
                        ? "text-red-600"
                        : "text-[#07116f]"
                }`}
            >
                {value}
            </p>

            <p className="mt-1 text-sm font-bold text-gray-500">
                {label}
            </p>
        </div>
    );
}

function InformationSection({
    title,
    icon,
    children,
}) {
    return (
        <section className="rounded-3xl bg-white p-7 shadow-sm">
            <div className="flex items-center gap-3 border-b pb-5">
                <span className="text-3xl">
                    {icon}
                </span>

                <h2 className="text-xl font-black">
                    {title}
                </h2>
            </div>

            <div className="mt-6">
                {children}
            </div>
        </section>
    );
}

function InformationGrid({ children }) {
    return (
        <div className="grid gap-5 sm:grid-cols-2">
            {children}
        </div>
    );
}

function InformationItem({
    label,
    value,
    highlight = false,
}) {
    return (
        <div
            className={`rounded-2xl p-4 ${
                highlight
                    ? "border border-pink-200 bg-pink-50"
                    : "bg-[#f7f9ff]"
            }`}
        >
            <p className="text-xs font-bold text-gray-500">
                {label}
            </p>

            <p
                className={`mt-2 break-words font-black ${
                    highlight
                        ? "text-pink-700"
                        : "text-[#07116f]"
                }`}
            >
                {value || "ยังไม่มีข้อมูล"}
            </p>
        </div>
    );
}

function ProgressInformation({
    label,
    value,
    description,
    passed,
}) {
    return (
        <div className="rounded-2xl bg-[#f7f9ff] p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-gray-500">
                        {label}
                    </p>

                    <p className="mt-1 text-lg font-black">
                        {value}
                    </p>
                </div>

                <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                        passed
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                    }`}
                >
                    {passed ? "ผ่าน" : "ไม่ผ่าน"}
                </span>
            </div>

            <p className="mt-2 text-xs text-gray-500">
                {description}
            </p>
        </div>
    );
}

function MiniStatusStep({
    number,
    label,
    currentStep,
}) {
    const completed = currentStep > number;
    const active = currentStep === number;

    let circleStyle =
        "border-2 border-gray-300 bg-white text-gray-400";

    let textStyle = "text-gray-400";

    if (completed) {
        circleStyle =
            "border-2 border-green-500 bg-green-500 text-white";

        textStyle = "text-green-700";
    }

    if (active) {
        circleStyle =
            "border-2 border-blue-600 bg-blue-600 text-white";

        textStyle = "text-blue-700";
    }

    return (
        <div className="flex items-center gap-3 rounded-xl bg-[#f7f9ff] p-3">
            <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${circleStyle}`}
            >
                {completed ? "✓" : number}
            </div>

            <div>
                <p className={`font-bold ${textStyle}`}>
                    {label}
                </p>

                <p className="text-xs text-gray-400">
                    {completed
                        ? "ดำเนินการแล้ว"
                        : active
                          ? "กำลังดำเนินการ"
                          : "ยังไม่เริ่ม"}
                </p>
            </div>
        </div>
    );
}

function formatThaiDate(dateString) {
    if (!dateString) {
        return "ยังไม่มีข้อมูล";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return new Intl.DateTimeFormat("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(date);
}

function formatAddress(student) {
    const addressParts = [
        student.houseNo &&
            `บ้านเลขที่ ${student.houseNo}`,
        student.villageNo &&
            `หมู่ที่ ${student.villageNo}`,
        student.villageName &&
            student.villageName,
        student.soi &&
            student.soi !== "-" &&
            `ซอย ${student.soi}`,
        student.road &&
            `ถนน ${student.road}`,
        student.subdistrict &&
            `ตำบล${student.subdistrict}`,
        student.district &&
            `อำเภอ${student.district}`,
        student.province &&
            `จังหวัด${student.province}`,
        student.postalCode,
    ].filter(Boolean);

    if (addressParts.length === 0) {
        return "ยังไม่มีข้อมูลที่อยู่";
    }

    return addressParts.join(" ");
}

export default StudentInfo;