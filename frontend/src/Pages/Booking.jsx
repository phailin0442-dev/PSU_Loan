import { useApp } from "../context/AppContext";

function Booking() {
    const { selectedStudent } = useApp();

    return (
        <main className="mx-auto max-w-5xl px-6 py-8">
            <h2 className="text-3xl font-black">จองคิวลงนามเอกสาร</h2>
            <section className="mt-7 rounded-3xl bg-white p-6 shadow-sm">
                <p className="font-black">{selectedStudent.fullName}</p>
                <p className="mt-2 text-gray-500">ตัวอย่างหน้าจองคิว สามารถเชื่อม API ภายหลังได้</p>
            </section>
        </main>
    );
}

export default Booking;
