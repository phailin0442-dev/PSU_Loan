ROLLBACK;

DROP SCHEMA IF EXISTS psu_loan CASCADE;

COMMIT;


-- ============================================================================
-- PSU Student Loan Screening and Queue System
-- PostgreSQL schema, tables, constraints, indexes, triggers and master data
-- Run this entire file in pgAdmin 4 Query Tool while connected to PSU_LOAN.
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS psu_loan;
SET search_path TO psu_loan, public;

-- ==========================================================================
-- D1: roles
-- ==========================================================================
CREATE TABLE roles (
    role_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name     VARCHAR(30)  NOT NULL UNIQUE,
    description   VARCHAR(255),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_roles_name
        CHECK (role_name IN ('STUDENT', 'STAFF', 'ADMIN'))
);

-- ==========================================================================
-- D2: users
-- ==========================================================================
CREATE TABLE users (
    user_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id        BIGINT        NOT NULL,
    email          VARCHAR(150)  NOT NULL,
    password_hash  VARCHAR(255)  NOT NULL,
    is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
    last_login_at  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_users_email
        CHECK (email = lower(email) AND position('@' IN email) > 1)
);

CREATE UNIQUE INDEX uq_users_email_lower ON users (lower(email));
CREATE INDEX idx_users_role_id ON users(role_id);

