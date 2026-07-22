import { useEffect, useState } from "react";

/*
|--------------------------------------------------------------------------
| Mock Students
|--------------------------------------------------------------------------
| ข้อมูลนักศึกษาตัวอย่าง 3 กรณีสำหรับใช้ทดสอบระบบ
|
| 1. ผู้กู้รายใหม่ อายุไม่ถึง 20 ปี
| 2. ผู้กู้เกินหลักสูตร อายุ 20 ปีขึ้นไป
| 3. ผู้กู้รายเก่าต่อเนื่อง อายุ 20 ปีขึ้นไป
|--------------------------------------------------------------------------
*/

const mockStudents = [
    {
        id: 1,
        studentId: 1001,
        studentCode: "6810110001",
        prefix: "นางสาว",
        firstName: "ณัฐณิชา",
        lastName: "ศรีสุข",
        fullName: "นางสาวณัฐณิชา ศรีสุข",

        birthDate: "2008-02-15",

        faculty: "คณะวิทยาศาสตร์",
        major: "วิทยาการคอมพิวเตอร์",
        yearLevel: 1,

        phone: "0812345678",
        email: "6810110001@psu.ac.th",

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
    },

    {
        id: 2,
        studentId: 1002,
        studentCode: "6410110002",
        prefix: "นาย",
        firstName: "ธนภัทร",
        lastName: "ใจดี",
        fullName: "นายธนภัทร ใจดี",

        birthDate: "2003-10-20",

        faculty: "คณะวิศวกรรมศาสตร์",
        major: "วิศวกรรมคอมพิวเตอร์",
        yearLevel: 5,

        phone: "0898765432",
        email: "6410110002@psu.ac.th",

        loanTypeCode: "CONTINUING_SPECIAL",
        loanTypeName: "ผู้กู้ต่อเนื่องกรณีเกินหลักสูตร",
        loanTypeGroup: 2,

        academicYear: "2569",
        semester: 1,

        gpax: 2.45,
        volunteerHours: 42,

        eligibilityStatus: "ผ่าน",
        applicationStatus: "รอตรวจสอบเอกสาร",

        revisionCount: 0,
        documentCount: 4,
        rejectedDocumentCount: 0,

        currentStep: 3,

        latestNotification:
            "เจ้าหน้าที่กำลังตรวจสอบเอกสารของคุณ",

        requiresParentDocuments: false,
    },

    {
        id: 3,
        studentId: 1003,
        studentCode: "6610110003",
        prefix: "นางสาว",
        firstName: "กมลชนก",
        lastName: "แสงทอง",
        fullName: "นางสาวกมลชนก แสงทอง",

        birthDate: "2004-06-10",

        faculty: "คณะทรัพยากรธรรมชาติ",
        major: "เกษตรศาสตร์",
        yearLevel: 3,

        phone: "0861112233",
        email: "6610110003@psu.ac.th",

        loanTypeCode: "CONTINUING_CURRENT",
        loanTypeName: "ผู้กู้รายเก่าต่อเนื่องเลื่อนชั้นปี",
        loanTypeGroup: 3,

        academicYear: "2569",
        semester: 1,

        gpax: 2.87,
        volunteerHours: 39,

        eligibilityStatus: "ผ่าน",
        applicationStatus: "เอกสารผ่านแล้ว",

        revisionCount: 2,
        documentCount: 3,
        rejectedDocumentCount: 0,

        currentStep: 4,

        latestNotification:
            "เอกสารผ่านการตรวจสอบแล้ว สามารถดำเนินการจองคิวได้",

        requiresParentDocuments: false,
    },
];

/*
|--------------------------------------------------------------------------
| Mock Home Data
|--------------------------------------------------------------------------
| ใช้เมื่อ Backend ไม่เปิดหรือเชื่อมต่อไม่ได้
|--------------------------------------------------------------------------
*/

