// เหลือแค่หัวหน้ารายงานอย่างเดียวตามที่ต้องการ
function StaffReport() {
    return (
        <main className="min-h-screen bg-[#eef5ff] px-5 py-8 text-[#07116f] sm:px-8 lg:px-10">
            <div className="mx-auto w-full max-w-[1600px]">
                <h1 className="text-2xl font-black sm:text-3xl">รายงาน</h1>
                <p className="mt-2 text-sm text-gray-500 sm:text-base">
                    สรุปภาพรวมและผลการตรวจสอบเอกสารของนักศึกษาผู้กู้ยืม
                </p>
            </div>
        </main>
    );
}

export default StaffReport;