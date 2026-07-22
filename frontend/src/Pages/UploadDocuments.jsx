import { useEffect, useMemo, useState } from "react";

/*
|--------------------------------------------------------------------------
| ตั้งค่าไฟล์
|--------------------------------------------------------------------------
*/

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const ALLOWED_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
];

const FILE_ACCEPT = ".pdf,.jpg,.jpeg,.png";

/*
|--------------------------------------------------------------------------
| นักศึกษาสำรอง
|--------------------------------------------------------------------------
*/

const defaultStudent = {
  id: 1,
  studentId: 1001,
  studentCode: "6810110001",

  prefix: "นางสาว",
  firstName: "ณัฐณิชา",
  lastName: "ศรีสุข",
  fullName: "นางสาวณัฐณิชา ศรีสุข",

  birthDate: "2008-02-15",
  age: 18,

  faculty: "คณะวิทยาศาสตร์",
  major: "วิทยาการคอมพิวเตอร์",
  yearLevel: 1,

  phone: "0812345678",
  email: "6810110001@psu.ac.th",

  loanTypeCode: "NEW_BORROWER",
  loanTypeName: "ผู้กู้รายใหม่",
  loanTypeGroup: 1,

  academicYear: "2569",
  semester: 1,

  gpax: 3.12,
  volunteerHours: 8,

  eligibilityStatus: "ผ่าน",
  applicationStatus: "รออัปโหลดเอกสาร",

  requiresParentDocuments: true,
};

/*
|--------------------------------------------------------------------------
| เอกสารพื้นฐาน
|--------------------------------------------------------------------------
*/

const commonDocuments = [
  {
    code: "GPAX_EVIDENCE",
    name: "หลักฐานผลการเรียน GPAX",
    description:
      "เอกสารผลการเรียนที่แสดงเกรดเฉลี่ยสะสมของนักศึกษาอย่างชัดเจน",
    required: true,
  },
  {
    code: "VOLUNTEER_EVIDENCE",
    name: "หลักฐานชั่วโมงจิตอาสา",
    description:
      "เอกสารหรือภาพหลักฐานที่แสดงกิจกรรมและจำนวนชั่วโมงจิตอาสาครบถ้วน",
    required: true,
  },
];

/*
|--------------------------------------------------------------------------
| เอกสารตามประเภทผู้กู้
|--------------------------------------------------------------------------
*/

const documentTemplates = {
  NEW_BORROWER: [
    ...commonDocuments,
    {
      code: "STUDENT_ID_CARD",
      name: "สำเนาบัตรประชาชนของนักศึกษา",
      description:
        "สำเนาบัตรประชาชนที่ยังไม่หมดอายุและมองเห็นข้อมูลได้ชัดเจน",
      required: true,
    },
    {
      code: "LOAN_CONTRACT",
      name: "สัญญากู้ยืมเงิน",
      description:
        "สัญญากู้ยืมเงินเพื่อการศึกษาที่กรอกข้อมูลและลงนามครบถ้วน",
      required: true,
    },
    {
      code: "WITHDRAWAL_FORM",
      name: "ใบเบิกเงินกู้ยืม",
      description:
        "ใบเบิกเงินกู้ยืมประจำปีการศึกษาและภาคการศึกษาปัจจุบัน",
      required: true,
    },
  ],

  CONTINUING_SPECIAL: [
    ...commonDocuments,
    {
      code: "STUDENT_ID_CARD",
      name: "สำเนาบัตรประชาชนของนักศึกษา",
      description:
        "สำเนาบัตรประชาชนที่ยังไม่หมดอายุและมองเห็นข้อมูลได้ชัดเจน",
      required: true,
    },
    {
      code: "LOAN_CONTRACT",
      name: "สัญญากู้ยืมเงิน",
      description:
        "ใช้สำหรับผู้กู้ต่อเนื่องจากมัธยม ย้ายสาขา หรือกรณีเกินหลักสูตร",
      required: true,
    },
    {
      code: "WITHDRAWAL_FORM",
      name: "ใบเบิกเงินกู้ยืม",
      description:
        "ใบเบิกเงินกู้ยืมประจำปีการศึกษาและภาคการศึกษาปัจจุบัน",
      required: true,
    },
  ],

  CONTINUING_CURRENT: [
    ...commonDocuments,
    {
      code: "STUDENT_ID_CARD",
      name: "สำเนาบัตรประชาชนของนักศึกษา",
      description:
        "สำเนาบัตรประชาชนที่ยังไม่หมดอายุและมองเห็นข้อมูลได้ชัดเจน",
      required: true,
    },
    {
      code: "WITHDRAWAL_FORM",
      name: "ใบเบิกเงินกู้ยืม",
      description:
        "ใบเบิกเงินกู้ยืมสำหรับผู้กู้ต่อเนื่องเลื่อนชั้นปี",
      required: true,
    },
  ],
};

