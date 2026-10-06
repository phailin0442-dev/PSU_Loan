import { useEffect, useState } from "react";
import {
  AppProvider,
  useApp,
} from "./context/AppContext";

import AppLayout from "./components/AppLayout";

import Home from "./Pages/Home";
import StudentProfiles from "./Pages/StudentProfiles";
import StudentInfo from "./Pages/studentInfo";
import Eligibility from "./Pages/Eligibility";
import UploadDocuments from "./Pages/UploadDocuments";
import Booking from "./Pages/Booking";
import Status from "./Pages/Status";

import StaffReport from "./Pages/staff/StaffReport";
import StudentList from "./Pages/staff/StudentList";
import DocumentReview from "./Pages/staff/DocumentReview";
import StaffBooking from "./Pages/staff/StaffBooking";
import StaffSettings from "./Pages/staff/Staffsettings";
import Login from "./login/Login";

function AppContent() {
  const [page, setPage] = useState("home");

  // คำขอเปลี่ยนหน้าที่รอตรวจสิทธิ์ (ดูคำอธิบายที่ goProtectedPage)
  const [navRequest, setNavRequest] = useState(null);

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
  | ตรวจสอบสิทธิ์ก่อนเข้าหน้านักศึกษา
  |--------------------------------------------------------------------------
  | เดิมเช็คสิทธิ์ทันทีตอนเรียก ทำให้ได้ค่าเก่าค้างอยู่ เช่น หน้าข้อมูลส่วนตัว
  | กด "บันทึก" แล้วสั่งไปหน้าคำขอกู้ทันที แต่ isProfileComplete ยังเป็นค่าเดิม
  | (false) จึงเด้งแจ้ง "กรุณากรอกข้อมูลส่วนบุคคลให้ครบก่อน" ต้องกดรอบสอง
  |
  | ตอนนี้แค่ "จดคำขอไว้" ก่อน แล้วค่อยเช็คใน useEffect ด้านล่าง ซึ่งรันหลัง
  | React อัปเดตข้อมูลที่เพิ่งบันทึกเสร็จแล้ว จึงได้ค่าล่าสุดเสมอ
  */

  const goProtectedPage = (targetPage) => {
    // ใส่ id กันกรณีขอหน้าเดิมซ้ำแล้ว React มองว่าค่าไม่เปลี่ยน
    setNavRequest({ targetPage, id: Date.now() + Math.random() });
  };

  useEffect(() => {
    if (!navRequest) return;

    const { targetPage } = navRequest;
    setNavRequest(null);

    // ด่านแรกสุด — ทุกหน้ายกเว้น "หน้าหลัก" กับ "เข้าสู่ระบบ" เอง
    // ต้อง login ก่อนถึงจะเข้าได้
    const publicPages = ["home", "login"];

    if (!publicPages.includes(targetPage) && !isAuthenticated) {
      alert("กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้");
      setPage("login");
      return;
    }

    // ต้องกรอกข้อมูลส่วนตัวให้ครบก่อน ถึงจะไปหน้า "คำขอกู้ยืมเงิน กยศ." ได้
    if (targetPage === "eligibility" && !isProfileComplete) {
      alert("กรุณากรอกข้อมูลส่วนบุคคลให้ครบก่อน");
      setPage("studentInfo");
      return;
    }

    // หน้าที่ต้องมีคำร้องกู้ยืมอยู่แล้วถึงจะเข้าได้ (อัปโหลด/จองคิว)
    if (
      ["uploadDocuments", "booking"].includes(targetPage) &&
      !hasOwnApplication
    ) {
      alert("กรุณายื่นคำขอกู้ยืมเงินก่อนใช้งานส่วนนี้");
      setPage("eligibility");
      return;
    }

    if (
      targetPage === "uploadDocuments" &&
      selectedStudent?.eligibilityStatus !== "PASSED" &&
      selectedStudent?.eligibilityStatus !== "NOT_REQUIRED"
    ) {
      alert("กรุณาผ่านการคัดกรองก่อน");
      setPage("eligibility");
      return;
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
      setPage("status");
      return;
    }

    setPage(targetPage);
  }, [
    navRequest,
    isAuthenticated,
    isProfileComplete,
    hasOwnApplication,
    selectedStudent,
  ]);

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
        <AppLayout setPage={goProtectedPage}>{renderPage()}</AppLayout>
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