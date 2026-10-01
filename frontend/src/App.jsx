import { useState } from "react";
<<<<<<< HEAD
import {
  AppProvider,
  useApp,
} from "./context/AppContext";
=======

import Home from "./Pages/Home";

import StudentProfiles from "./Pages/StudentProfiles";
import StudentInfo from "./Pages/StudentInfo";
import Eligibility from "./Pages/Eligibility";
import StaffDashboard from "./Pages/staff/StaffDashboard";
import StudentList from "./Pages/staff/StudentList";
import DocumentReview from "./Pages/staff/DocumentReview";


>>>>>>> 48a7d434ce692b2dcfb0093176389538de32d049

import AppLayout from "./components/AppLayout";

import Home from "./Pages/Home";
import StudentProfiles from "./Pages/StudentProfiles";
import StudentInfo from "./Pages/StudentInfo";
import Eligibility from "./Pages/Eligibility";
import UploadDocuments from "./Pages/UploadDocuments";
import Booking from "./Pages/Booking";
import Status from "./Pages/Status";

import StaffReport from "./Pages/staff/StaffReport";
import StudentList from "./Pages/staff/StudentList";
import DocumentReview from "./Pages/staff/DocumentReview";
import StaffBooking from "./Pages/staff/StaffBooking";
import StaffSettings from "./Pages/staff/StaffSettings";
import Login from "./login/Login";

function AppContent() {
  const [page, setPage] = useState("home");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loanData, setLoanData] = useState(null);

  console.log("loanData:", loanData);

  // เก็บนักศึกษาที่เจ้าหน้าที่เลือกตรวจสอบ
  const [reviewStudent, setReviewStudent] =
    useState(null);

<<<<<<< HEAD
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
  */

  const goProtectedPage = (targetPage) => {
    // ด่านแรกสุด — ทุกหน้ายกเว้น "หน้าหลัก" กับ "เข้าสู่ระบบ" เอง
    // ต้อง login ก่อนถึงจะเข้าได้ (ตามที่ต้องการตั้งแต่แรก)
    const publicPages = ["home", "login"];

    if (!publicPages.includes(targetPage) && !isAuthenticated) {
      alert("กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้");
      setPage("login");
      return;
    }

    // ลำดับที่ต้องการ: login/register เสร็จ -> กรอกข้อมูลส่วนตัวให้ครบ
    // ก่อนเสมอ ถึงจะไปหน้า "คำขอกู้ยืมเงิน กยศ." (สร้างคำร้อง/คัดกรอง) ได้
    // เช็คจาก myProfile ตรงๆ (ไม่ผูกกับคำร้อง จึงใช้ได้ตั้งแต่สมัครเสร็จ)
    if (
      targetPage === "eligibility" &&
      !isProfileComplete
    ) {
      alert("กรุณากรอกข้อมูลส่วนบุคคลให้ครบก่อน");
      setPage("studentInfo");
      return;
    }

    // หน้าที่ต้องมีคำร้องกู้ยืมอยู่แล้วถึงจะเข้าได้ (อัปโหลด/สถานะ/จองคิว)
    // ถ้ายังไม่มีคำร้องเลย ให้ไปหน้าคำขอกู้ยืมก่อน (ซึ่งจะเช็คโปรไฟล์ต่อเอง
    // ถ้ายังกรอกไม่ครบ)
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
      alert(
        "กรุณาผ่านการคัดกรองก่อน"
      );

      setPage("eligibility");
      return;
    }

    // "จองคิว" ต้องรอ "เจ้าหน้าที่ตรวจเอกสารผ่านแล้ว" เท่านั้น — แค่
    // อัปโหลดครบ (documentsCompleted) ไม่พอ เพราะเอกสารอาจยัง
    // "รอตรวจสอบ" อยู่ก็ได้ ต้องเช็คสถานะคำร้องจริงจาก backend
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

      case "staffSettings":
        return <StaffSettings />;

      default:
        return (
          <Home
            setPage={goProtectedPage}
          />
        );
    }
  };