/*
|--------------------------------------------------------------------------
| เอกสารผู้ปกครอง
|--------------------------------------------------------------------------
*/

const parentDocuments = [
  {
    code: "PARENT_ID_CARD",
    name: "สำเนาบัตรประชาชนของผู้ปกครอง",
    description:
      "ใช้สำหรับนักศึกษาที่มีอายุต่ำกว่า 20 ปี โดยข้อมูลต้องมองเห็นได้ชัดเจน",
    required: true,
  },
  {
    code: "PARENT_PHOTO",
    name: "รูปถ่ายผู้ปกครองขณะลงนาม",
    description:
      "รูปถ่ายผู้ปกครองขณะลงนาม โดยต้องเห็นบุคคลและเอกสารอย่างชัดเจน",
    required: true,
  },
];

/*
|--------------------------------------------------------------------------
| ฟังก์ชันอ่านข้อมูลนักศึกษา
|--------------------------------------------------------------------------
*/

function getSelectedStudent() {
  try {
    const savedStudent = localStorage.getItem(
      "selectedMockStudent"
    );

    if (!savedStudent) {
      return defaultStudent;
    }

    const parsedStudent = JSON.parse(savedStudent);

    return {
      ...defaultStudent,
      ...parsedStudent,
    };
  } catch (error) {
    console.error(
      "ไม่สามารถอ่านข้อมูลนักศึกษาได้:",
      error
    );

    return defaultStudent;
  }
}

/*
|--------------------------------------------------------------------------
| ฟังก์ชันอ่านแบบร่าง
|--------------------------------------------------------------------------
*/

function getDraftFiles(studentCode) {
  if (!studentCode) {
    return {};
  }

  try {
    const storageKey = `uploadDocumentsDraft_${studentCode}`;
    const savedDraft = localStorage.getItem(storageKey);

    if (!savedDraft) {
      return {};
    }

    const parsedDraft = JSON.parse(savedDraft);
    const restoredFiles = {};

    Object.entries(parsedDraft.files || {}).forEach(
      ([documentCode, fileData]) => {
        restoredFiles[documentCode] = {
          ...fileData,
          file: null,
          restoredFromDraft: true,
        };
      }
    );

    return restoredFiles;
  } catch (error) {
    console.error(
      "ไม่สามารถโหลดแบบร่างเอกสารได้:",
      error
    );

    return {};
  }
}

/*
|--------------------------------------------------------------------------
| Component หลัก
|--------------------------------------------------------------------------
*/

