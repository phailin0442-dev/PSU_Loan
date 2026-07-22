import { useMemo, useState } from "react";
import {
    DOCUMENT_TYPES,
    getBorrowerTypeLabel,
    getDocumentCompletion,
    normalizeStatus,
    requiresQualificationCheck,
} from "./documentRules";

function StudentList({
    students = [],
    setPage,
    openStudentReview,
}) {
    const [searchText, setSearchText] = useState("");
    const [semesterFilter, setSemesterFilter] =
        useState("ทั้งหมด");
    const [borrowerFilter, setBorrowerFilter] =
        useState("ทั้งหมด");
    const [statusFilter, setStatusFilter] =
        useState("ทั้งหมด");

    const filteredStudents = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();

        return students.filter((student) => {
            const searchable = [
                student.studentId,
                student.fullName,
                student.faculty,
                student.major,
                getBorrowerTypeLabel(
                    student.borrowerTypeCode,
                    student.borrowerType
                ),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return (
                (!keyword ||
                    searchable.includes(keyword)) &&
                (semesterFilter === "ทั้งหมด" ||
                    String(student.semester) ===
                    semesterFilter) &&
                (borrowerFilter === "ทั้งหมด" ||
                    student.borrowerTypeCode ===
                    borrowerFilter) &&
                (statusFilter === "ทั้งหมด" ||
                    normalizeStatus(student.status) ===
                    statusFilter)
            );
        });
    }, [
        students,
        searchText,
        semesterFilter,
        borrowerFilter,
        statusFilter,
    ]);

    const resetFilters = () => {
        setSearchText("");
        setSemesterFilter("ทั้งหมด");
        setBorrowerFilter("ทั้งหมด");
        setStatusFilter("ทั้งหมด");
    };

    return (
        <div className="min-h-screen bg-[#eef5ff] text-[#07116f]">
            <header className="sticky top-0 z-40 border-b border-gray-100 bg-white shadow-sm">
                <div className="flex min-h-20 items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
                    <div>
                        <p className="text-sm font-bold text-blue-500">
                            PSU Smart Loan
                        </p>
                        <h1 className="mt-1 text-2xl font-black">
                            รายชื่อนักศึกษา
                        </h1>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setPage?.("staffDashboard")
                        }
                        className="rounded-xl border border-[#07116f] px-4 py-2.5 font-black"
                    >
                        ← กลับ Dashboard
                    </button>
                </div>
            </header>

            <main className="px-5 py-7 sm:px-8 lg:px-10">
                <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                    <h2 className="text-xl font-black">
                        ค้นหาและกรองข้อมูล
                    </h2>

                    <div className="mt-6 grid gap-4 xl:grid-cols-12">
                        <input
                            value={searchText}
                            onChange={(event) =>
                                setSearchText(event.target.value)
                            }
                            placeholder="ชื่อ รหัส คณะ หรือสาขา"
                            className="rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 xl:col-span-4"
                        />

                        <select
                            value={semesterFilter}
                            onChange={(event) =>
                                setSemesterFilter(
                                    event.target.value
                                )
                            }
                            className="rounded-xl border border-gray-200 bg-white px-4 py-3 xl:col-span-2"
                        >
                            <option value="ทั้งหมด">
                                ทุกภาคเรียน
                            </option>
                            <option value="1">
                                ภาคเรียนที่ 1
                            </option>
                            <option value="2">
                                ภาคเรียนที่ 2
                            </option>
                        </select>

                        <select
                            value={borrowerFilter}
                            onChange={(event) =>
                                setBorrowerFilter(
                                    event.target.value
                                )
                            }
                            className="rounded-xl border border-gray-200 bg-white px-4 py-3 xl:col-span-3"
                        >
                            <option value="ทั้งหมด">
                                ทุกประเภทผู้กู้
                            </option>
                            <option value="NEW">
                                ผู้กู้รายใหม่
                            </option>
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
                                setStatusFilter(
                                    event.target.value
                                )
                            }
                            className="rounded-xl border border-gray-200 bg-white px-4 py-3 xl:col-span-2"
                        >
                            <option value="ทั้งหมด">
                                ทุกสถานะ
                            </option>
                            <option value="รอตรวจสอบ">
                                รอตรวจสอบ
                            </option>
                            <option value="ต้องแก้ไข">
                                ต้องแก้ไข
                            </option>
                            <option value="ผ่าน">
                                ผ่านแล้ว
                            </option>
                        </select>

                        <button
                            type="button"
                            onClick={resetFilters}
                            className="rounded-xl border border-gray-200 px-4 py-3 font-bold xl:col-span-1"
                        >
                            ล้าง
                        </button>
                    </div>
                </section>

                <section className="mt-7 overflow-hidden rounded-3xl bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
                        <h2 className="text-xl font-black">
                            รายการนักศึกษา
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            พบข้อมูล {filteredStudents.length} รายการ
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1400px] text-left">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50 text-sm text-gray-500">
                                    <th className="px-5 py-4">
                                        นักศึกษา
                                    </th>
                                    <th className="px-5 py-4">
                                        ภาคเรียน
                                    </th>
                                    <th className="px-5 py-4">
                                        ประเภทผู้กู้
                                    </th>
                                    <th className="px-5 py-4 text-center">
                                        อายุ
                                    </th>
                                    <th className="px-5 py-4 text-center">
                                        GPAX
                                    </th>
                                    <th className="px-5 py-4 text-center">
                                        จิตอาสา
                                    </th>
                                    <th className="px-5 py-4">
                                        เอกสารที่ต้องใช้
                                    </th>
                                    <th className="px-5 py-4 text-center">
                                        ความครบถ้วน
                                    </th>
                                    <th className="px-5 py-4">
                                        สถานะ
                                    </th>
                                    <th className="px-5 py-4 text-center">
                                        จัดการ
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="10"
                                            className="px-5 py-16 text-center text-gray-500"
                                        >
                                            ไม่พบข้อมูลนักศึกษา
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map(
                                        (student) => {
                                            const completion =
                                                getDocumentCompletion(
                                                    student
                                                );
                                            const checkQualification =
                                                requiresQualificationCheck(
                                                    student.semester
                                                );

                                            return (
                                                <tr
                                                    key={student.id}
                                                    className="border-b border-gray-100 hover:bg-blue-50/40"
                                                >
                                                    <td className="px-5 py-5">
                                                        <p className="font-black">
                                                            {student.fullName}
                                                        </p>
                                                        <p className="mt-1 text-sm text-gray-500">
                                                            {student.studentId}
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-400">
                                                            {student.faculty} ·{" "}
                                                            {student.major}
                                                        </p>
                                                    </td>

                                                    <td className="px-5 py-5 font-black">
                                                        {student.semester}
                                                    </td>

                                                    <td className="px-5 py-5">
                                                        <p className="font-black">
                                                            {getBorrowerTypeLabel(
                                                                student.borrowerTypeCode,
                                                                student.borrowerType
                                                            )}
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-400">
                                                            {
                                                                student.borrowerTypeCode
                                                            }
                                                        </p>
                                                    </td>

                                                    <td className="px-5 py-5 text-center font-black">
                                                        {student.age}
                                                    </td>

                                                    <td className="px-5 py-5 text-center font-black">
                                                        {checkQualification
                                                            ? student.gpax ?? "-"
                                                            : "ไม่ตรวจ"}
                                                    </td>

                                                    <td className="px-5 py-5 text-center font-black">
                                                        {checkQualification
                                                            ? `${student.volunteerHours ??
                                                            "-"
                                                            } ชม.`
                                                            : "ไม่ตรวจ"}
                                                    </td>

                                                    <td className="px-5 py-5">
                                                        <div className="flex flex-wrap gap-2">
                                                            {completion.required.map(
                                                                (category) => (
                                                                    <span
                                                                        key={category}
                                                                        className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700"
                                                                    >
                                                                        {
                                                                            DOCUMENT_TYPES[
                                                                            category
                                                                            ]
                                                                        }
                                                                    </span>
                                                                )
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="px-5 py-5 text-center">
                                                        <span
                                                            className={`rounded-full px-3 py-1.5 text-xs font-black ${completion.missing
                                                                .length === 0
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-red-100 text-red-700"
                                                                }`}
                                                        >
                                                            {
                                                                completion.completed
                                                            }
                                                            /
                                                            {
                                                                completion.required
                                                                    .length
                                                            }{" "}
                                                            ไฟล์
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-5">
                                                        <StatusBadge
                                                            status={
                                                                student.status
                                                            }
                                                        />
                                                    </td>

                                                    <td className="px-5 py-5 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openStudentReview?.(
                                                                    student
                                                                )
                                                            }
                                                            className="rounded-xl bg-[#07116f] px-5 py-2.5 font-black text-white"
                                                        >
                                                            ตรวจสอบ
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
}

function StatusBadge({ status }) {
    const value = normalizeStatus(status);

    const styles = {
        ผ่าน: "bg-green-100 text-green-700",
        ต้องแก้ไข: "bg-red-100 text-red-700",
        รอตรวจสอบ:
            "bg-yellow-100 text-yellow-700",
    };

    return (
        <span
            className={`rounded-full px-3 py-1.5 text-xs font-black ${styles[value]}`}
        >
            {value}
        </span>
    );
}

export default StudentList;
