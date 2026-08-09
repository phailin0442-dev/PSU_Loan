import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";

// แปลงมาจาก mockup HTML ที่ให้มาเป๊ะๆ (สี, ฟอนต์ Prompt/Sarabun, โครงหน้า)
// เป็น React component — ตอนนี้ยังเป็น UI เดโมเท่านั้น กดแล้วขึ้น toast
// จำลอง ไม่เชื่อมกับ backend auth จริง (ตามที่เลือกไว้ว่ายังไม่ทำ auth
// เต็มรูปแบบตอนนี้)

const MODE_COPY = {
    login: {
        h: "เข้าสู่ระบบ",
        s: "เพื่อจัดการคำขอกู้ยืม กยศ. ของคุณ",
        d: "กรอกข้อมูลบัญชีของคุณเพื่อดูสถานะคำขอ อัปโหลดเอกสาร และติดตามผลการพิจารณาแบบเรียลไทม์",
        alert: "กรุณาเตรียมรหัสนักศึกษาและรหัสผ่านให้พร้อมก่อนเข้าสู่ระบบ",
    },
    register: {
        h: "ลงทะเบียน",
        s: "สร้างบัญชีผู้กู้ยืมใหม่ในระบบ กยศ.",
        d: "กรอกข้อมูลให้ตรงกับเอกสารยืนยันตัวตน เพื่อให้ระบบตรวจสอบและอนุมัติได้รวดเร็วขึ้น",
        alert: "เตรียมบัตรประชาชนและอีเมลที่ใช้งานได้จริงก่อนลงทะเบียน",
    },
};

const ROLE_LABELS = {
    student: { badge: "นักศึกษา", id: "รหัสนักศึกษา", ph: "6610210707" },
    staff: {
        badge: "เจ้าหน้าที่",
        id: "รหัสเจ้าหน้าที่",
        ph: "STF001",
    },
};

function EyeIcon() {
    return (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
            <path
                d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"
                stroke="currentColor"
                strokeWidth="1.6"
            />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
        </svg>
    );
}

