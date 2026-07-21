import { useNavigate } from "react-router-dom";
import Home from "./pages/Home";

export default function App() {
  const navigate = useNavigate();

  const user = {
    name: "นักศึกษา",
  };

  const homeContents = [
    {
      id: 1,
      no: 1,
      title: "ตรวจสอบคุณสมบัติเบื้องต้น",
      description:
        "ตรวจสอบผลการเรียนและชั่วโมงจิตอาสาก่อนยื่นเอกสารกู้ยืมเงินเพื่อการศึกษา",
      dateText: "กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนดำเนินการ",
      color: "pink",
      active: true,
    },
    {
      id: 2,
      no: 2,
      title: "จัดเตรียมเอกสาร",
      description:
        "จัดเตรียมเอกสารตามประเภทของผู้กู้ และตรวจสอบความชัดเจนของไฟล์ก่อนอัปโหลด",
      dateText: "รองรับไฟล์ PDF, JPG, JPEG และ PNG",
      color: "green",
      active: true,
    },
    {
      id: 3,
      no: 3,
      title: "อัปโหลดเอกสาร",
      description:
        "ส่งเอกสารผ่านระบบออนไลน์และติดตามผลการตรวจสอบจากเจ้าหน้าที่",
      dateText: "หากเอกสารไม่ถูกต้อง เจ้าหน้าที่จะส่งกลับให้แก้ไข",
      color: "purple",
      active: true,
    },
    {
      id: 4,
      no: 4,
      title: "จองคิวลงนามเอกสาร",
      description:
        "เมื่อเอกสารผ่านการตรวจสอบแล้ว นักศึกษาสามารถเลือกวันและเวลาสำหรับเข้ารับบริการ",
      dateText: "สามารถจองคิวได้หลังเอกสารผ่านครบทุกฉบับ",
      color: "orange",
      active: true,
    },
  ];

  function goProtectedPage(page) {
    const routes = {
      studentInfo: "/student-info",
      uploadDocs: "/upload-docs",
      booking: "/booking",
      status: "/status",
    };

    const destination = routes[page];

    if (destination) {
      navigate(destination);
    }
  }

  return (
    <Home
      goProtectedPage={goProtectedPage}
      user={user}
      homeContents={homeContents}
    />
  );
}