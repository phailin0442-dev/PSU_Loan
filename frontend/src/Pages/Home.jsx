import { useEffect, useState } from "react";

function Home({ goProtectedPage }) {
    const [role, setRole] = useState("student");

    const [homeData, setHomeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadHomeData() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(
                    "http://localhost:3000/api/home"
                );

                if (!response.ok) {
                    throw new Error(
                        "ไม่สามารถโหลดข้อมูลหน้าหลักได้"
                    );
                }

                const result = await response.json();

                if (!result.success || !result.data) {
                    throw new Error(
                        "รูปแบบข้อมูลจาก Backend ไม่ถูกต้อง"
                    );
                }

                setHomeData(result.data);
            } catch (err) {
                console.error(
                    "โหลดข้อมูลหน้า Home ไม่สำเร็จ:",
                    err
                );

                setError(
                    err.message ||
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล"
                );
            } finally {
                setLoading(false);
            }
        }

        loadHomeData();
    }, []);

    const handleRoleChange = (event) => {
        const selectedRole = event.target.value;

        setRole(selectedRole);

        if (selectedRole === "staff") {
            goProtectedPage("staffDashboard");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#eef5ff] flex items-center justify-center">
                <div className="bg-white rounded-2xl px-10 py-8 shadow text-center">
                    <div className="text-5xl mb-4">⏳</div>

                    <p className="text-[#07116f] text-xl font-black">
                        กำลังโหลดข้อมูลหน้าหลัก...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#eef5ff] flex items-center justify-center px-6">
                <div className="bg-white rounded-2xl px-10 py-8 shadow text-center max-w-lg">
                    <div className="text-5xl mb-4">⚠️</div>

                    <p className="text-red-500 text-xl font-black">
                        {error}
                    </p>

                    <p className="text-gray-500 mt-3">
                        กรุณาตรวจสอบว่า Backend เปิดอยู่ที่
                        http://localhost:3000
                    </p>

                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="mt-6 bg-[#07116f] text-white px-6 py-3 rounded-xl font-bold"
                    >
                        ลองใหม่
                    </button>
                </div>
            </div>
        );
    }

    const system = homeData?.system || {};
    const banner = homeData?.banner || {};
    const featureCards = homeData?.featureCards || [];
    const homeContents = homeData?.homeContents || [];
    const notice = homeData?.notice || "";

    return (
        <div className="min-h-screen bg-[#eef5ff]">
            <main className="w-full px-6 py-6">
                <header className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-5 bg-white rounded-2xl px-8 py-5 shadow">
                    <div>
                        <h1 className="text-3xl font-black text-[#07116f]">
                            {system.title ||
                                "PSU ระบบจัดการข้อมูลผู้กู้ยืมเงิน"}
                        </h1>

                        <p className="text-sm text-gray-500">
                            {system.university ||
                                "มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตหาดใหญ่"}
                        </p>
                    </div>

                    <nav className="flex flex-wrap items-center gap-4 font-bold text-[#07116f]">
                        <button
                            type="button"
                            onClick={() =>
                                goProtectedPage("home")
                            }
                            className="transition hover:text-blue-500"
                        >
                            หน้าหลัก
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                goProtectedPage("studentInfo")
                            }
                            className="transition hover:text-blue-500"
                        >
                            คุณสมบัติ
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                goProtectedPage("uploadDocs")
                            }
                            className="transition hover:text-blue-500"
                        >
                            อัปโหลดเอกสาร
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                goProtectedPage("booking")
                            }
                            className="transition hover:text-blue-500"
                        >
                            จองคิว
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                goProtectedPage("status")
                            }
                            className="transition hover:text-blue-500"
                        >
                            ติดตามสถานะ
                        </button>

                        <div className="relative">
                            <select
                                value={role}
                                onChange={handleRoleChange}
                                aria-label="เลือกบทบาทผู้ใช้งาน"
                                className="appearance-none cursor-pointer rounded-full bg-[#07116f] py-2 pl-5 pr-11 font-semibold text-white outline-none transition hover:bg-[#101c8c] focus:ring-4 focus:ring-blue-200"
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
                </header>

                <section className="bg-[#cfeeff] rounded-3xl mt-8 p-10 shadow">
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                        <div>
                            <h2 className="text-6xl font-black text-pink-500">
                                {banner.title || "กยศ."}
                            </h2>

                            <h3 className="text-3xl font-black text-[#07116f] mt-3">
                                {banner.subtitle ||
                                    "กองทุนเงินให้กู้ยืมเพื่อการศึกษา"}
                            </h3>

                            <p className="text-[#07116f] mt-4 leading-8">
                                {banner.description ||
                                    "สนับสนุนโอกาสทางการศึกษา พร้อมระบบตรวจสอบเอกสารออนไลน์และจองคิวส่งเอกสาร"}
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    goProtectedPage(
                                        "studentInfo"
                                    )
                                }
                                className="mt-6 bg-[#07116f] text-white px-8 py-3 rounded-xl font-black transition hover:bg-[#101c8c]"
                            >
                                เริ่มใช้งานระบบ
                            </button>
                        </div>

                        <div className="bg-white rounded-3xl p-8 text-center shadow">
                            <div className="text-7xl">🎓</div>

                            <p className="mt-4 text-[#07116f] font-black text-xl">
                                Student Loan Management
                            </p>
                        </div>
                    </div>
                </section>

                <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6 mt-8">
                    {featureCards.map((item) => (
                        <FeatureCard
                            key={item.id}
                            icon={item.icon}
                            title={item.title}
                            desc={item.description}
                            button={item.buttonText}
                            link={item.link}
                        />
                    ))}
                </section>

                {notice && (
                    <section className="mt-8 bg-yellow-300 text-[#07116f] rounded-2xl px-8 py-5 font-bold shadow">
                        {notice}
                    </section>
                )}

                <section className="mt-12 space-y-8">
                    {homeContents
                        .filter((item) => item.active)
                        .map((item) => (
                            <StepCard
                                key={item.id}
                                no={item.no}
                                title={item.title}
                                detail={item.description}
                                date={item.dateText}
                                color={item.color}
                                button={item.no === 4}
                                onClick={() =>
                                    goProtectedPage(
                                        "studentInfo"
                                    )
                                }
                            />
                        ))}
                </section>

                <footer className="mt-12 bg-[#030735] text-white rounded-t-3xl p-10">
                    <h2 className="text-2xl font-black">
                        ระบบจัดการตรวจสอบเอกสารออนไลน์และจองคิว
                    </h2>

                    <p className="mt-2 opacity-80">
                        เพื่ออำนวยความสะดวกให้นักศึกษาในกระบวนการกู้ยืมเงิน
                    </p>

                    <div className="mt-8 grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-black mb-3">
                                ลิงก์ที่เกี่ยวข้อง
                            </h3>

                            <p>› ระบบ e-studentLoan</p>
                            <p>
                                › กองทุนเงินให้กู้ยืมเพื่อการศึกษา
                                (กยศ.)
                            </p>
                            <p>› ดาวน์โหลดแบบฟอร์ม</p>
                            <p>› คู่มือการใช้งานระบบ</p>
                        </div>

                        <div>
                            <h3 className="font-black mb-3">
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