function Login({ setPage }) {
    const { login, register } = useApp();

    const [mode, setMode] = useState("login");
    const [role, setRole] = useState("student");

    // สมัครสมาชิกใหม่เป็นนักศึกษาได้เท่านั้นเสมอ (ระบบมีเจ้าหน้าที่แค่ 2
    // คน ไม่เปิดให้สมัครเป็นเจ้าหน้าที่เอง) — กันกรณีเคยเลือก "เจ้าหน้าที่"
    // ไว้ตอนอยู่แท็บเข้าสู่ระบบ แล้วสลับมาแท็บลงทะเบียนโดยค่ายังค้างอยู่
    useEffect(() => {
        if (mode === "register") setRole("student");
    }, [mode]);

    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showRegPassword, setShowRegPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // ฟอร์มเข้าสู่ระบบ
    const [loginIdentifier, setLoginIdentifier] = useState("");
    const [loginPassword, setLoginPassword] = useState("");

    // ฟอร์มลงทะเบียน
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [studentCode, setStudentCode] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [confirmError, setConfirmError] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [toast, setToast] = useState("");

    const copy = MODE_COPY[mode];
    const roleInfo = ROLE_LABELS[role];

    const showToast = (message) => {
        setToast(message);
        setTimeout(() => setToast(""), 2400);
    };

    const handleLoginSubmit = async (event) => {
        event.preventDefault();
        setFormError("");
        setSubmitting(true);

        try {
            const user = await login({
                identifier: loginIdentifier,
                password: loginPassword,
                role,
            });

            showToast(`เข้าสู่ระบบสำเร็จ — ยินดีต้อนรับ ${user.fullName}`);

            setTimeout(() => {
                setPage?.(role === "staff" ? "studentList" : "studentProfiles");
            }, 700);
        } catch (error) {
            setFormError(error.message || "เข้าสู่ระบบไม่สำเร็จ");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRegisterSubmit = async (event) => {
        event.preventDefault();
        setFormError("");

        if (!regPassword || regPassword !== confirmPassword) {
            setConfirmError(true);
            return;
        }

        setConfirmError(false);
        setSubmitting(true);

        try {
            await register({
                studentCode,
                firstName,
                lastName,
                email: regEmail,
                phone,
                password: regPassword,
            });

            showToast("ลงทะเบียนสำเร็จ กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วน");

            setTimeout(() => {
                setPage?.("studentProfiles");
            }, 700);
        } catch (error) {
            setFormError(error.message || "ลงทะเบียนไม่สำเร็จ");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            style={{
                fontFamily: "'Sarabun', sans-serif",
                color: "#16205A",
                background: "#FFFFFF",
                minHeight: "100vh",
            }}
        >
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@500;600;700;800&family=Sarabun:wght@400;500;600;700&display=swap');
        .psu-login input::placeholder { color: #A9B4C8; }
        .psu-login a { color: #1C2B74; text-decoration: none; }
        .psu-login a:hover { text-decoration: underline; }
        .psu-login input:focus { outline: none; border-color: #1C2B74 !important; box-shadow: 0 0 0 4px rgba(28,43,116,0.1); }
        .psu-login .toggle-visibility:hover { color: #1C2B74; }
        .psu-login .btn-primary:hover { background: #101D5C; }
        .psu-login .switch-line button:hover { text-decoration: underline; }
        .psu-login .mode-tab { border: 1.5px solid #1C2B74; background: transparent; color: #1C2B74; font-family: 'Prompt', 'Sarabun', sans-serif; font-weight: 600; font-size: 0.9rem; padding: 10px 22px; border-radius: 999px; cursor: pointer; transition: background 0.2s, color 0.2s; }
        .psu-login .mode-tab.active { background: #1C2B74; color: #fff; }
        @media (max-width: 560px) {
          .psu-login .field-row { grid-template-columns: 1fr !important; }
        }
      `}</style>

            <div className="psu-login">
                {/* Top bar */}
                <header
                    style={{
                        background: "linear-gradient(120deg, #1C2B74, #101D5C)",
                        color: "#fff",
                        padding: "20px clamp(20px, 5vw, 56px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 20,
                        flexWrap: "wrap",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div
                            style={{
                                width: 52,
                                height: 52,
                                background: "#fff",
                                borderRadius: 12,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontFamily: "'Prompt', 'Sarabun', sans-serif",
                                fontWeight: 800,
                                color: "#1C2B74",
                                fontSize: "1rem",
                                flexShrink: 0,
                            }}
                        >
                            PSU
                        </div>
                        <div>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    flexWrap: "wrap",
                                }}
                            >
                                <strong
                                    style={{
                                        fontFamily: "'Prompt', 'Sarabun', sans-serif",
                                        fontWeight: 700,
                                        fontSize: "1.25rem",
                                    }}
                                >
                                    PSU Smart Loan
                                </strong>
                                <span
                                    style={{
                                        background: "rgba(255,255,255,0.16)",
                                        color: "#fff",
                                        fontSize: "0.72rem",
                                        fontWeight: 600,
                                        padding: "4px 12px",
                                        borderRadius: 999,
                                    }}
                                >
                                    {roleInfo.badge}
                                </span>
                            </div>
                            <p
                                style={{
                                    margin: "3px 0 0",
                                    fontSize: "0.82rem",
                                    color: "rgba(255,255,255,0.75)",
                                }}
                            >
                                ระบบคัดกรองและตรวจสอบเอกสารผู้กู้ยืมเงินเพื่อการศึกษา
                            </p>
                            <p
                                style={{
                                    margin: "3px 0 0",
                                    fontSize: "0.82rem",
                                    color: "rgba(255,255,255,0.75)",
                                }}
                            >
                                มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตหาดใหญ่
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setPage?.("home")}
                        style={{
                            color: "rgba(255,255,255,0.85)",
                            fontSize: "0.88rem",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                        }}
                    >
                        ← กลับหน้าหลัก
                    </button>
                </header>

                {/* Page body */}
                <main
                    style={{
                        maxWidth: 720,
                        margin: "0 auto",
                        padding: "clamp(24px, 5vw, 44px) 20px 60px",
                    }}
                >
                    <div
                        style={{
                            background: "#D9EEFC",
                            borderRadius: 28,
                            padding: "clamp(26px, 5vw, 44px)",
                        }}
                    >
                        <span
                            style={{
                                display: "inline-block",
                                background: "#fff",
                                color: "#16205A",
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                padding: "8px 18px",
                                borderRadius: 999,
                                marginBottom: 22,
                            }}
                        >
                            ระบบสำหรับผู้กู้ยืมเงิน กยศ.
                        </span>

                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                marginBottom: 26,
                                flexWrap: "wrap",
                            }}
                        >
                            <button
                                type="button"
                                className={`mode-tab ${mode === "login" ? "active" : ""}`}
                                onClick={() => setMode("login")}
                            >
                                เข้าสู่ระบบ
                            </button>
                            <button
                                type="button"
                                className={`mode-tab ${mode === "register" ? "active" : ""}`}
                                onClick={() => setMode("register")}
                            >
                                ลงทะเบียน
                            </button>
                        </div>

                        <h1
                            style={{
                                fontFamily: "'Prompt', 'Sarabun', sans-serif",
                                fontWeight: 800,
                                fontSize: "clamp(2.2rem, 7vw, 3rem)",
                                color: "#E31C79",
                                margin: "0 0 6px",
                                lineHeight: 1,
                            }}
                        >
                            {copy.h}
                        </h1>
                        <p
                            style={{
                                fontFamily: "'Prompt', 'Sarabun', sans-serif",
                                fontWeight: 600,
                                fontSize: "clamp(1.15rem, 3vw, 1.4rem)",
                                color: "#16205A",
                                margin: "0 0 12px",
                            }}
                        >
                            {copy.s}
                        </p>
                        <p
                            style={{
                                color: "#55688A",
                                fontSize: "0.95rem",
                                lineHeight: 1.7,
                                margin: "0 0 26px",
                                maxWidth: "46ch",
                            }}
                        >
                            {copy.d}
                        </p>

                        {/* บทบาทผู้ใช้งาน — เลือกได้แค่ตอน "เข้าสู่ระบบ" เท่านั้น
                เพราะระบบนี้มีเจ้าหน้าที่แค่ 2 คน ไม่เปิดให้สมัครสมาชิก
                เป็นเจ้าหน้าที่เอง (สมัครใหม่ = นักศึกษาเสมอ) */}
                        {mode === "login" && (
                            <div
                                style={{
                                    background: "#fff",
                                    borderRadius: 14,
                                    padding: "10px 16px",
                                    marginBottom: 24,
                                    maxWidth: 260,
                                }}
                            >
                                <label
                                    style={{
                                        display: "block",
                                        fontSize: "0.74rem",
                                        color: "#55688A",
                                        marginBottom: 2,
                                    }}
                                >
                                    บทบาทผู้ใช้งาน
                                </label>
                                <select
                                    value={role}
                                    onChange={(event) => setRole(event.target.value)}
                                    style={{
                                        width: "100%",
                                        border: "none",
                                        background: "transparent",
                                        fontFamily: "'Prompt', 'Sarabun', sans-serif",
                                        fontWeight: 600,
                                        fontSize: "0.95rem",
                                        color: "#16205A",
                                        padding: "2px 0",
                                    }}
                                >
                                    <option value="student">นักศึกษา</option>
                                    <option value="staff">เจ้าหน้าที่</option>
                                </select>
                            </div>
                        )}

                        {/* Form panel */}
                        <div
                            style={{
                                background: "#fff",
                                borderRadius: 20,
                                padding: "26px 26px 28px",
                                boxShadow: "0 16px 34px rgba(16,29,92,0.08)",
                            }}
                        >
                            {mode === "login" ? (
                                <form
                                    onSubmit={handleLoginSubmit}
                                    style={{ display: "flex", flexDirection: "column", gap: 16 }}
                                >
                                    <Field label={roleInfo.id}>
                                        <input
                                            type="text"
                                            value={loginIdentifier}
                                            onChange={(e) => setLoginIdentifier(e.target.value)}
                                            placeholder={roleInfo.ph}
                                            required
                                            style={inputStyle}
                                        />
                                    </Field>

                                    <PasswordField
                                        label="รหัสผ่าน"
                                        value={loginPassword}
                                        onChange={(value) => setLoginPassword(value)}
                                        show={showLoginPassword}
                                        onToggle={() => setShowLoginPassword((v) => !v)}
                                    />

                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            fontSize: "0.85rem",
                                        }}
                                    >
                                        <label
                                            style={{
                                                display: "flex",
                                                alignItems: "flex-start",
                                                gap: 9,
                                                fontSize: "0.83rem",
                                                color: "#55688A",
                                            }}
                                        >
                                            <input type="checkbox" style={{ accentColor: "#1C2B74" }} />
                                            จดจำฉันไว้ในระบบ
                                        </label>
                                        <a href="#!" onClick={(e) => e.preventDefault()}>
                                            ลืมรหัสผ่าน?
                                        </a>
                                    </div>

                                    {formError && (
                                        <p style={{ fontSize: "0.85rem", color: "#D6335A", fontWeight: 600 }}>
                                            {formError}
                                        </p>
                                    )}

                                    <SubmitButton disabled={submitting}>
                                        {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ →"}
                                    </SubmitButton>

                                    <p
                                        style={{
                                            textAlign: "center",
                                            fontSize: "0.88rem",
                                            color: "#55688A",
                                        }}
                                    >
                                        ยังไม่มีบัญชี?{" "}
                                        <button
                                            type="button"
                                            onClick={() => setMode("register")}
                                            style={switchButtonStyle}
                                        >
                                            ลงทะเบียนที่นี่
                                        </button>
                                    </p>
                                </form>
                            ) : (
                                <form
                                    onSubmit={handleRegisterSubmit}
                                    style={{ display: "flex", flexDirection: "column", gap: 16 }}
                                >
                                    <div className="field-row" style={fieldRowStyle}>
                                        <Field label="ชื่อ">
                                            <input
                                                type="text"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                placeholder="ชื่อจริง"
                                                required
                                                style={inputStyle}
                                            />
                                        </Field>
                                        <Field label="นามสกุล">
                                            <input
                                                type="text"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                placeholder="นามสกุล"
                                                required
                                                style={inputStyle}
                                            />
                                        </Field>
                                    </div>

                                    <Field label={roleInfo.id}>
                                        <input
                                            type="text"
                                            value={studentCode}
                                            onChange={(e) => setStudentCode(e.target.value)}
                                            placeholder={roleInfo.ph}
                                            required
                                            style={inputStyle}
                                        />
                                    </Field>

                                    <div className="field-row" style={fieldRowStyle}>
                                        <Field label="อีเมล">
                                            <input
                                                type="email"
                                                value={regEmail}
                                                onChange={(e) => setRegEmail(e.target.value)}
                                                placeholder="name@example.com"
                                                required
                                                style={inputStyle}
                                            />
                                        </Field>
                                        <Field label="เบอร์โทรศัพท์">
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="08xxxxxxxx"
                                                required
                                                style={inputStyle}
                                            />
                                        </Field>
                                    </div>

                                    <PasswordField
                                        label="รหัสผ่าน"
                                        value={regPassword}
                                        onChange={(value) => setRegPassword(value)}
                                        show={showRegPassword}
                                        onToggle={() => setShowRegPassword((v) => !v)}
                                        placeholder="ตั้งรหัสผ่าน"
                                        hint="อย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวอักษรและตัวเลข"
                                    />

                                    <PasswordField
                                        label="ยืนยันรหัสผ่าน"
                                        value={confirmPassword}
                                        onChange={(value) => {
                                            setConfirmPassword(value);
                                            setConfirmError(false);
                                        }}
                                        show={showConfirmPassword}
                                        onToggle={() => setShowConfirmPassword((v) => !v)}
                                        placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                                        error={confirmError ? "รหัสผ่านไม่ตรงกัน กรุณาลองอีกครั้ง" : ""}
                                    />

                                    <label
                                        style={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            gap: 9,
                                            fontSize: "0.83rem",
                                            color: "#55688A",
                                            lineHeight: 1.55,
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            required
                                            style={{ accentColor: "#1C2B74", marginTop: 3 }}
                                        />
                                        <span>
                                            ฉันยอมรับ
                                            <a href="#!" onClick={(e) => e.preventDefault()}>
                                                {" "}
                                                เงื่อนไขการใช้งาน
                                            </a>{" "}
                                            และ
                                            <a href="#!" onClick={(e) => e.preventDefault()}>
                                                {" "}
                                                นโยบายความเป็นส่วนตัว
                                            </a>
                                        </span>
                                    </label>

                                    {formError && (
                                        <p style={{ fontSize: "0.85rem", color: "#D6335A", fontWeight: 600 }}>
                                            {formError}
                                        </p>
                                    )}

                                    <SubmitButton disabled={submitting}>
                                        {submitting ? "กำลังลงทะเบียน..." : "ลงทะเบียน →"}
                                    </SubmitButton>

                                    <p
                                        style={{
                                            textAlign: "center",
                                            fontSize: "0.88rem",
                                            color: "#55688A",
                                        }}
                                    >
                                        มีบัญชีอยู่แล้ว?{" "}
                                        <button
                                            type="button"
                                            onClick={() => setMode("login")}
                                            style={switchButtonStyle}
                                        >
                                            เข้าสู่ระบบ
                                        </button>
                                    </p>
                                </form>
                            )}
                        </div>
                    </div>

                    <div
                        style={{
                            marginTop: 22,
                            background: "#FFC839",
                            color: "#6B4B00",
                            borderRadius: 16,
                            padding: "16px 22px",
                            fontSize: "0.9rem",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        📢 <span>{copy.alert}</span>
                    </div>
                </main>

                {/* Toast */}
                {toast && (
                    <div
                        style={{
                            position: "fixed",
                            bottom: 22,
                            left: "50%",
                            transform: "translateX(-50%)",
                            background: "#1C2B74",
                            color: "#fff",
                            padding: "12px 20px",
                            borderRadius: 999,
                            fontSize: "0.85rem",
                            boxShadow: "0 10px 30px rgba(16,29,92,0.3)",
                            zIndex: 50,
                        }}
                    >
                        {toast}
                    </div>
                )}
            </div>
        </div>
    );
}

const inputStyle = {
    width: "100%",
    fontFamily: "inherit",
    fontSize: "0.95rem",
    padding: "12px 14px",
    border: "1.5px solid #E1E9F5",
    borderRadius: 12,
    background: "#FAFCFF",
    color: "#16205A",
};

const fieldRowStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
};

const switchButtonStyle = {
    background: "none",
    border: "none",
    padding: 0,
    margin: 0,
    color: "#E31C79",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "inherit",
    fontFamily: "inherit",
};

function Field({ label, children }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: "0.83rem", fontWeight: 600, color: "#16205A" }}>
                {label}
            </label>
            {children}
        </div>
    );
}

function PasswordField({
    label,
    value,
    onChange,
    show,
    onToggle,
    hint,
    error,
    placeholder,
}) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: "0.83rem", fontWeight: 600, color: "#16205A" }}>
                {label}
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={onChange ? (e) => onChange(e.target.value) : undefined}
                    placeholder={placeholder || "รหัสผ่านของคุณ"}
                    required
                    style={{
                        ...inputStyle,
                        paddingRight: 42,
                        borderColor: error ? "#D6335A" : "#E1E9F5",
                        background: error ? "#FCEAF0" : "#FAFCFF",
                    }}
                />
                <button
                    type="button"
                    className="toggle-visibility"
                    onClick={onToggle}
                    aria-label="แสดงรหัสผ่าน"
                    style={{
                        position: "absolute",
                        right: 12,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 4,
                        color: "#55688A",
                        display: "flex",
                    }}
                >
                    <EyeIcon />
                </button>
            </div>
            {hint && (
                <span style={{ fontSize: "0.76rem", color: "#55688A" }}>{hint}</span>
            )}
            {error && (
                <span style={{ fontSize: "0.78rem", color: "#D6335A" }}>{error}</span>
            )}
        </div>
    );
}

function SubmitButton({ children, disabled }) {
    return (
        <button
            type="submit"
            className="btn-primary"
            disabled={disabled}
            style={{
                ...submitButtonStyle,
                opacity: disabled ? 0.6 : 1,
                cursor: disabled ? "not-allowed" : "pointer",
            }}
        >
            {children}
        </button>
    );
}

const submitButtonStyle = {
    marginTop: 4,
    background: "#1C2B74",
    color: "#fff",
    border: "none",
    padding: "14px 20px",
    borderRadius: 999,
    fontFamily: "'Prompt', 'Sarabun', sans-serif",
    fontSize: "0.97rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
};

export default Login;