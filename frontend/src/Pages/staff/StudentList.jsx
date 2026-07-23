import { useMemo, useState } from "react";
import {
    DOCUMENT_TYPES,
    getBorrowerTypeLabel,
    getDocumentCompletion,
    normalizeStatus,
    requiresQualificationCheck,
} from "../../rules/documentRules";

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

    /*
    |--------------------------------------------------------------------------
    | ป้องกันกรณี students ไม่ใช่ Array
    |--------------------------------------------------------------------------
    */

    const safeStudents = Array.isArray(students)
        ? students
        : [];

    /*
    |--------------------------------------------------------------------------
    | ค้นหาและกรองข้อมูล
    |--------------------------------------------------------------------------
    */

    const filteredStudents = useMemo(() => {
        const keyword = searchText
            .trim()
            .toLowerCase();

        return safeStudents.filter((student) => {
            if (!student) return false;

            const borrowerLabel =
                getBorrowerTypeLabel(
                    student.borrowerTypeCode,
                    student.borrowerType
                ) || "";

            const searchable = [
                student.studentId,
                student.studentCode,
                student.fullName,
                student.firstName,
                student.lastName,
                student.faculty,
                student.major,
                borrowerLabel,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch =
                !keyword ||
                searchable.includes(keyword);

            const matchesSemester =
                semesterFilter === "ทั้งหมด" ||
                String(student.semester) ===
                semesterFilter;

            const matchesBorrower =
                borrowerFilter === "ทั้งหมด" ||
                student.borrowerTypeCode ===
                borrowerFilter;

            const matchesStatus =
                statusFilter === "ทั้งหมด" ||
                normalizeStatus(
                    student.status
                ) === statusFilter;

            return (
                matchesSearch &&
                matchesSemester &&
                matchesBorrower &&
                matchesStatus
            );
        });
    }, [
        safeStudents,
        searchText,
        semesterFilter,
        borrowerFilter,
        statusFilter,
    ]);

    /*
    |--------------------------------------------------------------------------
    | ล้างตัวกรอง
    |--------------------------------------------------------------------------
    */

    const resetFilters = () => {
        setSearchText("");
        setSemesterFilter("ทั้งหมด");
        setBorrowerFilter("ทั้งหมด");
        setStatusFilter("ทั้งหมด");
    };

    /*
    |--------------------------------------------------------------------------
    | เปิดหน้าตรวจสอบ
    |--------------------------------------------------------------------------
    */

    const handleOpenReview = (student) => {
        if (!student) {
            alert("ไม่พบข้อมูลนักศึกษา");
            return;
        }

        if (typeof openStudentReview === "function") {
            openStudentReview(student);
            return;
        }

        /*
         * Fallback กรณียังไม่ได้ส่ง openStudentReview มาจาก App.jsx
         * จะเปิดหน้า DocumentReview ได้ แต่ไม่มีข้อมูลนักศึกษา
         */
        setPage?.("documentReview");
    };

    return (
        <main className="min-h-screen bg-[#eef5ff] px-5 py-8 text-[#07116f] sm:px-8 lg:px-10">
            <div className="mx-auto w-full max-w-[1800px]">
                {/* หัวข้อหน้า */}

                <section className="mb-7">

                    <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                        รายชื่อนักศึกษา
                    </h1>

                    <p className="mt-2 text-sm text-gray-500 sm:text-base">
                        ค้นหาและเลือกนักศึกษาเพื่อเปิดหน้าตรวจสอบข้อมูลและเอกสาร
                    </p>
                </section>

                {/* ตัวกรอง */}

                <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-xl font-black">
                                ค้นหาและกรองข้อมูล
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                ค้นหาจากชื่อ รหัสนักศึกษา
                                คณะ หรือสาขา
                            </p>
                        </div>

                        <p className="text-sm text-gray-500">
                            นักศึกษาทั้งหมด{" "}
                            <span className="font-black text-[#07116f]">
                                {safeStudents.length}
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
                                    setSearchText(
                                        event.target.value
                                    )
                                }
                                placeholder="ชื่อ รหัส คณะ หรือสาขา"
                                className="h-12 w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            />
                        </div>

                        <select
                            value={semesterFilter}
                            onChange={(event) =>
                                setSemesterFilter(
                                    event.target.value
                                )
                            }
                            className="h-12 rounded-xl border border-gray-200 bg-white px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 xl:col-span-2"
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
                            className="h-12 rounded-xl border border-gray-200 bg-white px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 xl:col-span-3"
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
                            className="h-12 rounded-xl border border-gray-200 bg-white px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 xl:col-span-2"
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
                            className="h-12 rounded-xl border border-gray-200 px-4 font-black text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 xl:col-span-1"
                        >
                            ล้าง
                        </button>
                    </div>
                </section>

                {/* ตาราง */}

                <section className="mt-7 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
                    <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div>
                            <h2 className="text-xl font-black">
                                รายการนักศึกษา
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                กดปุ่ม “ตรวจสอบ”
                                เพื่อเปิดข้อมูลและเอกสารของนักศึกษา
                            </p>
                        </div>

                        <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
                            พบ {filteredStudents.length} รายการ
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1180px] text-left">
                            <thead>
                                <tr className="border-b border-gray-100 bg-[#f7f9fc] text-sm text-gray-500">
                                    <th className="px-6 py-4">
                                        นักศึกษา
                                    </th>

                                    <th className="px-5 py-4 text-center">
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

                                    <th className="px-5 py-4 text-center">
                                        ความครบถ้วน
                                    </th>

                                    <th className="px-5 py-4 text-center">
                                        สถานะ
                                    </th>

                                    <th className="px-5 py-4 text-center">
                                        จัดการ
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredStudents.length ===
                                    0 ? (
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
                                    filteredStudents.map(
                                        (
                                            student,
                                            index
                                        ) => {
                                            const completion =
                                                getSafeCompletion(
                                                    student
                                                );

                                            const checkQualification =
                                                requiresQualificationCheck(
                                                    student?.semester
                                                );

                                            return (
                                                <tr
                                                    key={
                                                        student?.id ||
                                                        student?.studentId ||
                                                        index
                                                    }
                                                    className="border-b border-gray-100 transition hover:bg-blue-50/50"
                                                >
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-black text-blue-700">
                                                                {getStudentInitial(
                                                                    student
                                                                )}
                                                            </div>

                                                            <div>
                                                                <p className="font-black text-gray-900">
                                                                    {getStudentName(
                                                                        student
                                                                    )}
                                                                </p>

                                                                <p className="mt-1 text-sm text-gray-500">
                                                                    {student?.studentId ||
                                                                        student?.studentCode ||
                                                                        "-"}
                                                                </p>

                                                                <p className="mt-1 max-w-[280px] truncate text-xs text-gray-400">
                                                                    {[
                                                                        student?.faculty,
                                                                        student?.major,
                                                                    ]
                                                                        .filter(
                                                                            Boolean
                                                                        )
                                                                        .join(
                                                                            " • "
                                                                        ) ||
                                                                        "-"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-5 py-5 text-center font-black">
                                                        {student?.semester ??
                                                            "-"}
                                                    </td>

                                                    <td className="px-5 py-5">
                                                        <p className="max-w-[250px] font-black">
                                                            {getBorrowerTypeLabel(
                                                                student?.borrowerTypeCode,
                                                                student?.borrowerType
                                                            ) ||
                                                                "-"}
                                                        </p>

                                                        {student?.borrowerTypeCode && (
                                                            <p className="mt-1 text-xs text-gray-400">
                                                                {
                                                                    student.borrowerTypeCode
                                                                }
                                                            </p>
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-5 text-center font-black">
                                                        {student?.age ??
                                                            "-"}
                                                    </td>

                                                    <td className="px-5 py-5 text-center">
                                                        {checkQualification ? (
                                                            <ValueBadge
                                                                value={
                                                                    student?.gpax ??
                                                                    "-"
                                                                }
                                                            />
                                                        ) : (
                                                            <NotRequiredBadge />
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-5 text-center">
                                                        {checkQualification ? (
                                                            <ValueBadge
                                                                value={`${student?.volunteerHours ??
                                                                    "-"
                                                                    } ชม.`}
                                                            />
                                                        ) : (
                                                            <NotRequiredBadge />
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-5 text-center">
                                                        <CompletionBadge
                                                            completed={
                                                                completion.completed
                                                            }
                                                            total={
                                                                completion
                                                                    .required
                                                                    .length
                                                            }
                                                            missing={
                                                                completion
                                                                    .missing
                                                                    .length
                                                            }
                                                        />
                                                    </td>

                                                    <td className="px-5 py-5 text-center">
                                                        <StatusBadge
                                                            status={
                                                                student?.status
                                                            }
                                                        />
                                                    </td>

                                                    <td className="px-5 py-5 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleOpenReview(
                                                                    student
                                                                )
                                                            }
                                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#07116f] px-5 py-2.5 font-black text-white transition hover:bg-blue-800 active:scale-95"
                                                        >
                                                            <span>
                                                                ตรวจสอบ
                                                            </span>

                                                            <span>
                                                                →
                                                            </span>
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
            </div>
        </main>
    );
}

/*
|--------------------------------------------------------------------------
| ป้องกัน getDocumentCompletion โยน Error
|--------------------------------------------------------------------------
*/

function getSafeCompletion(student) {
    try {
        const completion =
            getDocumentCompletion(student);

        return {
            required: Array.isArray(
                completion?.required
            )
                ? completion.required
                : [],

            completed:
                Number(completion?.completed) ||
                0,

            missing: Array.isArray(
                completion?.missing
            )
                ? completion.missing
                : [],
        };
    } catch (error) {
        console.error(
            "ไม่สามารถคำนวณความครบถ้วนของเอกสารได้:",
            student,
            error
        );

        return {
            required: [],
            completed: 0,
            missing: [],
        };
    }
}

function getStudentName(student) {
    if (student?.fullName) {
        return student.fullName;
    }

    const fullName = [
        student?.prefix,
        student?.firstName,
        student?.lastName,
    ]
        .filter(Boolean)
        .join(" ");

    return fullName || "ไม่ระบุชื่อ";
}

function getStudentInitial(student) {
    const name = getStudentName(student)
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

function CompletionBadge({
    completed,
    total,
    missing,
}) {
    const isComplete =
        total > 0 && missing === 0;

    return (
        <span
            className={`inline-flex min-w-[88px] justify-center rounded-full px-3 py-1.5 text-xs font-black ${isComplete
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
                }`}
        >
            {completed}/{total} ไฟล์
        </span>
    );
}

function StatusBadge({ status }) {
    const value =
        normalizeStatus(status) ||
        "รอตรวจสอบ";

    const styles = {
        ผ่าน:
            "bg-green-100 text-green-700",
        ต้องแก้ไข:
            "bg-red-100 text-red-700",
        รอตรวจสอบ:
            "bg-yellow-100 text-yellow-700",
    };

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${styles[value] ||
                styles["รอตรวจสอบ"]
                }`}
        >
            {value}
        </span>
    );
}

export default StudentList;