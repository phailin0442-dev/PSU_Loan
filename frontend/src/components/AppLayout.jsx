import { useEffect, useState } from "react";
import AppNavbar from "./AppNavbar";
import { useApp } from "../context/AppContext";
import { MEMORABLE_PAGES, readRememberedPage } from "./pageMemory";
import { QUEUE_FAIL_DEFAULTS, fetchQueueFailMessage } from "../services/api";

// กู้หน้าเดิมแค่ครั้งเดียวต่อการโหลดหน้าเว็บ
// (AppLayout อาจถูกสร้างใหม่ทุกครั้งที่เปลี่ยนหน้า ถ้าไม่กันไว้จะเด้งกลับหน้าเดิมตลอด)
let restoredOnce = false;

function AppLayout({ setPage, children }) {
    const { role, homePage, isAuthenticated, isStaffUser, selectedStudent } = useApp();

    // popup "เอกสารส่งไม่สำเร็จ" — ขึ้นครั้งเดียวต่อผลตรวจแต่ละครั้ง (จำว่ากดรับทราบแล้วในแท็บนี้)
    const failed = Boolean(
        isAuthenticated && role === "student" && !isStaffUser && selectedStudent?.queueFailed
    );
    const failKey = failed ? `psu_loan_fail_seen_${selectedStudent.id}_${selectedStudent.queueFailType}_${selectedStudent.signingVerifiedAt || selectedStudent.latestBooking?.queueDate || ""}` : "";
    const [dismissedKey, setDismissedKey] = useState(null);
    const alreadySeen = (() => {
        try {
            return failKey && sessionStorage.getItem(failKey) === "1";
        } catch {
            return false;
        }
    })();
    const showFailPopup = failed && !alreadySeen && dismissedKey !== failKey;

    // ข้อความใน popup แก้ได้ที่หน้าตั้งค่า > ตั้งค่าหน้าหลัก (โหลดเมื่อจะแสดงเท่านั้น)
    const [texts, setTexts] = useState(QUEUE_FAIL_DEFAULTS);
    useEffect(() => {
        if (!showFailPopup) return undefined;
        let cancelled = false;
        fetchQueueFailMessage()
            .then((r) => {
                if (!cancelled && r?.data) setTexts({ ...QUEUE_FAIL_DEFAULTS, ...r.data });
            })
            .catch(() => {
                // โหลดไม่ได้ก็ใช้ข้อความเริ่มต้น
            });
        return () => {
            cancelled = true;
        };
    }, [showFailPopup]);

    const dismissFail = () => {
        try {
            sessionStorage.setItem(failKey, "1");
        } catch {
            // ไม่เป็นไร
        }
        setDismissedKey(failKey);
    };

    useEffect(() => {
        if (restoredOnce) return;
        restoredOnce = true;

        const saved = readRememberedPage();
        const allowed = MEMORABLE_PAGES[role] || [];

        if (saved && allowed.includes(saved)) {
            setPage(saved);
        } else if (isAuthenticated && role === "staff") {
            // เจ้าหน้าที่ไม่ควรเห็นหน้าหลักของนักศึกษา
            setPage(homePage);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-screen bg-[#eef5ff] text-[#07116f]">
            <AppNavbar setPage={setPage} />
            {children}

            {showFailPopup && (
                <div className="fixed inset-0 z-[100] grid place-items-center bg-[#07116f]/40 p-5 backdrop-blur-sm">
                    <div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="fail-popup-title"
                        className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl"
                    >
                        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-50 text-3xl" aria-hidden="true">
                            !
                        </div>
                        <h2 id="fail-popup-title" className="mt-4 text-xl font-black text-rose-600">
                            {texts.title}
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600">
                            {selectedStudent.queueFailType === "NO_SHOW" ? texts.noShow : texts.incomplete}
                        </p>
                        {selectedStudent.queueFailType !== "NO_SHOW" && selectedStudent.signingRemark && (
                            <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-left text-sm font-bold text-rose-700">
                                เหตุผล: {selectedStudent.signingRemark}
                            </p>
                        )}
                        <p className="mt-4 rounded-xl bg-[#eef5ff] px-4 py-3 text-left text-sm font-bold leading-relaxed text-[#07116f]">
                            {texts.contact}
                        </p>
                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    dismissFail();
                                    setPage("status");
                                }}
                                className="h-11 flex-1 rounded-xl border border-[#c9d8f5] text-sm font-black text-[#07116f] hover:bg-[#f6f9ff]"
                            >
                                ดูสถานะคำขอ
                            </button>
                            <button
                                type="button"
                                onClick={dismissFail}
                                autoFocus
                                className="h-11 flex-1 rounded-xl bg-[#07116f] text-sm font-black text-white hover:bg-[#0c1a9a]"
                            >
                                รับทราบ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AppLayout;