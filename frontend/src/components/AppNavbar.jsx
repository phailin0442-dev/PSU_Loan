import { useApp } from "../context/AppContext";

function AppNavbar({ setPage }) {
    const {
        students,
        selectedStudentId,
        setSelectedStudentId,
        role,
        setRole,
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
            id: "staff-home",
            page: "home",
            label: "หน้าหลัก",
        },
        {
            id: "staff-dashboard",
            page: "staffDashboard",
            label: "Dashboard",
        },
        {
            id: "staff-student-list",
            page: "studentList",
            label: "ตรวจสอบ",
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
    ];

    const menus =
        role === "staff"
            ? staffMenus
            : studentMenus;

    const handleRoleChange = (event) => {
        const nextRole = event.target.value;

        setRole(nextRole);

        if (nextRole === "staff") {
            setPage("staffDashboard");
        } else {
            setPage("home");
        }
    };

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
                                ระบบคัดกรองและตรวจสอบเอกสารผู้กู้ยืมเงินเพื่อการศึกษา
                            </p>

                            <p className="mt-1 text-xs text-blue-200">
                                มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตหาดใหญ่
                            </p>
                        </div>
                    </button>

                    {/* ตัวเลือกข้อมูลตัวอย่าง */}

                    <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto">
                        <label className="rounded-2xl border border-white/30 bg-white px-5 py-4 text-left shadow-md">
                            <span className="block text-xs font-black text-gray-500">
                                นักศึกษาตัวอย่าง
                            </span>

                            <select
                                value={selectedStudentId}
                                onChange={(event) =>
                                    setSelectedStudentId(
                                        Number(event.target.value)
                                    )
                                }
                                className="mt-2 h-9 w-full min-w-0 cursor-pointer bg-transparent text-base font-black text-gray-800 outline-none sm:min-w-[270px]"
                            >
                                {students.map((student) => (
                                    <option
                                        key={student.id}
                                        value={student.id}
                                    >
                                        {student.demoLabel}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="rounded-2xl border border-white/30 bg-white px-5 py-4 text-left shadow-md">
                            <span className="block text-xs font-black text-gray-500">
                                บทบาทผู้ใช้งาน
                            </span>

                            <select
                                value={role}
                                onChange={handleRoleChange}
                                className="mt-2 h-9 w-full min-w-0 cursor-pointer bg-transparent text-base font-black text-gray-800 outline-none sm:min-w-[220px]"
                            >
                                <option value="student">
                                    นักศึกษา
                                </option>

                                <option value="staff">
                                    เจ้าหน้าที่
                                </option>
                            </select>
                        </label>
                    </div>
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