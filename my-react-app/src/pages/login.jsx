import { useState } from 'react'
//import { supabase } from '../lib/supabase'
import loginBG from "../assets/loginBG.png";

function Login({ setUser, goAfterLogin, goHome, goRegister }) {
  const [role, setRole] = useState('student')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
  e.preventDefault()

  if (!username.trim() || !password.trim()) {
    alert('กรุณากรอกรหัสผู้ใช้และรหัสผ่าน')
    return
  }

  setLoading(true)

  try {
    const response = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username.trim(),
        password: password.trim(),
        role: role,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      alert(result.message)
      return
    }

    const data = result

    const loggedInUser = {
      id: data.user_id,
      username: data.username,
      role: data.role_code === "ADMIN" ? "staff" : "student",
      name: `${data.prefix || ""}${data.firstname || ""} ${data.lastname || ""}`.trim(),
      email: data.email,
      citizenId: data.citizen_id,
      birthDate: data.birth_date,
      phone: data.phone_no,
      faculty: data.faculty,
      major: data.major,
    }

    setUser(loggedInUser)
    goAfterLogin(loggedInUser)

  } catch (err) {
    console.error(err)
    alert("เชื่อมต่อฐานข้อมูลไม่ได้")
  } finally {
    setLoading(false)
  }
}

  const handleGoRegister = () => {
    setLoading(false)
    if (goRegister) {
      goRegister()
    } else {
      alert('ไม่พบคำสั่งไปหน้าลงทะเบียน ตรวจสอบ App.jsx')
    }
  }

  const handleGoHome = () => {
    setLoading(false)
    if (goHome) {
      goHome()
    } else {
      alert('ไม่พบคำสั่งกลับหน้าหลัก ตรวจสอบ App.jsx')
    }
  }

  return (
    <div
  className="min-h-screen bg-cover bg-center bg-no-repeat"
  style={{
    backgroundImage: `url(${loginBG})`,
  }}
>
  <div className="min-h-screen bg-black/50 flex items-center justify-center p-6">
    <form
      onSubmit={handleLogin}
      className="w-full max-w-lg bg-white/10 backdrop-blur-xl rounded-[36px] overflow-hidden shadow-2xl border border-white/20"
    >
        <div className="bg-[#050b59] text-white px-8 py-6">
          <h1 className="text-2xl font-black">
            PSU ระบบจัดการข้อมูลผู้กู้ยืมเงิน
          </h1>
          <p className="text-sm opacity-80">
            มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตหาดใหญ่
          </p>
        </div>

        <div className="p-8 text-white">
          <h2 className="text-4xl font-black text-center">ยินดีต้อนรับ</h2>

          <p className="text-center opacity-80 mt-2">
            เข้าสู่ระบบเพื่อใช้งาน
          </p>

          <div className="grid grid-cols-2 gap-3 mt-8">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`py-3 rounded-2xl font-black transition ${
                role === 'student'
                  ? 'bg-white text-[#07116f]'
                  : 'bg-white/10 text-white'
              }`}
            >
              นักศึกษา
            </button>

            <button
              type="button"
              onClick={() => setRole('staff')}
              className={`py-3 rounded-2xl font-black transition ${
                role === 'staff'
                  ? 'bg-white text-[#07116f]'
                  : 'bg-white/10 text-white'
              }`}
            >
              เจ้าหน้าที่
            </button>
          </div>

          <div className="mt-6">
            <label className="font-bold">
              {role === 'student' ? 'รหัสนักศึกษา' : 'รหัสเจ้าหน้าที่'}
            </label>

            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full mt-2 bg-white/15 border border-white/20 rounded-2xl px-5 py-4 outline-none"
              placeholder={role === 'student' ? '6610210707' : 'staff001'}
              required
            />
          </div>

          <div className="mt-5">
            <label className="font-bold">รหัสผ่าน</label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-2 bg-white/15 border border-white/20 rounded-2xl px-5 py-4 outline-none"
              placeholder="123456"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-8 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 py-4 rounded-2xl font-black transition"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>

          <button
            type="button"
            onClick={handleGoRegister}
            className="w-full mt-4 border border-white/30 py-4 rounded-2xl font-bold hover:bg-white/10 transition"
          >
            ยังไม่มีบัญชี? ลงทะเบียน
          </button>

          <button
            type="button"
            onClick={handleGoHome}
            className="w-full mt-4 text-white/80 font-bold hover:text-white transition"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </form>
    </div>
    </div>
  )
}

export default Login;