-- ==========================================================================
-- D3: student_profiles
-- ==========================================================================
CREATE TABLE student_profiles (
    student_id    BIGINT        PRIMARY KEY,
    student_code  VARCHAR(20)   NOT NULL UNIQUE,
    citizen_id    VARCHAR(13)   NOT NULL UNIQUE,
    prefix        VARCHAR(20)   NOT NULL,
    first_name    VARCHAR(100)  NOT NULL,
    last_name     VARCHAR(100)  NOT NULL,
    birth_date    DATE          NOT NULL,
    phone         VARCHAR(20)   NOT NULL,
    faculty       VARCHAR(150)  NOT NULL,
    major         VARCHAR(150)  NOT NULL,
    year_level    SMALLINT      NOT NULL,
    house_no      VARCHAR(30)   NOT NULL,
    village_no    VARCHAR(10),
    village_name  VARCHAR(100),
    soi           VARCHAR(100),
    road          VARCHAR(100),
    subdistrict   VARCHAR(100)  NOT NULL,
    district      VARCHAR(100)  NOT NULL,
    province      VARCHAR(100)  NOT NULL,
    postal_code   VARCHAR(5)    NOT NULL,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_student_profiles_user
        FOREIGN KEY (student_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT ck_student_citizen_id
        CHECK (citizen_id ~ '^[0-9]{13}$'),
    CONSTRAINT ck_student_postal_code
        CHECK (postal_code ~ '^[0-9]{5}$'),
    CONSTRAINT ck_student_year_level
        CHECK (year_level BETWEEN 1 AND 8),
    CONSTRAINT ck_student_birth_date
        CHECK (birth_date < CURRENT_DATE)
);

-- ==========================================================================
-- D4: staff_profiles
-- ==========================================================================
CREATE TABLE staff_profiles (
    staff_id      BIGINT        PRIMARY KEY,
    employee_code VARCHAR(30)   NOT NULL UNIQUE,
    prefix        VARCHAR(20)   NOT NULL,
    first_name    VARCHAR(100)  NOT NULL,
    last_name     VARCHAR(100)  NOT NULL,
    phone         VARCHAR(20),
    position      VARCHAR(100),
    department    VARCHAR(150),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_staff_profiles_user
        FOREIGN KEY (staff_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

-- ==========================================================================
-- D5: loan_types
-- ==========================================================================
CREATE TABLE loan_types (
    loan_type_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    loan_type_code  VARCHAR(40)   NOT NULL UNIQUE,
    loan_type_name  VARCHAR(200)  NOT NULL,
    description     TEXT,
    display_order   SMALLINT      NOT NULL DEFAULT 1,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_loan_types_code
        CHECK (loan_type_code IN
            ('NEW', 'CONTINUING_SPECIAL', 'CONTINUING_YEAR')),
    CONSTRAINT ck_loan_types_display_order
        CHECK (display_order > 0)
);

-- ==========================================================================
-- D6: eligibility_rules
-- ==========================================================================
CREATE TABLE eligibility_rules (
    eligibility_rule_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    loan_type_id          BIGINT        NOT NULL,
    academic_year         VARCHAR(10)   NOT NULL,
    semester              SMALLINT      NOT NULL,
    min_gpax              NUMERIC(3,2),
    min_volunteer_hours   INTEGER,
    is_screening_required BOOLEAN       NOT NULL,
    is_active             BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_eligibility_rules_loan_type
        FOREIGN KEY (loan_type_id) REFERENCES loan_types(loan_type_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_eligibility_rules
        UNIQUE (loan_type_id, academic_year, semester),
    CONSTRAINT ck_eligibility_semester
        CHECK (semester IN (1, 2)),
    CONSTRAINT ck_eligibility_gpax
        CHECK (min_gpax IS NULL OR min_gpax BETWEEN 0.00 AND 4.00),
    CONSTRAINT ck_eligibility_volunteer_hours
        CHECK (min_volunteer_hours IS NULL OR min_volunteer_hours >= 0),
    CONSTRAINT ck_eligibility_screening_values
        CHECK (
            (is_screening_required = TRUE
                AND min_gpax IS NOT NULL
                AND min_volunteer_hours IS NOT NULL)
            OR
            (is_screening_required = FALSE
                AND min_gpax IS NULL
                AND min_volunteer_hours IS NULL)
        )
);

CREATE INDEX idx_eligibility_rules_lookup
    ON eligibility_rules(academic_year, semester, loan_type_id)
    WHERE is_active = TRUE;

-- ==========================================================================
-- D7: document_types
-- ==========================================================================
CREATE TABLE document_types (
    document_type_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_code     VARCHAR(50)   NOT NULL UNIQUE,
    document_name     VARCHAR(200)  NOT NULL,
    description       TEXT,
    is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================================
-- D8: document_requirements
-- ==========================================================================
CREATE TABLE document_requirements (
    requirement_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    loan_type_id      BIGINT       NOT NULL,
    document_type_id  BIGINT       NOT NULL,
    academic_year     VARCHAR(10)  NOT NULL,
    semester          SMALLINT     NOT NULL,
    min_age           SMALLINT,
    max_age           SMALLINT,
    is_required       BOOLEAN      NOT NULL DEFAULT TRUE,
    document_stage    VARCHAR(20)  NOT NULL DEFAULT 'PRESCREEN',
    display_order     SMALLINT     NOT NULL DEFAULT 1,
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_document_requirements_loan_type
        FOREIGN KEY (loan_type_id) REFERENCES loan_types(loan_type_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_document_requirements_document_type
        FOREIGN KEY (document_type_id) REFERENCES document_types(document_type_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_document_requirements_semester
        CHECK (semester IN (1, 2)),
    CONSTRAINT ck_document_requirements_age
        CHECK (
            (min_age IS NULL OR min_age >= 0)
            AND (max_age IS NULL OR max_age >= 0)
            AND (min_age IS NULL OR max_age IS NULL OR min_age <= max_age)
        ),
    CONSTRAINT ck_document_requirements_stage
        CHECK (document_stage IN ('PRESCREEN', 'SIGNING', 'BOTH')),
    CONSTRAINT ck_document_requirements_display_order
        CHECK (display_order > 0)
);

CREATE UNIQUE INDEX uq_document_requirements_rule
    ON document_requirements (
        loan_type_id,
        document_type_id,
        academic_year,
        semester,
        COALESCE(min_age, -1),
        COALESCE(max_age, -1),
        document_stage
    );

CREATE INDEX idx_document_requirements_lookup
    ON document_requirements
        (loan_type_id, academic_year, semester, display_order)
    WHERE is_active = TRUE;

-- ==========================================================================
-- D9: applications
-- ==========================================================================
CREATE TABLE applications (
    application_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id              BIGINT       NOT NULL,
    loan_type_id            BIGINT       NOT NULL,
    eligibility_rule_id     BIGINT,
    academic_year           VARCHAR(10)  NOT NULL,
    semester                SMALLINT     NOT NULL,
    gpax                    NUMERIC(3,2),
    volunteer_hours         INTEGER,
    eligibility_status      VARCHAR(30)  NOT NULL DEFAULT 'PENDING',
    eligibility_checked_at  TIMESTAMPTZ,
    application_status      VARCHAR(30)  NOT NULL DEFAULT 'DRAFT',
    submitted_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_applications_student
        FOREIGN KEY (student_id) REFERENCES student_profiles(student_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_applications_loan_type
        FOREIGN KEY (loan_type_id) REFERENCES loan_types(loan_type_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_applications_eligibility_rule
        FOREIGN KEY (eligibility_rule_id)
        REFERENCES eligibility_rules(eligibility_rule_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_applications_student_term
        UNIQUE (student_id, academic_year, semester),
    CONSTRAINT ck_applications_semester
        CHECK (semester IN (1, 2)),
    CONSTRAINT ck_applications_gpax
        CHECK (gpax IS NULL OR gpax BETWEEN 0.00 AND 4.00),
    CONSTRAINT ck_applications_volunteer_hours
        CHECK (volunteer_hours IS NULL OR volunteer_hours >= 0),
    CONSTRAINT ck_applications_eligibility_status
        CHECK (eligibility_status IN
            ('PENDING', 'PASSED', 'FAILED', 'NOT_REQUIRED')),
    CONSTRAINT ck_applications_status
        CHECK (application_status IN (
            'DRAFT', 'SUBMITTED', 'DOCUMENT_REVIEW',
            'REVISION_REQUIRED', 'DOCUMENT_APPROVED',
            'QUEUE_BOOKED', 'SIGNED', 'CENTRAL_SUBMITTED',
            'COMPLETED', 'CANCELLED'
        )),
    CONSTRAINT ck_applications_semester_data
        CHECK (
            (semester = 1
                AND gpax IS NOT NULL
                AND volunteer_hours IS NOT NULL
                AND eligibility_status <> 'NOT_REQUIRED')
            OR
            (semester = 2
                AND gpax IS NULL
                AND volunteer_hours IS NULL
                AND eligibility_status = 'NOT_REQUIRED')
        )
);

CREATE INDEX idx_applications_student ON applications(student_id);
CREATE INDEX idx_applications_status ON applications(application_status);
CREATE INDEX idx_applications_period ON applications(academic_year, semester);

-- ==========================================================================
-- D10: application_documents
-- ==========================================================================
CREATE TABLE application_documents (
    document_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id    BIGINT        NOT NULL,
    requirement_id    BIGINT        NOT NULL,
    file_name         VARCHAR(255)  NOT NULL,
    stored_file_name  VARCHAR(255)  NOT NULL,
    file_path         VARCHAR(500)  NOT NULL,
    mime_type         VARCHAR(100)  NOT NULL,
    file_size_bytes   BIGINT        NOT NULL,
    version_no        INTEGER       NOT NULL DEFAULT 1,
    is_current        BOOLEAN       NOT NULL DEFAULT TRUE,
    document_status   VARCHAR(30)   NOT NULL DEFAULT 'PENDING',
    uploaded_by       BIGINT        NOT NULL,
    uploaded_at       TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by       BIGINT,
    reviewed_at       TIMESTAMPTZ,
    approved_at       TIMESTAMPTZ,
    CONSTRAINT fk_application_documents_application
        FOREIGN KEY (application_id) REFERENCES applications(application_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_application_documents_requirement
        FOREIGN KEY (requirement_id)
        REFERENCES document_requirements(requirement_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_application_documents_uploaded_by
        FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_application_documents_reviewed_by
        FOREIGN KEY (reviewed_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_application_document_version
        UNIQUE (application_id, requirement_id, version_no),
    CONSTRAINT ck_application_documents_mime_type
        CHECK (mime_type IN
            ('application/pdf', 'image/jpeg', 'image/png')),
    CONSTRAINT ck_application_documents_file_size
        CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),
    CONSTRAINT ck_application_documents_version
        CHECK (version_no > 0),
    CONSTRAINT ck_application_documents_status
        CHECK (document_status IN
            ('PENDING', 'APPROVED', 'REVISION_REQUIRED', 'REJECTED'))
);

CREATE UNIQUE INDEX uq_application_document_current
    ON application_documents(application_id, requirement_id)
    WHERE is_current = TRUE;

CREATE INDEX idx_application_documents_application
    ON application_documents(application_id);
CREATE INDEX idx_application_documents_status
    ON application_documents(document_status);

-- ==========================================================================
-- D11: document_remarks
-- ==========================================================================
CREATE TABLE document_remarks (
    remark_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id    BIGINT       NOT NULL,
    remark_no      INTEGER      NOT NULL DEFAULT 1,
    remark_text    TEXT         NOT NULL,
    created_by     BIGINT       NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_resolved    BOOLEAN      NOT NULL DEFAULT FALSE,
    resolved_at    TIMESTAMPTZ,
    CONSTRAINT fk_document_remarks_document
        FOREIGN KEY (document_id)
        REFERENCES application_documents(document_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_document_remarks_created_by
        FOREIGN KEY (created_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_document_remarks_no
        UNIQUE (document_id, remark_no),
    CONSTRAINT ck_document_remarks_no
        CHECK (remark_no > 0),
    CONSTRAINT ck_document_remarks_resolved
        CHECK (
            (is_resolved = FALSE AND resolved_at IS NULL)
            OR (is_resolved = TRUE AND resolved_at IS NOT NULL)
        )
);

CREATE INDEX idx_document_remarks_document ON document_remarks(document_id);

-- ==========================================================================
-- D12: application_status_history
-- ==========================================================================
CREATE TABLE application_status_history (
    status_history_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id     BIGINT       NOT NULL,
    old_status         VARCHAR(30),
    new_status         VARCHAR(30)  NOT NULL,
    remark             TEXT,
    changed_by         BIGINT,
    changed_at         TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_application_status_history_application
        FOREIGN KEY (application_id) REFERENCES applications(application_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_application_status_history_changed_by
        FOREIGN KEY (changed_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX idx_application_status_history_application
    ON application_status_history(application_id, changed_at DESC);

-- ==========================================================================
-- D13: queue_slots
-- ==========================================================================
CREATE TABLE queue_slots (
    slot_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    queue_date    DATE         NOT NULL,
    start_time    TIME         NOT NULL,
    end_time      TIME         NOT NULL,
    capacity      INTEGER      NOT NULL,
    slot_status   VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
    created_by    BIGINT       NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_queue_slots_created_by
        FOREIGN KEY (created_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_queue_slots_period
        UNIQUE (queue_date, start_time, end_time),
    CONSTRAINT ck_queue_slots_time
        CHECK (start_time < end_time),
    CONSTRAINT ck_queue_slots_capacity
        CHECK (capacity > 0),
    CONSTRAINT ck_queue_slots_status
        CHECK (slot_status IN ('OPEN', 'CLOSED', 'CANCELLED'))
);

CREATE INDEX idx_queue_slots_available
    ON queue_slots(queue_date, start_time)
    WHERE slot_status = 'OPEN';

-- ==========================================================================
-- D14: queue_bookings
-- ==========================================================================
CREATE TABLE queue_bookings (
    booking_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id  BIGINT       NOT NULL,
    slot_id         BIGINT       NOT NULL,
    booking_status  VARCHAR(20)  NOT NULL DEFAULT 'BOOKED',
    booked_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    checked_in_at   TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    cancelled_by    BIGINT,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_queue_bookings_application
        FOREIGN KEY (application_id) REFERENCES applications(application_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_queue_bookings_slot
        FOREIGN KEY (slot_id) REFERENCES queue_slots(slot_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_queue_bookings_cancelled_by
        FOREIGN KEY (cancelled_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_queue_bookings_application_slot
        UNIQUE (application_id, slot_id),
    CONSTRAINT ck_queue_bookings_status
        CHECK (booking_status IN
            ('BOOKED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
    CONSTRAINT ck_queue_bookings_cancel_data
        CHECK (
            (booking_status = 'CANCELLED'
                AND cancelled_at IS NOT NULL
                AND cancelled_by IS NOT NULL)
            OR
            (booking_status <> 'CANCELLED')
        )
);

CREATE UNIQUE INDEX uq_queue_bookings_active_application
    ON queue_bookings(application_id)
    WHERE booking_status IN ('BOOKED', 'CHECKED_IN');

CREATE INDEX idx_queue_bookings_slot ON queue_bookings(slot_id);

-- ==========================================================================
-- D15: central_submissions
-- ==========================================================================
CREATE TABLE central_submissions (
    submission_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id      BIGINT        NOT NULL,
    signed_document_id  BIGINT,
    submitted_by        BIGINT        NOT NULL,
    submitted_at        TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference_number    VARCHAR(100),
    remark              TEXT,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_central_submissions_application
        FOREIGN KEY (application_id) REFERENCES applications(application_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_central_submissions_signed_document
        FOREIGN KEY (signed_document_id)
        REFERENCES application_documents(document_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_central_submissions_submitted_by
        FOREIGN KEY (submitted_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX idx_central_submissions_application
    ON central_submissions(application_id, submitted_at DESC);

-- ==========================================================================
-- Function and trigger: automatically maintain updated_at
-- ==========================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_student_profiles_updated_at
BEFORE UPDATE ON student_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_staff_profiles_updated_at
BEFORE UPDATE ON staff_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_loan_types_updated_at
BEFORE UPDATE ON loan_types
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_eligibility_rules_updated_at
BEFORE UPDATE ON eligibility_rules
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_document_types_updated_at
BEFORE UPDATE ON document_types
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_document_requirements_updated_at
BEFORE UPDATE ON document_requirements
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_applications_updated_at
BEFORE UPDATE ON applications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_queue_slots_updated_at
BEFORE UPDATE ON queue_slots
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_queue_bookings_updated_at
BEFORE UPDATE ON queue_bookings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================================================
-- Function and trigger: prevent overbooking
-- ==========================================================================
CREATE OR REPLACE FUNCTION prevent_queue_overbooking()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_capacity       INTEGER;
    v_slot_status    VARCHAR(20);
    v_active_booking INTEGER;
BEGIN
    IF NEW.booking_status NOT IN ('BOOKED', 'CHECKED_IN') THEN
        RETURN NEW;
    END IF;

    SELECT capacity, slot_status
      INTO v_capacity, v_slot_status
      FROM queue_slots
     WHERE slot_id = NEW.slot_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Queue slot % does not exist', NEW.slot_id;
    END IF;

    IF v_slot_status <> 'OPEN' THEN
        RAISE EXCEPTION 'Queue slot % is not open', NEW.slot_id;
    END IF;

    SELECT COUNT(*)
      INTO v_active_booking
      FROM queue_bookings
     WHERE slot_id = NEW.slot_id
       AND booking_status IN ('BOOKED', 'CHECKED_IN')
       AND booking_id <> COALESCE(NEW.booking_id, -1);

    IF v_active_booking >= v_capacity THEN
        RAISE EXCEPTION 'Queue slot % is full', NEW.slot_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_queue_overbooking
BEFORE INSERT OR UPDATE OF slot_id, booking_status ON queue_bookings
FOR EACH ROW EXECUTE FUNCTION prevent_queue_overbooking();

-- ==========================================================================
-- Function and trigger: record application status history automatically
-- ==========================================================================
CREATE OR REPLACE FUNCTION record_application_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO application_status_history
            (application_id, old_status, new_status, remark, changed_by)
        VALUES
            (NEW.application_id, NULL, NEW.application_status,
             'Application created by system', NULL);
    ELSIF NEW.application_status IS DISTINCT FROM OLD.application_status THEN
        INSERT INTO application_status_history
            (application_id, old_status, new_status, remark, changed_by)
        VALUES
            (NEW.application_id, OLD.application_status,
             NEW.application_status, 'Status updated by system', NULL);
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_application_status_history
AFTER INSERT OR UPDATE OF application_status ON applications
FOR EACH ROW EXECUTE FUNCTION record_application_status_history();

-- ==========================================================================
-- Master data: roles
-- ==========================================================================
INSERT INTO roles (role_name, description)
VALUES
    ('STUDENT', 'Student user'),
    ('STAFF',   'Student Loan Fund officer'),
    ('ADMIN',   'System administrator');

-- ==========================================================================
-- Master data: loan types
-- ==========================================================================
INSERT INTO loan_types
    (loan_type_code, loan_type_name, description, display_order)
VALUES
    (
        'NEW',
        'ผู้กู้รายใหม่',
        'ผู้กู้ที่ไม่เคยกู้มาก่อน ภาคเรียนที่ 1 ใช้สัญญากู้ยืมและใบเบิกเงิน',
        1
    ),
    (
        'CONTINUING_SPECIAL',
        'ผู้กู้ต่อเนื่องจากมัธยม ผู้กู้ย้ายสาขา หรือผู้กู้เกินหลักสูตร',
        'ภาคเรียนที่ 1 ใช้สัญญากู้ยืมและใบเบิกเงิน',
        2
    ),
    (
        'CONTINUING_YEAR',
        'ผู้กู้ต่อเนื่องเลื่อนชั้นปี',
        'ใช้ใบเบิกเงินเป็นเอกสารหลัก',
        3
    );

-- ==========================================================================
-- Master data: eligibility rules for academic year 2569
-- Change 1.80 and 36 later if the official rule changes.
-- ==========================================================================
INSERT INTO eligibility_rules
    (loan_type_id, academic_year, semester,
     min_gpax, min_volunteer_hours, is_screening_required)
SELECT loan_type_id, '2569', 1, 1.80, 36, TRUE
FROM loan_types;

INSERT INTO eligibility_rules
    (loan_type_id, academic_year, semester,
     min_gpax, min_volunteer_hours, is_screening_required)
SELECT loan_type_id, '2569', 2, NULL, NULL, FALSE
FROM loan_types;

-- ==========================================================================
-- Master data: document types
-- ==========================================================================
INSERT INTO document_types
    (document_code, document_name, description)
VALUES
    ('GPAX_EVIDENCE',
     'หลักฐานค่าเฉลี่ยสะสม (GPAX)',
     'ใช้ประกอบการคัดกรองเฉพาะภาคเรียนที่ 1'),
    ('VOLUNTEER_EVIDENCE',
     'หลักฐานชั่วโมงจิตอาสา',
     'ใช้ประกอบการคัดกรองเฉพาะภาคเรียนที่ 1'),
    ('LOAN_CONTRACT',
     'สัญญากู้ยืมเงิน',
     'ใช้กับผู้กู้ NEW และ CONTINUING_SPECIAL ในภาคเรียนที่ 1'),
    ('DISBURSEMENT_FORM',
     'ใบเบิกเงินกู้ยืม',
     'ใช้ตามเงื่อนไขของแต่ละภาคเรียน'),
    ('STUDENT_ID_CARD',
     'สำเนาบัตรประจำตัวประชาชนผู้กู้',
     'ใช้ทุกประเภทผู้กู้ทั้งสองภาคเรียน'),
    ('PARENT_PHOTO',
     'รูปถ่ายผู้ปกครอง',
     'ใช้เมื่อผู้กู้อายุไม่ครบ 20 ปีบริบูรณ์'),
    ('PARENT_ID_CARD',
     'สำเนาบัตรประจำตัวประชาชนผู้ปกครอง',
     'ใช้เมื่อผู้กู้อายุไม่ครบ 20 ปีบริบูรณ์');

-- ==========================================================================
-- Document requirements: semester 1 evidence for every loan type
-- ==========================================================================
INSERT INTO document_requirements
    (loan_type_id, document_type_id, academic_year, semester,
     min_age, max_age, is_required, document_stage, display_order)
SELECT lt.loan_type_id, dt.document_type_id, '2569', 1,
       NULL, NULL, TRUE, 'PRESCREEN',
       CASE dt.document_code
           WHEN 'GPAX_EVIDENCE' THEN 1
           WHEN 'VOLUNTEER_EVIDENCE' THEN 2
       END
FROM loan_types lt
CROSS JOIN document_types dt
WHERE dt.document_code IN ('GPAX_EVIDENCE', 'VOLUNTEER_EVIDENCE');

-- Semester 1: NEW and CONTINUING_SPECIAL use contract, disbursement and ID copy
INSERT INTO document_requirements
    (loan_type_id, document_type_id, academic_year, semester,
     min_age, max_age, is_required, document_stage, display_order)
SELECT lt.loan_type_id, dt.document_type_id, '2569', 1,
       NULL, NULL, TRUE, 'BOTH',
       CASE dt.document_code
           WHEN 'LOAN_CONTRACT' THEN 3
           WHEN 'DISBURSEMENT_FORM' THEN 4
           WHEN 'STUDENT_ID_CARD' THEN 5
       END
FROM loan_types lt
CROSS JOIN document_types dt
WHERE lt.loan_type_code IN ('NEW', 'CONTINUING_SPECIAL')
  AND dt.document_code IN
      ('LOAN_CONTRACT', 'DISBURSEMENT_FORM', 'STUDENT_ID_CARD');

-- Semester 1: CONTINUING_YEAR uses disbursement and ID copy
INSERT INTO document_requirements
    (loan_type_id, document_type_id, academic_year, semester,
     min_age, max_age, is_required, document_stage, display_order)
SELECT lt.loan_type_id, dt.document_type_id, '2569', 1,
       NULL, NULL, TRUE, 'BOTH',
       CASE dt.document_code
           WHEN 'DISBURSEMENT_FORM' THEN 3
           WHEN 'STUDENT_ID_CARD' THEN 4
       END
FROM loan_types lt
CROSS JOIN document_types dt
WHERE lt.loan_type_code = 'CONTINUING_YEAR'
  AND dt.document_code IN ('DISBURSEMENT_FORM', 'STUDENT_ID_CARD');

-- Semester 2: every loan type uses disbursement and ID copy
INSERT INTO document_requirements
    (loan_type_id, document_type_id, academic_year, semester,
     min_age, max_age, is_required, document_stage, display_order)
SELECT lt.loan_type_id, dt.document_type_id, '2569', 2,
       NULL, NULL, TRUE, 'BOTH',
       CASE dt.document_code
           WHEN 'DISBURSEMENT_FORM' THEN 1
           WHEN 'STUDENT_ID_CARD' THEN 2
       END
FROM loan_types lt
CROSS JOIN document_types dt
WHERE dt.document_code IN ('DISBURSEMENT_FORM', 'STUDENT_ID_CARD');

-- Under 20 years: parent photo and parent ID copy in both semesters
INSERT INTO document_requirements
    (loan_type_id, document_type_id, academic_year, semester,
     min_age, max_age, is_required, document_stage, display_order)
SELECT lt.loan_type_id, dt.document_type_id, '2569', s.semester,
       NULL, 19, TRUE, 'BOTH',
       CASE dt.document_code
           WHEN 'PARENT_PHOTO' THEN 90
           WHEN 'PARENT_ID_CARD' THEN 91
       END
FROM loan_types lt
CROSS JOIN document_types dt
CROSS JOIN (VALUES (1), (2)) AS s(semester)
WHERE dt.document_code IN ('PARENT_PHOTO', 'PARENT_ID_CARD');

-- ==========================================================================
-- Views for frontend/dashboard
-- ==========================================================================
CREATE VIEW v_application_overview AS
SELECT
    a.application_id,
    sp.student_code,
    concat(sp.first_name, ' ', sp.last_name) AS student_name,
    lt.loan_type_code,
    lt.loan_type_name,
    a.academic_year,
    a.semester,
    a.gpax,
    a.volunteer_hours,
    a.eligibility_status,
    a.application_status,
    a.created_at,
    a.updated_at
FROM applications a
JOIN student_profiles sp ON sp.student_id = a.student_id
JOIN loan_types lt ON lt.loan_type_id = a.loan_type_id;

CREATE VIEW v_queue_slot_availability AS
SELECT
    qs.slot_id,
    qs.queue_date,
    qs.start_time,
    qs.end_time,
    qs.capacity,
    COUNT(qb.booking_id) FILTER (
        WHERE qb.booking_status IN ('BOOKED', 'CHECKED_IN')
    ) AS booked_count,
    qs.capacity - COUNT(qb.booking_id) FILTER (
        WHERE qb.booking_status IN ('BOOKED', 'CHECKED_IN')
    ) AS remaining_capacity,
    qs.slot_status
FROM queue_slots qs
LEFT JOIN queue_bookings qb ON qb.slot_id = qs.slot_id
GROUP BY
    qs.slot_id, qs.queue_date, qs.start_time, qs.end_time,
    qs.capacity, qs.slot_status;

COMMIT;

-- ==========================================================================
-- Verification queries
-- ==========================================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'psu_loan'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

SELECT role_id, role_name, description
FROM psu_loan.roles
ORDER BY role_id;

SELECT loan_type_id, loan_type_code, loan_type_name
FROM psu_loan.loan_types
ORDER BY display_order;

SELECT
    lt.loan_type_code,
    dr.academic_year,
    dr.semester,
    dt.document_code,
    dt.document_name,
    dr.min_age,
    dr.max_age,
    dr.document_stage,
    dr.display_order
FROM psu_loan.document_requirements dr
JOIN psu_loan.loan_types lt
  ON lt.loan_type_id = dr.loan_type_id
JOIN psu_loan.document_types dt
  ON dt.document_type_id = dr.document_type_id
ORDER BY
    lt.display_order,
    dr.semester,
    dr.display_order;



SELECT COUNT(*) AS total_tables
FROM information_schema.tables
WHERE table_schema = 'psu_loan'
  AND table_type = 'BASE TABLE';




  SELECT COUNT(*) AS total_roles
FROM psu_loan.roles;

SELECT COUNT(*) AS total_loan_types
FROM psu_loan.loan_types;

SELECT COUNT(*) AS total_eligibility_rules
FROM psu_loan.eligibility_rules;

SELECT COUNT(*) AS total_document_types
FROM psu_loan.document_types;

SELECT COUNT(*) AS total_document_requirements
FROM psu_loan.document_requirements;


SELECT
    lt.loan_type_code,
    dr.semester,
    dt.document_code,
    dt.document_name,
    dr.min_age,
    dr.max_age,
    dr.document_stage
FROM psu_loan.document_requirements dr
JOIN psu_loan.loan_types lt
    ON lt.loan_type_id = dr.loan_type_id
JOIN psu_loan.document_types dt
    ON dt.document_type_id = dr.document_type_id
WHERE lt.loan_type_code = 'CONTINUING_SPECIAL'
  AND dr.academic_year = '2569'
  AND dr.semester = 1
  AND dr.is_active = TRUE
  AND (
      (dr.min_age IS NULL OR 18 >= dr.min_age)
      AND
      (dr.max_age IS NULL OR 18 <= dr.max_age)
  )
ORDER BY dr.display_order;



