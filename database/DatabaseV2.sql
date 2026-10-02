-- PSU Smart Loan Database V2
-- PostgreSQL 15+
-- WARNING: This script recreates the psu_loan schema and deletes existing data.

BEGIN;
DROP SCHEMA IF EXISTS psu_loan CASCADE;
CREATE SCHEMA psu_loan;
SET search_path TO psu_loan, public;

-- =========================
-- ENUM TYPES
-- =========================
CREATE TYPE user_role_code AS ENUM ('STUDENT','STAFF','ADMIN');
CREATE TYPE application_status_code AS ENUM (
  'DRAFT','SUBMITTED','ELIGIBILITY_REVIEW','ELIGIBILITY_FAILED',
  'DOCUMENT_REVIEW','REVISION_REQUIRED','DOCUMENT_APPROVED',
  'QUEUE_BOOKED','SIGNED','CENTRAL_SUBMITTED','COMPLETED','CANCELLED'
);
CREATE TYPE eligibility_result_code AS ENUM ('PENDING','PASSED','FAILED','NOT_REQUIRED');
CREATE TYPE document_review_status_code AS ENUM ('PENDING','APPROVED','REVISION_REQUIRED','REJECTED');
CREATE TYPE booking_status_code AS ENUM ('BOOKED','CHECKED_IN','COMPLETED','CANCELLED','NO_SHOW');
CREATE TYPE slot_status_code AS ENUM ('OPEN','CLOSED','CANCELLED');
CREATE TYPE signing_status_code AS ENUM ('PENDING','VERIFIED','SIGNED','FAILED');
CREATE TYPE central_submission_status_code AS ENUM ('PENDING','SUBMITTED','ACKNOWLEDGED','REJECTED');

