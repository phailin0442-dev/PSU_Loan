import { useEffect, useState } from "react";
import {
    fetchApplicationPeriods,
    fetchHomeContent,
    fetchStaffList,
    saveApplicationPeriod,
    saveQueueDates,
    toggleApplicationPeriod,
    updateHomeContent,
} from "../../services/api";

const SEMESTER_OPTIONS = [1, 2];

const INPUT_CLASS =
    "mt-2 h-11 w-full rounded-xl border border-gray-200 bg-[#f8fbff] px-4 font-bold outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100";

const EMPTY_PERIOD_FORM = {
    academicYear: "2569",
    semester: 1,
    startDate: "",
    endDate: "",
    isOpen: true,
};

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
| แท็บที่ 1: จัดการเนื้อหาหน้าประชาสัมพันธ์ (ไม่ได้แก้)
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
                    className={INPUT_CLASS}
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
                    className={INPUT_CLASS}
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
                    className={INPUT_CLASS}
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
| แท็บที่ 2: ช่วงเวลาเปิดรับยื่นกู้ + วันจองคิว (แยกกล่อง แยกปุ่มบันทึก)
|--------------------------------------------------------------------------
| กล่อง 1: เปิดรับยื่นกู้ → บันทึกก่อนได้เลย ให้นักศึกษาอัปโหลดเอกสาร
| กล่อง 2: วันจองคิว → มากำหนดทีหลังเมื่อเจ้าหน้าที่รู้วันแน่นอน
| กล่อง 3: รายการทั้งหมด
|--------------------------------------------------------------------------
*/