function UploadDocuments({
  goProtectedPage,
  setPage,
}) {
  const initialStudent = getSelectedStudent();

  const [student, setStudent] = useState(
    initialStudent
  );

  const [uploadedFiles, setUploadedFiles] =
    useState(() =>
      getDraftFiles(initialStudent.studentCode)
    );

  const [errors, setErrors] = useState({});
  const [draggingCode, setDraggingCode] =
    useState("");

  const [generalMessage, setGeneralMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("info");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [submitSuccess, setSubmitSuccess] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | รับการเปลี่ยนนักศึกษาจากหน้า Home
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleStudentChanged = (event) => {
      const changedStudent =
        event.detail || getSelectedStudent();

      const updatedStudent = {
        ...defaultStudent,
        ...changedStudent,
      };

      setStudent(updatedStudent);

      setUploadedFiles(
        getDraftFiles(updatedStudent.studentCode)
      );

      setErrors({});
      setGeneralMessage("");
      setMessageType("info");
      setSubmitSuccess(false);
    };

    window.addEventListener(
      "mockStudentChanged",
      handleStudentChanged
    );

    return () => {
      window.removeEventListener(
        "mockStudentChanged",
        handleStudentChanged
      );
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | รายการเอกสารที่ต้องใช้
  |--------------------------------------------------------------------------
  */

  const requiredDocuments = useMemo(() => {
    const baseDocuments =
      documentTemplates[student.loanTypeCode] ||
      documentTemplates.NEW_BORROWER;

    const needsParentDocuments =
      student.requiresParentDocuments === true ||
      Number(student.age) < 20;

    if (needsParentDocuments) {
      return [
        ...baseDocuments,
        ...parentDocuments,
      ];
    }

    return baseDocuments;
  }, [
    student.loanTypeCode,
    student.requiresParentDocuments,
    student.age,
  ]);

  /*
  |--------------------------------------------------------------------------
  | สรุปจำนวนเอกสาร
  |--------------------------------------------------------------------------
  */

  const uploadedCount = requiredDocuments.filter(
    (document) =>
      Boolean(uploadedFiles[document.code])
  ).length;

  const totalDocuments = requiredDocuments.length;

  const remainingCount =
    totalDocuments - uploadedCount;

  const progressPercent =
    totalDocuments === 0
      ? 0
      : Math.round(
          (uploadedCount / totalDocuments) * 100
        );

  const allRequiredFilesUploaded =
    requiredDocuments.length > 0 &&
    requiredDocuments
      .filter((document) => document.required)
      .every((document) =>
        Boolean(uploadedFiles[document.code])
      );

  /*
  |--------------------------------------------------------------------------
  | เปลี่ยนหน้า
  |--------------------------------------------------------------------------
  */

  const navigateTo = (targetPage) => {
    if (typeof goProtectedPage === "function") {
      goProtectedPage(targetPage);
      return;
    }

    if (typeof setPage === "function") {
      setPage(targetPage);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | ตรวจสอบไฟล์
  |--------------------------------------------------------------------------
  */

  const validateFile = (file) => {
    if (!file) {
      return "กรุณาเลือกไฟล์";
    }

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    const isAllowedType =
      ALLOWED_FILE_TYPES.includes(file.type);

    const isAllowedExtension =
      ALLOWED_EXTENSIONS.includes(extension);

    if (!isAllowedType && !isAllowedExtension) {
      return "รองรับเฉพาะไฟล์ PDF, JPG, JPEG และ PNG";
    }

    if (file.size > MAX_FILE_SIZE) {
      return "ไฟล์ต้องมีขนาดไม่เกิน 10 MB";
    }

    return "";
  };

  /*
  |--------------------------------------------------------------------------
  | เพิ่มไฟล์
  |--------------------------------------------------------------------------
  */

  const addFile = (documentCode, file) => {
    const validationError = validateFile(file);

    if (validationError) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [documentCode]: validationError,
      }));

      return;
    }

    setUploadedFiles((currentFiles) => ({
      ...currentFiles,

      [documentCode]: {
        file,
        fileName: file.name,
        fileSize: file.size,
        fileType:
          file.type ||
          "application/octet-stream",

        uploadedAt: new Date().toISOString(),
        status: "พร้อมส่ง",
        restoredFromDraft: false,
      },
    }));

    setErrors((currentErrors) => {
      const updatedErrors = {
        ...currentErrors,
      };

      delete updatedErrors[documentCode];

      return updatedErrors;
    });

    setGeneralMessage("");
    setMessageType("info");
    setSubmitSuccess(false);
  };

  /*
  |--------------------------------------------------------------------------
  | เลือกไฟล์
  |--------------------------------------------------------------------------
  */

  const handleFileChange = (
    event,
    documentCode
  ) => {
    const selectedFile =
      event.target.files?.[0];

    if (selectedFile) {
      addFile(documentCode, selectedFile);
    }

    event.target.value = "";
  };

  /*
  |--------------------------------------------------------------------------
  | ลากไฟล์
  |--------------------------------------------------------------------------
  */

  const handleDragOver = (
    event,
    documentCode
  ) => {
    event.preventDefault();
    setDraggingCode(documentCode);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDraggingCode("");
  };

  const handleDrop = (
    event,
    documentCode
  ) => {
    event.preventDefault();

    setDraggingCode("");

    const droppedFile =
      event.dataTransfer.files?.[0];

    if (droppedFile) {
      addFile(documentCode, droppedFile);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | ลบไฟล์
  |--------------------------------------------------------------------------
  */

  const removeFile = (documentCode) => {
    setUploadedFiles((currentFiles) => {
      const updatedFiles = {
        ...currentFiles,
      };

      delete updatedFiles[documentCode];

      return updatedFiles;
    });

    setErrors((currentErrors) => {
      const updatedErrors = {
        ...currentErrors,
      };

      delete updatedErrors[documentCode];

      return updatedErrors;
    });

    setGeneralMessage("");
    setMessageType("info");
    setSubmitSuccess(false);
  };

  /*
  |--------------------------------------------------------------------------
  | บันทึกแบบร่าง
  |--------------------------------------------------------------------------
  */

  const saveDraft = () => {
    if (uploadedCount === 0) {
      setGeneralMessage(
        "กรุณาเลือกไฟล์อย่างน้อย 1 รายการก่อนบันทึกแบบร่าง"
      );

      setMessageType("error");
      return;
    }

    const draftFiles = {};

    Object.entries(uploadedFiles).forEach(
      ([documentCode, fileData]) => {
        draftFiles[documentCode] = {
          fileName: fileData.fileName,
          fileSize: fileData.fileSize,
          fileType: fileData.fileType,
          uploadedAt: fileData.uploadedAt,
          status: "บันทึกแบบร่าง",
        };
      }
    );

    const draftData = {
      studentCode: student.studentCode,
      loanTypeCode: student.loanTypeCode,
      files: draftFiles,
      savedAt: new Date().toISOString(),
    };

    const storageKey = `uploadDocumentsDraft_${student.studentCode}`;

    localStorage.setItem(
      storageKey,
      JSON.stringify(draftData)
    );

    setGeneralMessage(
      "บันทึกข้อมูลแบบร่างเรียบร้อยแล้ว"
    );

    setMessageType("success");
    setSubmitSuccess(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /*
  |--------------------------------------------------------------------------
  | ส่งเอกสาร
  |--------------------------------------------------------------------------
  */

  const submitDocuments = async () => {
    const validationErrors = {};

    requiredDocuments.forEach((document) => {
      if (
        document.required &&
        !uploadedFiles[document.code]
      ) {
        validationErrors[document.code] =
          "กรุณาอัปโหลดเอกสารรายการนี้";
      }
    });

    if (
      Object.keys(validationErrors).length > 0
    ) {
      setErrors(validationErrors);

      setGeneralMessage(
        "กรุณาอัปโหลดเอกสารที่จำเป็นให้ครบทุกรายการ"
      );

      setMessageType("error");
      setSubmitSuccess(false);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    setIsSubmitting(true);
    setGeneralMessage("");
    setMessageType("info");

    try {
      /*
      |--------------------------------------------------------------------------
      | เชื่อม Backend ภายหลัง
      |--------------------------------------------------------------------------
      |
      | const formData = new FormData();
      |
      | formData.append(
      |   "studentCode",
      |   student.studentCode
      | );
      |
      | formData.append(
      |   "loanTypeCode",
      |   student.loanTypeCode
      | );
      |
      | Object.entries(uploadedFiles).forEach(
      |   ([documentCode, fileData]) => {
      |     if (fileData.file) {
      |       formData.append(
      |         documentCode,
      |         fileData.file
      |       );
      |     }
      |   }
      | );
      |
      | const response = await fetch(
      |   "http://localhost:3000/api/documents/upload",
      |   {
      |     method: "POST",
      |     body: formData,
      |   }
      | );
      |
      | if (!response.ok) {
      |   throw new Error(
      |     "ไม่สามารถส่งเอกสารได้"
      |   );
      | }
      |--------------------------------------------------------------------------
      */

      await new Promise((resolve) => {
        window.setTimeout(resolve, 800);
      });

      const submittedFiles = {};

      Object.entries(uploadedFiles).forEach(
        ([documentCode, fileData]) => {
          submittedFiles[documentCode] = {
            fileName: fileData.fileName,
            fileSize: fileData.fileSize,
            fileType: fileData.fileType,

            status: "รอตรวจสอบ",
            remark: "",

            versionNo: 1,
            isCurrent: true,

            submittedAt:
              new Date().toISOString(),
          };
        }
      );

      const submittedData = {
        studentCode: student.studentCode,
        studentName: student.fullName,

        loanTypeCode: student.loanTypeCode,
        loanTypeName: student.loanTypeName,

        academicYear: student.academicYear,
        semester: student.semester,

        applicationStatus:
          "รอตรวจสอบเอกสาร",

        files: submittedFiles,

        submittedAt:
          new Date().toISOString(),
      };

      localStorage.setItem(
        `submittedDocuments_${student.studentCode}`,
        JSON.stringify(submittedData)
      );

      localStorage.removeItem(
        `uploadDocumentsDraft_${student.studentCode}`
      );

      const updatedStudent = {
        ...student,

        applicationStatus:
          "รอตรวจสอบเอกสาร",

        currentStep: 3,
        documentCount: totalDocuments,
        rejectedDocumentCount: 0,

        latestNotification:
          "ส่งเอกสารเรียบร้อยแล้ว เจ้าหน้าที่กำลังตรวจสอบเอกสารของคุณ",
      };

      localStorage.setItem(
        "selectedMockStudent",
        JSON.stringify(updatedStudent)
      );

      window.dispatchEvent(
        new CustomEvent("mockStudentChanged", {
          detail: updatedStudent,
        })
      );

      setStudent(updatedStudent);
      setSubmitSuccess(true);

      setGeneralMessage(
        "ส่งเอกสารเรียบร้อยแล้ว กรุณารอเจ้าหน้าที่ตรวจสอบ"
      );

      setMessageType("success");
      setErrors({});

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(
        "เกิดข้อผิดพลาดขณะส่งเอกสาร:",
        error
      );

      setSubmitSuccess(false);

      setGeneralMessage(
        "ไม่สามารถส่งเอกสารได้ กรุณาลองใหม่อีกครั้ง"
      );

      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef5ff] text-[#07116f]">
      {/* Header */}

      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="flex min-h-20 flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-12">
          <button
            type="button"
            onClick={() => navigateTo("home")}
            className="text-left"
          >
            <h1 className="text-2xl font-black md:text-3xl">
              PSU Smart Loan
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              ระบบอัปโหลดเอกสารผู้กู้ยืมเงินเพื่อการศึกษา
            </p>
          </button>

          <nav className="flex flex-wrap items-center gap-2 font-bold">
            <NavButton
              label="หน้าหลัก"
              onClick={() => navigateTo("home")}
            />

            <NavButton
              label="ข้อมูลของฉัน"
              onClick={() =>
                navigateTo("studentInfo")
              }
            />

            <NavButton
              label="การคัดกรอง"
              onClick={() =>
                navigateTo("eligibility")
              }
            />

            <NavButton
              label="เอกสารของฉัน"
              active
            />

            <NavButton
              label="จองคิว"
              onClick={() =>
                navigateTo("booking")
              }
            />

            <NavButton
              label="ติดตามสถานะ"
              onClick={() =>
                navigateTo("status")
              }
            />

            <span className="rounded-full bg-[#07116f] px-5 py-2 text-white">
              👤 นักศึกษา
            </span>
          </nav>
        </div>
      </header>

      <main className="px-5 py-8 sm:px-6 lg:px-12">
        {/* ข้อความแจ้งเตือน */}

        {generalMessage && (
          <MessageBox
            type={messageType}
            message={generalMessage}
            onClose={() =>
              setGeneralMessage("")
            }
          />
        )}

        {/* ขั้นตอน */}

        <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <div className="mb-7">
            <h2 className="text-xl font-black md:text-2xl">
              ขั้นตอนการยื่นคำขอกู้
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              กรุณาดำเนินการตามขั้นตอนให้ครบถ้วน
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <ProgressStep
              number="1"
              title="ข้อมูลส่วนตัว"
              completed
            />

            <ProgressStep
              number="2"
              title="คัดกรอง"
              completed
            />

            <ProgressStep
              number="3"
              title="อัปโหลดเอกสาร"
              active
            />

            <ProgressStep
              number="4"
              title="ตรวจสอบสถานะ"
            />

            <ProgressStep
              number="5"
              title="จองคิว"
            />
          </div>
        </section>

        {/* ข้อมูลนักศึกษา */}

        <section className="mt-7 overflow-hidden rounded-3xl bg-gradient-to-r from-[#07116f] to-[#2638b8] p-7 text-white shadow-lg md:p-9">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white/15 text-5xl ring-4 ring-white/20">
                👩‍🎓
              </div>

              <div>
                <p className="text-sm font-bold text-blue-200">
                  นักศึกษาผู้ยื่นคำขอ
                </p>

                <h2 className="mt-1 text-2xl font-black md:text-3xl">
                  {student.fullName}
                </h2>

                <p className="mt-2 text-blue-100">
                  รหัสนักศึกษา{" "}
                  {student.studentCode}
                </p>

                <p className="mt-1 text-sm text-blue-100">
                  {student.faculty} ·{" "}
                  {student.major}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <StudentBadge>
                    {student.loanTypeName}
                  </StudentBadge>

                  <StudentBadge>
                    ชั้นปีที่{" "}
                    {student.yearLevel}
                  </StudentBadge>

                  <StudentBadge>
                    อายุ {student.age} ปี
                  </StudentBadge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[480px]">
              <StudentSummary
                value={student.gpax}
                label="GPAX"
              />

              <StudentSummary
                value={`${student.volunteerHours} ชม.`}
                label="จิตอาสา"
              />

              <StudentSummary
                value={student.academicYear}
                label="ปีการศึกษา"
              />

              <StudentSummary
                value={student.semester}
                label="ภาคเรียน"
              />
            </div>
          </div>
        </section>

        {/* แจ้งเตือนเอกสารผู้ปกครอง */}

        {(student.requiresParentDocuments ||
          Number(student.age) < 20) && (
          <section className="mt-6 flex items-start gap-4 rounded-2xl border border-pink-300 bg-pink-50 px-6 py-5">
            <span className="text-3xl">
              👪
            </span>

            <div>
              <h3 className="font-black text-pink-700">
                นักศึกษาอายุต่ำกว่า 20 ปี
              </h3>

              <p className="mt-1 leading-7 text-pink-600">
                ระบบเพิ่มสำเนาบัตรประชาชนของผู้ปกครอง
                และรูปถ่ายผู้ปกครองขณะลงนาม
                เป็นเอกสารบังคับโดยอัตโนมัติ
              </p>
            </div>
          </section>
        )}

        {/* ความคืบหน้า */}

        <section className="mt-7 rounded-3xl bg-white p-7 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">
                เอกสารที่ต้องอัปโหลด
              </h2>

              <p className="mt-2 text-gray-500">
                รองรับไฟล์ PDF, JPG, JPEG
                และ PNG ขนาดไม่เกิน 10 MB
                ต่อไฟล์
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 px-6 py-4 text-center">
              <p className="text-2xl font-black text-blue-700">
                {uploadedCount}/
                {totalDocuments}
              </p>

              <p className="text-xs font-bold text-blue-500">
                อัปโหลดแล้ว
              </p>
            </div>
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
              }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-sm font-bold">
            <span className="text-gray-500">
              ความคืบหน้า
            </span>

            <span className="text-blue-700">
              {progressPercent}%
            </span>
          </div>
        </section>

        {/* รายการเอกสาร */}

        <section className="mt-7 space-y-5">
          {requiredDocuments.map(
            (document, index) => (
              <DocumentUploadCard
                key={document.code}
                number={index + 1}
                document={document}
                uploadedFile={
                  uploadedFiles[
                    document.code
                  ]
                }
                error={
                  errors[document.code]
                }
                isDragging={
                  draggingCode ===
                  document.code
                }
                onFileChange={(event) =>
                  handleFileChange(
                    event,
                    document.code
                  )
                }
                onDragOver={(event) =>
                  handleDragOver(
                    event,
                    document.code
                  )
                }
                onDragLeave={
                  handleDragLeave
                }
                onDrop={(event) =>
                  handleDrop(
                    event,
                    document.code
                  )
                }
                onRemove={() =>
                  removeFile(document.code)
                }
              />
            )
          )}
        </section>

        {/* สรุป */}

        <section className="mt-7 rounded-3xl bg-white p-7 shadow-sm">
          <h2 className="text-xl font-black">
            สรุปความพร้อมของเอกสาร
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatusSummary
              icon="📄"
              value={totalDocuments}
              label="เอกสารที่ต้องใช้"
            />

            <StatusSummary
              icon="✅"
              value={uploadedCount}
              label="อัปโหลดแล้ว"
              type="success"
            />

            <StatusSummary
              icon="⏳"
              value={remainingCount}
              label="ยังไม่ได้อัปโหลด"
              type={
                remainingCount > 0
                  ? "warning"
                  : "success"
              }
            />
          </div>

          <div
            className={`mt-6 rounded-2xl border p-5 ${
              allRequiredFilesUploaded
                ? "border-green-300 bg-green-50"
                : "border-yellow-300 bg-yellow-50"
            }`}
          >
            <p
              className={`font-black ${
                allRequiredFilesUploaded
                  ? "text-green-700"
                  : "text-yellow-700"
              }`}
            >
              {allRequiredFilesUploaded
                ? "✓ เอกสารครบถ้วน พร้อมส่งให้เจ้าหน้าที่ตรวจสอบ"
                : `ยังขาดเอกสาร ${remainingCount} รายการ กรุณาอัปโหลดให้ครบก่อนส่ง`}
            </p>
          </div>
        </section>

        {/* ปุ่ม */}

        <section className="mt-7 flex flex-col-reverse gap-4 rounded-3xl bg-white p-7 shadow-sm md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={() =>
              navigateTo("eligibility")
            }
            disabled={isSubmitting}
            className="rounded-xl border-2 border-[#07116f] px-7 py-3 font-black transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← ย้อนกลับไปหน้าคัดกรอง
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={saveDraft}
              disabled={
                isSubmitting ||
                uploadedCount === 0
              }
              className="rounded-xl border-2 border-blue-600 px-7 py-3 font-black text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
            >
              💾 บันทึกแบบร่าง
            </button>

            <button
              type="button"
              onClick={submitDocuments}
              disabled={
                isSubmitting ||
                !allRequiredFilesUploaded
              }
              className="rounded-xl bg-[#07116f] px-8 py-3 font-black text-white transition hover:bg-[#101c8c] disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isSubmitting
                ? "กำลังส่งเอกสาร..."
                : "ส่งเอกสารให้เจ้าหน้าที่"}
            </button>
          </div>
        </section>

        {/* ส่งสำเร็จ */}

        {submitSuccess && (
          <section className="mt-7 rounded-3xl border border-green-300 bg-green-50 p-8 text-center shadow-sm">
            <div className="text-6xl">
              ✅
            </div>

            <h2 className="mt-5 text-2xl font-black text-green-700">
              ส่งเอกสารเรียบร้อยแล้ว
            </h2>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-green-600">
              เอกสารของคุณถูกส่งเข้าสู่ระบบแล้ว
              ขณะนี้อยู่ในสถานะรอเจ้าหน้าที่ตรวจสอบ
              กรุณาติดตามผลจากหน้าติดตามสถานะ
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  navigateTo("home")
                }
                className="rounded-xl border-2 border-green-700 px-6 py-3 font-black text-green-700 transition hover:bg-green-100"
              >
                กลับหน้าหลัก
              </button>

              <button
                type="button"
                onClick={() =>
                  navigateTo("status")
                }
                className="rounded-xl bg-green-700 px-6 py-3 font-black text-white transition hover:bg-green-800"
              >
                ไปหน้าติดตามสถานะ
              </button>
            </div>
          </section>
        )}

        <footer className="mt-10 rounded-t-3xl bg-[#030735] p-9 text-white">
          <h2 className="text-xl font-black">
            PSU Smart Loan
          </h2>

          <p className="mt-2 text-sm opacity-75">
            ระบบคัดกรองคุณสมบัติ
            ตรวจสอบเอกสาร
            และจองคิวสำหรับนักศึกษาผู้กู้ยืมเงิน
          </p>
        </footer>
      </main>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Navigation
|--------------------------------------------------------------------------
*/

function NavButton({
  label,
  onClick,
  active = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-xl bg-blue-100 px-4 py-2 text-blue-700"
          : "rounded-xl px-4 py-2 transition hover:bg-blue-50"
      }
    >
      {label}
    </button>
  );
}

/*
|--------------------------------------------------------------------------
| Message
|--------------------------------------------------------------------------
*/

function MessageBox({
  type,
  message,
  onClose,
}) {
  const styles = {
    success: {
      box: "border-green-300 bg-green-50 text-green-700",
      icon: "✅",
      title: "ดำเนินการสำเร็จ",
    },

    error: {
      box: "border-red-300 bg-red-50 text-red-700",
      icon: "⚠️",
      title: "กรุณาตรวจสอบข้อมูล",
    },

    info: {
      box: "border-blue-300 bg-blue-50 text-blue-700",
      icon: "ℹ️",
      title: "แจ้งเตือน",
    },
  };

  const currentStyle =
    styles[type] || styles.info;

  return (
    <section
      className={`mb-6 flex items-start gap-4 rounded-2xl border px-6 py-5 shadow-sm ${currentStyle.box}`}
    >
      <span className="text-2xl">
        {currentStyle.icon}
      </span>

      <div className="flex-1">
        <p className="font-black">
          {currentStyle.title}
        </p>

        <p className="mt-1 text-sm">
          {message}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="ปิดข้อความ"
        className="text-xl font-black opacity-60 transition hover:opacity-100"
      >
        ×
      </button>
    </section>
  );
}

/*
|--------------------------------------------------------------------------
| Progress
|--------------------------------------------------------------------------
*/

function ProgressStep({
  number,
  title,
  completed = false,
  active = false,
}) {
  let containerClass =
    "border-gray-200 bg-gray-50";

  let circleClass =
    "border-gray-300 bg-white text-gray-400";

  let titleClass = "text-gray-400";
  let detail = "ยังไม่เริ่ม";

  if (completed) {
    containerClass =
      "border-green-200 bg-green-50";

    circleClass =
      "border-green-500 bg-green-500 text-white";

    titleClass = "text-green-700";
    detail = "ดำเนินการแล้ว";
  }

  if (active) {
    containerClass =
      "border-blue-300 bg-blue-50 ring-2 ring-blue-100";

    circleClass =
      "border-blue-600 bg-blue-600 text-white";

    titleClass = "text-blue-700";
    detail = "กำลังดำเนินการ";
  }

  return (
    <div
      className={`rounded-2xl border p-4 ${containerClass}`}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full border-2 font-black ${circleClass}`}
      >
        {completed ? "✓" : number}
      </div>

      <p
        className={`mt-3 text-sm font-black ${titleClass}`}
      >
        {title}
      </p>

      <p className="mt-1 text-xs text-gray-400">
        {detail}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| ข้อมูลนักศึกษา
|--------------------------------------------------------------------------
*/

function StudentBadge({ children }) {
  return (
    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
      {children}
    </span>
  );
}

function StudentSummary({ value, label }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur">
      <p className="text-lg font-black">
        {value}
      </p>

      <p className="mt-1 text-xs text-blue-100">
        {label}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| การ์ดอัปโหลดเอกสาร
|--------------------------------------------------------------------------
*/

function DocumentUploadCard({
  number,
  document,
  uploadedFile,
  error,
  isDragging,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemove,
}) {
  const inputId = `document-${document.code}`;

  return (
    <article
      className={`rounded-3xl border-2 bg-white p-6 shadow-sm transition md:p-7 ${
        error
          ? "border-red-300"
          : uploadedFile
            ? "border-green-300"
            : "border-white"
      }`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-black text-white ${
            uploadedFile
              ? "bg-green-600"
              : "bg-[#07116f]"
          }`}
        >
          {uploadedFile ? "✓" : number}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black md:text-xl">
                  {document.name}
                </h3>

                {document.required && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-600">
                    จำเป็น
                  </span>
                )}
              </div>

              <p className="mt-2 max-w-3xl leading-7 text-gray-500">
                {document.description}
              </p>
            </div>

            <DocumentStatus
              uploadedFile={uploadedFile}
            />
          </div>

          {!uploadedFile ? (
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`mt-5 rounded-2xl border-2 border-dashed p-7 text-center transition ${
                isDragging
                  ? "border-blue-600 bg-blue-100"
                  : error
                    ? "border-red-400 bg-red-50"
                    : "border-blue-300 bg-blue-50"
              }`}
            >
              <div className="text-4xl">
                📎
              </div>

              <p className="mt-3 font-black">
                ลากไฟล์มาวางที่นี่
              </p>

              <p className="mt-1 text-sm text-gray-500">
                หรือเลือกไฟล์จากคอมพิวเตอร์
              </p>

              <label
                htmlFor={inputId}
                className="mt-5 inline-flex cursor-pointer rounded-xl bg-[#07116f] px-6 py-3 font-black text-white transition hover:bg-[#101c8c]"
              >
                เลือกไฟล์
              </label>

              <input
                id={inputId}
                type="file"
                accept={FILE_ACCEPT}
                onChange={onFileChange}
                className="hidden"
              />

              <p className="mt-4 text-xs text-gray-400">
                PDF, JPG, JPEG หรือ PNG
                ขนาดไม่เกิน 10 MB
              </p>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-green-200 bg-green-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 text-2xl">
                  {getFileIcon(
                    uploadedFile.fileName
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-black text-green-800">
                    {uploadedFile.fileName}
                  </p>

                  <p className="mt-1 text-sm text-green-600">
                    {formatFileSize(
                      uploadedFile.fileSize
                    )}

                    {uploadedFile.restoredFromDraft
                      ? " · โหลดจากแบบร่าง"
                      : ""}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <label
                  htmlFor={inputId}
                  className="cursor-pointer rounded-xl border border-green-600 px-4 py-2 text-sm font-black text-green-700 transition hover:bg-green-100"
                >
                  เปลี่ยนไฟล์
                </label>

                <input
                  id={inputId}
                  type="file"
                  accept={FILE_ACCEPT}
                  onChange={onFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={onRemove}
                  className="rounded-xl border border-red-300 px-4 py-2 text-sm font-black text-red-600 transition hover:bg-red-50"
                >
                  ลบ
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              ⚠️ {error}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function DocumentStatus({ uploadedFile }) {
  if (uploadedFile) {
    return (
      <span className="shrink-0 rounded-full bg-green-100 px-4 py-2 text-xs font-black text-green-700">
        ✓ พร้อมส่ง
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-gray-100 px-4 py-2 text-xs font-black text-gray-500">
      ยังไม่ได้อัปโหลด
    </span>
  );
}

/*
|--------------------------------------------------------------------------
| กล่องสรุป
|--------------------------------------------------------------------------
*/

function StatusSummary({
  icon,
  value,
  label,
  type = "default",
}) {
  const styles = {
    default: {
      box: "bg-[#f7f9ff]",
      value: "text-[#07116f]",
    },

    success: {
      box: "bg-green-50",
      value: "text-green-700",
    },

    warning: {
      box: "bg-yellow-50",
      value: "text-yellow-700",
    },
  };

  const currentStyle =
    styles[type] || styles.default;

  return (
    <div
      className={`rounded-2xl p-5 ${currentStyle.box}`}
    >
      <div className="text-3xl">
        {icon}
      </div>

      <p
        className={`mt-4 text-2xl font-black ${currentStyle.value}`}
      >
        {value}
      </p>

      <p className="mt-1 text-sm font-bold text-gray-500">
        {label}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Utility
|--------------------------------------------------------------------------
*/

function formatFileSize(size) {
  const numericSize = Number(size);

  if (
    !numericSize ||
    Number.isNaN(numericSize)
  ) {
    return "ไม่ทราบขนาดไฟล์";
  }

  if (numericSize < 1024) {
    return `${numericSize} B`;
  }

  if (numericSize < 1024 * 1024) {
    return `${(
      numericSize / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    numericSize /
    (1024 * 1024)
  ).toFixed(2)} MB`;
}

function getFileIcon(fileName = "") {
  const extension = fileName
    .split(".")
    .pop()
    ?.toLowerCase();

  if (extension === "pdf") {
    return "📕";
  }

  if (
    extension === "jpg" ||
    extension === "jpeg" ||
    extension === "png"
  ) {
    return "🖼️";
  }

  return "📄";
}

export default UploadDocuments;