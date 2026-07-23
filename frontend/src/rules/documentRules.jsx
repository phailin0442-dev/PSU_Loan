export const DOCUMENT_TYPES = {
    GPAX_EVIDENCE: "หลักฐานผลการเรียน GPAX",
    VOLUNTEER_EVIDENCE: "หลักฐานชั่วโมงจิตอาสา",

    LOAN_CONTRACT: "สัญญากู้ยืมเงิน",
    WITHDRAWAL_FORM: "ใบเบิกเงิน",
    STUDENT_ID_CARD: "สำเนาบัตรประจำตัวประชาชนผู้กู้",
    PARENT_ID_CARD:
        "สำเนาบัตรประจำตัวประชาชนผู้ปกครอง",
    PARENT_PHOTO:
        "รูปถ่ายผู้ปกครองขณะลงนาม",
};

export const QUALIFICATION_TYPES = {
    GPAX_EVIDENCE:
        DOCUMENT_TYPES.GPAX_EVIDENCE,

    VOLUNTEER_EVIDENCE:
        DOCUMENT_TYPES.VOLUNTEER_EVIDENCE,
};

export function normalizeBorrowerTypeCode(
    studentOrCode
) {
    const rawCode =
        typeof studentOrCode === "string"
            ? studentOrCode
            : studentOrCode?.borrowerTypeCode ||
            studentOrCode?.loanTypeCode ||
            studentOrCode?.borrowerType ||
            studentOrCode?.loanTypeName ||
            "";

    const code = String(rawCode)
        .trim()
        .toUpperCase();

    if (
        code === "NEW_BORROWER" ||
        code === "NEW" ||
        code.includes("รายใหม่")
    ) {
        return "NEW_BORROWER";
    }

    if (
        code === "CONTINUING_SPECIAL" ||
        code === "SPECIAL" ||
        code.includes("กรณีพิเศษ") ||
        code.includes("เกินหลักสูตร") ||
        code.includes("ย้ายสาขา") ||
        code.includes("ต่อเนื่องจากมัธยม")
    ) {
        return "CONTINUING_SPECIAL";
    }

    if (
        code === "CONTINUING_YEAR" ||
        code === "CONTINUING" ||
        code.includes("เลื่อนชั้นปี") ||
        code.includes("รายเก่า")
    ) {
        return "CONTINUING_YEAR";
    }

    return code;
}

export function getBorrowerTypeLabel(
    studentOrCode
) {
    const code =
        normalizeBorrowerTypeCode(
            studentOrCode
        );

    const labels = {
        NEW_BORROWER: "ผู้กู้รายใหม่",

        CONTINUING_SPECIAL:
            "ผู้กู้ต่อเนื่องกรณีพิเศษ",

        CONTINUING_YEAR:
            "ผู้กู้ต่อเนื่องเลื่อนชั้นปี",
    };

    return (
        labels[code] ||
        studentOrCode?.loanTypeName ||
        studentOrCode?.borrowerType ||
        "-"
    );
}

export function requiresQualificationCheck(
    student
) {
    const semester = Number(
        student?.semester || 1
    );

    return semester === 1;
}

export function getQualificationCategories(
    student
) {
    if (
        !requiresQualificationCheck(student)
    ) {
        return [];
    }

    return [
        "GPAX_EVIDENCE",
        "VOLUNTEER_EVIDENCE",
    ];
}

export function getRequiredDocumentCategories(
    student
) {
    const semester = Number(
        student?.semester || 1
    );

    const borrowerTypeCode =
        normalizeBorrowerTypeCode(student);

    const age = Number(
        student?.age || 0
    );

    const categories = [];

    if (semester === 1) {
        if (
            borrowerTypeCode ===
            "NEW_BORROWER" ||
            borrowerTypeCode ===
            "CONTINUING_SPECIAL"
        ) {
            categories.push(
                "LOAN_CONTRACT",
                "WITHDRAWAL_FORM",
                "STUDENT_ID_CARD"
            );
        }

        if (
            borrowerTypeCode ===
            "CONTINUING_YEAR"
        ) {
            categories.push(
                "WITHDRAWAL_FORM",
                "STUDENT_ID_CARD"
            );
        }
    }

    if (semester === 2) {
        categories.push(
            "WITHDRAWAL_FORM",
            "STUDENT_ID_CARD"
        );
    }

    if (age > 0 && age < 20) {
        categories.push(
            "PARENT_ID_CARD",
            "PARENT_PHOTO"
        );
    }

    return [...new Set(categories)];
}

export function getDocumentByCategory(
    documents = [],
    category
) {
    if (!Array.isArray(documents)) {
        return null;
    }

    return (
        documents.find(
            (document) =>
                document?.category === category
        ) || null
    );
}

export function normalizeStatus(
    status
) {
    const value = String(
        status || ""
    )
        .trim()
        .toLowerCase();

    if (
        value === "ผ่าน" ||
        value === "approved" ||
        value === "approve" ||
        value === "pass" ||
        value === "accepted"
    ) {
        return "ผ่าน";
    }

    if (
        value === "ต้องแก้ไข" ||
        value === "rejected" ||
        value === "reject" ||
        value === "revision" ||
        value === "แก้ไข"
    ) {
        return "ต้องแก้ไข";
    }

    if (
        value === "รอตรวจสอบ" ||
        value === "pending" ||
        value === "waiting" ||
        value === ""
    ) {
        return "รอตรวจสอบ";
    }

    return status || "รอตรวจสอบ";
}

export function getDocumentCompletion(
    student
) {
    const requiredCategories =
        getRequiredDocumentCategories(student);

    const documents = Array.isArray(
        student?.documents
    )
        ? student.documents
        : [];

    const uploadedCategories =
        requiredCategories.filter(
            (category) =>
                documents.some(
                    (document) =>
                        document?.category ===
                        category &&
                        Boolean(
                            document?.fileName ||
                            document?.file ||
                            document?.url
                        )
                )
        );

    const approvedCategories =
        requiredCategories.filter(
            (category) => {
                const document =
                    getDocumentByCategory(
                        documents,
                        category
                    );

                return (
                    normalizeStatus(
                        document?.status
                    ) === "ผ่าน"
                );
            }
        );

    const rejectedCategories =
        requiredCategories.filter(
            (category) => {
                const document =
                    getDocumentByCategory(
                        documents,
                        category
                    );

                return (
                    normalizeStatus(
                        document?.status
                    ) === "ต้องแก้ไข"
                );
            }
        );

    const total =
        requiredCategories.length;

    const uploaded =
        uploadedCategories.length;

    const approved =
        approvedCategories.length;

    const rejected =
        rejectedCategories.length;

    const percentage =
        total === 0
            ? 100
            : Math.round(
                (uploaded / total) * 100
            );

    return {
        total,
        uploaded,
        approved,
        rejected,
        pending:
            Math.max(
                total -
                approved -
                rejected,
                0
            ),

        percentage,

        completed:
            total === 0 ||
            uploaded === total,

        allApproved:
            total === 0 ||
            approved === total,

        requiredCategories,
        uploadedCategories,
        approvedCategories,
        rejectedCategories,
    };
}