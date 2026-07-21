const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDirectory = path.join(
    __dirname,
    "..",
    "uploads",
    "eligibility"
);

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, {
        recursive: true,
    });
}

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, uploadDirectory);
    },

    filename: (req, file, callback) => {
        const originalExtension = path.extname(file.originalname).toLowerCase();

        const safeFieldName = file.fieldname.replace(/[^a-zA-Z0-9_-]/g, "");

        const uniqueName = `${safeFieldName}-${Date.now()}-${Math.round(
            Math.random() * 1000000
        )}${originalExtension}`;

        callback(null, uniqueName);
    },
});

const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
];

const fileFilter = (req, file, callback) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        callback(null, true);
    } else {
        callback(
            new Error("รองรับเฉพาะไฟล์ PDF, JPG, JPEG และ PNG เท่านั้น"),
            false
        );
    }
};

const upload = multer({
    storage,
    fileFilter,

    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});

module.exports = upload;