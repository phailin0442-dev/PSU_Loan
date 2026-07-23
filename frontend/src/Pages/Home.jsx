import { mockHomeContents } from "../data/mockData";
import { useApp } from "../context/AppContext";

function calculateAge(birthDate) {
    if (!birthDate) {
        return "-";
    }

    const birth = new Date(birthDate);

    if (Number.isNaN(birth.getTime())) {
        return "-";
    }

    const today = new Date();

    let age =
        today.getFullYear() - birth.getFullYear();

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

function Home({ setPage }) {
    const { selectedStudent, role } = useApp();

    const studentAge =
        selectedStudent?.age ||
        calculateAge(
            selectedStudent?.birthDate ||
            selectedStudent?.birthdate
        );

    const currentStep =
        Number(selectedStudent?.currentStep) || 1;

    const applicationStatus =
        selectedStudent?.applicationStatus ||
        "ยังไม่ได้ดำเนินการ";

    const latestNotification =
        selectedStudent?.latestNotification ||
        getDefaultNotification(applicationStatus);

    const revisionCount =
        selectedStudent?.revisionCount ??
        countRejectedDocuments(selectedStudent);

    const rejectedDocumentCount =
        selectedStudent?.rejectedDocumentCount ??
        countRejectedDocuments(selectedStudent);

    const quickActions = [
        {
            id: 1,
            icon: "👤",
            title: "ข้อมูลของฉัน",
            description:
                "ดูข้อมูลส่วนตัว วันเกิด อายุ คณะ สาขา ชั้นปี และข้อมูลติดต่อ",
            buttonText: "ดูข้อมูลส่วนตัว",
            page: "studentProfiles",
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
                "ดูเอกสารที่ต้องใช้ ไฟล์ที่ส่ง ผลตรวจ และหมายเหตุจากเจ้าหน้าที่",
            buttonText: "ดูเอกสาร",
            page: "uploadDocuments",
        },
        {
            id: 4,
            icon: "📍",
            title: "ติดตามสถานะ",
            description:
                "ตรวจสอบขั้นตอนปัจจุบันและสถานะล่าสุดของคำขอกู้ยืม",
            buttonText: "ติดตามสถานะ",
            page: "status",
        },
    ];

    const stepThemes = [
        {
            border: "border-pink-400",
            text: "text-pink-600",
            bg: "bg-pink-500",
        },
        {
            border: "border-green-500",
            text: "text-green-600",
            bg: "bg-green-600",
        },
        {
            border: "border-purple-500",
            text: "text-purple-600",
            bg: "bg-purple-600",
        },
        {
            border: "border-orange-500",
            text: "text-orange-600",
            bg: "bg-orange-500",
        },
    ];

    return (
        <main className="w-full px-6 py-8 lg:px-12">
            <section className="overflow-hidden rounded-[32px] bg-[#cfeeff] shadow-sm">
                <div className="grid items-center gap-10 p-8 lg:grid-cols-2 lg:p-12">
                    <div>
                        <span className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-[#07116f] shadow-sm">
                            ระบบบริการนักศึกษาผู้กู้ยืมเงิน
                        </span>

                        <h1 className="mt-5 text-5xl font-black text-pink-500 md:text-6xl">
                            กยศ.
                        </h1>

                        <h2 className="mt-3 text-2xl font-black text-[#07116f] md:text-3xl">
                            กองทุนเงินให้กู้ยืมเพื่อการศึกษา
                        </h2>

                        <p className="mt-4 max-w-xl leading-8 text-[#07116f]">
                            ระบบคัดกรองคุณสมบัติ
                            ตรวจสอบเอกสารออนไลน์
                            ติดตามสถานะ และจองคิว
                            สำหรับนักศึกษาผู้กู้ยืมเงิน
                        </p>

                        <div className="mt-7 flex flex-wrap gap-3">
                            {role === "student" ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPage(
                                                "studentProfiles"
                                            )
                                        }
                                        className="rounded-xl bg-[#07116f] px-7 py-3 font-black text-white transition hover:bg-[#101c8c]"
                                    >
                                        ดูข้อมูลของฉัน
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPage("status")
                                        }
                                        className="rounded-xl border-2 border-[#07116f] bg-white px-7 py-3 font-black text-[#07116f] transition hover:bg-blue-50"
                                    >
                                        ติดตามสถานะ
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPage(
                                            "staffDashboard"
                                        )
                                    }
                                    className="rounded-xl bg-[#07116f] px-7 py-3 font-black text-white transition hover:bg-[#101c8c]"
                                >
                                    ไป Dashboard เจ้าหน้าที่
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="rounded-[28px] bg-white p-7 shadow-md">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-100 text-4xl">
                                👩‍🎓
                            </div>

                            <div>
                                <p className="text-sm font-bold text-gray-500">
                                    นักศึกษาที่กำลังทดสอบ
                                </p>

                                <h2 className="mt-1 text-xl font-black text-[#07116f]">
                                    {selectedStudent?.fullName ||
                                        "-"}
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    {selectedStudent?.studentCode ||
                                        selectedStudent?.studentId ||
                                        "-"}{" "}
                                    · อายุ {studentAge} ปี
                                </p>

                                <span className="mt-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                                    {selectedStudent?.loanTypeName ||
                                        "-"}
                                </span>
                            </div>
                        </div>

                        <div className="mt-7 grid grid-cols-2 gap-3">
                            <SummaryItem
                                value={
                                    selectedStudent?.gpax ??
                                    "-"
                                }
                                label="GPAX"
                            />

                            <SummaryItem
                                value={
                                    selectedStudent?.volunteerHours !==
                                        null &&
                                        selectedStudent?.volunteerHours !==
                                        undefined
                                        ? `${selectedStudent.volunteerHours} ชม.`
                                        : "-"
                                }
                                label="จิตอาสา"
                            />

                            <SummaryItem
                                value={revisionCount}
                                label="จำนวนครั้งที่แก้"
                            />

                            <SummaryItem
                                value={applicationStatus}
                                label="สถานะล่าสุด"
                                small
                            />
                        </div>

                        {Number(studentAge) < 20 && (
                            <div className="mt-5 rounded-2xl bg-pink-50 p-4 text-sm font-bold text-pink-700">
                                👪 นักศึกษาอายุต่ำกว่า 20 ปี
                                ระบบต้องเพิ่มเอกสารผู้ปกครองโดยอัตโนมัติ
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="mt-7 flex items-start gap-4 rounded-2xl bg-yellow-300 px-7 py-5 font-bold text-[#07116f] shadow-sm">
                <span className="text-2xl">
                    📢
                </span>

                <div>
                    <p>{latestNotification}</p>

                    <p className="mt-1 text-sm font-medium opacity-75">
                        กำลังใช้งานข้อมูลนักศึกษาตัวอย่างสำหรับทดสอบระบบ
                    </p>
                </div>
            </section>

            {role === "student" && (
                <section className="mt-10">
                    <div className="mb-6">
                        <h2 className="text-2xl font-black text-[#07116f] md:text-3xl">
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
                                button={item.buttonText}
                                onClick={() =>
                                    setPage(item.page)
                                }
                            />
                        ))}
                    </div>
                </section>
            )}

            <section className="mt-12 grid gap-6 lg:grid-cols-3">
                <div className="rounded-[28px] bg-white p-7 shadow-sm lg:col-span-2">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-[#07116f]">
                                สถานะคำขอปัจจุบัน
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                ปีการศึกษา{" "}
                                {selectedStudent?.academicYear ||
                                    "-"}{" "}
                                ภาคการศึกษาที่{" "}
                                {selectedStudent?.semester ||
                                    "-"}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setPage("status")
                            }
                            className="rounded-xl bg-blue-50 px-5 py-3 font-black text-[#07116f] transition hover:bg-blue-100"
                        >
                            ดูรายละเอียดทั้งหมด
                        </button>
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-4">
                        <StatusStep
                            number="1"
                            title="ข้อมูลส่วนตัว"
                            status={
                                selectedStudent?.studentInfoCompleted
                                    ? "เสร็จแล้ว"
                                    : "ยังไม่ครบ"
                            }
                            completed={
                                selectedStudent?.studentInfoCompleted
                            }
                            active={
                                !selectedStudent?.studentInfoCompleted
                            }
                        />

                        <StatusStep
                            number="2"
                            title="คัดกรอง"
                            status={
                                selectedStudent?.eligibilityCompleted
                                    ? "เสร็จแล้ว"
                                    : "ยังไม่เริ่ม"
                            }
                            completed={
                                selectedStudent?.eligibilityCompleted
                            }
                            active={
                                selectedStudent?.studentInfoCompleted &&
                                !selectedStudent?.eligibilityCompleted
                            }
                        />

                        <StatusStep
                            number="3"
                            title="อัปโหลดเอกสาร"
                            status={
                                selectedStudent?.documentsCompleted
                                    ? "เสร็จแล้ว"
                                    : selectedStudent?.eligibilityCompleted
                                        ? "กำลังดำเนินการ"
                                        : "ยังไม่เริ่ม"
                            }
                            completed={
                                selectedStudent?.documentsCompleted
                            }
                            active={
                                selectedStudent?.eligibilityCompleted &&
                                !selectedStudent?.documentsCompleted
                            }
                        />

                        <StatusStep
                            number="4"
                            title="ตรวจเอกสาร"
                            status={
                                currentStep >= 4
                                    ? "พร้อมจองคิว"
                                    : applicationStatus
                            }
                            completed={currentStep > 4}
                            active={currentStep >= 3}
                        />
                    </div>
                </div>

                <div className="rounded-[28px] bg-[#07116f] p-7 text-white shadow-sm">
                    <div className="text-4xl">
                        🔔
                    </div>

                    <h2 className="mt-5 text-2xl font-black">
                        การแจ้งเตือน
                    </h2>

                    <p className="mt-3 leading-7 text-blue-100">
                        {latestNotification}
                    </p>

                    {rejectedDocumentCount > 0 && (
                        <p className="mt-4 rounded-xl bg-red-500/20 p-3 font-bold text-red-100">
                            มีเอกสารต้องแก้ไข{" "}
                            {rejectedDocumentCount} รายการ
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={() =>
                            setPage("uploadDocuments")
                        }
                        className="mt-6 w-full rounded-xl bg-white px-5 py-3 font-black text-[#07116f] transition hover:bg-blue-50"
                    >
                        ตรวจสอบเอกสารของฉัน
                    </button>
                </div>
            </section>

            {mockHomeContents?.length > 0 && (
                <section className="mt-12">
                    <div className="mb-6">
                        <h2 className="text-2xl font-black text-[#07116f] md:text-3xl">
                            ขั้นตอนการดำเนินการ
                        </h2>

                        <p className="mt-2 text-gray-500">
                            ขั้นตอนสำหรับนักศึกษาผู้กู้ยืมเงิน
                        </p>
                    </div>

                    <div className="space-y-7">
                        {mockHomeContents.map(
                            (item, index) => {
                                const theme =
                                    stepThemes[
                                    index %
                                    stepThemes.length
                                    ];

                                return (
                                    <StepCard
                                        key={item.id}
                                        no={
                                            item.no ||
                                            index + 1
                                        }
                                        title={
                                            item.title
                                        }
                                        detail={
                                            item.description
                                        }
                                        date={
                                            item.dateText ||
                                            getStepMessage(
                                                index
                                            )
                                        }
                                        theme={theme}
                                        button={
                                            index === 1
                                        }
                                        onClick={() =>
                                            setPage(
                                                "eligibility"
                                            )
                                        }
                                    />
                                );
                            }
                        )}
                    </div>
                </section>
            )}

            <footer className="mt-12 rounded-t-[32px] bg-[#030735] p-10 text-white">
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

                        <p className="mt-2 opacity-80">
                            › ระบบ e-studentLoan
                        </p>

                        <p className="mt-2 opacity-80">
                            › กองทุนเงินให้กู้ยืมเพื่อการศึกษา
                        </p>

                        <p className="mt-2 opacity-80">
                            › ดาวน์โหลดแบบฟอร์ม
                        </p>

                        <p className="mt-2 opacity-80">
                            › คู่มือการใช้งานระบบ
                        </p>
                    </div>

                    <div>
                        <h3 className="mb-3 font-black">
                            ติดต่อหน่วยงาน
                        </h3>

                        <p className="mt-2 opacity-80">
                            อาคารกิจกรรมนักศึกษา
                        </p>

                        <p className="mt-2 opacity-80">
                            โทรศัพท์ 074-282-213
                        </p>

                        <p className="mt-2 opacity-80">
                            studentloan.psu.ac.th
                        </p>
                    </div>
                </div>
            </footer>
        </main>
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
                className={`font-black text-[#07116f] ${small
                        ? "text-sm leading-5"
                        : "text-xl"
                    }`}
            >
                {value ?? "-"}
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
            className="block w-full rounded-[28px] border border-gray-100 bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
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
    } else if (active) {
        circleClass =
            "border-2 border-blue-600 bg-blue-600 text-white";

        statusClass = "text-blue-600";
    }

    return (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
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
    theme,
    button,
    onClick,
}) {
    return (
        <article
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
        </article>
    );
}

