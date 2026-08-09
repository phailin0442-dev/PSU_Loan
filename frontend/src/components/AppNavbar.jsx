import { useApp } from "../context/AppContext";

function AppNavbar({ setPage }) {
    const {
        role,
        isAuthenticated,
        currentUser,
        logout,
    } = useApp();

    const studentMenus = [
        {
            id: "student-home",
            page: "home",
            label: "หน้าหลัก",
        },
        {
            id: "student-profile",
            page: "studentProfiles",
            label: "ข้อมูลของฉัน",
        },
        {
            id: "student-loan-application",
            page: "eligibility",
            label: "คำขอกู้ยืมเงิน กยศ.",
        },
        {
            id: "student-booking",
            page: "booking",
            label: "จองคิว",
        },
        {
            id: "student-status",
            page: "status",
            label: "ติดตามสถานะ",
        },
    ];

    const staffMenus = [
        {
            id: "staff-student-list",
            page: "studentList",
            label: "จัดการคำขอกู้ยืมเงิน กยศ.",
        },
        {
            id: "staff-booking",
            page: "staffBooking",
            label: "จัดการคิว",
        },
        {
            id: "staff-report",
            page: "staffReport",
            label: "รายงาน",
        },
        {
            id: "staff-settings",
            page: "staffSettings",
            label: "ตั้งค่า",
        },
    ];

    const menus =
        role === "staff"
            ? staffMenus
            : studentMenus;

    return (
        <header className="sticky top-0 z-50 bg-gradient-to-r from-[#0a197c] via-[#1033a4] to-[#1858d7] text-white shadow-lg">
            <div className="mx-auto max-w-[1800px] px-5 sm:px-8 lg:px-10">
                {/* ส่วนบน */}

                <div className="flex flex-col gap-6 py-5 xl:flex-row xl:items-center xl:justify-between">
                    {/* ชื่อระบบ */}

                    <button
                        type="button"
                        onClick={() => setPage("home")}
                        className="group flex items-center gap-4 text-left"
                    >
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#08156c] text-2xl font-black text-white shadow-lg transition duration-200 group-hover:-translate-y-0.5">
                            PSU
                        </div>

                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                                    PSU Smart Loan
                                </h1>

                                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#0a197c] shadow-sm">
                                    {role === "staff"
                                        ? "เจ้าหน้าที่"
                                        : "นักศึกษา"}
                                </span>
                            </div>

                            <p className="mt-1 text-sm font-medium text-blue-100">
                                ระบบคัดกรองพร้อมจองคิวผู้กู้ยืมเงินเพื่อการศึกษา
                            </p>

                            <p className="mt-1 text-xs text-blue-200">
                                มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตหาดใหญ่
                            </p>
                        </div>
                    </button>

                    {isAuthenticated ? (
                        <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-3 shadow-md xl:w-auto">
                            <span className="text-sm font-black text-[#0a197c]">
                                👤 {currentUser?.fullName}
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    logout();
                                    setPage("home");
                                }}
                                className="rounded-xl border border-[#0a197c] px-3 py-1.5 text-xs font-black text-[#0a197c] transition hover:bg-blue-50"
                            >
                                ออกจากระบบ
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setPage("login")}
                            className="flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-black text-[#0a197c] shadow-md transition hover:-translate-y-0.5 hover:shadow-lg xl:w-auto"
                        >
                            เข้าสู่ระบบ / สมัครสมาชิก
                        </button>
                    )}
                </div>

                {/* เมนูตรงกลาง */}

                <nav className="border-t border-white/30">
                    <div className="flex min-h-[74px] items-center justify-center overflow-x-auto">
                        <div className="flex min-w-max items-center justify-center gap-2 px-2 py-3">
                            {menus.map((menu) => (
                                <button
                                    key={menu.id}
                                    type="button"
                                    onClick={() =>
                                        setPage(menu.page)
                                    }
                                    className="whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-black text-white transition duration-200 hover:bg-white/20 active:scale-95 sm:text-base"
                                >
                                    {menu.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </nav>
            </div>
        </header>
    );
}

export default AppNavbar;