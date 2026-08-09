import { useEffect, useState } from "react";
import {
    fetchApplicationPeriods,
    fetchHomeContent,
    fetchStaffList,
    saveApplicationPeriod,
    toggleApplicationPeriod,
    updateHomeContent,
} from "../../services/api";

const SEMESTER_OPTIONS = [1, 2];

function StaffSettings() {
    const [activeTab, setActiveTab] = useState("content");

    return (
        <main className="min-h-screen bg-[#eef5ff] px-5 py-8 text-[#07116f] sm:px-8 lg:px-10">
            <div className="mx-auto w-full max-w-4xl">
                <h1 className="text-2xl font-black sm:text-3xl">ตั้งค่าระบบ</h1>
                <p className="mt-2 text-sm text-gray-500">
                    จัดการเนื้อหาหน้าประชาสัมพันธ์ และช่วงเวลาเปิดรับยื่นกู้แต่ละเทอม
                </p>

                <div className="mt-6 flex gap-2 rounded-2xl bg-white p-2 shadow-sm">
                    <TabButton
                        active={activeTab === "content"}
                        onClick={() => setActiveTab("content")}
                    >
                        📢 หน้าประชาสัมพันธ์
                    </TabButton>
                    <TabButton
                        active={activeTab === "periods"}
                        onClick={() => setActiveTab("periods")}
                    >
                        🗓️ ช่วงเวลาเปิดรับยื่นกู้
                    </TabButton>
                </div>

                <div className="mt-5">
                    {activeTab === "content" ? (
                        <HomeContentEditor />
                    ) : (
                        <ApplicationPeriodManager />
                    )}
                </div>
            </div>
        </main>
    );
}

