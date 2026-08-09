const express = require("express");
const pool = require("../config/db");

const router = express.Router();

const homeContents = [
    {
        id: 1,
        no: 1,
        title: "ตรวจสอบประกาศและกำหนดการ",
        description:
            "นักศึกษาควรตรวจสอบช่วงเวลาการยื่นกู้และกำหนดส่งเอกสารของแต่ละภาคการศึกษาให้เรียบร้อย",
        dateText: "กรุณาดำเนินการภายในระยะเวลาที่มหาวิทยาลัยกำหนด",
        color: "pink",
        active: true,
    },
    {
        id: 2,
        no: 2,
        title: "เตรียมข้อมูลสำหรับตรวจสอบคุณสมบัติ",
        description:
            "เตรียมข้อมูลส่วนตัว เกรดเฉลี่ยสะสม และจำนวนชั่วโมงจิตอาสาเพื่อใช้ในการคัดกรองเบื้องต้น",
        dateText: "ภาคการศึกษาที่ 1 ใช้ GPAX และชั่วโมงจิตอาสาในการพิจารณา",
        color: "green",
        active: true,
    },
    {
        id: 3,
        no: 3,
        title: "เตรียมเอกสารตามประเภทผู้กู้",
        description:
            "รายการเอกสารจะแตกต่างกันตามประเภทผู้กู้ ภาคการศึกษา และอายุของนักศึกษา",
        dateText: "นักศึกษาอายุต่ำกว่า 20 ปี ต้องแนบเอกสารของผู้ปกครองเพิ่มเติม",
        color: "purple",
        active: true,
    },
    {
        id: 4,
        no: 4,
        title: "เริ่มตรวจสอบคุณสมบัติ",
        description:
            "กรอกข้อมูลนักศึกษาและส่งข้อมูลเข้าสู่ระบบเพื่อให้ระบบตรวจสอบคุณสมบัติเบื้องต้น",
        dateText: "เมื่อผ่านการคัดกรองแล้ว จึงดำเนินการอัปโหลดเอกสาร",
        color: "orange",
        active: true,
    },
];

const featureCards = [
    {
        id: 1,
        icon: "✅",
        title: "หลักสูตรที่กู้ยืมได้",
        description: "ตรวจสอบหลักสูตรและเงื่อนไขเบื้องต้น",
        buttonText: "ดูชื่อหลักสูตร",
        link: "/files/test.pdf",
    },
    {
        id: 2,
        icon: "📄",
        title: "เอกสารและเรื่องน่ารู้จาก กยศ.",
        description: "ดาวน์โหลดแบบฟอร์มและข้อมูลที่เกี่ยวข้อง",
        buttonText: "ดาวน์โหลด",
        link: "/files/test.pdf",
    },
    {
        id: 3,
        icon: "👥",
        title: "การทำจิตอาสา",
        description: "ตรวจสอบชั่วโมงจิตอาสาก่อนยื่นกู้",
        buttonText: "อ่านเพิ่มเติม",
        link: "/files/test.pdf",
    },
    {
        id: 4,
        icon: "💬",
        title: "คำถามที่พบบ่อย",
        description: "รวมคำถามและคำตอบเกี่ยวกับการกู้ยืม",
        buttonText: "ดูคำถาม",
        link: "/files/test.pdf",
    },
];

/*
|--------------------------------------------------------------------------
| เนื้อหาหน้าประชาสัมพันธ์ (public, ไม่ต้อง login)
|--------------------------------------------------------------------------
| GET /api/home
|--------------------------------------------------------------------------
| banner/notice ดึงจากตาราง home_content จริง (เจ้าหน้าที่แก้ได้ผ่าน
| PUT /api/staff/home-content) ส่วน featureCards/homeContents (ขั้นตอน)
| ยังเป็น static ในไฟล์นี้ก่อน — ยังไม่ทำหน้าแก้ไขสองส่วนนี้จากฐานข้อมูล
|--------------------------------------------------------------------------
*/
router.get("/", async (req, res) => {
    try {
        const contentResult = await pool.query(
            `SELECT banner_title, banner_subtitle, banner_description, notice
             FROM psu_loan.home_content
             ORDER BY content_id DESC
             LIMIT 1`
        );

        const content = contentResult.rows[0] || {};

        res.status(200).json({
            success: true,
            data: {
                system: {
                    title: "PSU ระบบจัดการข้อมูลผู้กู้ยืมเงิน",
                    university: "มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตหาดใหญ่",
                },

                banner: {
                    title: content.banner_title || "กยศ.",
                    subtitle:
                        content.banner_subtitle ||
                        "กองทุนเงินให้กู้ยืมเพื่อการศึกษา",
                    description: content.banner_description || "",
                },

                notice: content.notice || "",

                featureCards,
                homeContents,
            },
        });
    } catch (error) {
        console.error("GET /api/home error:", error);

        res.status(500).json({
            success: false,
            message: "ไม่สามารถโหลดข้อมูลหน้าแรกได้",
        });
    }
});

module.exports = router;
