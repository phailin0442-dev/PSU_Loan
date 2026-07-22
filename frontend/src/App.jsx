import { useState} from "react";

import Home from "./Pages/Home";
import StudentProfiles from "./Pages/StudentProfiles";
import StudentInfo from "./Pages/StudentInfo";
import Eligibility from "./Pages/Eligibility";
import UploadDocuments from "./Pages/UploadDocuments";

import StaffDashboard from "./Pages/staff/StaffDashboard";

function App() {
  const [page, setPage] = useState("home");

  const [user] = useState({
    name: "นักศึกษา",
    role: "student",
  });

  const [loanData, setLoanData] = useState(null);

  console.log("loanData:", loanData);

  const [studentData, setStudentData] = useState({
    fullname: "นางสาวนักศึกษา ทดสอบ",
    studentId: "6610110001",
    birthdate: "12/08/2547",
    faculty: "คณะวิทยาศาสตร์",
    major: "เทคโนโลยีสารสนเทศและการสื่อสาร",
    yearLevel: "2",
  });

  const [students] = useState([
    {
      id: 1,
      studentId: "6810110001",
      fullName: "นางสาวณัฐณิชา ศรีสุข",
      faculty: "คณะวิทยาศาสตร์",
      major: "วิทยาการคอมพิวเตอร์",
      year: 1,
      borrowerType: "ผู้กู้รายใหม่",
      gpax: 2.85,
      volunteerHours: 12,
      age: 18,
      submittedDate: "20 กรกฎาคม 2569",
      status: "รอตรวจสอบ",
      documents: [
        {
          id: 101,
          name: "หลักฐานผลการเรียน GPAX",
          fileName: "gpax-6810110001.pdf",
          status: "รอตรวจสอบ",
          remark: "",
        },
        {
          id: 102,
          name: "หลักฐานชั่วโมงจิตอาสา",
          fileName: "volunteer-6810110001.pdf",
          status: "รอตรวจสอบ",
          remark: "",
        },
        {
          id: 103,
          name: "สำเนาบัตรประชาชน",
          fileName: "citizen-card-6810110001.jpg",
          status: "รอตรวจสอบ",
          remark: "",
        },
        {
          id: 104,
          name: "สัญญากู้ยืมเงิน",
          fileName: "loan-contract-6810110001.pdf",
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
      borrowerType: "ผู้กู้ต่อเนื่องเลื่อนชั้นปี",
      gpax: 2.42,
      volunteerHours: 40,
      age: 20,
      submittedDate: "19 กรกฎาคม 2569",
      status: "ต้องแก้ไข",
      documents: [
        {
          id: 201,
          name: "หลักฐานผลการเรียน GPAX",
          fileName: "gpax-6810110002.pdf",
          status: "ผ่าน",
          remark: "",
        },
        {
          id: 202,
          name: "หลักฐานชั่วโมงจิตอาสา",
          fileName: "volunteer-6810110002.jpg",
          status: "ต้องแก้ไข",
          remark: "ภาพไม่ชัด กรุณาอัปโหลดใหม่",
        },
        {
          id: 203,
          name: "ใบเบิกเงิน",
          fileName: "withdrawal-form-6810110002.pdf",
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
      borrowerType: "ผู้กู้ต่อเนื่องเลื่อนชั้นปี",
      gpax: 3.12,
      volunteerHours: 45,
      age: 21,
      submittedDate: "18 กรกฎาคม 2569",
      status: "ผ่าน",
      documents: [
        {
          id: 301,
          name: "หลักฐานผลการเรียน GPAX",
          fileName: "gpax-6810110003.pdf",
          status: "ผ่าน",
          remark: "",
        },
        {
          id: 302,
          name: "หลักฐานชั่วโมงจิตอาสา",
          fileName: "volunteer-6810110003.pdf",
          status: "ผ่าน",
          remark: "",
        },
        {
          id: 303,
          name: "ใบเบิกเงิน",
          fileName: "withdrawal-form-6810110003.pdf",
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
        "นักศึกษาผู้กู้ยืมต้องเข้าร่วมกิจกรรมจิตอาสาและสะสมชั่วโมงตามเกณฑ์ที่กำหนด โดยผู้กู้รายใหม่ต้องมีไม่น้อยกว่า 2 ชั่วโมง และผู้กู้ต่อเนื่องต้องมีไม่น้อยกว่า 36 ชั่วโมง",
      dateText:
        "ช่วงเวลาดำเนินกิจกรรม : ตั้งแต่วันที่ 1 มกราคม 2568 – 20 มีนาคม 2569",
      color: "pink",
      active: true,
    },
    {
      id: 2,
      no: 2,
      title: "ตรวจสอบความถูกต้องของข้อมูลการบันทึกจิตอาสา",
      description:
        "นักศึกษาตรวจสอบข้อมูลกิจกรรมจิตอาสาให้ถูกต้องครบถ้วน และอัปโหลดหลักฐานประกอบก่อนส่งข้อมูลเข้าสู่ระบบ",
      dateText: "ภายในวันที่ 20 มีนาคม 2569",
      color: "green",
      active: true,
    },
    {
      id: 3,
      no: 3,
      title: "ตรวจสอบผลรายงานสถานภาพการศึกษา",
      description:
        "ระบบจะตรวจสอบสถานภาพการศึกษาและรายงานข้อมูลที่เกี่ยวข้อง เพื่อใช้ประกอบการพิจารณาคุณสมบัติของผู้กู้ยืม",
      dateText: "ภายในวันที่ 15 เมษายน 2569 - 30 พฤษภาคม 2569",
      color: "purple",
      active: true,
    },
    {
      id: 4,
      no: 4,
      title: "คัดกรองคุณสมบัติ",
      description:
        "กรอกข้อมูลประเภทผู้กู้ เกรดเฉลี่ยสะสม และชั่วโมงจิตอาสา พร้อมแนบไฟล์หลักฐาน GPAX และหลักฐานชั่วโมงจิตอาสา",
      dateText: "ระบบคัดกรองคุณสมบัติ",
      color: "orange",
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
    targetPage === "uploadDocuments" ||
    targetPage === "myDocuments"
  ) {
    setPage("uploadDocuments");
    return;
  }

  if (targetPage === "booking") {
    setPage("booking");
    return;
  }

  if (targetPage === "status") {
    setPage("status");
    return;
  }

  if (targetPage === "staffDashboard") {
    setPage("staffDashboard");
    return;
  }

  alert("หน้านี้ยังไม่ได้สร้าง");
};

  const openStudentReview = () => {
    alert("ยังไม่ได้สร้างหน้า StudentList และ DocumentReview");
  };

  if (page === "StudentProfiles") {
  return (
    <StudentProfiles
      goProtectedPage={goProtectedPage}
      setPage={setPage}
    />
  );
}

if (page === "studentInfo") {
  return (
    <StudentInfo
      goProtectedPage={goProtectedPage}
      setPage={setPage}
      studentData={studentData}
      setStudentData={setStudentData}
    />
  );
}

  

  if (page === "eligibility") {
    return (
      <Eligibility
        setPage={setPage}
        setLoanData={setLoanData}
        studentData={studentData}
      />
    );
  }
  
   if (page === "uploadDocuments") {
  return (
    <UploadDocuments
      goProtectedPage={goProtectedPage}
      setPage={setPage}
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

  return (
    <Home
      goProtectedPage={goProtectedPage}
      user={user}
      homeContents={homeContents}
    />
  );
}

export default App;