function TabButton({ active, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-black transition ${active
                ? "bg-[#07116f] text-white shadow-md"
                : "text-gray-600 hover:bg-blue-50"
                }`}
        >
            {children}
        </button>
    );
}

/*
|--------------------------------------------------------------------------
| แท็บที่ 1: จัดการเนื้อหาหน้าประชาสัมพันธ์
|--------------------------------------------------------------------------
*/
function HomeContentEditor() {
    const [staffList, setStaffList] = useState([]);
    const [staffId, setStaffId] = useState("");
    const [form, setForm] = useState({
        bannerTitle: "",
        bannerSubtitle: "",
        bannerDescription: "",
        notice: "",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);

            try {
                const [contentResult, staffResult] = await Promise.all([
                    fetchHomeContent(),
                    fetchStaffList(),
                ]);

                if (cancelled) return;

                const banner = contentResult.data?.banner || {};

                setForm({
                    bannerTitle: banner.title || "",
                    bannerSubtitle: banner.subtitle || "",
                    bannerDescription: banner.description || "",
                    notice: contentResult.data?.notice || "",
                });

                setStaffList(staffResult.data || []);

                if (staffResult.data?.length) {
                    setStaffId(String(staffResult.data[0].staffId));
                }
            } catch (error) {
                setMessage(error.message || "โหลดข้อมูลไม่สำเร็จ");
                setMessageType("error");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleChange = (field) => (event) => {
        setForm((current) => ({ ...current, [field]: event.target.value }));
    };

    const handleSave = async () => {
        if (!form.bannerTitle.trim() || !form.bannerSubtitle.trim()) {
            setMessage("กรุณากรอกหัวข้อและคำอธิบายย่อยให้ครบ");
            setMessageType("error");
            return;
        }

        setSaving(true);
        setMessage("");

        try {
            await updateHomeContent({ ...form, staffId: Number(staffId) });

            setMessage("บันทึกเนื้อหาหน้าประชาสัมพันธ์เรียบร้อยแล้ว");
            setMessageType("success");
        } catch (error) {
            setMessage(error.message || "บันทึกไม่สำเร็จ");
            setMessageType("error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
                <p className="font-black text-gray-500">กำลังโหลดข้อมูล...</p>
            </div>
        );
    }

    return (
        <div className="rounded-3xl bg-white p-6 shadow-sm lg:p-8">
            <label className="block">
                <span className="text-sm font-black text-[#07116f]">
                    หัวข้อหลัก (banner title)
                </span>
                <input
                    value={form.bannerTitle}
                    onChange={handleChange("bannerTitle")}
                    placeholder="เช่น กยศ."
                    className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-[#f8fbff] px-4 font-bold outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
            </label>

            <label className="mt-4 block">
                <span className="text-sm font-black text-[#07116f]">
                    หัวข้อรอง (banner subtitle)
                </span>
                <input
                    value={form.bannerSubtitle}
                    onChange={handleChange("bannerSubtitle")}
                    placeholder="เช่น กองทุนเงินให้กู้ยืมเพื่อการศึกษา"
                    className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-[#f8fbff] px-4 font-bold outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
            </label>

            <label className="mt-4 block">
                <span className="text-sm font-black text-[#07116f]">
                    คำอธิบาย
                </span>
                <textarea
                    value={form.bannerDescription}
                    onChange={handleChange("bannerDescription")}
                    rows="3"
                    className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-[#f8fbff] px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
            </label>

            <label className="mt-4 block">
                <span className="text-sm font-black text-[#07116f]">
                    ประกาศ (แถบสีเหลืองบนหน้าแรก)
                </span>
                <textarea
                    value={form.notice}
                    onChange={handleChange("notice")}
                    rows="3"
                    placeholder="เช่น เปิดรับยื่นกู้เทอม 1/2569 ระหว่าง 10-15 ส.ค. 2569"
                    className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-[#f8fbff] px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
            </label>

            <label className="mt-4 block max-w-xs">
                <span className="text-sm font-black text-[#07116f]">
                    ผู้แก้ไข
                </span>
                <select
                    value={staffId}
                    onChange={(event) => setStaffId(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-[#f8fbff] px-4 font-bold outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                >
                    {staffList.map((staff) => (
                        <option key={staff.staffId} value={staff.staffId}>
                            {staff.fullName}
                        </option>
                    ))}
                </select>
            </label>

            {message && (
                <p
                    className={`mt-4 text-sm font-bold ${messageType === "success" ? "text-green-600" : "text-red-600"
                        }`}
                >
                    {message}
                </p>
            )}

            <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="mt-5 h-12 rounded-xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-8 font-black text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {saving ? "กำลังบันทึก..." : "💾 บันทึก"}
            </button>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| แท็บที่ 2: ช่วงเวลาเปิดรับยื่นกู้ แยกตามปี+เทอม
|--------------------------------------------------------------------------
*/
function ApplicationPeriodManager() {
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");

    const [form, setForm] = useState({
        academicYear: "2569",
        semester: 1,
        startDate: "",
        endDate: "",
        isOpen: true,
    });
    const [saving, setSaving] = useState(false);

    const loadPeriods = async () => {
        setLoading(true);

        try {
            const result = await fetchApplicationPeriods();
            setPeriods(result.data || []);
        } catch (error) {
            setMessage(error.message || "โหลดข้อมูลไม่สำเร็จ");
            setMessageType("error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPeriods();
    }, []);

    const handleFormChange = (field) => (event) => {
        const value =
            field === "isOpen" ? event.target.checked : event.target.value;

        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleSave = async () => {
        if (!form.academicYear || !form.startDate || !form.endDate) {
            setMessage("กรุณากรอกปีการศึกษาและวันที่ให้ครบ");
            setMessageType("error");
            return;
        }

        setSaving(true);
        setMessage("");

        try {
            await saveApplicationPeriod({
                ...form,
                semester: Number(form.semester),
            });

            setMessage("บันทึกช่วงเวลาเปิดรับยื่นกู้เรียบร้อยแล้ว");
            setMessageType("success");
            await loadPeriods();
        } catch (error) {
            setMessage(error.message || "บันทึกไม่สำเร็จ");
            setMessageType("error");
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (periodId) => {
        try {
            await toggleApplicationPeriod(periodId);
            await loadPeriods();
        } catch (error) {
            setMessage(error.message || "เปลี่ยนสถานะไม่สำเร็จ");
            setMessageType("error");
        }
    };

    return (
        <div className="space-y-5">
            {/* ฟอร์มเพิ่ม/แก้ไข */}
            <div className="rounded-3xl bg-white p-6 shadow-sm lg:p-8">
                <h2 className="font-black text-[#07116f]">
                    กำหนดช่วงเวลาเปิดรับยื่นกู้
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                    ถ้ากรอกปี+เทอมที่มีอยู่แล้ว จะเป็นการแก้ไขข้อมูลเดิม
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className="text-sm font-black text-[#07116f]">
                            ปีการศึกษา (พ.ศ.)
                        </span>
                        <input
                            value={form.academicYear}
                            onChange={handleFormChange("academicYear")}
                            placeholder="2569"
                            className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-[#f8fbff] px-4 font-bold outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm font-black text-[#07116f]">
                            ภาคการศึกษา
                        </span>
                        <select
                            value={form.semester}
                            onChange={handleFormChange("semester")}
                            className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-[#f8fbff] px-4 font-bold outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        >
                            {SEMESTER_OPTIONS.map((value) => (
                                <option key={value} value={value}>
                                    ภาคเรียนที่ {value}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="text-sm font-black text-[#07116f]">
                            วันที่เริ่มเปิดรับ
                        </span>
                        <input
                            type="date"
                            value={form.startDate}
                            onChange={handleFormChange("startDate")}
                            className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-[#f8fbff] px-4 font-bold outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm font-black text-[#07116f]">
                            วันที่ปิดรับ
                        </span>
                        <input
                            type="date"
                            value={form.endDate}
                            onChange={handleFormChange("endDate")}
                            className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-[#f8fbff] px-4 font-bold outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        />
                    </label>
                </div>

                <label className="mt-4 flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={form.isOpen}
                        onChange={handleFormChange("isOpen")}
                        className="h-5 w-5 rounded border-gray-300"
                    />
                    <span className="text-sm font-bold text-gray-600">
                        เปิดใช้งานช่วงเวลานี้ทันที
                    </span>
                </label>

                {message && (
                    <p
                        className={`mt-4 text-sm font-bold ${messageType === "success" ? "text-green-600" : "text-red-600"
                            }`}
                    >
                        {message}
                    </p>
                )}

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-5 h-12 rounded-xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-8 font-black text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {saving ? "กำลังบันทึก..." : "💾 บันทึก"}
                </button>
            </div>

            {/* รายการช่วงเวลาที่มีอยู่ */}
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
                <div className="border-b border-gray-100 p-5">
                    <h2 className="font-black text-[#07116f]">
                        ช่วงเวลาทั้งหมด
                    </h2>
                </div>

                {loading ? (
                    <p className="p-6 text-center text-sm text-gray-400">
                        กำลังโหลด...
                    </p>
                ) : periods.length === 0 ? (
                    <p className="p-6 text-center text-sm text-gray-400">
                        ยังไม่มีการกำหนดช่วงเวลา
                    </p>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {periods.map((period) => (
                            <div
                                key={period.periodId}
                                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
                            >
                                <div>
                                    <p className="font-black text-[#07116f]">
                                        ปีการศึกษา {period.academicYear} ภาคเรียนที่{" "}
                                        {period.semester}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-400">
                                        {period.startDate} ถึง {period.endDate}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span
                                        className={`rounded-full px-3 py-1.5 text-xs font-black ${period.isOpen
                                            ? "bg-green-100 text-green-700"
                                            : "bg-gray-100 text-gray-500"
                                            }`}
                                    >
                                        {period.isOpen ? "เปิดอยู่" : "ปิดอยู่"}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => handleToggle(period.periodId)}
                                        className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-black text-gray-600 hover:bg-gray-50"
                                    >
                                        {period.isOpen ? "ปิดตอนนี้" : "เปิดตอนนี้"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default StaffSettings;