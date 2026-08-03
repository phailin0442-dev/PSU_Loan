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