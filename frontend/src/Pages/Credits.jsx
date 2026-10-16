// หน้าประวัติผู้จัดทำ — ข้อมูลคงที่ ไม่ต้องเรียก API
const MEMBERS = [
    { name: "นางสาวซะมีมี่ วิชิตสมร", studentId: "6610210086", role: "Frontend" },
    { name: "นางสาวไพลิน ธนาพันธ์ประเสริฐ", studentId: "6610210707", role: "Backend / Database" },
];

const ADVISOR = "อาจารย์ ปรีชา";

function Credits() {
    return (
        <main className="w-full px-4 py-6 sm:px-6 lg:px-10">
            <section className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
                {/* หัวหน้า */}
                <div className="rounded-3xl bg-gradient-to-r from-[#07116f] to-[#0646ff] p-6 text-white shadow-md lg:px-8">
                    <p className="text-sm font-bold text-blue-100">PSU Smart Loan</p>
                    <h1 className="mt-1 text-2xl font-black md:text-3xl">ประวัติผู้จัดทำ</h1>
                    <p className="mt-1.5 text-base text-blue-100">
                        ระบบคัดกรองและจองคิวผู้กู้ยืมเงินเพื่อการศึกษา
                    </p>
                </div>

                {/* รายชื่อผู้จัดทำ */}
                <div className="grid gap-4 sm:grid-cols-2">
                    {MEMBERS.map((m) => (
                        <div key={m.studentId} className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-2xl font-black text-[#07116f]">
                                {m.name.replace(/^(นาย|นางสาว|นาง)\s*/, "").charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <p className="text-lg font-black text-[#07116f]">{m.name}</p>
                                <p className="text-sm text-gray-500">รหัสนักศึกษา {m.studentId}</p>
                                <p className="mt-1 inline-block rounded-full bg-blue-50 px-3 py-0.5 text-xs font-bold text-blue-700">
                                    {m.role}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* อาจารย์ที่ปรึกษา */}
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <p className="text-sm font-bold text-gray-500">อาจารย์ที่ปรึกษา</p>
                    <p className="mt-1 text-lg font-black text-[#07116f]">{ADVISOR}</p>
                </div>
            </section>
        </main>
    );
}

export default Credits;