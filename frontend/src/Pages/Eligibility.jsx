import { useState } from 'react'

function calculateAge(birthdate) {
  if (!birthdate) return 0

  let day
  let month
  let year

  if (birthdate.includes('/')) {
    const parts = birthdate.split('/').map(Number)
    day = parts[0]
    month = parts[1]
    year = parts[2]
  } else if (birthdate.includes('-')) {
    const parts = birthdate.split('-').map(Number)
    year = parts[0]
    month = parts[1]
    day = parts[2]
  } else {
    return 0
  }

  if (!day || !month || !year) return 0

  if (year > 2400) {
    year = year - 543
  }

  const birth = new Date(year, month - 1, day)
  const today = new Date()

  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age--
  }

  return age > 0 && age < 120 ? age : 0
}

function Eligibility({ setPage, setLoanData, studentData }) {
  const [loanType, setLoanType] = useState('new')
  const [gpax, setGpax] = useState('')
  const [volunteerHours, setVolunteerHours] = useState('')
  const [gpaxFile, setGpaxFile] = useState(null)
  const [volunteerFile, setVolunteerFile] = useState(null)
  const [result, setResult] = useState(null)

  const age = calculateAge(studentData?.birthdate)

  const getVolunteerMin = () => {
    if (loanType === 'new') return 2
    return 36
  }

  const getLoanTypeText = () => {
    if (loanType === 'new') return 'ผู้กู้รายใหม่'
    if (loanType === 'continue') return 'ผู้กู้รายเก่าเลื่อนชั้นปี'
    return 'ผู้กู้ย้ายสาขา / กู้เกินหลักสูตร'
  }

  const handleCheck = () => {
    const minHour = getVolunteerMin()
    const errors = []

    if (!age) {
      errors.push('กรุณาตรวจสอบวันเดือนปีเกิดให้ถูกต้อง เช่น 12/08/2547')
    }

    if (!gpax) {
      errors.push('กรุณากรอกเกรดเฉลี่ยสะสม GPAX')
    } else if (Number(gpax) < 1.8) {
      errors.push('เกรดเฉลี่ยสะสมต้องไม่ต่ำกว่า 1.80')
    }

    if (!volunteerHours) {
      errors.push('กรุณากรอกจำนวนชั่วโมงจิตอาสา')
    } else if (Number(volunteerHours) < minHour) {
      errors.push(`ชั่วโมงจิตอาสาต้องไม่น้อยกว่า ${minHour} ชั่วโมง`)
    }

    if (!gpaxFile) errors.push('กรุณาแนบไฟล์หลักฐาน GPAX')
    if (!volunteerFile) errors.push('กรุณาแนบไฟล์หลักฐานชั่วโมงจิตอาสา')

    const pass = errors.length === 0

    setResult({ pass, errors, minHour })

    if (pass) {
      setLoanData({
        loanType,
        loanTypeText: getLoanTypeText(),
        gpax,
        volunteerHours,
        age,
        isAdult: age >= 20,
        gpaxFile,
        volunteerFile,
      })

      setTimeout(() => {
        alert("ผ่านการคัดกรองคุณสมบัติแล้ว");
      }, 500);
    }
  }

  return (
    <div className="min-h-screen bg-[#eef5ff] text-[#07116f]">
      <main className="max-w-5xl mx-auto px-8 py-8">
        <p className="text-sm font-bold text-blue-500">ขั้นตอนที่ 2 จาก 2</p>

        <h2 className="text-3xl font-black mt-1">คุณสมบัติเบื้องต้น</h2>

        <p className="text-gray-500 mt-1">
          ระบบคำนวณอายุจากวันเดือนปีเกิดอัตโนมัติ: อายุ {age || '-'} ปี
        </p>

        <section className="bg-white border-2 border-[#07116f] rounded-xl mt-6 overflow-hidden shadow">
          <div className="bg-[#07116f] text-white px-6 py-3 font-bold">
            ข้อมูลสำหรับการกู้ยืม
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-black mb-3">1. ประเภทผู้กู้ยืม</h3>

              <LoanTypeOption checked={loanType === 'new'} onChange={() => setLoanType('new')} title="ผู้กู้รายใหม่" desc="ชั่วโมงจิตอาสาไม่น้อยกว่า 2 ชั่วโมง" />
              <LoanTypeOption checked={loanType === 'continue'} onChange={() => setLoanType('continue')} title="ผู้กู้รายเก่าเลื่อนชั้นปี" desc="ชั่วโมงจิตอาสาไม่น้อยกว่า 36 ชั่วโมง" />
              <LoanTypeOption checked={loanType === 'transfer'} onChange={() => setLoanType('transfer')} title="ผู้กู้ย้ายสาขา / กู้เกินหลักสูตร" desc="ชั่วโมงจิตอาสาไม่น้อยกว่า 36 ชั่วโมง" />
            </div>

            <div className="border-2 border-[#07116f] rounded-xl p-5">
              <h3 className="font-black mb-3">2. เกรดเฉลี่ยสะสม GPAX</h3>

              <input
                value={gpax}
                onChange={(e) => setGpax(e.target.value)}
                className="w-full border rounded-lg px-4 py-3"
                placeholder="เช่น 2.48"
                type="number"
                step="0.01"
              />

              <p className="text-sm mt-2 text-gray-500">
                ผู้กู้ทุกประเภทต้องมี GPAX ไม่ต่ำกว่า 1.80
              </p>

              <label className="mt-4 flex items-center justify-center border-2 border-dashed rounded-lg h-24 text-gray-500 cursor-pointer hover:bg-blue-50">
                <input type="file" className="hidden" onChange={(e) => setGpaxFile(e.target.files?.[0] || null)} />
                {gpaxFile ? gpaxFile.name : 'แนบไฟล์หลักฐาน GPAX'}
              </label>
            </div>

            <div className="border-2 border-[#07116f] rounded-xl p-5">
              <h3 className="font-black mb-3">3. ชั่วโมงจิตอาสา</h3>

              <input
                value={volunteerHours}
                onChange={(e) => setVolunteerHours(e.target.value)}
                className="w-full border rounded-lg px-4 py-3"
                placeholder="เช่น 36"
                type="number"
              />

              <p className="text-sm mt-2 text-gray-500">
                ประเภทนี้ต้องมีชั่วโมงจิตอาสาไม่น้อยกว่า {getVolunteerMin()} ชั่วโมง
              </p>

              <label className="mt-4 flex items-center justify-center border-2 border-dashed rounded-lg h-24 text-gray-500 cursor-pointer hover:bg-blue-50">
                <input type="file" className="hidden" onChange={(e) => setVolunteerFile(e.target.files?.[0] || null)} />
                {volunteerFile ? volunteerFile.name : 'แนบไฟล์หลักฐานชั่วโมงจิตอาสา'}
              </label>
            </div>

            {result && !result.pass && (
              <div className="bg-red-50 border border-red-300 text-red-600 rounded-xl p-4">
                <p className="font-black mb-2">ไม่ผ่านการคัดกรอง เนื่องจาก:</p>
                <ul className="list-disc ml-6 space-y-1">
                  {result.errors.map((err, index) => <li key={index}>{err}</li>)}
                </ul>
              </div>
            )}

            {result && result.pass && (
              <div className="bg-green-50 border border-green-300 text-green-700 rounded-xl p-4 font-bold">
                ผ่านการคัดกรอง กำลังไปยังหน้าอัปโหลดเอกสาร...
              </div>
            )}

            <div className="mt-8 flex flex-col sm:flex-row gap-4 items-stretch">
              <button
                type="button"
                onClick={() => setPage("home")}
                className="h-14 sm:w-44 rounded-2xl bg-white border border-gray-200 text-gray-700 font-bold shadow-sm hover:bg-gray-50 hover:shadow-md transition-all"
              >
                ← กลับ
              </button>

              <button
                type="button"
                onClick={handleCheck}
                className="h-14 flex-1 rounded-2xl bg-gradient-to-r from-[#0646ff] to-[#006dff] text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                ตรวจสอบคุณสมบัติ →
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function LoanTypeOption({ checked, onChange, title, desc }) {
  return (
    <label className={`flex gap-3 border rounded-lg p-4 mb-3 cursor-pointer ${checked ? 'border-blue-600 bg-blue-50' : 'hover:border-blue-400'}`}>
      <input type="radio" checked={checked} onChange={onChange} />
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </label>
  )
}

export default Eligibility