import { useEffect, useMemo, useState } from "react";
import { requiresQualificationCheck } from "../../rules/documentRules";
import { fetchStaffStudentList } from "../../services/api";

function StudentList({ setPage, openStudentReview }) {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [searchText, setSearchText] = useState("");
    const [semesterFilter, setSemesterFilter] = useState("ทั้งหมด");
    const [borrowerFilter, setBorrowerFilter] = useState("ทั้งหมด");
    const [statusFilter, setStatusFilter] = useState("ทั้งหมด");

    /*
    |--------------------------------------------------------------------------
    | โหลดรายชื่อจาก backend จริง (GET /api/staff/students)
    |--------------------------------------------------------------------------
    | เดิมหน้านี้รับ students มาจาก context ซึ่งมีข้อมูล documents ครบแค่
    | คนที่กำลังถูกเลือกดูอยู่คนเดียว ทำให้ตัวเลข "ความครบถ้วน" ผิดสำหรับ
    | คนอื่นทั้งหมด (เห็นเป็น 0/0 หรือเพี้ยน) จึงเปลี่ยนมาดึงข้อมูลของหน้านี้
    | เองตรงๆ พร้อมตัวนับ uploadedCount/requiredCount จริงจาก backend
    |--------------------------------------------------------------------------
    */
    const loadStudents = async () => {
        setLoading(true);
        setLoadError("");

        try {
            const result = await fetchStaffStudentList();
            setStudents(result.data || []);
        } catch (error) {
            setLoadError(
                error.message || "โหลดรายชื่อนักศึกษาไม่สำเร็จ"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStudents();
    }, []);

    /*
    |--------------------------------------------------------------------------
    | ค้นหาและกรองข้อมูล (กรองฝั่ง client เพราะโหลดมาครั้งเดียวตอนเปิดหน้า)
    |--------------------------------------------------------------------------
    */

    const filteredStudents = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();

        return students.filter((student) => {
            if (!student) return false;

            const searchable = [
                student.studentId,
                student.fullName,
                student.faculty,
                student.major,
                student.borrowerType,
                student.borrowerCode,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch =
                !keyword || searchable.includes(keyword);

            const matchesSemester =
                semesterFilter === "ทั้งหมด" ||
                String(student.semester) === semesterFilter;

            const matchesBorrower =
                borrowerFilter === "ทั้งหมด" ||
                student.borrowerCode === borrowerFilter;

            const matchesStatus =
                statusFilter === "ทั้งหมด" ||
                student.status === statusFilter;

            return (
                matchesSearch &&
                matchesSemester &&
                matchesBorrower &&
                matchesStatus
            );
        });
    }, [students, searchText, semesterFilter, borrowerFilter, statusFilter]);

    const resetFilters = () => {
        setSearchText("");
        setSemesterFilter("ทั้งหมด");
        setBorrowerFilter("ทั้งหมด");
        setStatusFilter("ทั้งหมด");
    };

    const handleOpenReview = (student) => {
        if (!student) {
            alert("ไม่พบข้อมูลนักศึกษา");
            return;
        }

        if (typeof openStudentReview === "function") {
            openStudentReview(student);
            return;
        }

        setPage?.("documentReview");
    };

    return (
        <main className="min-h-screen bg-[#eef5ff] px-5 py-8 text-[#07116f] sm:px-8 lg:px-10">
            <div className="mx-auto w-full max-w-[1800px]">
                <section className="mb-7 flex items-center justify-between">
                    <div>
                        <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                            รายชื่อนักศึกษา
                        </h1>

                        <p className="mt-2 text-sm text-gray-500 sm:text-base">
                            ค้นหาและเลือกนักศึกษาเพื่อเปิดหน้าตรวจสอบข้อมูลและเอกสาร
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={loadStudents}
                        className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-50"
                    >
                        🔄 รีเฟรช
                    </button>
                </section>

                <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-xl font-black">
                                ค้นหาและกรองข้อมูล
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                ค้นหาจากชื่อ รหัสนักศึกษา คณะ หรือสาขา
                            </p>
                        </div>

                        <p className="text-sm text-gray-500">
                            นักศึกษาทั้งหมด{" "}
                            <span className="font-black text-[#07116f]">
                                {students.length}
                            </span>{" "}
                            คน
                        </p>
                    </div>

                    <div className="mt-6 grid gap-4 xl:grid-cols-12">
                        <div className="relative xl:col-span-4">
                            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                🔍
                            </span>

                            <input
                                type="text"
                                value={searchText}
                                onChange={(event) =>
                                    setSearchText(event.target.value)
                                }
                                placeholder="ชื่อ รหัส คณะ หรือสาขา"
                                className="h-12 w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            />
                        </div>

                        <select
                            value={semesterFilter}
                            onChange={(event) =>
                                setSemesterFilter(event.target.value)
                            }
                            className="h-12 rounded-xl border border-gray-200 bg-white px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 xl:col-span-2"
                        >
                            <option value="ทั้งหมด">ทุกภาคเรียน</option>
                            <option value="1">ภาคเรียนที่ 1</option>
                            <option value="2">ภาคเรียนที่ 2</option>
                        </select>

                        <select
                            value={borrowerFilter}
                            onChange={(event) =>
                                setBorrowerFilter(event.target.value)
                            }
                            className="h-12 rounded-xl border border-gray-200 bg-white px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 xl:col-span-3"
                        >
                            <option value="ทั้งหมด">ทุกประเภทผู้กู้</option>
                            <option value="NEW">ผู้กู้รายใหม่</option>
                            <option value="CONTINUING_SPECIAL">
                                ผู้กู้ต่อเนื่องกรณีพิเศษ
                            </option>
                            <option value="CONTINUING_YEAR">
                                ผู้กู้ต่อเนื่องเลื่อนชั้นปี
                            </option>
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                            className="h-12 rounded-xl border border-gray-200 bg-white px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 xl:col-span-2"
                        >
                            <option value="ทั้งหมด">ทุกสถานะ</option>
                            <option value="รอตรวจสอบ">รอตรวจสอบ</option>
                            <option value="ต้องแก้ไข">ต้องแก้ไข</option>
                            <option value="ผ่าน">ผ่านแล้ว</option>
                        </select>

                        <button
                            type="button"
                            onClick={resetFilters}
                            className="h-12 rounded-xl border border-gray-200 px-4 font-black text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 xl:col-span-1"
                        >
                            ล้าง
                        </button>
                    </div>
                </section>

                <section className="mt-7 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
                    <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div>
                            <h2 className="text-xl font-black">
                                รายการนักศึกษา
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                กดปุ่ม "ตรวจสอบ" เพื่อเปิดข้อมูลและเอกสารของนักศึกษา
                            </p>
                        </div>

                        <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
                            พบ {filteredStudents.length} รายการ
                        </div>
                    </div>

                    {loading ? (
                        <div className="px-6 py-20 text-center font-black text-gray-500">
                            กำลังโหลดข้อมูล...
                        </div>
                    ) : loadError ? (
                        <div className="px-6 py-20 text-center">
                            <p className="font-black text-red-600">
                                {loadError}
                            </p>
                            <button
                                type="button"
                                onClick={loadStudents}
                                className="mt-4 rounded-xl bg-[#07116f] px-5 py-2.5 font-black text-white"
                            >
                                ลองอีกครั้ง
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1180px] text-left">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-[#f7f9fc] text-sm text-gray-500">
                                        <th className="px-6 py-4">นักศึกษา</th>
                                        <th className="px-5 py-4 text-center">
                                            ภาคเรียน
                                        </th>
                                        <th className="px-5 py-4">ประเภทผู้กู้</th>
                                        <th className="px-5 py-4 text-center">อายุ</th>
                                        <th className="px-5 py-4 text-center">GPAX</th>
                                        <th className="px-5 py-4 text-center">
                                            จิตอาสา
                                        </th>
                                        <th className="px-5 py-4 text-center">
                                            ความครบถ้วน
                                        </th>
                                        <th className="px-5 py-4 text-center">สถานะ</th>
                                        <th className="px-5 py-4 text-center">จัดการ</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredStudents.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan="9"
                                                className="px-6 py-20 text-center"
                                            >
                                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
                                                    🔎
                                                </div>
                                                <p className="mt-4 font-black text-gray-700">
                                                    ไม่พบข้อมูลนักศึกษา
                                                </p>
                                                <p className="mt-1 text-sm text-gray-500">
                                                    ลองเปลี่ยนคำค้นหาหรือตัวกรอง
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStudents.map((student) => {
                                            const checkQualification =
                                                requiresQualificationCheck(
                                                    student?.semester
                                                );

                                            return (
                                                <tr
                                                    key={student.id}
                                                    className="border-b border-gray-100 transition hover:bg-blue-50/50"
                                                >
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-black text-blue-700">
                                                                {getStudentInitial(
                                                                    student.fullName
                                                                )}
                                                            </div>

                                                            <div>
                                                                <p className="font-black text-gray-900">
                                                                    {student.fullName ||
                                                                        "ไม่ระบุชื่อ"}
                                                                </p>
                                                                <p className="mt-1 text-sm text-gray-500">
                                                                    {student.studentId ||
                                                                        "-"}
                                                                </p>
                                                                <p className="mt-1 max-w-[280px] truncate text-xs text-gray-400">
                                                                    {[
                                                                        student.faculty,
                                                                        student.major,
                                                                    ]
                                                                        .filter(Boolean)
                                                                        .join(" • ") ||
                                                                        "-"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-5 py-5 text-center font-black">
                                                        {student.semester ?? "-"}
                                                    </td>

                                                    <td className="px-5 py-5">
                                                        <p className="max-w-[250px] font-black">
                                                            {student.borrowerType || "-"}
                                                        </p>
                                                        {student.borrowerCode && (
                                                            <p className="mt-1 text-xs text-gray-400">
                                                                {student.borrowerCode}
                                                            </p>
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-5 text-center font-black">
                                                        {student.age ?? "-"}
                                                    </td>

                                                    <td className="px-5 py-5 text-center">
                                                        {checkQualification ? (
                                                            <ValueBadge
                                                                value={
                                                                    student.gpax ?? "-"
                                                                }
                                                            />
                                                        ) : (
                                                            <NotRequiredBadge />
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-5 text-center">
                                                        {checkQualification ? (
                                                            <ValueBadge
                                                                value={`${student.volunteerHours ??
                                                                    "-"
                                                                    } ชม.`}
                                                            />
                                                        ) : (
                                                            <NotRequiredBadge />
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-5 text-center">
                                                        <CompletionBadge
                                                            uploaded={
                                                                student.uploadedCount ?? 0
                                                            }
                                                            total={
                                                                student.requiredCount ?? 0
                                                            }
                                                        />
                                                    </td>

                                                    <td className="px-5 py-5 text-center">
                                                        <StatusBadge
                                                            status={student.status}
                                                        />
                                                    </td>

                                                    <td className="px-5 py-5 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleOpenReview(student)
                                                            }
                                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#07116f] px-5 py-2.5 font-black text-white transition hover:bg-blue-800 active:scale-95"
                                                        >
                                                            <span>ตรวจสอบ</span>
                                                            <span>→</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

function getStudentInitial(fullName) {
    const name = (fullName || "")
        .replace(/^(นาย|นางสาว|นาง)/, "")
        .trim();

    return name.charAt(0) || "น";
}

function ValueBadge({ value }) {
    return (
        <span className="inline-flex min-w-[72px] justify-center rounded-full bg-blue-50 px-3 py-1.5 text-sm font-black text-blue-700">
            {value}
        </span>
    );
}

function NotRequiredBadge() {
    return (
        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-500">
            ไม่ตรวจ
        </span>
    );
}

function CompletionBadge({ uploaded, total }) {
    const isComplete = total > 0 && uploaded >= total;

    return (
        <span
            className={`inline-flex min-w-[88px] justify-center rounded-full px-3 py-1.5 text-xs font-black ${isComplete
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
        >
            {uploaded}/{total} ไฟล์
        </span>
    );
}

function StatusBadge({ status }) {
    const styles = {
        ผ่าน: "bg-green-100 text-green-700",
        ต้องแก้ไข: "bg-red-100 text-red-700",
        รอตรวจสอบ: "bg-yellow-100 text-yellow-700",
        ยกเลิก: "bg-gray-100 text-gray-500",
    };

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${styles[status] || styles["รอตรวจสอบ"]
                }`}
        >
            {status || "รอตรวจสอบ"}
        </span>
    );
}

export default StudentList;