function FeatureCard({
    icon,
    title,
    desc,
    button,
    link,
}) {
    const content = (
        <>
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-3xl mb-4">
                {icon}
            </div>

            <h3 className="font-black text-[#07116f] text-xl">
                {title}
            </h3>

            <p className="text-gray-500 mt-3 min-h-[48px]">
                {desc}
            </p>

            <span className="mt-5 inline-block text-[#07116f] font-black">
                {button} →
            </span>
        </>
    );

    if (!link) {
        return (
            <div className="block bg-white rounded-3xl shadow p-6 border">
                {content}
            </div>
        );
    }

    return (
        <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white rounded-3xl shadow p-6 border hover:scale-[1.02] transition cursor-pointer"
        >
            {content}
        </a>
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
            className={`bg-white border-2 ${theme.border} rounded-[32px] p-8 shadow-sm`}
        >
            <div className="flex flex-col sm:flex-row gap-6">
                <div
                    className={`w-16 h-16 rounded-full ${theme.bg} text-white flex items-center justify-center text-3xl font-black shrink-0`}
                >
                    {no}
                </div>

                <div className="flex-1">
                    <h2
                        className={`text-2xl font-black ${theme.text}`}
                    >
                        {title}
                    </h2>

                    <p className="mt-4 text-[#07116f] leading-8 font-medium">
                        {detail}
                    </p>

                    {date && (
                        <p className="mt-4 text-red-500 font-bold">
                            {date}
                        </p>
                    )}

                    {button && (
                        <button
                            type="button"
                            onClick={onClick}
                            className="mt-5 bg-[#07116f] text-white px-6 py-3 rounded-xl font-bold transition hover:bg-[#101c8c]"
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