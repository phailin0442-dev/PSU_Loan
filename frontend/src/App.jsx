import { useState } from "react";

import Home from "./Pages/Home";
import Eligibility from "./Pages/Eligibility";
import StaffDashboard from "./Pages/staff/StaffDashboard";
import StudentList from "./Pages/staff/StudentList";
import DocumentReview from "./Pages/staff/DocumentReview";

function App() {
  const [page, setPage] = useState("home");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loanData, setLoanData] = useState(null);

  const [user] = useState({
    name: "นักศึกษา",
    role: "student",
  });

  const [studentData] = useState({
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

    if (
      targetPage === "studentInfo" ||
      targetPage === "studentDashboard" ||
      targetPage === "eligibility"
    ) {
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
      setPage("studentList");
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