-- =========================
-- CORE USERS
-- =========================
CREATE TABLE roles (
  role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role_code user_role_code NOT NULL UNIQUE,
  role_name_th VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role_id BIGINT NOT NULL REFERENCES roles(role_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  email VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_users_email CHECK (email = lower(email) AND position('@' IN email) > 1)
);
CREATE UNIQUE INDEX uq_users_email_lower ON users(lower(email));
CREATE INDEX idx_users_role_id ON users(role_id);

CREATE TABLE student_profiles (
  student_id BIGINT PRIMARY KEY REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
  student_code VARCHAR(20) NOT NULL UNIQUE,
  citizen_id VARCHAR(13) NOT NULL UNIQUE,
  prefix VARCHAR(20) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  faculty VARCHAR(150) NOT NULL,
  major VARCHAR(150) NOT NULL,
  year_level SMALLINT NOT NULL CHECK (year_level BETWEEN 1 AND 8),
  house_no VARCHAR(30) NOT NULL,
  village_no VARCHAR(10),
  village_name VARCHAR(100),
  soi VARCHAR(100),
  road VARCHAR(100),
  subdistrict VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  postal_code VARCHAR(5) NOT NULL CHECK (postal_code ~ '^[0-9]{5}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_student_citizen_id CHECK (citizen_id ~ '^[0-9]{13}$'),
  CONSTRAINT ck_student_birth_date CHECK (birth_date < CURRENT_DATE)
);

CREATE TABLE staff_profiles (
  staff_id BIGINT PRIMARY KEY REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
  employee_code VARCHAR(30) NOT NULL UNIQUE,
  prefix VARCHAR(20) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  position VARCHAR(100),
  department VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE guardians (
  guardian_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES student_profiles(student_id) ON UPDATE CASCADE ON DELETE CASCADE,
  citizen_id VARCHAR(13) NOT NULL,
  prefix VARCHAR(20) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  relationship VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address_text TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_guardian_citizen_id CHECK (citizen_id ~ '^[0-9]{13}$')
);
CREATE UNIQUE INDEX uq_guardian_primary_per_student ON guardians(student_id) WHERE is_primary = TRUE;

-- =========================
-- MASTER RULES
-- =========================
CREATE TABLE loan_types (
  loan_type_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  loan_type_code VARCHAR(40) NOT NULL UNIQUE CHECK (loan_type_code IN ('NEW','CONTINUING_SPECIAL','CONTINUING_YEAR')),
  loan_type_name VARCHAR(200) NOT NULL,
  description TEXT,
  display_order SMALLINT NOT NULL DEFAULT 1 CHECK (display_order > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE eligibility_rules (
  eligibility_rule_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  loan_type_id BIGINT NOT NULL REFERENCES loan_types(loan_type_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  academic_year VARCHAR(10) NOT NULL,
  semester SMALLINT NOT NULL CHECK (semester IN (1,2)),
  min_gpax NUMERIC(3,2),
  min_volunteer_hours INTEGER,
  is_screening_required BOOLEAN NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(loan_type_id, academic_year, semester),
  CONSTRAINT ck_eligibility_values CHECK (
    (is_screening_required AND min_gpax IS NOT NULL AND min_volunteer_hours IS NOT NULL)
    OR (NOT is_screening_required AND min_gpax IS NULL AND min_volunteer_hours IS NULL)
  )
);

CREATE TABLE document_types (
  document_type_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_code VARCHAR(50) NOT NULL UNIQUE,
  document_name VARCHAR(200) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_requirements (
  requirement_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  loan_type_id BIGINT NOT NULL REFERENCES loan_types(loan_type_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  document_type_id BIGINT NOT NULL REFERENCES document_types(document_type_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  academic_year VARCHAR(10) NOT NULL,
  semester SMALLINT NOT NULL CHECK (semester IN (1,2)),
  min_age SMALLINT,
  max_age SMALLINT,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  document_stage VARCHAR(20) NOT NULL DEFAULT 'PRESCREEN' CHECK (document_stage IN ('PRESCREEN','SIGNING','BOTH')),
  display_order SMALLINT NOT NULL DEFAULT 1 CHECK (display_order > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_requirement_age CHECK ((min_age IS NULL OR min_age >= 0) AND (max_age IS NULL OR max_age >= 0) AND (min_age IS NULL OR max_age IS NULL OR min_age <= max_age))
);
CREATE UNIQUE INDEX uq_document_requirement_rule ON document_requirements(
  loan_type_id, document_type_id, academic_year, semester,
  COALESCE(min_age,-1), COALESCE(max_age,-1), document_stage
);

-- =========================
-- APPLICATION FLOW
-- =========================
CREATE TABLE applications (
  application_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES student_profiles(student_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  loan_type_id BIGINT NOT NULL REFERENCES loan_types(loan_type_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  eligibility_rule_id BIGINT REFERENCES eligibility_rules(eligibility_rule_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  academic_year VARCHAR(10) NOT NULL,
  semester SMALLINT NOT NULL CHECK (semester IN (1,2)),
  gpax NUMERIC(3,2) CHECK (gpax IS NULL OR gpax BETWEEN 0.00 AND 4.00),
  volunteer_hours INTEGER CHECK (volunteer_hours IS NULL OR volunteer_hours >= 0),
  eligibility_status eligibility_result_code NOT NULL DEFAULT 'PENDING',
  application_status application_status_code NOT NULL DEFAULT 'DRAFT',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, academic_year, semester),
  CONSTRAINT ck_application_semester_data CHECK (
    (semester = 1 AND gpax IS NOT NULL AND volunteer_hours IS NOT NULL AND eligibility_status <> 'NOT_REQUIRED')
    OR (semester = 2 AND gpax IS NULL AND volunteer_hours IS NULL AND eligibility_status = 'NOT_REQUIRED')
  ),
  CONSTRAINT ck_application_cancel_data CHECK (
    (application_status = 'CANCELLED' AND cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL)
    OR application_status <> 'CANCELLED'
  )
);
CREATE INDEX idx_applications_status ON applications(application_status);
CREATE INDEX idx_applications_period ON applications(academic_year,semester);

CREATE TABLE eligibility_checks (
  eligibility_check_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES applications(application_id) ON UPDATE CASCADE ON DELETE CASCADE,
  check_round INTEGER NOT NULL DEFAULT 1 CHECK (check_round > 0),
  gpax_passed BOOLEAN,
  volunteer_passed BOOLEAN,
  result eligibility_result_code NOT NULL,
  remark TEXT,
  checked_by BIGINT REFERENCES staff_profiles(staff_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(application_id, check_round)
);

CREATE TABLE application_documents (
  document_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES applications(application_id) ON UPDATE CASCADE ON DELETE CASCADE,
  requirement_id BIGINT NOT NULL REFERENCES document_requirements(requirement_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  original_file_name VARCHAR(255) NOT NULL,
  stored_file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL CHECK (mime_type IN ('application/pdf','image/jpeg','image/png')),
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),
  version_no INTEGER NOT NULL DEFAULT 1 CHECK (version_no > 0),
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  review_status document_review_status_code NOT NULL DEFAULT 'PENDING',
  latest_remark TEXT,
  uploaded_by BIGINT NOT NULL REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by BIGINT REFERENCES staff_profiles(staff_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  UNIQUE(application_id, requirement_id, version_no)
);
CREATE UNIQUE INDEX uq_application_document_current ON application_documents(application_id, requirement_id) WHERE is_current = TRUE;
CREATE INDEX idx_application_documents_status ON application_documents(review_status);

CREATE TABLE document_review_history (
  review_history_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES application_documents(document_id) ON UPDATE CASCADE ON DELETE CASCADE,
  review_round INTEGER NOT NULL CHECK (review_round > 0),
  old_status document_review_status_code,
  new_status document_review_status_code NOT NULL,
  remark TEXT,
  reviewed_by BIGINT NOT NULL REFERENCES staff_profiles(staff_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(document_id, review_round)
);

CREATE TABLE application_status_history (
  status_history_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES applications(application_id) ON UPDATE CASCADE ON DELETE CASCADE,
  old_status application_status_code,
  new_status application_status_code NOT NULL,
  remark TEXT,
  changed_by BIGINT REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- QUEUE, SIGNING, CENTRAL
-- =========================
CREATE TABLE queue_slots (
  slot_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  queue_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  slot_status slot_status_code NOT NULL DEFAULT 'OPEN',
  created_by BIGINT NOT NULL REFERENCES staff_profiles(staff_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(queue_date,start_time,end_time),
  CHECK(start_time < end_time)
);

CREATE TABLE queue_bookings (
  booking_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES applications(application_id) ON UPDATE CASCADE ON DELETE CASCADE,
  slot_id BIGINT NOT NULL REFERENCES queue_slots(slot_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  booking_status booking_status_code NOT NULL DEFAULT 'BOOKED',
  booked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checked_in_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by BIGINT REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  cancellation_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(application_id,slot_id),
  CONSTRAINT ck_booking_cancel CHECK (
    (booking_status='CANCELLED' AND cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancellation_reason IS NOT NULL)
    OR booking_status <> 'CANCELLED'
  )
);
CREATE UNIQUE INDEX uq_active_booking_per_application ON queue_bookings(application_id) WHERE booking_status IN ('BOOKED','CHECKED_IN');

CREATE TABLE signing_records (
  signing_record_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id BIGINT NOT NULL UNIQUE REFERENCES applications(application_id) ON UPDATE CASCADE ON DELETE CASCADE,
  booking_id BIGINT UNIQUE REFERENCES queue_bookings(booking_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  signing_status signing_status_code NOT NULL DEFAULT 'PENDING',
  original_documents_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by BIGINT REFERENCES staff_profiles(staff_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  verified_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_signing_verified CHECK (
    (original_documents_verified = FALSE)
    OR (original_documents_verified = TRUE AND verified_by IS NOT NULL AND verified_at IS NOT NULL)
  )
);

CREATE TABLE central_submissions (
  submission_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES applications(application_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  signing_record_id BIGINT REFERENCES signing_records(signing_record_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  submission_status central_submission_status_code NOT NULL DEFAULT 'PENDING',
  submitted_by BIGINT REFERENCES staff_profiles(staff_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  submitted_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  reference_number VARCHAR(100),
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_central_submitted CHECK (
    (submission_status='PENDING')
    OR (submission_status<>'PENDING' AND submitted_by IS NOT NULL AND submitted_at IS NOT NULL)
  )
);

-- =========================
-- TRIGGERS
-- =========================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := CURRENT_TIMESTAMP; RETURN NEW; END; $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['roles','users','student_profiles','staff_profiles','guardians','loan_types','eligibility_rules','document_types','document_requirements','applications','queue_slots','queue_bookings','signing_records','central_submissions']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION record_application_status_history() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO application_status_history(application_id,old_status,new_status,remark)
    VALUES(NEW.application_id,NULL,NEW.application_status,'Application created');
  ELSIF NEW.application_status IS DISTINCT FROM OLD.application_status THEN
    INSERT INTO application_status_history(application_id,old_status,new_status,remark)
    VALUES(NEW.application_id,OLD.application_status,NEW.application_status,'Status updated');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_application_status_history AFTER INSERT OR UPDATE OF application_status ON applications FOR EACH ROW EXECUTE FUNCTION record_application_status_history();

CREATE OR REPLACE FUNCTION prevent_queue_overbooking() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_capacity INTEGER; v_status slot_status_code; v_count INTEGER;
BEGIN
  IF NEW.booking_status NOT IN ('BOOKED','CHECKED_IN') THEN RETURN NEW; END IF;
  SELECT capacity,slot_status INTO v_capacity,v_status FROM queue_slots WHERE slot_id=NEW.slot_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Queue slot % does not exist',NEW.slot_id; END IF;
  IF v_status<>'OPEN' THEN RAISE EXCEPTION 'Queue slot % is not open',NEW.slot_id; END IF;
  SELECT COUNT(*) INTO v_count FROM queue_bookings WHERE slot_id=NEW.slot_id AND booking_status IN ('BOOKED','CHECKED_IN') AND booking_id<>COALESCE(NEW.booking_id,-1);
  IF v_count>=v_capacity THEN RAISE EXCEPTION 'Queue slot % is full',NEW.slot_id; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_prevent_queue_overbooking BEFORE INSERT OR UPDATE OF slot_id,booking_status ON queue_bookings FOR EACH ROW EXECUTE FUNCTION prevent_queue_overbooking();

-- =========================
-- MASTER DATA
-- =========================
INSERT INTO roles(role_code,role_name_th,description) VALUES
('STUDENT','นักศึกษา','ผู้ยื่นคำร้อง'),('STAFF','เจ้าหน้าที่ กยศ.','ผู้ตรวจสอบและจัดการคิว'),('ADMIN','ผู้ดูแลระบบ','ผู้ดูแลข้อมูลหลักและสิทธิ์');

INSERT INTO loan_types(loan_type_code,loan_type_name,description,display_order) VALUES
('NEW','ผู้กู้รายใหม่','ไม่เคยกู้มาก่อน',1),
('CONTINUING_SPECIAL','ผู้กู้ต่อเนื่องกรณีพิเศษ','ต่อเนื่องจากมัธยม ย้ายสาขา หรือเกินหลักสูตร',2),
('CONTINUING_YEAR','ผู้กู้ต่อเนื่องเลื่อนชั้นปี','ผู้กู้ต่อเนื่องปกติ',3);

INSERT INTO eligibility_rules(loan_type_id,academic_year,semester,min_gpax,min_volunteer_hours,is_screening_required)
SELECT loan_type_id,'2569',1,1.80,36,TRUE FROM loan_types;
INSERT INTO eligibility_rules(loan_type_id,academic_year,semester,min_gpax,min_volunteer_hours,is_screening_required)
SELECT loan_type_id,'2569',2,NULL,NULL,FALSE FROM loan_types;

INSERT INTO document_types(document_code,document_name,description) VALUES
('GPAX_EVIDENCE','หลักฐานค่าเฉลี่ยสะสม (GPAX)','ใช้ภาคเรียนที่ 1'),
('VOLUNTEER_EVIDENCE','หลักฐานชั่วโมงจิตอาสา','ใช้ภาคเรียนที่ 1'),
('LOAN_CONTRACT','สัญญากู้ยืมเงิน','ใช้ตามประเภทผู้กู้'),
('DISBURSEMENT_FORM','ใบเบิกเงินกู้ยืม','ใช้ตามประเภทและภาคเรียน'),
('STUDENT_ID_CARD','สำเนาบัตรประชาชนผู้กู้','ใช้ทุกประเภท'),
('PARENT_PHOTO','รูปถ่ายผู้ปกครอง','ใช้เมื่ออายุต่ำกว่า 20 ปี'),
('PARENT_ID_CARD','สำเนาบัตรประชาชนผู้ปกครอง','ใช้เมื่ออายุต่ำกว่า 20 ปี');

-- Semester 1 common evidence
INSERT INTO document_requirements(loan_type_id,document_type_id,academic_year,semester,document_stage,display_order)
SELECT lt.loan_type_id,dt.document_type_id,'2569',1,'PRESCREEN',CASE dt.document_code WHEN 'GPAX_EVIDENCE' THEN 1 ELSE 2 END
FROM loan_types lt CROSS JOIN document_types dt WHERE dt.document_code IN ('GPAX_EVIDENCE','VOLUNTEER_EVIDENCE');
-- Semester 1 NEW and CONTINUING_SPECIAL
INSERT INTO document_requirements(loan_type_id,document_type_id,academic_year,semester,document_stage,display_order)
SELECT lt.loan_type_id,dt.document_type_id,'2569',1,'BOTH',CASE dt.document_code WHEN 'LOAN_CONTRACT' THEN 3 WHEN 'DISBURSEMENT_FORM' THEN 4 ELSE 5 END
FROM loan_types lt CROSS JOIN document_types dt WHERE lt.loan_type_code IN ('NEW','CONTINUING_SPECIAL') AND dt.document_code IN ('LOAN_CONTRACT','DISBURSEMENT_FORM','STUDENT_ID_CARD');
-- Semester 1 continuing year
INSERT INTO document_requirements(loan_type_id,document_type_id,academic_year,semester,document_stage,display_order)
SELECT lt.loan_type_id,dt.document_type_id,'2569',1,'BOTH',CASE dt.document_code WHEN 'DISBURSEMENT_FORM' THEN 3 ELSE 4 END
FROM loan_types lt CROSS JOIN document_types dt WHERE lt.loan_type_code='CONTINUING_YEAR' AND dt.document_code IN ('DISBURSEMENT_FORM','STUDENT_ID_CARD');
-- Semester 2 all
INSERT INTO document_requirements(loan_type_id,document_type_id,academic_year,semester,document_stage,display_order)
SELECT lt.loan_type_id,dt.document_type_id,'2569',2,'BOTH',CASE dt.document_code WHEN 'DISBURSEMENT_FORM' THEN 1 ELSE 2 END
FROM loan_types lt CROSS JOIN document_types dt WHERE dt.document_code IN ('DISBURSEMENT_FORM','STUDENT_ID_CARD');
-- Under 20 all types, both semesters
INSERT INTO document_requirements(loan_type_id,document_type_id,academic_year,semester,max_age,document_stage,display_order)
SELECT lt.loan_type_id,dt.document_type_id,'2569',s.semester,19,'BOTH',CASE dt.document_code WHEN 'PARENT_PHOTO' THEN 90 ELSE 91 END
FROM loan_types lt CROSS JOIN document_types dt CROSS JOIN (VALUES(1),(2)) s(semester)
WHERE dt.document_code IN ('PARENT_PHOTO','PARENT_ID_CARD');

-- =========================
-- VIEWS FOR BACKEND
-- =========================
CREATE VIEW v_application_overview AS
SELECT a.application_id,sp.student_code,sp.prefix,sp.first_name,sp.last_name,
       concat_ws(' ',sp.prefix,sp.first_name,sp.last_name) AS student_name,
       sp.birth_date,EXTRACT(YEAR FROM age(CURRENT_DATE,sp.birth_date))::INTEGER AS age,
       sp.faculty,sp.major,sp.year_level,lt.loan_type_code,lt.loan_type_name,
       a.academic_year,a.semester,a.gpax,a.volunteer_hours,a.eligibility_status,
       a.application_status,a.submitted_at,a.created_at,a.updated_at
FROM applications a JOIN student_profiles sp ON sp.student_id=a.student_id
JOIN loan_types lt ON lt.loan_type_id=a.loan_type_id;

CREATE VIEW v_dashboard_summary AS
SELECT COUNT(*)::INTEGER AS total_count,
COUNT(*) FILTER(WHERE application_status IN ('SUBMITTED','ELIGIBILITY_REVIEW','DOCUMENT_REVIEW'))::INTEGER AS pending_count,
COUNT(*) FILTER(WHERE application_status='REVISION_REQUIRED')::INTEGER AS revision_count,
COUNT(*) FILTER(WHERE application_status IN ('DOCUMENT_APPROVED','QUEUE_BOOKED','SIGNED','CENTRAL_SUBMITTED','COMPLETED'))::INTEGER AS approved_count
FROM applications;

CREATE VIEW v_queue_slot_availability AS
SELECT qs.slot_id,qs.queue_date,qs.start_time,qs.end_time,qs.capacity,
COUNT(qb.booking_id) FILTER(WHERE qb.booking_status IN ('BOOKED','CHECKED_IN'))::INTEGER AS booked_count,
(qs.capacity-COUNT(qb.booking_id) FILTER(WHERE qb.booking_status IN ('BOOKED','CHECKED_IN')))::INTEGER AS remaining_capacity,
qs.slot_status
FROM queue_slots qs LEFT JOIN queue_bookings qb ON qb.slot_id=qs.slot_id
GROUP BY qs.slot_id,qs.queue_date,qs.start_time,qs.end_time,qs.capacity,qs.slot_status;

COMMIT;

-- Verification
SELECT table_name FROM information_schema.tables WHERE table_schema='psu_loan' AND table_type='BASE TABLE' ORDER BY table_name;
SELECT * FROM psu_loan.v_dashboard_summary;



-- ============================================================
-- Seed ข้อมูลตัวอย่าง 3 คน สำหรับ dropdown "นักศึกษาตัวอย่าง" หน้าเว็บ
-- ตรงกับ loan_types 3 ประเภทที่ seed ไว้แล้วใน DatabaseV2.sql:
--   1) NEW               -> ผู้กู้รายใหม่ อายุไม่ถึง 20 ปี (มีผู้ปกครอง)
--   2) CONTINUING_SPECIAL-> ผู้กู้ต่อเนื่องกรณีพิเศษ
--   3) CONTINUING_YEAR   -> ผู้กู้ต่อเนื่องเลื่อนชั้นปี ภาคเรียน 2
--
-- รหัสนักศึกษา 2 ตัวแรกอ้างอิงปีที่เข้า (พ.ศ.) เทียบกับปีการศึกษา
-- ปัจจุบัน 2569 ตามสูตร: year_level = 2569 - ปีที่เข้า + 1
--
-- รันไฟล์นี้หลังจาก DatabaseV2.sql เท่านั้น (ต้องมี loan_types,
-- eligibility_rules อยู่ก่อนแล้ว)
-- ============================================================

BEGIN;
SET search_path TO psu_loan, public;

-- ----------------------------------------------------------------
-- 1) ผู้กู้รายใหม่ อายุไม่ถึง 20 ปี — นางสาวณัฐณิชา ศรีสุข
--    รหัส 69 (เข้าปี 2569) -> ปี 1 ในปัจจุบัน (2569-2569+1=1)
-- ----------------------------------------------------------------
WITH new_user AS (
    INSERT INTO users (role_id, email, password_hash, is_active)
    SELECT role_id, '6910110001@psu.ac.th', 'DEMO_NO_LOGIN', TRUE
    FROM roles WHERE role_code = 'STUDENT'
    RETURNING user_id
),
new_profile AS (
    INSERT INTO student_profiles (
        student_id, student_code, citizen_id, prefix, first_name, last_name,
        birth_date, phone, faculty, major, year_level,
        house_no, subdistrict, district, province, postal_code
    )
    SELECT
        user_id, '6910110001', '1909900000001', 'นางสาว', 'ณัฐณิชา', 'ศรีสุข',
        DATE '2008-05-12', '0812345671', 'คณะวิทยาศาสตร์', 'วิทยาการคอมพิวเตอร์', 1,
        '99/1', 'คอหงส์', 'หาดใหญ่', 'สงขลา', '90110'
    FROM new_user
    RETURNING student_id
),
new_guardian AS (
    INSERT INTO guardians (
        student_id, citizen_id, prefix, first_name, last_name,
        relationship, phone, is_primary
    )
    SELECT
        student_id, '1909900000099', 'นาย', 'สมชาย', 'ศรีสุข',
        'บิดา', '0891111111', TRUE
    FROM new_profile
    RETURNING student_id
)
INSERT INTO applications (
    student_id, loan_type_id, eligibility_rule_id, academic_year, semester,
    gpax, volunteer_hours, eligibility_status, application_status, submitted_at
)
SELECT
    p.student_id, lt.loan_type_id, er.eligibility_rule_id, '2569', 1,
    2.91, 6, 'PASSED', 'DOCUMENT_REVIEW', CURRENT_TIMESTAMP
FROM new_profile p
JOIN loan_types lt ON lt.loan_type_code = 'NEW'
JOIN eligibility_rules er
    ON er.loan_type_id = lt.loan_type_id
    AND er.academic_year = '2569' AND er.semester = 1;

-- ----------------------------------------------------------------
-- 2) ผู้กู้ต่อเนื่องกรณีพิเศษ — นายกิตติพงศ์ แสงทอง
--    รหัส 65 (เข้าปี 2565) -> ปี 5 ในปัจจุบัน (2569-2565+1=5)
--    (เกินหลักสูตรปกติ 4 ปี จึงเข้าเงื่อนไข "กรณีพิเศษ")
-- ----------------------------------------------------------------
WITH new_user AS (
    INSERT INTO users (role_id, email, password_hash, is_active)
    SELECT role_id, '6510110025@psu.ac.th', 'DEMO_NO_LOGIN', TRUE
    FROM roles WHERE role_code = 'STUDENT'
    RETURNING user_id
),
new_profile AS (
    INSERT INTO student_profiles (
        student_id, student_code, citizen_id, prefix, first_name, last_name,
        birth_date, phone, faculty, major, year_level,
        house_no, subdistrict, district, province, postal_code
    )
    SELECT
        user_id, '6510110025', '1909900000002', 'นาย', 'กิตติพงศ์', 'แสงทอง',
        DATE '2003-01-15', '0812345672', 'คณะวิศวกรรมศาสตร์', 'วิศวกรรมคอมพิวเตอร์', 5,
        '25 ถนนกาญจนวณิชย์', 'หาดใหญ่', 'หาดใหญ่', 'สงขลา', '90110'
    FROM new_user
    RETURNING student_id
)
INSERT INTO applications (
    student_id, loan_type_id, eligibility_rule_id, academic_year, semester,
    gpax, volunteer_hours, eligibility_status, application_status, submitted_at
)
SELECT
    p.student_id, lt.loan_type_id, er.eligibility_rule_id, '2569', 1,
    2.65, 40, 'PASSED', 'DOCUMENT_APPROVED', CURRENT_TIMESTAMP
FROM new_profile p
JOIN loan_types lt ON lt.loan_type_code = 'CONTINUING_SPECIAL'
JOIN eligibility_rules er
    ON er.loan_type_id = lt.loan_type_id
    AND er.academic_year = '2569' AND er.semester = 1;

-- ----------------------------------------------------------------
-- 3) ผู้กู้ต่อเนื่องเลื่อนชั้นปี ภาคเรียน 2 — นางสาวพิมพ์ชนก บุญรักษ์
--    รหัส 66 (เข้าปี 2566) -> ปี 4 ในปัจจุบัน (2569-2566+1=4)
--    แก้คณะเป็นคณะวิทยาศาสตร์ตามที่แจ้ง
--    (ภาคเรียนที่ 2 ไม่ต้องคัดกรอง GPAX/จิตอาสา ตาม CHECK constraint
--     ck_application_semester_data จึงต้องเป็น NULL + NOT_REQUIRED)
-- ----------------------------------------------------------------
WITH new_user AS (
    INSERT INTO users (role_id, email, password_hash, is_active)
    SELECT role_id, '6610110042@psu.ac.th', 'DEMO_NO_LOGIN', TRUE
    FROM roles WHERE role_code = 'STUDENT'
    RETURNING user_id
),
new_profile AS (
    INSERT INTO student_profiles (
        student_id, student_code, citizen_id, prefix, first_name, last_name,
        birth_date, phone, faculty, major, year_level,
        house_no, subdistrict, district, province, postal_code
    )
    SELECT
        user_id, '6610110042', '1909900000003', 'นางสาว', 'พิมพ์ชนก', 'บุญรักษ์',
        DATE '2005-03-10', '0812345673', 'คณะวิทยาศาสตร์',
        'เทคโนโลยีสารสนเทศและการสื่อสาร', 4,
        '15/3 หมู่ 2', 'คลองแห', 'หาดใหญ่', 'สงขลา', '90110'
    FROM new_user
    RETURNING student_id
)
INSERT INTO applications (
    student_id, loan_type_id, eligibility_rule_id, academic_year, semester,
    gpax, volunteer_hours, eligibility_status, application_status, submitted_at
)
SELECT
    p.student_id, lt.loan_type_id, er.eligibility_rule_id, '2569', 2,
    NULL, NULL, 'NOT_REQUIRED', 'REVISION_REQUIRED', CURRENT_TIMESTAMP
FROM new_profile p
JOIN loan_types lt ON lt.loan_type_code = 'CONTINUING_YEAR'
JOIN eligibility_rules er
    ON er.loan_type_id = lt.loan_type_id
    AND er.academic_year = '2569' AND er.semester = 2;

COMMIT;

-- ตรวจผลลัพธ์
SELECT * FROM psu_loan.v_application_overview ORDER BY application_id;


SELECT dr.requirement_id, dt.document_code, dt.document_name
FROM psu_loan.document_requirements dr
JOIN psu_loan.document_types dt ON dt.document_type_id = dr.document_type_id
WHERE dr.loan_type_id = (SELECT loan_type_id FROM psu_loan.loan_types WHERE loan_type_code = 'NEW')
  AND dr.academic_year = '2569' AND dr.semester = 1;

  SELECT staff_id, employee_code, first_name, last_name FROM psu_loan.staff_profiles;

  SET search_path TO psu_loan, public;

WITH new_staff_user AS (
    INSERT INTO users (role_id, email, password_hash, is_active)
    SELECT role_id, 'staff01@psu.ac.th', 'DEMO_NO_LOGIN', TRUE
    FROM roles WHERE role_code = 'STAFF'
    RETURNING user_id
)
INSERT INTO staff_profiles (staff_id, employee_code, prefix, first_name, last_name, position, department)
SELECT user_id, 'STF001', 'นางสาว', 'สุดา', 'ตรวจเอกสาร', 'เจ้าหน้าที่ กยศ.', 'กองกิจการนักศึกษา'
FROM new_staff_user
RETURNING staff_id;


-- ============================================================
-- Patch: เพิ่ม student_id (user_id ของนักศึกษา) เข้า view
-- v_application_overview เพื่อให้ frontend รู้ค่า uploadedBy
-- ตอนยิง POST /api/student/:id/documents
-- (student_profiles.student_id คือค่าเดียวกับ users.user_id)
--
-- หมายเหตุ: Postgres ไม่อนุญาตให้ CREATE OR REPLACE VIEW เปลี่ยนชื่อ
-- หรือตำแหน่งคอลัมน์เดิม เพิ่มได้แค่ "ต่อท้าย" เท่านั้น จึงต้องใส่
-- student_user_id ไว้เป็นคอลัมน์สุดท้าย ไม่ใช่ต่อจาก application_id
-- ============================================================

SET search_path TO psu_loan, public;

CREATE OR REPLACE VIEW v_application_overview AS
SELECT a.application_id, sp.student_code, sp.prefix, sp.first_name, sp.last_name,
       concat_ws(' ', sp.prefix, sp.first_name, sp.last_name) AS student_name,
       sp.birth_date, EXTRACT(YEAR FROM age(CURRENT_DATE, sp.birth_date))::INTEGER AS age,
       sp.faculty, sp.major, sp.year_level, lt.loan_type_code, lt.loan_type_name,
       a.academic_year, a.semester, a.gpax, a.volunteer_hours, a.eligibility_status,
       a.application_status, a.submitted_at, a.created_at, a.updated_at,
       sp.student_id AS student_user_id
FROM applications a JOIN student_profiles sp ON sp.student_id = a.student_id
JOIN loan_types lt ON lt.loan_type_id = a.loan_type_id;

-- ตรวจผลลัพธ์
SELECT application_id, student_user_id, student_name FROM psu_loan.v_application_overview;


SELECT staff_id, employee_code, first_name, last_name FROM psu_loan.staff_profiles;

SET search_path TO psu_loan, public;

SELECT application_id, gpax, semester
FROM applications a
JOIN student_profiles sp ON sp.student_id = a.student_id
WHERE sp.student_code = '6510110025';


UPDATE applications
SET gpax = NULL
WHERE application_id = 2;





-- ============================================================
-- Migration: ระบบจัดการช่วงเวลาเปิดรับยื่นกู้ + เนื้อหาหน้าประชาสัมพันธ์
-- รันไฟล์นี้ในฐานข้อมูลที่มี DatabaseV2.sql อยู่แล้ว
-- ============================================================

SET search_path TO psu_loan, public;

-- ----------------------------------------------------------------
-- 1) ช่วงเวลาเปิดรับยื่นกู้ (1 แถวต่อ 1 ปีการศึกษา+เทอม)
-- ----------------------------------------------------------------
CREATE TABLE application_periods (
    period_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    academic_year VARCHAR(10) NOT NULL,
    semester SMALLINT NOT NULL CHECK (semester IN (1, 2)),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_open BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_application_period UNIQUE (academic_year, semester),
    CONSTRAINT ck_application_period_dates CHECK (end_date >= start_date)
);

CREATE TRIGGER trg_application_periods_updated_at
    BEFORE UPDATE ON application_periods
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------
-- 2) เนื้อหาหน้าประชาสัมพันธ์ (แถวเดียว แก้ทับได้เรื่อยๆ)
-- ----------------------------------------------------------------
CREATE TABLE home_content (
    content_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    banner_title VARCHAR(200) NOT NULL DEFAULT 'กยศ.',
    banner_subtitle VARCHAR(300) NOT NULL DEFAULT 'กองทุนเงินให้กู้ยืมเพื่อการศึกษา',
    banner_description TEXT NOT NULL DEFAULT
        'ระบบคัดกรองคุณสมบัติ ตรวจสอบเอกสารออนไลน์ ติดตามสถานะ และจองคิว สำหรับนักศึกษาผู้กู้ยืมเงิน',
    notice TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT REFERENCES staff_profiles(staff_id)
);

CREATE TRIGGER trg_home_content_updated_at
    BEFORE UPDATE ON home_content
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------
-- Seed ข้อมูลเริ่มต้น
-- ----------------------------------------------------------------

-- แถวเนื้อหาหน้าแรก (แถวเดียว)
INSERT INTO home_content (banner_title, banner_subtitle, banner_description, notice)
VALUES (
    'กยศ.',
    'กองทุนเงินให้กู้ยืมเพื่อการศึกษา',
    'ระบบคัดกรองคุณสมบัติ ตรวจสอบเอกสารออนไลน์ ติดตามสถานะ และจองคิว สำหรับนักศึกษาผู้กู้ยืมเงิน',
    'ผู้กู้ยืมที่มีความประสงค์จะกู้ยืมต่อในเทอม/ปีการศึกษา กรุณาดำเนินการตามขั้นตอนและตรวจสอบเอกสารให้ครบถ้วน'
);

-- ตัวอย่างช่วงเวลา: เทอม 1 ปีการศึกษา 2569 เปิดรับ 10-15 ส.ค. 2569
INSERT INTO application_periods (academic_year, semester, start_date, end_date, is_open)
VALUES ('2569', 1, DATE '2026-08-10', DATE '2026-08-15', TRUE);

-- เทอม 2 ปีการศึกษา 2569 — เปิดกว้างไว้ก่อน (ยังไม่ได้กำหนดช่วงจริง)
INSERT INTO application_periods (academic_year, semester, start_date, end_date, is_open)
VALUES ('2569', 2, DATE '2026-01-01', DATE '2026-12-31', TRUE);

-- ตรวจผลลัพธ์
SELECT * FROM application_periods;
SELECT * FROM home_content;


-- ============================================================
-- เพิ่มคอลัมน์เก็บ "ประเภทผู้กู้ที่ต้องการ" ไว้ในโปรไฟล์นักศึกษา
-- (แยกจาก applications.loan_type_id ซึ่งเป็นประเภทของคำร้องที่สร้างจริง
--  ไปแล้ว — อันนี้คือค่า "ที่ตั้งใจไว้ล่วงหน้า" ก่อนสร้างคำร้อง)
-- ============================================================

SET search_path TO psu_loan, public;

ALTER TABLE student_profiles
    ADD COLUMN loan_type_code VARCHAR(30);

-- ตรวจผลลัพธ์
SELECT student_id, student_code, loan_type_code FROM student_profiles;


-- ============================================================
-- ลบบัญชีที่พลาดสมัครผิด (เลือก "เจ้าหน้าที่" ตอน register แต่ระบบ
-- สร้างเป็นนักศึกษาเสมอ ทำให้ข้อมูลไม่ตรงกับที่ตั้งใจ)
-- ============================================================

SET search_path TO psu_loan, public;

-- เช็คก่อนว่าใช่บัญชีที่ต้องการลบไหม (แก้ student_code ให้ตรง)
SELECT u.user_id, u.email, sp.student_code, sp.first_name, sp.last_name
FROM users u
JOIN student_profiles sp ON sp.student_id = u.user_id
WHERE sp.student_code = 'Staff001';

-- ถ้าใช่ตัวที่ต้องการ ลบทิ้ง (ไม่มี application ผูกอยู่ ลบ users
-- ตัวเดียวพอ จะ CASCADE ไปลบ student_profiles ให้อัตโนมัติ)
DELETE FROM users
WHERE user_id IN (
    SELECT student_id FROM student_profiles WHERE student_code = 'Staff001'
);


-- ============================================================
-- ตรวจสอบจำนวนและรายชื่อเจ้าหน้าที่ทั้งหมดในระบบ
-- ============================================================

SET search_path TO psu_loan, public;

-- นับจำนวนรวม
SELECT COUNT(*) AS total_staff_count
FROM users u
JOIN roles r ON r.role_id = u.role_id
WHERE r.role_code = 'STAFF';

-- ดูรายละเอียดทุกคน (ชื่อ, รหัสพนักงาน, อีเมล, ยัง active อยู่ไหม)
SELECT
    u.user_id,
    stp.employee_code,
    stp.prefix,
    stp.first_name,
    stp.last_name,
    stp.position,
    stp.department,
    u.email,
    u.is_active,
    u.created_at
FROM users u
JOIN roles r ON r.role_id = u.role_id
JOIN staff_profiles stp ON stp.staff_id = u.user_id
WHERE r.role_code = 'STAFF'
ORDER BY u.created_at ASC;



-- ============================================================
-- ล้างข้อมูลผู้ใช้งานทั้งหมด เริ่มนับหนึ่งใหม่
-- (เก็บตารางตั้งค่า/ข้อมูลอ้างอิงไว้: roles, loan_types, document_types,
--  document_requirements, eligibility_rules, application_periods,
--  home_content — ไม่แตะต้องเลย)
-- ============================================================

SET search_path TO psu_loan, public;

-- 1) ลบคำร้องทั้งหมดก่อนเสมอ (CASCADE ไปลบ application_documents,
--    document_review_history, application_status_history ให้อัตโนมัติ)
DELETE FROM applications;

-- 2) ลบผู้ใช้ทั้งหมด ทั้งนักศึกษาและเจ้าหน้าที่ (CASCADE ไปลบ
--    student_profiles, staff_profiles, guardians ให้อัตโนมัติ)
DELETE FROM users;

-- ตรวจผลลัพธ์ (ทุกตารางควรว่างเปล่าหมด)
SELECT 'users' AS table_name, COUNT(*) FROM users
UNION ALL SELECT 'student_profiles', COUNT(*) FROM student_profiles
UNION ALL SELECT 'staff_profiles', COUNT(*) FROM staff_profiles
UNION ALL SELECT 'guardians', COUNT(*) FROM guardians
UNION ALL SELECT 'applications', COUNT(*) FROM applications
UNION ALL SELECT 'application_documents', COUNT(*) FROM application_documents
UNION ALL SELECT 'document_review_history', COUNT(*) FROM document_review_history
UNION ALL SELECT 'application_status_history', COUNT(*) FROM application_status_history;

-- ============================================================
-- สร้างเจ้าหน้าที่ 2 คนใหม่ (รันหลัง full_reset.sql เท่านั้น)
-- ============================================================

SET search_path TO psu_loan, public;

WITH new_user AS (
    INSERT INTO users (role_id, email, password_hash, is_active)
    SELECT role_id, 'staff01@psu.ac.th', 'PENDING_PASSWORD_RESET', TRUE
    FROM roles WHERE role_code = 'STAFF'
    RETURNING user_id
)
INSERT INTO staff_profiles (staff_id, employee_code, prefix, first_name, last_name, position, department)
SELECT user_id, 'STF001', 'นางสาว', 'ซาน่า', 'ตรวจเอกสาร', 'เจ้าหน้าที่ กยศ.', 'กองพัฒนานักศึกษา'
FROM new_user;

WITH new_user AS (
    INSERT INTO users (role_id, email, password_hash, is_active)
    SELECT role_id, 'staff02@psu.ac.th', 'PENDING_PASSWORD_RESET', TRUE
    FROM roles WHERE role_code = 'STAFF'
    RETURNING user_id
)
INSERT INTO staff_profiles (staff_id, employee_code, prefix, first_name, last_name, position, department)
SELECT user_id, 'STF002', 'นาย', 'เมฆา', 'ดูแลระบบ', 'เจ้าหน้าที่ กยศ.', 'กองพัฒนานักศึกษา'
FROM new_user;

-- ตรวจผลลัพธ์
SELECT u.user_id, stp.employee_code, stp.prefix, stp.first_name, stp.last_name, u.email
FROM users u
JOIN staff_profiles stp ON stp.staff_id = u.user_id
ORDER BY u.user_id;


SET search_path TO psu_loan, public;

SELECT
    sp.student_id,
    sp.student_code,
    sp.first_name,
    sp.last_name,
    u.email,
    a.application_id,
    a.gpax,
    a.volunteer_hours,
    a.eligibility_status,
    a.application_status,
    a.created_at AS application_created_at
FROM student_profiles sp
JOIN users u ON u.user_id = sp.student_id
LEFT JOIN applications a ON a.student_id = sp.student_id
ORDER BY sp.student_id DESC;


-- ============================================================
-- เช็คประเภทผู้กู้ของรุสนา (application_id = 5) ก่อนแก้ไข
-- ============================================================

SET search_path TO psu_loan, public;

SELECT
    a.application_id,
    lt.loan_type_code,
    lt.loan_type_name,
    a.gpax,
    a.volunteer_hours,
    a.eligibility_status,
    a.application_status
FROM applications a
JOIN loan_types lt ON lt.loan_type_id = a.loan_type_id
WHERE a.application_id = 5;

-- ============================================================
-- ถ้า loan_type_code = 'NEW' (ผู้กู้รายใหม่) ค่อยรันคำสั่งด้านล่างนี้
-- เพื่อแก้สถานะให้ตรงกับเกณฑ์ที่ถูกต้อง (GPAX 4.00 > 1.80 และ
-- จิตอาสา 2 > 1 ชั่วโมง ผ่านทั้งคู่)
-- ============================================================

UPDATE applications
SET eligibility_status = 'PASSED',
    application_status = 'DOCUMENT_REVIEW'
WHERE application_id = 5;

-- ตรวจผลลัพธ์
SELECT application_id, gpax, volunteer_hours, eligibility_status, application_status
FROM applications
WHERE application_id = 5;


SET search_path TO psu_loan, public;

-- ดูทุกบัญชีนักศึกษา พร้อมเช็คว่ามีคำร้องผูกอยู่ไหม (เรียงล่าสุดก่อน)
SELECT
    sp.student_id,
    sp.student_code,
    sp.first_name,
    sp.last_name,
    u.email,
    a.application_id,
    a.gpax,
    a.volunteer_hours,
    a.eligibility_status,
    a.application_status
FROM student_profiles sp
JOIN users u ON u.user_id = sp.student_id
LEFT JOIN applications a ON a.student_id = sp.student_id
ORDER BY sp.student_id DESC;


SET search_path TO psu_loan, public;

SELECT
    a.application_id,
    sp.first_name,
    sp.last_name,
    lt.loan_type_code,
    a.academic_year,
    a.semester,
    a.gpax,
    a.volunteer_hours,
    a.eligibility_status,
    a.application_status
FROM applications a
JOIN student_profiles sp ON sp.student_id = a.student_id
JOIN loan_types lt ON lt.loan_type_id = a.loan_type_id
WHERE sp.first_name = 'ปิยะธิดา';


SET search_path TO psu_loan, public;

-- ============================================================
-- เพิ่มคอลัมน์ student_user_id เข้าไปใน view v_application_overview
-- (จำเป็นสำหรับ frontend ใช้จับคู่ว่าคำร้องนี้เป็นของนักศึกษาคนไหน)
-- ============================================================

SET search_path TO psu_loan, public;

CREATE OR REPLACE VIEW v_application_overview AS
SELECT a.application_id,sp.student_code,sp.prefix,sp.first_name,sp.last_name,
       concat_ws(' ',sp.prefix,sp.first_name,sp.last_name) AS student_name,
       sp.birth_date,EXTRACT(YEAR FROM age(CURRENT_DATE,sp.birth_date))::INTEGER AS age,
       sp.faculty,sp.major,sp.year_level,lt.loan_type_code,lt.loan_type_name,
       a.academic_year,a.semester,a.gpax,a.volunteer_hours,a.eligibility_status,
       a.application_status,a.submitted_at,a.created_at,a.updated_at,
       sp.student_id AS student_user_id
FROM applications a JOIN student_profiles sp ON sp.student_id=a.student_id
JOIN loan_types lt ON lt.loan_type_id=a.loan_type_id;

-- ตรวจผลลัพธ์ (ควรเห็นคอลัมน์ student_user_id ตอนนี้)
SELECT * FROM v_application_overview LIMIT 3;

SELECT * FROM psu_loan.document_types;
SELECT * FROM psu_loan.document_requirements;


-- ============================================================
-- แก้ไขเอกสารหลักฐาน GPAX/ชั่วโมงจิตอาสา ที่อัปโหลดไปแล้วก่อนหน้านี้
-- (ตอนนั้นยังไม่มี logic อนุมัติอัตโนมัติ เลยค้างเป็น PENDING อยู่)
-- ============================================================

SET search_path TO psu_loan, public;

select * from loan_types;
select * from document_types;


UPDATE application_documents ad
SET review_status = 'APPROVED'
FROM document_requirements dr
JOIN document_types dt ON dt.document_type_id = dr.document_type_id
WHERE ad.requirement_id = dr.requirement_id
  AND dt.document_code IN ('GPAX_EVIDENCE', 'VOLUNTEER_EVIDENCE')
  AND ad.is_current = TRUE
  AND ad.review_status = 'PENDING';

-- ตรวจผลลัพธ์ (ควรเห็นทุกแถวเป็น APPROVED แล้ว)
SELECT ad.document_id, dt.document_code, ad.review_status
FROM application_documents ad
JOIN document_requirements dr ON dr.requirement_id = ad.requirement_id
JOIN document_types dt ON dt.document_type_id = dr.document_type_id
WHERE dt.document_code IN ('GPAX_EVIDENCE', 'VOLUNTEER_EVIDENCE')
  AND ad.is_current = TRUE;


Desc application_documents;


SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'application_documents'
ORDER BY ordinal_position;