=======
  const [studentData, setStudentData] = useState({
    fullname: "นางสาวนักศึกษา ทดสอบ",
    studentId: "6610110001",
    birthdate: "12/08/2547",
    faculty: "คณะวิทยาศาสตร์",
    major: "เทคโนโลยีสารสนเทศและการสื่อสาร",
    yearLevel: "2",
  });

  const [students, setStudents] = useState([
    {
      id: 1,
      studentId: "6810110001",
      fullName: "นางสาวณัฐณิชา ศรีสุข",
      faculty: "คณะวิทยาศาสตร์",
      major: "วิทยาการคอมพิวเตอร์",
      year: 1,
      semester: 1,
      borrowerTypeCode: "NEW",
      borrowerType: "ผู้กู้รายใหม่",
      gpax: 2.85,
      volunteerHours: 12,
      age: 18,
      submittedDate: "20 กรกฎาคม 2569",
      status: "รอตรวจสอบ",
      documents: [
        {
          id: 101,
          category: "GPAX_EVIDENCE",
          name: "หลักฐานผลการเรียน GPAX",
          fileName: "gpax-6810110001.pdf",
          status: "รอตรวจสอบ",
          remark: "",
        },
        {
          id: 102,
          category: "VOLUNTEER_EVIDENCE",
          name: "หลักฐานชั่วโมงจิตอาสา",
          fileName: "volunteer-6810110001.pdf",
          status: "รอตรวจสอบ",
          remark: "",
        },
        {
          id: 103,
          category: "LOAN_CONTRACT",
          name: "สัญญากู้ยืมเงิน",
          fileName: "loan-contract-6810110001.pdf",
          status: "รอตรวจสอบ",
          remark: "",
        },
        {
          id: 104,
          category: "WITHDRAWAL_FORM",
          name: "ใบเบิกเงิน",
          fileName: "withdrawal-form-6810110001.pdf",
          status: "รอตรวจสอบ",
          remark: "",
        },
        {
          id: 105,
          category: "STUDENT_ID_CARD",
          name: "สำเนาบัตรประจำตัวประชาชนผู้กู้",
          fileName: "student-id-card-6810110001.jpg",
          status: "รอตรวจสอบ",
          remark: "",
        },
        {
          id: 106,
          category: "PARENT_PHOTO",
          name: "รูปถ่ายผู้ปกครอง",
          fileName: "parent-photo-6810110001.jpg",
          status: "รอตรวจสอบ",
          remark: "",
        },
        {
          id: 107,
          category: "PARENT_ID_CARD",
          name: "สำเนาบัตรประจำตัวประชาชนผู้ปกครอง",
          fileName: "parent-id-card-6810110001.jpg",
          status: "รอตรวจสอบ",
          remark: "",
        },
      ],
    },
    {
      id: 2,
      studentId: "6810110002",
      fullName: "นายธนภัทร ใจดี",
      faculty: "คณะวิศวกรรมศาสตร์",
      major: "วิศวกรรมคอมพิวเตอร์",
      year: 2,
      semester: 1,
      borrowerTypeCode: "CONTINUING_YEAR",
      borrowerType: "ผู้กู้ต่อเนื่องเลื่อนชั้นปี",
      gpax: 2.42,
      volunteerHours: 40,
      age: 20,
      submittedDate: "19 กรกฎาคม 2569",
      status: "ต้องแก้ไข",
      documents: [
        {
          id: 201,
          category: "GPAX_EVIDENCE",
          name: "หลักฐานผลการเรียน GPAX",
          fileName: "gpax-6810110002.pdf",
          status: "ผ่าน",
          remark: "",
        },
        {
          id: 202,
          category: "VOLUNTEER_EVIDENCE",
          name: "หลักฐานชั่วโมงจิตอาสา",
          fileName: "volunteer-6810110002.jpg",
          status: "ต้องแก้ไข",
          remark: "ภาพไม่ชัด กรุณาอัปโหลดใหม่",
        },
        {
          id: 203,
          category: "WITHDRAWAL_FORM",
          name: "ใบเบิกเงิน",
          fileName: "withdrawal-form-6810110002.pdf",
          status: "รอตรวจสอบ",
          remark: "",
        },
        {
          id: 204,
          category: "STUDENT_ID_CARD",
          name: "สำเนาบัตรประจำตัวประชาชนผู้กู้",
          fileName: "student-id-card-6810110002.jpg",
          status: "รอตรวจสอบ",
          remark: "",
        },
      ],
    },
    {
      id: 3,
      studentId: "6810110003",
      fullName: "นางสาวกมลชนก แสงทอง",
      faculty: "คณะทรัพยากรธรรมชาติ",
      major: "เกษตรศาสตร์",
      year: 3,
      semester: 2,
      borrowerTypeCode: "CONTINUING_SPECIAL",
      borrowerType: "ผู้กู้ต่อเนื่องกรณีพิเศษ",
      gpax: null,
      volunteerHours: null,
      age: 21,
      submittedDate: "18 กรกฎาคม 2569",
      status: "ผ่าน",
      documents: [
        {
          id: 301,
          category: "WITHDRAWAL_FORM",
          name: "ใบเบิกเงิน",
          fileName: "withdrawal-form-6810110003.pdf",
          status: "ผ่าน",
          remark: "",
        },
        {
          id: 302,
          category: "STUDENT_ID_CARD",
          name: "สำเนาบัตรประจำตัวประชาชนผู้กู้",
          fileName: "student-id-card-6810110003.jpg",
          status: "ผ่าน",
          remark: "",
        },
      ],
    },
  ]);

  const [homeContents] = useState([
    {
      id: 1,
      no: 1,
      title: "การเข้าร่วมกิจกรรมจิตอาสา",
      description:
        "นักศึกษาผู้กู้ยืมต้องเข้าร่วมกิจกรรมจิตอาสาและสะสมชั่วโมงตามเกณฑ์ที่กำหนด",
      dateText: "ภาคเรียนที่ 1",
      color: "pink",
      active: true,
    },
    {
      id: 2,
      no: 2,
      title: "ตรวจสอบความถูกต้องของข้อมูล",
      description:
        "ตรวจสอบข้อมูล GPAX ชั่วโมงจิตอาสา และเอกสารประกอบให้ครบถ้วนก่อนส่ง",
      dateText: "ระบบคัดกรองคุณสมบัติ",
      color: "green",
      active: true,
    },
  ]);

  const goProtectedPage = (targetPage) => {
    if (targetPage === "home") {
      setPage("home");
      return;
    }



    if (targetPage === "StudentProfiles") {
  setPage("StudentProfiles");
  return;
}

if (targetPage === "studentInfo") {
  setPage("studentInfo");
  return;
}

if (targetPage === "eligibility") {
  setPage("eligibility");
  return;
}

    if (
      targetPage === "staff" ||
      targetPage === "staffDashboard"
    ) {
      setPage("staffDashboard");
      return;
    }

    if (targetPage === "studentList") {
      setPage("studentList");
      return;
    }

    if (targetPage === "documentReview") {
    setPage("documentReview");
    return;
}

    alert(`หน้านี้ยังไม่ได้สร้าง: ${targetPage}`);
  };

  const openStudentReview = (student) => {
    setSelectedStudent(student);
    setPage("documentReview");
  };

  const saveStudentReview = (updatedStudent) => {
    setStudents((currentStudents) =>
      currentStudents.map((student) =>
        student.id === updatedStudent.id
          ? updatedStudent
          : student
      )
    );

    setSelectedStudent(updatedStudent);
    alert("บันทึกผลการตรวจสอบเรียบร้อยแล้ว");
    setPage("studentList");
  };

  if (page === "StudentProfiles") {
  return (
    <StudentProfiles
      setPage={setPage}
      goProtectedPage={goProtectedPage}
      students={students}
    />
  );
}

