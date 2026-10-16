import { useEffect, useRef, useState } from "react";
import {
  AppProvider,
  useApp,
} from "./context/AppContext";

import AppLayout from "./components/AppLayout";

import Booking from "./Pages/Booking";
import Eligibility from "./Pages/Eligibility";
import Home from "./Pages/Home";
import Status from "./Pages/Status";
import StudentProfiles from "./Pages/StudentProfiles";
import UploadDocuments from "./Pages/UploadDocuments";
import StudentInfo from "./Pages/studentInfo";
import Credits from "./Pages/Credits";

import DocumentReview from "./Pages/staff/DocumentReview";
import StaffBooking from "./Pages/staff/StaffBooking";
import StaffReport from "./Pages/staff/StaffReport";
import StaffSettings from "./Pages/staff/Staffsettings";
import StudentList from "./Pages/staff/StudentList";
import Login from "./login/Login";


function AppContent() {
  const [page, setPage] = useState("home");

  // เก็บนักศึกษาที่เจ้าหน้าที่เลือกตรวจสอบ
  const [reviewStudent, setReviewStudent] =
    useState(null);

  const {
    selectedStudent,
    students,
    isAuthenticated,
    hasOwnApplication,
    isProfileComplete,
  } = useApp();

  /*
  |--------------------------------------------------------------------------
  | เก็บค่าล่าสุดไว้ใน ref
  |--------------------------------------------------------------------------
  | ใช้ตอนเช็คสิทธิ์ เพื่อให้ได้ค่าล่าสุดเสมอ ไม่ใช่ค่าเก่าที่ค้างอยู่ใน closure
  | (เช่น หน้าข้อมูลส่วนตัวกด "บันทึก" แล้วไปหน้าคำขอกู้ทันที)
  | เขียน ref ใน useEffect (ไม่ได้เขียนระหว่าง render) และไม่มี setState ใน effect
  */

  const latest = useRef({});

  useEffect(() => {
    latest.current = {
      selectedStudent,
      isAuthenticated,
      hasOwnApplication,
      isProfileComplete,
    };
  });

  /*
  |--------------------------------------------------------------------------
  | ตรวจสอบสิทธิ์ก่อนเข้าหน้านักศึกษา
  |--------------------------------------------------------------------------
  | คืนชื่อหน้าที่ควรไปจริง (อาจถูกเปลี่ยนเส้นทางถ้าไม่ผ่านเงื่อนไข)
  */

  const resolvePage = (targetPage) => {
    const {
      selectedStudent,
      isAuthenticated,
      hasOwnApplication,
      isProfileComplete,
    } = latest.current;

    // ด่านแรกสุด — ทุกหน้ายกเว้น "หน้าหลัก" กับ "เข้าสู่ระบบ" เอง
    // ต้อง login ก่อนถึงจะเข้าได้
    const publicPages = ["home", "login", "credits"];

    if (!publicPages.includes(targetPage) && !isAuthenticated) {
      alert("กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้");
      return "login";
    }

    // ต้องกรอกข้อมูลส่วนตัวให้ครบก่อน ถึงจะไปหน้า "คำขอกู้ยืมเงิน กยศ." ได้
    if (targetPage === "eligibility" && !isProfileComplete) {
      alert("กรุณากรอกข้อมูลส่วนบุคคลให้ครบก่อน");
      return "studentInfo";
    }

    // หน้าที่ต้องมีคำร้องกู้ยืมอยู่แล้วถึงจะเข้าได้ (อัปโหลด/จองคิว)
    if (
      ["uploadDocuments", "booking"].includes(targetPage) &&
      !hasOwnApplication
    ) {
      alert("กรุณายื่นคำขอกู้ยืมเงินก่อนใช้งานส่วนนี้");
      return "eligibility";
    }

    if (
      targetPage === "uploadDocuments" &&
      selectedStudent?.eligibilityStatus !== "PASSED" &&
      selectedStudent?.eligibilityStatus !== "NOT_REQUIRED"
    ) {
      alert("กรุณาผ่านการคัดกรองก่อน");
      return "eligibility";
    }

    // "จองคิว" ต้องรอ "เจ้าหน้าที่ตรวจเอกสารผ่านแล้ว" เท่านั้น
    const approvedStatuses = [
      "DOCUMENT_APPROVED",
      "QUEUE_BOOKED",
      "SIGNED",
      "CENTRAL_SUBMITTED",
      "COMPLETED",
    ];

    const isApprovedForBooking = approvedStatuses.includes(
      selectedStudent?.applicationStatusCode
    );

    if (targetPage === "booking" && !isApprovedForBooking) {
      alert(
        "ต้องรอผลการตรวจสอบเอกสารว่า \"ผ่าน\" ก่อน ถึงจะจองคิวได้"
      );
      return "status";
    }

    return targetPage;
  };

  const goProtectedPage = (targetPage) => {
    // รอ 1 tick ให้ state ที่เพิ่งบันทึกอัปเดตเสร็จก่อนค่อยเช็ค
    setTimeout(() => setPage(resolvePage(targetPage)), 0);
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

  const handleSaveReview = (updatedStudent) => {
    setReviewStudent(updatedStudent);
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
      /* ---------- หน้านักศึกษา ---------- */

      case "home":
        return <Home setPage={goProtectedPage} />;

      case "studentProfiles":
        return <StudentProfiles setPage={goProtectedPage} />;

      case "studentInfo":
        return <StudentInfo setPage={goProtectedPage} />;

      case "eligibility":
        return <Eligibility setPage={goProtectedPage} />;

      case "uploadDocuments":
        return <UploadDocuments setPage={goProtectedPage} />;

      case "booking":
        return <Booking setPage={goProtectedPage} />;

      case "status":
        return <Status setPage={goProtectedPage} />;

      case "credits":
        return <Credits setPage={goProtectedPage} />;

      /* ---------- หน้าเจ้าหน้าที่ ---------- */

      case "studentList":
        return (
          <StudentList
            students={students}
            setPage={setPage}
            openStudentReview={openStudentReview}
          />
        );

      case "documentReview":
        if (!reviewStudent) {
          return (
            <main className="min-h-screen bg-[#eef5ff] px-5 py-10 sm:px-8 lg:px-10">
              <section className="mx-auto max-w-2xl rounded-3xl bg-white p-8 text-center shadow-sm">
                <div className="text-6xl">📭</div>

                <h1 className="mt-5 text-2xl font-black text-[#07116f]">
                  ยังไม่ได้เลือกนักศึกษา
                </h1>

                <p className="mt-2 text-gray-500">
                  กรุณาเลือกนักศึกษาจากหน้ารายการก่อนเข้าตรวจสอบเอกสาร
                </p>

                <button
                  type="button"
                  onClick={() => setPage("studentList")}
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
        return <StaffBooking setPage={setPage} />;

      case "staffReport":
        return <StaffReport setPage={setPage} />;

      case "staffSettings":
        return <StaffSettings />;

      default:
        return <Home setPage={goProtectedPage} />;
    }
  };

  return (
    <>
      {page === "login" ? (
        <Login setPage={setPage} />
      ) : (
        <AppLayout page={page} setPage={goProtectedPage}>
          {renderPage()}
        </AppLayout>
      )}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}