const mockHomeData = {
    system: {
        title: "PSU Smart Loan",
        university:
            "มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตหาดใหญ่",
    },

    banner: {
        title: "กยศ.",
        subtitle: "กองทุนเงินให้กู้ยืมเพื่อการศึกษา",
        description:
            "ระบบคัดกรองคุณสมบัติ ตรวจสอบเอกสารออนไลน์ ติดตามสถานะ และจองคิวสำหรับนักศึกษาผู้กู้ยืมเงิน",
    },

    homeContents: [
        {
            id: 1,
            no: 1,
            title: "ตรวจสอบข้อมูลส่วนตัว",
            description:
                "นักศึกษาตรวจสอบชื่อ รหัสนักศึกษา วันเกิด คณะ สาขา ชั้นปี และข้อมูลติดต่อให้ถูกต้องก่อนดำเนินการคัดกรอง",
            dateText:
                "กรุณาตรวจสอบข้อมูลส่วนตัวก่อนส่งคำขอกู้",
            color: "pink",
            active: true,
        },
        {
            id: 2,
            no: 2,
            title: "คัดกรองคุณสมบัติผู้กู้",
            description:
                "ระบบตรวจสอบประเภทผู้กู้ GPAX ชั่วโมงจิตอาสา ภาคการศึกษา และเงื่อนไขอายุของนักศึกษา",
            dateText:
                "ผลการคัดกรองจะถูกบันทึกไว้ในคำขอกู้",
            color: "green",
            active: true,
        },
        {
            id: 3,
            no: 3,
            title: "อัปโหลดและตรวจสอบเอกสาร",
            description:
                "อัปโหลดเอกสารตามประเภทผู้กู้และเงื่อนไขอายุ พร้อมติดตามผลตรวจและประวัติการแก้ไขทุกเวอร์ชัน",
            dateText:
                "ไฟล์เดิมจะยังสามารถเปิดดูย้อนหลังได้",
            color: "purple",
            active: true,
        },
        {
            id: 4,
            no: 4,
            title: "ติดตามสถานะและจองคิว",
            description:
                "ตรวจสอบว่าคำขออยู่ในขั้นตอนใด เมื่อเอกสารผ่านครบแล้วจึงสามารถจองคิวลงนามเอกสารได้",
            dateText:
                "ระบบแสดงประวัติการเปลี่ยนสถานะพร้อมวันและเวลา",
            color: "orange",
            active: true,
        },
    ],

    notice:
        "กำลังใช้งานข้อมูลนักศึกษาตัวอย่างสำหรับทดสอบระบบ",
};

function calculateAge(birthDate) {
    if (!birthDate) {
        return 0;
    }

    const today = new Date();
    const birth = new Date(birthDate);

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

    return age;
}

