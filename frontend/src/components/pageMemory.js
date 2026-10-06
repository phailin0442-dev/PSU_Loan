/**
 * src/components/pageMemory.js
 * จำหน้าล่าสุดที่เปิดจากเมนู ไว้ใน sessionStorage
 * รีเฟรชแล้วกลับมาหน้าเดิม (ปิดแท็บแล้วจะล้างเอง)
 */
export const PAGE_KEY = "psu_loan_page";

// หน้าที่จำได้ แยกตามบทบาท (ตรงกับเมนูใน AppNavbar)
export const MEMORABLE_PAGES = {
    staff: ["studentList", "staffBooking", "staffReport", "staffSettings"],
    student: ["home", "studentProfiles", "eligibility", "status"],
};

export function rememberPage(page) {
    try {
        sessionStorage.setItem(PAGE_KEY, page);
    } catch {
        // เบราว์เซอร์ไม่ให้ใช้ storage ก็ข้ามไป
    }
}

export function readRememberedPage() {
    try {
        return sessionStorage.getItem(PAGE_KEY);
    } catch {
        return null;
    }
}