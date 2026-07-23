import { useApp } from "../context/AppContext";

function Status() {
    const { selectedStudent } = useApp();

    return (
        <main className="mx-auto max-w-5xl px-6 py-8">
            <h2 className="text-3xl font-black">ติดตามสถานะ</h2>
            <section className="mt-7 rounded-3xl bg-white p-6 shadow-sm">
                <p className="font-black">{selectedStudent.fullName}</p>
                <p className="mt-3 text-2xl font-black text-blue-600">
                    {selectedStudent.applicationStatus}
                </p>
            </section>
        </main>
    );
}

export default Status;
