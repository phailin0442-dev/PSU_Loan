function Home({ goProtectedPage, user, homeContents = [] }) {
    return (
        <div className="min-h-screen bg-[#eef5ff]">
            <main className="w-full px-6 py-6">
                <header className="flex justify-between items-center bg-white rounded-2xl px-8 py-5 shadow">
                    <div>
                        <h1 className="text-3xl font-black text-[#07116f]">
                            PSU ระบบจัดการข้อมูลผู้กู้ยืมเงิน
                        </h1>
                        <p className="text-sm text-gray-500">
                            มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตหาดใหญ่
                        </p>
                    </div>

                    <nav className="flex items-center gap-6 font-bold text-[#07116f]">
                        <button>หน้าหลัก</button>

                        <button onClick={() => goProtectedPage('studentInfo')}>
                            คุณสมบัติ
                        </button>

                        <button onClick={() => goProtectedPage('uploadDocs')}>
                            อัปโหลดเอกสาร
                        </button>

                        <button onClick={() => goProtectedPage('booking')}>
                            จองคิว
                        </button>

                        <button onClick={() => goProtectedPage('status')}>
                            ติดตามสถานะ
                        </button>

                        <button
                            onClick={() => goProtectedPage('studentInfo')}
                            className="bg-[#07116f] text-white px-5 py-2 rounded-full"
                        >
                            👤 {user ? user.name : 'ผู้ใช้งาน'}
                        </button>
                    </nav>
                </header>

                <section className="bg-[#cfeeff] rounded-3xl mt-8 p-10 shadow">
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                        <div>
                            <h2 className="text-6xl font-black text-pink-500">
                                กยศ.
                            </h2>

                            <h3 className="text-3xl font-black text-[#07116f] mt-3">
                                กองทุนเงินให้กู้ยืมเพื่อการศึกษา
                            </h3>

                            <p className="text-[#07116f] mt-4 leading-8">
                                สนับสนุนโอกาสทางการศึกษาให้แก่นักศึกษาที่ขาดแคลนทุนทรัพย์
                                พร้อมระบบตรวจสอบเอกสารออนไลน์และจองคิวส่งเอกสาร
                            </p>

                            <button
                                onClick={() => goProtectedPage('studentInfo')}
                                className="mt-6 bg-[#07116f] text-white px-8 py-3 rounded-xl font-black"
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

                <section className="grid md:grid-cols-4 gap-6 mt-8">
                    <FeatureCard
                        icon="✅"
                        title="หลักสูตรที่กู้ยืมได้"
                        desc="ตรวจสอบหลักสูตรและเงื่อนไขเบื้องต้น"
                        button="ดูชื่อหลักสูตร"
                        link="/files/test.pdf"
                    />

                    <FeatureCard
                        icon="📄"
                        title="เอกสารและเรื่องน่ารู้จาก กยศ."
                        desc="ดาวน์โหลดแบบฟอร์มและข้อมูลที่เกี่ยวข้อง"
                        button="ดาวน์โหลด"
                        link="/files/test.pdf"
                    />

                    <FeatureCard
                        icon="👥"
                        title="การทำจิตอาสา"
                        desc="ตรวจสอบชั่วโมงจิตอาสาก่อนยื่นกู้"
                        button="อ่านเพิ่มเติม"
                        link="/files/test.pdf"
                    />

                    <FeatureCard
                        icon="💬"
                        title="คำถามที่พบบ่อย"
                        desc="รวมคำถามและคำตอบเกี่ยวกับการกู้ยืม"
                        button="ดูคำถาม"
                        link="/files/test.pdf"
                    />
                </section>

                <section className="mt-8 bg-yellow-300 text-[#07116f] rounded-2xl px-8 py-5 font-bold shadow">
                    ผู้กู้ยืมที่มีความประสงค์จะกู้ยืมต่อในเทอม/ปีการศึกษา
                    กรุณาดำเนินการตามขั้นตอนและตรวจสอบเอกสารให้ครบถ้วน
                </section>

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
                                onClick={() => goProtectedPage('studentInfo')}
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
                            <h3 className="font-black mb-3">ลิงก์ที่เกี่ยวข้อง</h3>
                            <p>› ระบบ e-studentLoan</p>
                            <p>› กองทุนเงินให้กู้ยืมเพื่อการศึกษา (กยศ.)</p>
                            <p>› ดาวน์โหลดแบบฟอร์ม</p>
                            <p>› คู่มือการใช้งานระบบ</p>
                        </div>

                        <div>
                            <h3 className="font-black mb-3">ติดต่อหน่วยงาน</h3>
                            <p>อาคารกิจกรรมนักศึกษา</p>
                            <p>โทรศัพท์ 074-282-213</p>
                            <p>studentloan.psu.ac.th</p>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    )
}

function FeatureCard({ icon, title, desc, button, link }) {
    return (
        <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white rounded-3xl shadow p-6 border hover:scale-[1.02] transition cursor-pointer"
        >
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
        </a>
    )
}

function StepCard({ no, title, detail, date, color, button, onClick }) {
    const colors = {
        pink: {
            border: 'border-pink-400',
            text: 'text-pink-600',
            bg: 'bg-pink-600',
        },
        green: {
            border: 'border-green-500',
            text: 'text-green-600',
            bg: 'bg-green-600',
        },
        purple: {
            border: 'border-purple-500',
            text: 'text-purple-600',
            bg: 'bg-purple-600',
        },
        orange: {
            border: 'border-orange-500',
            text: 'text-orange-600',
            bg: 'bg-orange-500',
        },
    }

    const theme = colors[color] || colors.pink

    return (
        <div className={`bg-white border-2 ${theme.border} rounded-[32px] p-8 shadow-sm`}>
            <div className="flex gap-6">
                <div
                    className={`w-16 h-16 rounded-full ${theme.bg} text-white flex items-center justify-center text-3xl font-black shrink-0`}
                >
                    {no}
                </div>

                <div className="flex-1">
                    <h2 className={`text-2xl font-black ${theme.text}`}>
                        {title}
                    </h2>

                    <p className="mt-4 text-[#07116f] leading-8 font-medium">
                        {detail}
                    </p>

                    <p className="mt-4 text-red-500 font-bold">
                        {date}
                    </p>

                    {button && (
                        <button
                            onClick={onClick}
                            className="mt-5 bg-[#07116f] text-white px-6 py-3 rounded-xl font-bold"
                        >
                            ระบบคัดกรองคุณสมบัติ
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Home