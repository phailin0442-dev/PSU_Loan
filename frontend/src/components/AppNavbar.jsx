import { useApp } from "../context/AppContext";

function AppNavbar({ setPage }) {
    const { role, isAuthenticated, currentUser, logout } = useApp();

    const studentMenus = [
        { id: "student-home", page: "home", label: "หน้าหลัก" },
        { id: "student-profile", page: "studentProfiles", label: "ข้อมูลของฉัน" },
        { id: "student-loan-application", page: "eligibility", label: "คำขอกู้ยืมเงิน กยศ." },
        { id: "student-booking", page: "booking", label: "จองคิว" },
        { id: "student-status", page: "status", label: "ติดตามสถานะ" },
    ];

    const staffMenus = [
        { id: "staff-student-list", page: "studentList", label: "จัดการคำขอกู้ยืม" },
        { id: "staff-booking", page: "staffBooking", label: "จัดการคิว" },
        { id: "staff-report", page: "staffReport", label: "รายงาน" },
        { id: "staff-settings", page: "staffSettings", label: "ตั้งค่า" },
    ];

    const menus = role === "staff" ? staffMenus : studentMenus;

    return (
        <header className="sticky top-0 z-50 bg-gradient-to-r from-[#08156c] via-[#1033a4] to-[#1858d7] text-white shadow-md">
            <div className="mx-auto max-w-[1800px] px-5 sm:px-8 lg:px-10">
                <div className="flex min-h-[88px] items-center justify-between gap-5">
                    <button
                        type="button"
                        onClick={() => setPage("home")}
                        className="group flex min-w-0 items-center gap-3 text-left"
                        aria-label="กลับหน้าหลัก"
                    >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg font-black shadow-sm ring-1 ring-white/15 transition group-hover:bg-white/20">
                            PSU
                        </div>

                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">
                                    PSU Smart Loan
                                </h1>

                                <span className="hidden rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#0a197c] sm:inline">
                                    {role === "staff" ? "เจ้าหน้าที่" : "นักศึกษา"}
                                </span>
                            </div>

                            <p className="hidden text-xs text-blue-100 sm:block">
                                ระบบคัดกรองและจองคิวผู้กู้ยืมเงินเพื่อการศึกษา
                            </p>
                        </div>
                    </button>

                    {isAuthenticated ? (
                        <div className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-2 py-2 shadow-sm sm:gap-3 sm:px-3">
                            <span
                                className="max-w-[110px] truncate px-1 text-xs font-bold text-[#0a197c] sm:max-w-[230px] sm:text-sm"
                                title={currentUser?.fullName}
                            >
                                👤 {currentUser?.fullName}
                            </span>

                            <button
                                type="button"
                                onClick={() => {
                                    logout();
                                    setPage("home");
                                }}
                                className="rounded-lg border border-[#0a197c] px-2.5 py-1.5 text-xs font-black text-[#0a197c] transition hover:bg-blue-50"
                            >
                                ออกจากระบบ
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setPage("login")}
                            className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-black text-[#0a197c] shadow-sm transition hover:bg-blue-50 sm:px-4 sm:text-sm"
                        >
                            เข้าสู่ระบบ/ลงทะเบียน
                        </button>
                    )}
                </div>

                <nav className="border-t border-white/20" aria-label="เมนูหลัก">
                    <div className="overflow-x-auto">
                        <div className="flex min-w-max items-center gap-1 py-2 sm:justify-center">
                            {menus.map((menu) => (
                                <button
                                    key={menu.id}
                                    type="button"
                                    onClick={() => setPage(menu.page)}
                                    className="whitespace-nowrap rounded-lg px-4 py-2.5 text-base font-black text-blue-50 transition hover:bg-white/15 hover:text-white active:scale-95 sm:px-5"
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