function countRejectedDocuments(student) {
    const qualificationDocuments =
        Array.isArray(
            student?.qualificationDocuments
        )
            ? student.qualificationDocuments
            : [];

    const documents = Array.isArray(
        student?.documents
    )
        ? student.documents
        : [];

    return [
        ...qualificationDocuments,
        ...documents,
    ].filter((document) =>
        ["ต้องแก้ไข", "rejected"].includes(
            String(
                document?.status || ""
            ).toLowerCase()
        )
    ).length;
}

function getDefaultNotification(status) {
    if (
        String(status).includes(
            "ต้องแก้ไข"
        )
    ) {
        return "มีเอกสารที่ต้องแก้ไข กรุณาตรวจสอบหมายเหตุจากเจ้าหน้าที่";
    }

    if (
        String(status).includes("ผ่าน")
    ) {
        return "เอกสารผ่านการตรวจสอบแล้ว สามารถดำเนินการขั้นตอนถัดไปได้";
    }

    if (
        String(status).includes(
            "รอตรวจสอบ"
        )
    ) {
        return "เจ้าหน้าที่กำลังตรวจสอบเอกสารของคุณ";
    }

    return "กรุณาตรวจสอบข้อมูลและดำเนินการตามขั้นตอนของระบบ";
}

function getStepMessage(index) {
    const messages = [
        "กรุณาตรวจสอบข้อมูลส่วนตัวก่อนส่งคำขอกู้",
        "ผลการคัดกรองจะถูกบันทึกไว้ในคำขอกู้",
        "สามารถติดตามผลการตรวจสอบเอกสารได้ในระบบ",
        "เมื่อเอกสารผ่านครบแล้วจึงสามารถจองคิวได้",
    ];

    return messages[index] || "";
}

export default Home;