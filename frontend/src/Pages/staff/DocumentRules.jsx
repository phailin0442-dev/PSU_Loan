export const DOCUMENT_TYPES = {
    GPAX_EVIDENCE: "หลักฐานผลการเรียน GPAX",
    VOLUNTEER_EVIDENCE: "หลักฐานชั่วโมงจิตอาสา",
    LOAN_CONTRACT: "สัญญากู้ยืมเงิน",
    WITHDRAWAL_FORM: "ใบเบิกเงิน",
    STUDENT_ID_CARD: "สำเนาบัตรประจำตัวประชาชนผู้กู้",
    PARENT_PHOTO: "รูปถ่ายผู้ปกครอง",
    PARENT_ID_CARD: "สำเนาบัตรประจำตัวประชาชนผู้ปกครอง",
};

export function getBorrowerTypeLabel(code, fallback = "") {
    const labels = {
        NEW: "ผู้กู้รายใหม่",
        CONTINUING_SPECIAL: "ผู้กู้ต่อเนื่องกรณีพิเศษ",
        CONTINUING_YEAR: "ผู้กู้ต่อเนื่องเลื่อนชั้นปี",
    };

    return labels[code] || fallback || code || "-";
}

export function requiresQualificationCheck(semester) {
    return Number(semester) === 1;
}

export function getRequiredDocumentCategories(student) {
    const semester = Number(student?.semester);
    const borrowerTypeCode = student?.borrowerTypeCode;
    const age = Number(student?.age);

    const required = [];

    if (semester === 1) {
        required.push("GPAX_EVIDENCE", "VOLUNTEER_EVIDENCE");

        if (
            borrowerTypeCode === "NEW" ||
            borrowerTypeCode === "CONTINUING_SPECIAL"
        ) {
            required.push(
                "LOAN_CONTRACT",
                "WITHDRAWAL_FORM",
                "STUDENT_ID_CARD"
            );
        }

        if (borrowerTypeCode === "CONTINUING_YEAR") {
            required.push("WITHDRAWAL_FORM", "STUDENT_ID_CARD");
        }
    }

    if (semester === 2) {
        required.push("WITHDRAWAL_FORM", "STUDENT_ID_CARD");
    }

    if (age < 20) {
        required.push("PARENT_PHOTO", "PARENT_ID_CARD");
    }

    return [...new Set(required)];
}

export function getDocumentByCategory(documents = [], category) {
    return documents.find(
        (document) => document.category === category
    );
}

export function getDocumentCompletion(student) {
    const required = getRequiredDocumentCategories(student);
    const documents = student?.documents || [];

    const completed = required.filter((category) =>
        getDocumentByCategory(documents, category)
    ).length;

    return {
        required,
        completed,
        missing: required.filter(
            (category) =>
                !getDocumentByCategory(documents, category)
        ),
    };
}

export function normalizeStatus(status) {
    const value = String(status || "").trim();

    if (
        ["ผ่าน", "ผ่านแล้ว", "อนุมัติ", "ตรวจผ่านแล้ว"].includes(
            value
        )
    ) {
        return "ผ่าน";
    }

    if (
        ["ต้องแก้ไข", "ต้องแก้ไขเอกสาร", "ตีกลับ"].includes(
            value
        )
    ) {
        return "ต้องแก้ไข";
    }

    return "รอตรวจสอบ";
}
