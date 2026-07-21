import { useState } from "react";
import Home from "./pages/Home";
import Eligibility from "./pages/Eligibility";

function App() {
  const [page, setPage] = useState("home");

  const [user] = useState({
    name: "นักศึกษา",
    role: "student",
  });

  

  const [loanData, setLoanData] = useState(null);
  console.log("loanData:", loanData);

  const [studentData] = useState({
    fullname: "นางสาวนักศึกษา ทดสอบ",
    studentId: "6610110001",
    birthdate: "12/08/2547",
    faculty: "คณะวิทยาศาสตร์",
    major: "เทคโนโลยีสารสนเทศและการสื่อสาร",
    yearLevel: "2",
  });

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
    if (targetPage === "studentInfo") {
      setPage("eligibility");
      return;
    }

    if (targetPage === "eligibility") {
      setPage("eligibility");
      return;
    }

    alert("หน้านี้ยังไม่ได้สร้าง");
  };

  if (page === "eligibility") {
    return (
      <Eligibility
        setPage={setPage}
        setLoanData={setLoanData}
        studentData={studentData}
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