function Home({ goProtectedPage }) {
    const [role, setRole] = useState("student");

    const [homeData, setHomeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [usingMockData, setUsingMockData] =
        useState(false);

    const [selectedStudentId, setSelectedStudentId] =
        useState(() => {
            const savedStudentId = localStorage.getItem(
                "selectedMockStudentId"
            );

            return savedStudentId
                ? Number(savedStudentId)
                : mockStudents[0].id;
        });

    const selectedStudent =
        mockStudents.find(
            (student) =>
                student.id === selectedStudentId
        ) || mockStudents[0];

    const studentAge = calculateAge(
        selectedStudent.birthDate
    );

    useEffect(() => {
        async function loadHomeData() {
            try {
                setLoading(true);

                const response = await fetch(
                    "http://localhost:3000/api/home"
                );

                if (!response.ok) {
                    throw new Error(
                        "Backend ไม่พร้อมใช้งาน"
                    );
                }

                const result = await response.json();

                if (!result.success || !result.data) {
                    throw new Error(
                        "รูปแบบข้อมูลจาก Backend ไม่ถูกต้อง"
                    );
                }

                setHomeData(result.data);
                setUsingMockData(false);
            } catch (error) {
                console.warn(
                    "ไม่สามารถเชื่อมต่อ Backend ได้ จึงใช้ Mock Data แทน:",
                    error
                );

                setHomeData(mockHomeData);
                setUsingMockData(true);
            } finally {
                setLoading(false);
            }
        }

        loadHomeData();
    }, []);

    useEffect(() => {
        localStorage.setItem(
            "selectedMockStudentId",
            String(selectedStudent.id)
        );

        localStorage.setItem(
            "selectedMockStudent",
            JSON.stringify({
                ...selectedStudent,
                age: studentAge,
            })
        );

        window.dispatchEvent(
            new CustomEvent("mockStudentChanged", {
                detail: {
                    ...selectedStudent,
                    age: studentAge,
                },
            })
        );
    }, [selectedStudent, studentAge]);

    const handleRoleChange = (event) => {
        const selectedRole = event.target.value;

        setRole(selectedRole);

        if (selectedRole === "staff") {
            goProtectedPage("staffDashboard");
            return;
        }

        goProtectedPage("home");
    };

    const handleStudentChange = (event) => {
        setSelectedStudentId(
            Number(event.target.value)
        );
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
            page: "studentInfo",
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

    const quickActions = [
        {
            id: 1,
            icon: "👤",
            title: "ข้อมูลของฉัน",
            description:
                "ดูข้อมูลส่วนตัว วันเกิด อายุ คณะ สาขา ชั้นปี และข้อมูลติดต่อ",
            buttonText: "ดูข้อมูลส่วนตัว",
            page: "studentInfo",
        },
        {
            id: 2,
            icon: "✅",
            title: "การคัดกรอง",
            description:
                "ตรวจสอบประเภทผู้กู้ GPAX ชั่วโมงจิตอาสา และผลการคัดกรอง",
            buttonText: "ดูผลการคัดกรอง",
            page: "eligibility",
        },
        {
            id: 3,
            icon: "📄",
            title: "เอกสารของฉัน",
            description:
                "ดูไฟล์ที่ส่ง ผลตรวจ เหตุผลที่ต้องแก้ และประวัติไฟล์ทุกเวอร์ชัน",
            buttonText: "ดูเอกสาร",
            page: "myDocuments",
        },
        {
            id: 4,
            icon: "📍",
            title: "ติดตามสถานะ",
            description:
                "ตรวจสอบขั้นตอนปัจจุบันและประวัติการเปลี่ยนสถานะของคำขอกู้",
            buttonText: "ติดตามสถานะ",
            page: "status",
        },
    ];

    if (loading || !homeData) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#eef5ff]">
                <div className="rounded-2xl bg-white px-10 py-8 text-center shadow">
                    <div className="mb-4 text-5xl">
                        ⏳
                    </div>

                    <p className="text-xl font-black text-[#07116f]">
                        กำลังโหลดข้อมูลหน้าหลัก...
                    </p>
                </div>
            </div>
        );
    }

    const system = homeData?.system || {};
    const banner = homeData?.banner || {};
    const homeContents =
        homeData?.homeContents || [];
    const notice = homeData?.notice || "";

    return (
        <div className="min-h-screen bg-[#eef5ff] text-[#07116f]">
            <header className="sticky top-0 z-50 w-full bg-white shadow-sm">
                <div className="flex min-h-20 w-full flex-col gap-5 px-6 py-4 lg:px-12 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                        <h1 className="text-2xl font-black md:text-3xl">
                            {system.title ||
                                "PSU Smart Loan"}
                        </h1>

                        <p className="mt-1 text-sm text-gray-500">
                            {system.university ||
                                "มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตหาดใหญ่"}
                        </p>
                    </div>

                    <nav className="flex flex-wrap items-center gap-2 font-bold">
                        {studentMenus.map((menu) => (
                            <button
                                key={menu.id}
                                type="button"
                                onClick={() =>
                                    goProtectedPage(
                                        menu.page
                                    )
                                }
                                className="rounded-lg px-2 py-2 transition hover:bg-blue-50 hover:text-blue-500"
                            >
                                {menu.label}
                            </button>
                        ))}

                        <div className="relative ml-1">
                            <select
                                value={selectedStudentId}
                                onChange={
                                    handleStudentChange
                                }
                                aria-label="เลือกนักศึกษาตัวอย่าง"
                                className="max-w-[260px] cursor-pointer appearance-none rounded-full border-2 border-[#07116f] bg-white py-2 pl-4 pr-10 text-sm font-bold text-[#07116f] outline-none transition hover:bg-blue-50 focus:ring-4 focus:ring-blue-200"
                            >
                                {mockStudents.map(
                                    (student) => (
                                        <option
                                            key={student.id}
                                            value={student.id}
                                        >
                                            {
                                                student.studentCode
                                            }{" "}
                                            -{" "}
                                            {
                                                student.loanTypeName
                                            }
                                        </option>
                                    )
                                )}
                            </select>

                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs">
                                ▼
                            </span>
                        </div>

                        <div className="relative">
                            <select
                                value={role}
                                onChange={
                                    handleRoleChange
                                }
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

            <main className="w-full px-6 py-8 lg:px-12">
                {usingMockData && (
                    <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-orange-300 bg-orange-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">
                                🧪
                            </span>

                            <div>
                                <p className="font-black text-orange-700">
                                    โหมดข้อมูลตัวอย่าง
                                </p>

                                <p className="text-sm text-orange-600">
                                    ไม่พบ Backend
                                    ระบบจึงใช้ Mock Data
                                    สำหรับทดสอบ
                                </p>
                            </div>
                        </div>

                        <span className="rounded-full bg-orange-200 px-4 py-2 text-sm font-black text-orange-800">
                            {selectedStudent.loanTypeName}
                        </span>
                    </section>
                )}

                <section className="overflow-hidden rounded-3xl bg-[#cfeeff] shadow">
                    <div className="grid items-center gap-10 p-8 md:grid-cols-2 lg:p-12">
                        <div>
                            <span className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-black shadow-sm">
                                ระบบบริการนักศึกษาผู้กู้ยืมเงิน
                            </span>

                            <h2 className="mt-5 text-5xl font-black text-pink-500 md:text-6xl">
                                {banner.title || "กยศ."}
                            </h2>

                            <h3 className="mt-3 text-2xl font-black md:text-3xl">
                                {banner.subtitle ||
                                    "กองทุนเงินให้กู้ยืมเพื่อการศึกษา"}
                            </h3>

                            <p className="mt-4 max-w-xl leading-8">
                                {banner.description ||
                                    "ระบบคัดกรองคุณสมบัติ ตรวจสอบเอกสาร ติดตามสถานะ และจองคิว"}
                            </p>

                            <div className="mt-7 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        goProtectedPage(
                                            "studentInfo"
                                        )
                                    }
                                    className="rounded-xl bg-[#07116f] px-7 py-3 font-black text-white transition hover:bg-[#101c8c]"
                                >
                                    ดูข้อมูลของฉัน
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        goProtectedPage(
                                            "status"
                                        )
                                    }
                                    className="rounded-xl border-2 border-[#07116f] bg-white px-7 py-3 font-black transition hover:bg-blue-50"
                                >
                                    ติดตามสถานะ
                                </button>
                            </div>
                        </div>

                        <div className="rounded-3xl bg-white p-7 shadow">
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-100 text-4xl">
                                    👩‍🎓
                                </div>

                                <div>
                                    <p className="text-sm font-bold text-gray-500">
                                        นักศึกษาที่กำลังทดสอบ
                                    </p>

                                    <h2 className="mt-1 text-xl font-black">
                                        {
                                            selectedStudent.fullName
                                        }
                                    </h2>

                                    <p className="mt-1 text-sm text-gray-500">
                                        {
                                            selectedStudent.studentCode
                                        }{" "}
                                        · อายุ {studentAge} ปี
                                    </p>

                                    <span className="mt-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                                        {
                                            selectedStudent.loanTypeName
                                        }
                                    </span>
                                </div>
                            </div>

                            <div className="mt-7 grid grid-cols-2 gap-3">
                                <SummaryItem
                                    value={
                                        selectedStudent.gpax
                                    }
                                    label="GPAX"
                                />

                                <SummaryItem
                                    value={`${selectedStudent.volunteerHours} ชม.`}
                                    label="จิตอาสา"
                                />

                                <SummaryItem
                                    value={
                                        selectedStudent.revisionCount
                                    }
                                    label="จำนวนครั้งที่แก้"
                                />

                                <SummaryItem
                                    value={
                                        selectedStudent.applicationStatus
                                    }
                                    label="สถานะล่าสุด"
                                    small
                                />
                            </div>

                            {selectedStudent.requiresParentDocuments && (
                                <div className="mt-5 rounded-2xl bg-pink-50 p-4 text-sm font-bold text-pink-700">
                                    👪 นักศึกษาอายุต่ำกว่า 20 ปี
                                    ระบบต้องเพิ่มเอกสารผู้ปกครอง
                                    โดยอัตโนมัติ
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="mt-7 flex items-start gap-4 rounded-2xl bg-yellow-300 px-7 py-5 font-bold shadow-sm">
                    <span className="text-2xl">
                        📢
                    </span>

                    <div>
                        <p>
                            {selectedStudent.latestNotification}
                        </p>

                        {notice && (
                            <p className="mt-1 text-sm font-medium opacity-75">
                                {notice}
                            </p>
                        )}
                    </div>
                </section>

                <section className="mt-10">
                    <div className="mb-6">
                        <h2 className="text-2xl font-black md:text-3xl">
                            บริการสำหรับนักศึกษา
                        </h2>

                        <p className="mt-2 text-gray-500">
                            เลือกเมนูที่ต้องการตรวจสอบหรือดำเนินการ
                        </p>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                        {quickActions.map((item) => (
                            <FeatureCard
                                key={item.id}
                                icon={item.icon}
                                title={item.title}
                                desc={item.description}
                                button={
                                    item.buttonText
                                }
                                onClick={() =>
                                    goProtectedPage(
                                        item.page
                                    )
                                }
                            />
                        ))}
                    </div>
                </section>

                <section className="mt-12 grid gap-6 lg:grid-cols-3">
                    <div className="rounded-3xl bg-white p-7 shadow-sm lg:col-span-2">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-2xl font-black">
                                    สถานะคำขอปัจจุบัน
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    ปีการศึกษา{" "}
                                    {
                                        selectedStudent.academicYear
                                    }{" "}
                                    ภาคการศึกษาที่{" "}
                                    {selectedStudent.semester}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    goProtectedPage(
                                        "status"
                                    )
                                }
                                className="rounded-xl bg-blue-50 px-5 py-3 font-black transition hover:bg-blue-100"
                            >
                                ดูรายละเอียดทั้งหมด
                            </button>
                        </div>

                        <div className="mt-8 grid gap-4 md:grid-cols-4">
                            <StatusStep
                                number="1"
                                title="คัดกรอง"
                                status={
                                    selectedStudent.currentStep >
                                    1
                                        ? "เสร็จแล้ว"
                                        : "กำลังดำเนินการ"
                                }
                                completed={
                                    selectedStudent.currentStep >
                                    1
                                }
                                active={
                                    selectedStudent.currentStep ===
                                    1
                                }
                            />

                            <StatusStep
                                number="2"
                                title="อัปโหลดเอกสาร"
                                status={
                                    selectedStudent.currentStep >
                                    2
                                        ? "เสร็จแล้ว"
                                        : selectedStudent.currentStep ===
                                            2
                                          ? "กำลังดำเนินการ"
                                          : "ยังไม่เริ่ม"
                                }
                                completed={
                                    selectedStudent.currentStep >
                                    2
                                }
                                active={
                                    selectedStudent.currentStep ===
                                    2
                                }
                            />

                            <StatusStep
                                number="3"
                                title="ตรวจเอกสาร"
                                status={
                                    selectedStudent.currentStep >
                                    3
                                        ? "เสร็จแล้ว"
                                        : selectedStudent.currentStep ===
                                            3
                                          ? selectedStudent.applicationStatus
                                          : "ยังไม่เริ่ม"
                                }
                                completed={
                                    selectedStudent.currentStep >
                                    3
                                }
                                active={
                                    selectedStudent.currentStep ===
                                    3
                                }
                            />

                            <StatusStep
                                number="4"
                                title="จองคิว"
                                status={
                                    selectedStudent.currentStep >=
                                    4
                                        ? "พร้อมจองคิว"
                                        : "ยังไม่เปิดใช้งาน"
                                }
                                active={
                                    selectedStudent.currentStep ===
                                    4
                                }
                            />
                        </div>
                    </div>

                    <div className="rounded-3xl bg-[#07116f] p-7 text-white shadow-sm">
                        <div className="text-4xl">
                            🔔
                        </div>

                        <h2 className="mt-5 text-2xl font-black">
                            การแจ้งเตือน
                        </h2>

                        <p className="mt-3 leading-7 text-blue-100">
                            {
                                selectedStudent.latestNotification
                            }
                        </p>

                        {selectedStudent.rejectedDocumentCount >
                            0 && (
                            <p className="mt-4 rounded-xl bg-red-500/20 p-3 font-bold text-red-100">
                                มีเอกสารต้องแก้ไข{" "}
                                {
                                    selectedStudent.rejectedDocumentCount
                                }{" "}
                                รายการ
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={() =>
                                goProtectedPage(
                                    "myDocuments"
                                )
                            }
                            className="mt-6 w-full rounded-xl bg-white px-5 py-3 font-black text-[#07116f] transition hover:bg-blue-50"
                        >
                            ตรวจสอบเอกสารของฉัน
                        </button>
                    </div>
                </section>

                {homeContents.length > 0 && (
                    <section className="mt-12">
                        <div className="mb-6">
                            <h2 className="text-2xl font-black md:text-3xl">
                                ขั้นตอนการดำเนินการ
                            </h2>

                            <p className="mt-2 text-gray-500">
                                ขั้นตอนสำหรับนักศึกษาผู้กู้ยืมเงิน
                            </p>
                        </div>

                        <div className="space-y-7">
                            {homeContents
                                .filter(
                                    (item) =>
                                        item.active
                                )
                                .map((item) => (
                                    <StepCard
                                        key={item.id}
                                        no={item.no}
                                        title={
                                            item.title
                                        }
                                        detail={
                                            item.description
                                        }
                                        date={
                                            item.dateText
                                        }
                                        color={
                                            item.color
                                        }
                                        button={
                                            item.no === 2
                                        }
                                        onClick={() =>
                                            goProtectedPage(
                                                "eligibility"
                                            )
                                        }
                                    />
                                ))}
                        </div>
                    </section>
                )}

                <footer className="mt-12 rounded-t-3xl bg-[#030735] p-10 text-white">
                    <h2 className="text-2xl font-black">
                        PSU Smart Loan
                    </h2>

                    <p className="mt-2 opacity-80">
                        ระบบคัดกรองคุณสมบัติ
                        ตรวจสอบเอกสาร
                        และจองคิวสำหรับนักศึกษาผู้กู้ยืมเงิน
                    </p>

                    <div className="mt-8 grid gap-8 md:grid-cols-2">
                        <div>
                            <h3 className="mb-3 font-black">
                                ลิงก์ที่เกี่ยวข้อง
                            </h3>

                            <p>› ระบบ e-studentLoan</p>
                            <p>
                                ›
                                กองทุนเงินให้กู้ยืมเพื่อการศึกษา
                                (กยศ.)
                            </p>
                            <p>› ดาวน์โหลดแบบฟอร์ม</p>
                            <p>› คู่มือการใช้งานระบบ</p>
                        </div>

                        <div>
                            <h3 className="mb-3 font-black">
                                ติดต่อหน่วยงาน
                            </h3>

                            <p>อาคารกิจกรรมนักศึกษา</p>
                            <p>โทรศัพท์ 074-282-213</p>
                            <p>studentloan.psu.ac.th</p>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}

function SummaryItem({
    value,
    label,
    small = false,
}) {
    return (
        <div className="rounded-2xl bg-[#eef5ff] p-4 text-center">
            <p
                className={`font-black text-[#07116f] ${
                    small
                        ? "text-sm"
                        : "text-xl"
                }`}
            >
                {value}
            </p>

            <p className="mt-1 text-xs font-bold text-gray-500">
                {label}
            </p>
        </div>
    );
}

function FeatureCard({
    icon,
    title,
    desc,
    button,
    onClick,
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="block w-full rounded-3xl border bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
        >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">
                {icon}
            </div>

            <h3 className="text-xl font-black text-[#07116f]">
                {title}
            </h3>

            <p className="mt-3 min-h-[72px] leading-6 text-gray-500">
                {desc}
            </p>

            <span className="mt-5 inline-block font-black text-[#07116f]">
                {button} →
            </span>
        </button>
    );
}

function StatusStep({
    number,
    title,
    status,
    completed = false,
    active = false,
}) {
    let circleClass =
        "border-2 border-gray-300 bg-white text-gray-400";

    let statusClass = "text-gray-400";

    if (completed) {
        circleClass =
            "border-2 border-green-500 bg-green-500 text-white";

        statusClass = "text-green-600";
    }

    if (active) {
        circleClass =
            "border-2 border-blue-600 bg-blue-600 text-white";

        statusClass = "text-blue-600";
    }

    return (
        <div className="rounded-2xl border bg-gray-50 p-4">
            <div
                className={`flex h-11 w-11 items-center justify-center rounded-full font-black ${circleClass}`}
            >
                {completed ? "✓" : number}
            </div>

            <h3 className="mt-4 font-black text-[#07116f]">
                {title}
            </h3>

            <p
                className={`mt-1 text-sm font-bold ${statusClass}`}
            >
                {status}
            </p>
        </div>
    );
}

function StepCard({
    no,
    title,
    detail,
    date,
    color,
    button,
    onClick,
}) {
    const colors = {
        pink: {
            border: "border-pink-400",
            text: "text-pink-600",
            bg: "bg-pink-600",
        },

        green: {
            border: "border-green-500",
            text: "text-green-600",
            bg: "bg-green-600",
        },

        purple: {
            border: "border-purple-500",
            text: "text-purple-600",
            bg: "bg-purple-600",
        },

        orange: {
            border: "border-orange-500",
            text: "text-orange-600",
            bg: "bg-orange-500",
        },
    };

    const theme = colors[color] || colors.pink;

    return (
        <div
            className={`rounded-[32px] border-2 bg-white p-8 shadow-sm ${theme.border}`}
        >
            <div className="flex flex-col gap-6 sm:flex-row">
                <div
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-3xl font-black text-white ${theme.bg}`}
                >
                    {no}
                </div>

                <div className="flex-1">
                    <h2
                        className={`text-2xl font-black ${theme.text}`}
                    >
                        {title}
                    </h2>

                    <p className="mt-4 font-medium leading-8 text-[#07116f]">
                        {detail}
                    </p>

                    {date && (
                        <p className="mt-4 font-bold text-red-500">
                            {date}
                        </p>
                    )}

                    {button && (
                        <button
                            type="button"
                            onClick={onClick}
                            className="mt-5 rounded-xl bg-[#07116f] px-6 py-3 font-bold text-white transition hover:bg-[#101c8c]"
                        >
                            ระบบคัดกรองคุณสมบัติ
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Home;