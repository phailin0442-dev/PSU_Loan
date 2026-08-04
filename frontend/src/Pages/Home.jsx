import { useEffect, useState } from "react";
import { fetchHomeContent } from "../services/api";

// หน้าประชาสัมพันธ์ — ไม่ผูกกับนักศึกษาที่เลือกอยู่เลย ตั้งใจให้เข้าดูได้
// โดยไม่ต้อง login (ตามที่ต้องการ) เนื้อหาทั้งหมดดึงจาก GET /api/home จริง
// (ก่อนหน้านี้ Home.jsx ใช้ mockHomeContents เฉยๆ ไม่เคยต่อ backend เลย)
const stepThemes = [
    { border: "border-pink-400", text: "text-pink-600", bg: "bg-pink-500" },
    { border: "border-green-500", text: "text-green-600", bg: "bg-green-600" },
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

function Home({ setPage }) {
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadContent() {
            setLoading(true);
            setLoadError("");

            try {
                const result = await fetchHomeContent();
                if (!cancelled) setContent(result.data);
            } catch (error) {
                if (!cancelled) {
                    setLoadError(
                        error.message || "โหลดข้อมูลหน้าแรกไม่สำเร็จ"
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadContent();

        return () => {
            cancelled = true;
        };
    }, []);

    const banner = content?.banner;
    const featureCards = content?.featureCards || [];
    const homeContents = content?.homeContents || [];

    return (
        <main className="w-full px-6 py-8 lg:px-12">
            {/* Hero ประชาสัมพันธ์ */}
            <section className="overflow-hidden rounded-[32px] bg-[#cfeeff] shadow-sm">
                <div className="flex flex-col items-start gap-6 p-8 lg:p-12">
                    <span className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-[#07116f] shadow-sm">
                        ระบบบริการนักศึกษาผู้กู้ยืมเงิน
                    </span>

                    <div>
                        <h1 className="text-5xl font-black text-pink-500 md:text-6xl">
                            {banner?.title || "กยศ."}
                        </h1>

                        <h2 className="mt-3 text-2xl font-black text-[#07116f] md:text-3xl">
                            {banner?.subtitle || "กองทุนเงินให้กู้ยืมเพื่อการศึกษา"}
                        </h2>

                        <p className="mt-4 max-w-2xl leading-8 text-[#07116f]">
                            {banner?.description ||
                                "ระบบคัดกรองคุณสมบัติ ตรวจสอบเอกสารออนไลน์ ติดตามสถานะ และจองคิว สำหรับนักศึกษาผู้กู้ยืมเงิน"}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => setPage("eligibility")}
                            className="rounded-xl bg-[#07116f] px-7 py-3 font-black text-white transition hover:bg-[#101c8c]"
                        >
                            ยื่นคำขอกู้ยืมเงิน กยศ. →
                        </button>

                        <button
                            type="button"
                            onClick={() => setPage("status")}
                            className="rounded-xl border-2 border-[#07116f] bg-white px-7 py-3 font-black text-[#07116f] transition hover:bg-blue-50"
                        >
                            ติดตามสถานะคำขอ
                        </button>
                    </div>
                </div>
            </section>

            {/* ประกาศ */}
            {content?.notice && (
                <section className="mt-7 flex items-start gap-4 rounded-2xl bg-yellow-300 px-7 py-5 font-bold text-[#07116f] shadow-sm">
                    <span className="text-2xl">📢</span>
                    <p>{content.notice}</p>
                </section>
            )}

            {loading && (
                <p className="mt-8 text-center text-sm font-bold text-gray-400">
                    กำลังโหลดข้อมูล...
                </p>
            )}

            {loadError && (
                <p className="mt-8 text-center text-sm font-bold text-red-500">
                    {loadError}
                </p>
            )}

            {/* การ์ดข้อมูลทั่วไป (ไม่ผูกกับนักศึกษาคนไหนทั้งสิ้น) */}
            {featureCards.length > 0 && (
                <section className="mt-10">
                    <div className="mb-6">
                        <h2 className="text-2xl font-black text-[#07116f] md:text-3xl">
                            ข้อมูลสำหรับผู้กู้ยืม
                        </h2>
                        <p className="mt-2 text-gray-500">
                            สิ่งที่ควรรู้ก่อนเริ่มยื่นคำขอกู้ยืมเงิน
                        </p>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                        {featureCards.map((item) => (
                            <FeatureCard
                                key={item.id}
                                icon={item.icon}
                                title={item.title}
                                desc={item.description}
                                button={item.buttonText}
                                href={item.link}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* ขั้นตอนการดำเนินการ */}
            {homeContents.length > 0 && (
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
                        {homeContents.map((item, index) => {
                            const theme = stepThemes[index % stepThemes.length];

                            return (
                                <StepCard
                                    key={item.id}
                                    no={item.no || index + 1}
                                    title={item.title}
                                    detail={item.description}
                                    date={item.dateText}
                                    theme={theme}
                                    button={index === 1}
                                    onClick={() => setPage("eligibility")}
                                />
                            );
                        })}
                    </div>
                </section>
            )}

            <footer className="mt-12 rounded-t-[32px] bg-[#030735] p-10 text-white">
                <h2 className="text-2xl font-black">PSU Smart Loan</h2>

                <p className="mt-2 opacity-80">
                    ระบบคัดกรองคุณสมบัติ ตรวจสอบเอกสาร และจองคิวสำหรับนักศึกษาผู้กู้ยืมเงิน
                </p>

                <div className="mt-8 grid gap-8 md:grid-cols-2">
                    <div>
                        <h3 className="mb-3 font-black">ลิงก์ที่เกี่ยวข้อง</h3>
                        <p className="mt-2 opacity-80">› ระบบ e-studentLoan</p>
                        <p className="mt-2 opacity-80">
                            › กองทุนเงินให้กู้ยืมเพื่อการศึกษา
                        </p>
                        <p className="mt-2 opacity-80">› ดาวน์โหลดแบบฟอร์ม</p>
                        <p className="mt-2 opacity-80">› คู่มือการใช้งานระบบ</p>
                    </div>

                    <div>
                        <h3 className="mb-3 font-black">ติดต่อหน่วยงาน</h3>
                        <p className="mt-2 opacity-80">อาคารกิจกรรมนักศึกษา</p>
                        <p className="mt-2 opacity-80">โทรศัพท์ 074-282-213</p>
                        <p className="mt-2 opacity-80">studentloan.psu.ac.th</p>
                    </div>
                </div>
            </footer>
        </main>
    );
}

function FeatureCard({ icon, title, desc, button, href }) {
    return (
        <a
            href={href || "#"}
            target={href ? "_blank" : undefined}
            rel={href ? "noreferrer" : undefined}
            className="block w-full rounded-[28px] border border-gray-100 bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
        >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">
                {icon}
            </div>

            <h3 className="text-xl font-black text-[#07116f]">{title}</h3>

            <p className="mt-3 min-h-[72px] leading-6 text-gray-500">{desc}</p>

            <span className="mt-5 inline-block font-black text-[#07116f]">
                {button} →
            </span>
        </a>
    );
}

function StepCard({ no, title, detail, date, theme, button, onClick }) {
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
                    <h2 className={`text-2xl font-black ${theme.text}`}>{title}</h2>

                    <p className="mt-4 font-medium leading-8 text-[#07116f]">
                        {detail}
                    </p>

                    {date && (
                        <p className="mt-4 font-bold text-red-500">{date}</p>
                    )}

                    {button && (
                        <button
                            type="button"
                            onClick={onClick}
                            className="mt-5 rounded-xl bg-[#07116f] px-6 py-3 font-bold text-white transition hover:bg-[#101c8c]"
                        >
                            ยื่นคำขอกู้ยืมเงิน กยศ.
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}

export default Home;