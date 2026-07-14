import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/login.css";
import BgPSU from "./assets/LoginBG.png";
import LogoPSU from "./assets/LOGOPSU.png";

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab]           = useState("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");

  function handleLogin() {
    setError("");

    if (tab === "student") {
      // โรลนักศึกษา
      if (username === "1111" && password === "1111") {
        navigate("/student/home");
    } else {
        setError("รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง");
      }
    } else {
      // โรลเจ้าหน้าที่
      if (username === "2222" && password === "2222") {
        navigate("/dashboard");
      } else {
        setError("รหัสเจ้าหน้าที่หรือรหัสผ่านไม่ถูกต้อง");
      }
    }
  }

  return (
    <div className="lg-page" style={{ backgroundImage: `url(${BgPSU})` }}>
      <div className="lg-overlay" />

      <div className="lg-logo">
        <img src={LogoPSU} alt="PSU Logo" className="lg-logo-badge" />
        <div>
          <div className="lg-logo-title">ระบบจัดการข้อมูลผู้กู้ยืมเงิน</div>
          <div className="lg-logo-sub">มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตหาดใหญ่</div>
        </div>
      </div>

      <div className="lg-card">
        <h1 className="lg-heading">ยินดีต้อนรับ</h1>

        <div className="lg-tabs">
          <button
            className={`lg-tab ${tab === "student" ? "active" : ""}`}
            onClick={() => { setTab("student"); setError(""); }}
          >
            นักศึกษา
          </button>
          <button
            className={`lg-tab ${tab === "admin" ? "active" : ""}`}
            onClick={() => { setTab("admin"); setError(""); }}
          >
            เจ้าหน้าที่ (Admin)
          </button>
        </div>

        <div className="lg-info-banner">
          <i className="ti ti-info-circle" aria-hidden="true" />
          ใช้อีเมลและรหัสผ่าน มหาวิทยาลัย (PSU Passport) ในการเข้าสู่ระบบ
        </div>

        <div className="lg-form">
          <div className="lg-field-label">
            {tab === "admin" ? "รหัสเจ้าหน้าที่ (Admin)" : "รหัสนักศึกษา"}
          </div>
          <div className="lg-input-wrap">
            <i className="ti ti-user lg-input-icon" aria-hidden="true" />
            <input
              className="lg-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="lg-field-label">รหัสผ่าน</div>
          <div className="lg-input-wrap">
            <i className="ti ti-lock lg-input-icon" aria-hidden="true" />
            <input
              className="lg-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="lg-error">
              <i className="ti ti-alert-circle" aria-hidden="true" />
              {error}
            </div>
          )}

          <button className="lg-submit-btn" onClick={handleLogin}>
            เข้าสู่ระบบ
          </button>
        </div>
      </div>
    </div>
  );
}