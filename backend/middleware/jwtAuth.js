const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me"; // ต้องตรงกับ routes/auth.js

function requireLogin(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        console.log("JWT: ไม่มี token แนบมากับคำขอ", req.method, req.originalUrl);
        return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบก่อนใช้งาน" });
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        return next();
    } catch (err) {
        // แสดงสาเหตุจริงใน terminal ของ backend (ไม่ส่งไปให้ผู้ใช้เห็น)
        console.log("JWT ตรวจไม่ผ่าน:", err.name, "-", err.message, "|", req.method, req.originalUrl);
        return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            console.log("JWT: role ไม่มีสิทธิ์", req.user?.role, "ต้องเป็น", roles.join("/"), "|", req.originalUrl);
            return res.status(403).json({ success: false, code: "FORBIDDEN", message: "หน้านี้สำหรับเจ้าหน้าที่เท่านั้น" });
        }
        return next();
    };
}

module.exports = { requireLogin, requireRole };