// แสดงวันที่ YYYY-MM-DD เป็นภาษาไทย เช่น 12 ต.ค. 2569
function formatThaiDate(isoDate) {
    if (!isoDate) return "-";
    return new Date(`${isoDate}T00:00:00`).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function periodLabel(period) {
    return `ปีการศึกษา ${period.academicYear} ภาคเรียนที่ ${period.semester}`;
}

function StatusMessage({ text, type }) {
    if (!text) return null;
    return (
        <p
            className={`mt-4 text-sm font-bold ${type === "success" ? "text-green-600" : "text-red-600"
                }`}
        >
            {text}
        </p>
    );
}

function SaveButton({ saving, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={saving}
            className="mt-5 h-12 rounded-xl bg-gradient-to-r from-[#07116f] to-[#0646ff] px-8 font-black text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {saving ? "กำลังบันทึก..." : children}
        </button>
    );
}

function ApplicationPeriodManager() {
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");

    // ฟอร์มกล่อง 1 อยู่ที่นี่ เพื่อให้กล่อง 2 (วันจองคิว) ใช้ปี+เทอมเดียวกัน
    const [periodForm, setPeriodForm] = useState(EMPTY_PERIOD_FORM);

    // ใช้หลังบันทึก/สลับสถานะ (เรียกจาก event handler จึงไม่ติด lint)
    const reloadPeriods = async () => {
        try {
            const result = await fetchApplicationPeriods();
            setPeriods(result.data || []);
            setListError("");
        } catch (error) {
            setListError(error.message || "โหลดข้อมูลไม่สำเร็จ");
        }
    };

    // ไม่ setLoading(true) ใน effect (state เริ่มเป็น true อยู่แล้ว)
    // และ setState เฉพาะใน .then/.catch/.finally → ไม่ติด lint
    useEffect(() => {
        let cancelled = false;

        fetchApplicationPeriods()
            .then((result) => {
                if (!cancelled) setPeriods(result.data || []);
            })
            .catch((error) => {
                if (!cancelled) setListError(error.message || "โหลดข้อมูลไม่สำเร็จ");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // ช่วงยื่นกู้ที่บันทึกไว้แล้ว ของปี+เทอมที่เลือกในกล่อง 1
    const currentPeriod = periods.find(
        (period) =>
            String(period.academicYear) === String(periodForm.academicYear).trim() &&
            Number(period.semester) === Number(periodForm.semester)
    );

    // ปุ่มในรายการ → ดึงปี+เทอมนั้นมาใส่กล่อง 1 (กล่อง 2 จะตามไปเอง)
    const loadPeriodIntoForm = (period, scrollTargetId) => {
        setPeriodForm({
            academicYear: period.academicYear,
            semester: period.semester,
            startDate: period.startDate || "",
            endDate: period.endDate || "",
            isOpen: period.isOpen,
        });
        document
            .getElementById(scrollTargetId)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <div className="space-y-5">
            <PeriodForm
                form={periodForm}
                setForm={setPeriodForm}
                onSaved={reloadPeriods}
            />

            <QueueDateForm
                academicYear={periodForm.academicYear}
                semester={periodForm.semester}
                period={currentPeriod}
                onSaved={reloadPeriods}
            />

            <PeriodList
                periods={periods}
                loading={loading}
                error={listError}
                onReload={reloadPeriods}
                onEditPeriod={(period) => loadPeriodIntoForm(period, "period-form")}
                onEditQueue={(period) => loadPeriodIntoForm(period, "queue-date-form")}
            />
        </div>
    );
}

/*
| กล่อง 1: ช่วงเวลาเปิดรับยื่นกู้ (ไม่แตะวันจองคิว)
*/
function PeriodForm({ form, setForm, onSaved }) {
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");

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
                academicYear: String(form.academicYear).trim(),
                semester: Number(form.semester),
            });
            setMessage("บันทึกช่วงเวลาเปิดรับยื่นกู้เรียบร้อยแล้ว นักศึกษาเริ่มยื่นและอัปโหลดเอกสารได้");
            setMessageType("success");
            await onSaved();
        } catch (error) {
            setMessage(error.message || "บันทึกไม่สำเร็จ");
            setMessageType("error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div id="period-form" className="scroll-mt-6 rounded-3xl bg-white p-6 shadow-sm lg:p-8">
            <h2 className="font-black text-[#07116f]">
                กำหนดช่วงเวลาเปิดรับยื่นกู้
            </h2>
            <p className="mt-1 text-xs text-gray-400">
                ถ้ากรอกปี+เทอมที่มีอยู่แล้ว จะเป็นการแก้ไขข้อมูลเดิม (วันจองคิวที่ตั้งไว้จะไม่หาย)
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
                        className={INPUT_CLASS}
                    />
                </label>

                <label className="block">
                    <span className="text-sm font-black text-[#07116f]">
                        ภาคการศึกษา
                    </span>
                    <select
                        value={form.semester}
                        onChange={handleFormChange("semester")}
                        className={INPUT_CLASS}
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
                        className={INPUT_CLASS}
                    />
                </label>

                <label className="block">
                    <span className="text-sm font-black text-[#07116f]">
                        วันที่ปิดรับ
                    </span>
                    <input
                        type="date"
                        value={form.endDate}
                        min={form.startDate || undefined}
                        onChange={handleFormChange("endDate")}
                        className={INPUT_CLASS}
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

            <StatusMessage text={message} type={messageType} />

            <SaveButton saving={saving} onClick={handleSave}>
                💾 บันทึกช่วงเปิดรับยื่นกู้
            </SaveButton>
        </div>
    );
}

/*
| กล่อง 2: วันจองคิวยื่นเอกสาร — ใช้ปี+เทอมเดียวกับกล่อง 1 อัตโนมัติ
*/
function QueueDateForm({ academicYear, semester, period, onSaved }) {
    const [dates, setDates] = useState({ queueStartDate: "", queueEndDate: "" });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");

    // เมื่อปี+เทอมในกล่อง 1 เปลี่ยน (หรือเพิ่งบันทึกช่วงยื่นกู้ของเทอมนั้น)
    // ให้ดึงวันจองคิวเดิมของเทอมนั้นมาใส่ — เทียบค่าระหว่าง render แทน useEffect
    const periodKey = period ? String(period.periodId) : `new-${academicYear}-${semester}`;
    const [loadedKey, setLoadedKey] = useState(null);
    if (periodKey !== loadedKey) {
        setLoadedKey(periodKey);
        setDates({
            queueStartDate: period?.queueStartDate || "",
            queueEndDate: period?.queueEndDate || "",
        });
        setMessage("");
    }

    const handleDateChange = (field) => (event) =>
        setDates((current) => ({ ...current, [field]: event.target.value }));

    const submit = async (payload, successText) => {
        setSaving(true);
        setMessage("");
        try {
            await saveQueueDates(period.periodId, payload);
            setMessage(successText);
            setMessageType("success");
            await onSaved();
        } catch (error) {
            setMessage(error.message || "บันทึกไม่สำเร็จ");
            setMessageType("error");
        } finally {
            setSaving(false);
        }
    };

    const handleSave = () => {
        if (!period) {
            setMessage(
                `ยังไม่มีช่วงเปิดรับยื่นกู้ของปีการศึกษา ${academicYear} ภาคเรียนที่ ${semester} กรุณาบันทึกกล่องด้านบนก่อน`
            );
            setMessageType("error");
            return;
        }
        if (!dates.queueStartDate || !dates.queueEndDate) {
            setMessage("กรุณาเลือกวันเปิดและวันปิดจองคิวให้ครบ");
            setMessageType("error");
            return;
        }
        if (dates.queueEndDate < dates.queueStartDate) {
            setMessage("วันปิดจองคิวต้องไม่ก่อนวันเปิดจองคิว");
            setMessageType("error");
            return;
        }
        submit(dates, "บันทึกวันจองคิวเรียบร้อยแล้ว");
    };

    const handleClear = () => {
        if (!window.confirm("ล้างวันจองคิวของเทอมนี้? นักศึกษาจะยังจองคิวไม่ได้จนกว่าจะกำหนดใหม่")) {
            return;
        }
        setDates({ queueStartDate: "", queueEndDate: "" });
        submit({ queueStartDate: null, queueEndDate: null }, "ล้างวันจองคิวแล้ว");
    };

    return (
        <div id="queue-date-form" className="scroll-mt-6 rounded-3xl bg-white p-6 shadow-sm lg:p-8">
            <h2 className="font-black text-[#07116f]">
                กำหนดวันจองคิวยื่นเอกสาร
            </h2>
            <p className="mt-1 text-xs text-gray-400">
                ใช้ปีการศึกษาและภาคเรียนเดียวกับช่วงเปิดรับยื่นกู้ด้านบน กำหนดทีหลังได้เมื่อทราบวันที่แน่นอน
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-[#f8fbff] px-4 py-3">
                <span className="text-sm font-black text-[#07116f]">
                    ปีการศึกษา {academicYear || "-"} ภาคเรียนที่ {semester}
                </span>
                {period ? (
                    <span className="text-xs text-gray-500">
                        (ยื่นกู้ {formatThaiDate(period.startDate)} ถึง {formatThaiDate(period.endDate)})
                    </span>
                ) : (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                        ยังไม่ได้บันทึกช่วงเปิดรับยื่นกู้ของเทอมนี้
                    </span>
                )}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                    <span className="text-sm font-black text-[#07116f]">
                        วันที่เปิดจองคิว
                    </span>
                    <input
                        type="date"
                        value={dates.queueStartDate}
                        onChange={handleDateChange("queueStartDate")}
                        className={INPUT_CLASS}
                    />
                </label>

                <label className="block">
                    <span className="text-sm font-black text-[#07116f]">
                        วันที่ปิดจองคิว
                    </span>
                    <input
                        type="date"
                        value={dates.queueEndDate}
                        min={dates.queueStartDate || undefined}
                        onChange={handleDateChange("queueEndDate")}
                        className={INPUT_CLASS}
                    />
                </label>
            </div>

            <StatusMessage text={message} type={messageType} />

            <div className="flex flex-wrap items-center gap-3">
                <SaveButton saving={saving} onClick={handleSave}>
                    💾 บันทึกวันจองคิว
                </SaveButton>

                {period?.queueStartDate && (
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={saving}
                        className="mt-5 h-12 rounded-xl border border-gray-200 px-6 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                        ล้างวันจองคิว
                    </button>
                )}
            </div>
        </div>
    );
}

/*
| กล่อง 3: รายการช่วงเวลาทั้งหมด
*/
function PeriodList({ periods, loading, error, onReload, onEditPeriod, onEditQueue }) {
    const [toggleError, setToggleError] = useState("");

    const handleToggle = async (periodId) => {
        try {
            await toggleApplicationPeriod(periodId);
            setToggleError("");
            await onReload();
        } catch (err) {
            setToggleError(err.message || "เปลี่ยนสถานะไม่สำเร็จ");
        }
    };

    return (
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="border-b border-gray-100 p-5">
                <h2 className="font-black text-[#07116f]">ช่วงเวลาทั้งหมด</h2>
                {(error || toggleError) && (
                    <p className="mt-2 text-sm font-bold text-red-600">
                        {error || toggleError}
                    </p>
                )}
            </div>

            {loading ? (
                <p className="p-6 text-center text-sm text-gray-400">กำลังโหลด...</p>
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
                                    {periodLabel(period)}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                    ยื่นกู้: {formatThaiDate(period.startDate)} ถึง{" "}
                                    {formatThaiDate(period.endDate)}
                                </p>
                                <p className="mt-0.5 text-xs text-gray-500">
                                    จองคิว:{" "}
                                    {period.queueStartDate ? (
                                        `${formatThaiDate(period.queueStartDate)} ถึง ${formatThaiDate(period.queueEndDate)}`
                                    ) : (
                                        <span className="font-bold text-amber-600">ยังไม่กำหนด</span>
                                    )}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
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
                                    onClick={() => onEditPeriod(period)}
                                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-[#07116f] hover:bg-blue-50"
                                >
                                    แก้ไขช่วงยื่นกู้
                                </button>

                                <button
                                    type="button"
                                    onClick={() => onEditQueue(period)}
                                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-[#07116f] hover:bg-blue-50"
                                >
                                    {period.queueStartDate ? "แก้ไขวันจองคิว" : "กำหนดวันจองคิว"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleToggle(period.periodId)}
                                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-600 hover:bg-gray-50"
                                >
                                    {period.isOpen ? "ปิดตอนนี้" : "เปิดตอนนี้"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default StaffSettings;