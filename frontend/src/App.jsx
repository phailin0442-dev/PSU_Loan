import { useState } from "react";
import {
  AppProvider,
  useApp,
} from "./context/AppContext";

import AppLayout from "./components/AppLayout";

import Home from "./Pages/Home";
import StudentProfiles from "./Pages/StudentProfiles";
import StudentInfo from "./Pages/StudentInfo";
import Eligibility from "./Pages/Eligibility";
import UploadDocuments from "./Pages/UploadDocuments";
import Booking from "./Pages/Booking";
import Status from "./Pages/Status";

import StaffDashboard from "./Pages/staff/StaffDashboard";
import StudentList from "./Pages/staff/StudentList";
import DocumentReview from "./Pages/staff/DocumentReview";
import StaffBooking from "./Pages/staff/StaffBooking";
import StaffReport from "./Pages/staff/StaffReport";

function AppContent() {
  const [page, setPage] = useState("home");

  // เก็บนักศึกษาที่เจ้าหน้าที่เลือกตรวจสอบ
  const [reviewStudent, setReviewStudent] =
    useState(null);

  const {
    selectedStudent,
    students,
  } = useApp();

  /*
  |--------------------------------------------------------------------------
  | ตรวจสอบสิทธิ์ก่อนเข้าหน้านักศึกษา
  |--------------------------------------------------------------------------
  */

  const goProtectedPage = (targetPage) => {
    if (
      targetPage === "eligibility" &&
      !selectedStudent?.studentInfoCompleted
    ) {
      alert(
        "กรุณากรอกข้อมูลส่วนบุคคลให้ครบก่อน"
      );

      setPage("studentInfo");
      return;
    }

    if (
      targetPage === "uploadDocuments" &&
      !selectedStudent?.eligibilityCompleted
    ) {
      alert(
        "กรุณาผ่านการคัดกรองก่อน"
      );

      setPage("eligibility");
      return;
    }

    setPage(targetPage);
  };

  /*
  |--------------------------------------------------------------------------
  | เปิดหน้าตรวจสอบเอกสารของนักศึกษา
  |--------------------------------------------------------------------------
  */

  const openStudentReview = (student) => {
    if (!student) {
      alert("ไม่พบข้อมูลนักศึกษา");
      return;
    }

    setReviewStudent(student);
    setPage("documentReview");
  };

  /*
  |--------------------------------------------------------------------------
  | บันทึกผลตรวจสอบ
  |--------------------------------------------------------------------------
  */

  const handleSaveReview = (
    updatedStudent
  ) => {
    // เก็บข้อมูลล่าสุดไว้ใน state ของหน้าตรวจสอบ
    setReviewStudent(updatedStudent);

    /*
     * ตอนเชื่อม Backend หรือมีฟังก์ชัน updateStudent
     * ใน AppContext สามารถเรียกบันทึกข้อมูลตรงนี้ได้
     */

    alert("บันทึกผลการตรวจสอบเรียบร้อย");

    setPage("studentList");
  };

  /*
  |--------------------------------------------------------------------------
  | แสดงหน้า
  |--------------------------------------------------------------------------
  */

  const renderPage = () => {
    switch (page) {
      /*
      |--------------------------------------------------------------------------
      | หน้านักศึกษา
      |--------------------------------------------------------------------------
      */

      case "home":
        return (
          <Home
            setPage={goProtectedPage}
          />
        );

      case "studentProfiles":
        return (
          <StudentProfiles
            setPage={goProtectedPage}
          />
        );

      case "studentInfo":
        return (
          <StudentInfo
            setPage={goProtectedPage}
          />
        );

      case "eligibility":
        return (
          <Eligibility
            setPage={goProtectedPage}
          />
        );

      case "uploadDocuments":
        return (
          <UploadDocuments
            setPage={goProtectedPage}
          />
        );

      case "booking":
        return (
          <Booking
            setPage={goProtectedPage}
          />
        );

      case "status":
        return (
          <Status
            setPage={goProtectedPage}
          />
        );

      /*
      |--------------------------------------------------------------------------
      | หน้าเจ้าหน้าที่
      |--------------------------------------------------------------------------
      */

      case "staffDashboard":
        return (
          <StaffDashboard
            students={students}
            setPage={setPage}
            openStudentReview={
              openStudentReview
            }
          />
        );

      case "studentList":
        return (
          <StudentList
            students={students}
            setPage={setPage}
            openStudentReview={
              openStudentReview
            }
          />
        );

      case "documentReview":
        if (!reviewStudent) {
          return (
            <main className="min-h-screen bg-[#eef5ff] px-5 py-10 sm:px-8 lg:px-10">
              <section className="mx-auto max-w-2xl rounded-3xl bg-white p-8 text-center shadow-sm">
                <div className="text-6xl">
                  📭
                </div>

                <h1 className="mt-5 text-2xl font-black text-[#07116f]">
                  ยังไม่ได้เลือกนักศึกษา
                </h1>

                <p className="mt-2 text-gray-500">
                  กรุณาเลือกนักศึกษาจากหน้ารายการก่อนเข้าตรวจสอบเอกสาร
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setPage(
                      "studentList"
                    )
                  }
                  className="mt-6 rounded-xl bg-[#07116f] px-6 py-3 font-black text-white transition hover:bg-blue-900"
                >
                  ไปหน้ารายชื่อนักศึกษา
                </button>
              </section>
            </main>
          );
        }

        return (
          <DocumentReview
            student={reviewStudent}
            setPage={setPage}
            onSave={handleSaveReview}
          />
        );

      case "staffBooking":
        return (
          <StaffBooking
            setPage={setPage}
          />
        );

      case "staffReport":
        return (
          <StaffReport
            setPage={setPage}
          />
        );

      default:
        return (
          <Home
            setPage={goProtectedPage}
          />
        );
    }
  };

  return (
    <AppLayout
      setPage={goProtectedPage}
    >
      {renderPage()}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}