if (page === "studentInfo") {
  return (
    <StudentInfo
      setPage={setPage}
      goProtectedPage={goProtectedPage}
      studentData={studentData}
      setStudentData={setStudentData}
      user={user}
    />
  );
}


  if (page === "eligibility") {
    return (
      <Eligibility
        setPage={setPage}
        goProtectedPage={goProtectedPage}
        setLoanData={setLoanData}
        studentData={studentData}
      />
    );
  }
>>>>>>> 48a7d434ce692b2dcfb0093176389538de32d049

  if (page === "staffDashboard") {
    return (
      <StaffDashboard
        students={students}
        setPage={setPage}
        openStudentReview={openStudentReview}
      />
    );
  }

  if (page === "studentList") {
    return (
      <StudentList
        students={students}
        setPage={setPage}
        openStudentReview={openStudentReview}
      />
    );
  }

  if (page === "documentReview") {
    return (
      <DocumentReview
        student={selectedStudent || students[0]}
        setPage={setPage}
        onSave={saveStudentReview}
      />
    );
  }

  return (
<<<<<<< HEAD
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
=======
    <Home
      setPage={setPage}
      goProtectedPage={goProtectedPage}
      user={user}
      homeContents={homeContents}
      students={students}
    />
  );
}

export default App;
>>>>>>> 48a7d434ce692b2dcfb0093176389538de32d049
