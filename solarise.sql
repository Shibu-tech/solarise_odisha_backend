-- ============================================================
-- SOLARISE ODISHA DATABASE DUMP (PURE 'solarise' SCHEMA)
-- Compatible with Neon PostgreSQL and Standard PostgreSQL
-- ============================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- 1. Create Schema and Extensions
CREATE SCHEMA IF NOT EXISTS solarise;
SET search_path = solarise, public;

CREATE EXTENSION IF NOT EXISTS citext;

-- 2. Create Custom ENUM Types in 'solarise' schema
DO $$ BEGIN
    CREATE TYPE solarise.action_status AS ENUM (
        'open',
        'doc_uploaded',
        'in_review',
        'resolved',
        'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE solarise.action_type AS ENUM (
        'electric_bill_name_correction',
        'ownership_transfer',
        'commercial_to_domestic',
        'bank_passbook_name_correction',
        'bank_passbook_update',
        'other'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE solarise.document_status AS ENUM (
        'uploaded',
        'verified',
        'rejected',
        'action_required'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE solarise.document_type AS ENUM (
        'electric_bill',
        'aadhaar_card',
        'pan_card',
        'bank_passbook',
        'roof_geotagged_photo',
        'land_ror',
        'sale_deed',
        'malgujani',
        'bank_statement_6m',
        'salary_slip',
        'it_return',
        'beneficiary_aadhaar',
        'noc',
        'form_1',
        'self_undertaking',
        'death_certificate',
        'legal_heir_certificate',
        'material_sealing_video',
        'customer_consent_video',
        'plant_geotagged_photo',
        'inverter_serial_photo',
        'inverter_setup_photo',
        'earthing_photo',
        'la_photo',
        'inspection_report',
        'psa_agreement',
        'net_metering_agreement',
        'other'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE solarise.installation_item AS ENUM (
        'structure',
        'panel',
        'inverter_looping',
        'ac_wiring',
        'dc_wiring',
        'lightning_arrester',
        'earthing',
        'earthing_pit',
        'concreting',
        'output_service'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE solarise.occupation_type AS ENUM (
        'self_employed',
        'farmer',
        'housewife',
        'government_service',
        'private_job',
        'other'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE solarise.payment_mode AS ENUM (
        'cash',
        'bank_loan',
        'shriram_finance'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE solarise.payment_status AS ENUM (
        'pending',
        'paid',
        'refunded',
        'failed'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE solarise.payment_type AS ENUM (
        'processing_fee',
        'security_deposit',
        'consumer_payment',
        'loan_disbursal',
        'subsidy_cfa',
        'subsidy_sfa'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE solarise.project_status AS ENUM (
        'new_registration',
        'doc_requested',
        'doc_uploaded',
        'doc_verified',
        'action_required',
        'action_required_bank',
        'work_in_progress',
        'processing_fee_paid',
        'registration_no_generated',
        'master_data_pending',
        'name_corrected',
        'ownership_changed',
        'type_converted',
        'pending_with_discom',
        'security_deposit_pending',
        'security_deposit_paid',
        'psa_agreement_done',
        'pmsgy_done',
        'loan_applied',
        'loan_approved',
        'loan_rejected',
        'line_up_given',
        'materials_delivered',
        'installation_in_progress',
        'installation_done',
        'installation_uploaded_pmsgy',
        'net_metering_applied',
        'net_metering_rts_pending',
        'net_metering_payment_pending',
        'net_metering_agreement_done',
        'inspection_report_submitted',
        'site_activity',
        'approval_desk',
        'service_release',
        'service_released',
        'meter_installed',
        'project_commissioned',
        'subsidy_redeemed',
        'subsidy_return',
        'subsidy_pending',
        'subsidy_disbursed_cfa',
        'subsidy_disbursed_sfa',
        'project_handover_pending',
        'project_handed_over'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE solarise.user_role AS ENUM (
        'agent',
        'site_manager',
        'doc_team',
        'accounts',
        'admin'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

SET default_tablespace = '';
SET default_table_access_method = heap;

-- 3. Create Tables in 'solarise' schema

CREATE TABLE IF NOT EXISTS solarise.action_required (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    project_id bigint NOT NULL,
    action_type solarise.action_type NOT NULL,
    detail text,
    status solarise.action_status DEFAULT 'open'::solarise.action_status NOT NULL,
    raised_by bigint NOT NULL,
    raised_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_to bigint,
    resolved_by bigint,
    resolved_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS solarise.area_blocks (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    district text DEFAULT 'Khurda'::text NOT NULL
);

CREATE TABLE IF NOT EXISTS solarise.bank_loans (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    consumer_id bigint NOT NULL,
    is_ghanbani_land boolean,
    bank_name text,
    loan_amount numeric(12,2),
    applied_at timestamp with time zone,
    approved_at timestamp with time zone,
    rejected_at timestamp with time zone,
    remarks text
);

CREATE TABLE IF NOT EXISTS solarise.consumer_transfers (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    consumer_id bigint NOT NULL,
    from_agent_id bigint,
    to_agent_id bigint NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS solarise.consumers (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    first_name text NOT NULL,
    last_name text,
    address text NOT NULL,
    area_block_id bigint NOT NULL,
    email citext,
    phone_primary character varying(15) NOT NULL,
    phone_secondary character varying(15),
    contact_person_name text,
    contact_person_phone character varying(15),
    contact_person_relation text,
    same_as_contact_person boolean DEFAULT false NOT NULL,
    name_on_electric_bill text NOT NULL,
    phone_on_electric_bill character varying(15),
    geo_lat numeric(9,6),
    geo_lng numeric(9,6),
    electric_consumer_no text NOT NULL,
    age smallint,
    surpassed_mac boolean GENERATED ALWAYS AS ((age > 64)) STORED,
    aadhaar_no character(12),
    pan_no character(10),
    bank_account_no text,
    payment_mode solarise.payment_mode NOT NULL,
    land_owned_by_consumer boolean DEFAULT true NOT NULL,
    occupation solarise.occupation_type,
    created_by bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);

CREATE TABLE IF NOT EXISTS solarise.documents (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    consumer_id bigint NOT NULL,
    doc_type solarise.document_type NOT NULL,
    file_url text NOT NULL,
    file_name text,
    mime_type text,
    geo_lat numeric(9,6),
    geo_lng numeric(9,6),
    status solarise.document_status DEFAULT 'uploaded'::solarise.document_status NOT NULL,
    uploaded_by bigint NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    verified_by bigint,
    verified_at timestamp with time zone,
    reject_reason text,
    version integer DEFAULT 1 NOT NULL
);

CREATE TABLE IF NOT EXISTS solarise.installation_progress (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    project_id bigint NOT NULL,
    item solarise.installation_item NOT NULL,
    weight_pct numeric(4,2) NOT NULL,
    is_done boolean DEFAULT false NOT NULL,
    done_by bigint,
    done_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS solarise.material_deliveries (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    project_id bigint NOT NULL,
    delivered_at timestamp with time zone DEFAULT now() NOT NULL,
    dcr_number text,
    recorded_by bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS solarise.notifications (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    user_id bigint NOT NULL,
    project_id bigint,
    title text NOT NULL,
    body text,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS solarise.ownership_transfers (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    action_id bigint NOT NULL,
    all_ror_members_alive boolean NOT NULL,
    beneficiary_name text NOT NULL,
    remarks text
);

CREATE TABLE IF NOT EXISTS solarise.payments (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    project_id bigint NOT NULL,
    payment_type solarise.payment_type NOT NULL,
    amount numeric(12,2) NOT NULL,
    status solarise.payment_status DEFAULT 'pending'::solarise.payment_status NOT NULL,
    reference_no text,
    paid_at timestamp with time zone,
    recorded_by bigint NOT NULL,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payments_amount_check CHECK ((amount >= (0)::numeric))
);

CREATE TABLE IF NOT EXISTS solarise.projects (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    consumer_id bigint NOT NULL,
    current_status solarise.project_status DEFAULT 'new_registration'::solarise.project_status NOT NULL,
    registration_no text,
    capacity_kw numeric(5,2) NOT NULL,
    assigned_site_manager bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS solarise.status_history (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    project_id bigint NOT NULL,
    from_status solarise.project_status,
    to_status solarise.project_status NOT NULL,
    changed_by bigint NOT NULL,
    remarks text,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS solarise.users (
    id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
    first_name text NOT NULL,
    last_name text,
    email citext NOT NULL,
    phone character varying(15) NOT NULL,
    role solarise.user_role NOT NULL,
    password_hash text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Extract and Insert Data for solarise tables

-- Data for tables in solarise schema

COPY solarise.action_required (id, project_id, action_type, detail, status, raised_by, raised_at, assigned_to, resolved_by, resolved_at) FROM stdin;
\.

COPY solarise.area_blocks (id, name, is_active, district) FROM stdin;
1	Bhubaneswar	t	Khurda
2	Bhawanipatna	t	Kalahandi
\.

COPY solarise.bank_loans (id, consumer_id, is_ghanbani_land, bank_name, loan_amount, applied_at, approved_at, rejected_at, remarks) FROM stdin;
\.

COPY solarise.consumer_transfers (id, consumer_id, from_agent_id, to_agent_id, status, remarks, created_at, updated_at) FROM stdin;
\.

COPY solarise.consumers (id, first_name, last_name, address, area_block_id, email, phone_primary, phone_secondary, contact_person_name, contact_person_phone, contact_person_relation, same_as_contact_person, name_on_electric_bill, phone_on_electric_bill, geo_lat, geo_lng, electric_consumer_no, age, aadhaar_no, pan_no, bank_account_no, payment_mode, land_owned_by_consumer, occupation, created_by, created_at, updated_at, is_active) FROM stdin;
1	Aman	Kumar	GCEK Bhawanipatna, Bandhopala	2	aman94251kumar@gmail.com	8144967943	7894561236	Aman Kumar	8144967943	Self	t	Aman Kumar Sah		19.910005	83.164607	ELE-2026-9090	20	456114562312	ABCDE1234F		cash	t	self_employed	1	2026-08-22 14:52:52.212751+05:30	2026-08-22 14:52:52.212751+05:30	t
\.

COPY solarise.documents (id, consumer_id, doc_type, file_url, file_name, mime_type, geo_lat, geo_lng, status, uploaded_by, uploaded_at, verified_by, verified_at, reject_reason, version) FROM stdin;
1	1	electric_bill	https://solarise-odisha-storage.s3.ap-south-2.amazonaws.com/documents/1/electric_bill/191705f3-0308-41f2-a36f-fa246073b557-Summer-work-grade-9-into-10.pdf	Summer work grade 9 into 10.pdf	application/pdf	19.910024	83.164653	rejected	1	2026-08-22 14:53:33.168375+05:30	1	2026-08-22 17:04:17.103094+05:30	Wrong file uploaded	1
\.

COPY solarise.installation_progress (id, project_id, item, weight_pct, is_done, done_by, done_at) FROM stdin;
\.

COPY solarise.material_deliveries (id, project_id, delivered_at, dcr_number, recorded_by) FROM stdin;
\.

COPY solarise.notifications (id, user_id, project_id, title, body, is_read, created_at) FROM stdin;
\.

COPY solarise.ownership_transfers (id, action_id, all_ror_members_alive, beneficiary_name, remarks) FROM stdin;
\.

COPY solarise.payments (id, project_id, payment_type, amount, status, reference_no, paid_at, recorded_by, remarks, created_at) FROM stdin;
\.

COPY solarise.projects (id, consumer_id, current_status, registration_no, capacity_kw, assigned_site_manager, created_at, updated_at) FROM stdin;
\.

COPY solarise.status_history (id, project_id, from_status, to_status, changed_by, remarks, changed_at) FROM stdin;
\.

COPY solarise.users (id, first_name, last_name, email, phone, role, password_hash, is_active, created_at, updated_at) FROM stdin;
1	Shibu	Nayak	shibu.nayak@example.com	9876543210	admin	$2b$10$K8fkaGJIg2MQbVk0RjuuO.Aq8nVZSlEaXhZ5eSd/HhxE7VVHkoGOS	t	2026-08-09 13:26:23.220702+05:30	2026-08-09 13:26:23.220702+05:30
2	Omprakash	Behera	prakash.behera@example.com	7894561230	site_manager	$2b$10$Z6EQWGSq9qUeXcTszCsb1e0.5ezoF.EpR7SpFSdvJ1/fOTkjkD0cm	t	2026-08-09 14:19:53.95723+05:30	2026-08-09 14:19:53.95723+05:30
3	Chinmaya	Behera	chinmaya@solarise.com	9632587410	doc_team	chinmaya123	t	2026-08-15 13:03:54.384466+05:30	2026-08-15 13:03:54.384466+05:30
4	Raja	Moharana	raja.moharana@example.com	9874563214	agent	$2b$10$H2VDTToiHi3EovRoyQf.I.Dt3OtA4LbGYLa.dzPy2yUQVdP1VufpK	t	2026-08-19 18:41:22.089073+05:30	2026-08-19 18:41:22.089073+05:30
\.


-- Sequences setval for solarise schema

SELECT pg_catalog.setval('solarise.action_required_id_seq', 1, false);
SELECT pg_catalog.setval('solarise.area_blocks_id_seq', 2, true);
SELECT pg_catalog.setval('solarise.bank_loans_id_seq', 1, false);
SELECT pg_catalog.setval('solarise.consumer_transfers_id_seq', 1, false);
SELECT pg_catalog.setval('solarise.consumers_id_seq', 1, true);
SELECT pg_catalog.setval('solarise.documents_id_seq', 1, true);
SELECT pg_catalog.setval('solarise.installation_progress_id_seq', 1, false);
SELECT pg_catalog.setval('solarise.material_deliveries_id_seq', 1, true);
SELECT pg_catalog.setval('solarise.notifications_id_seq', 1, false);
SELECT pg_catalog.setval('solarise.ownership_transfers_id_seq', 1, false);
SELECT pg_catalog.setval('solarise.payments_id_seq', 1, false);
SELECT pg_catalog.setval('solarise.projects_id_seq', 1, false);
SELECT pg_catalog.setval('solarise.status_history_id_seq', 1, false);
SELECT pg_catalog.setval('solarise.users_id_seq', 4, true);

-- 5. Constraints & Primary Keys for solarise schema

ALTER TABLE ONLY solarise.action_required
    ADD CONSTRAINT action_required_pkey PRIMARY KEY (id);

ALTER TABLE ONLY solarise.area_blocks
    ADD CONSTRAINT area_blocks_name_key UNIQUE (name);

ALTER TABLE ONLY solarise.area_blocks
    ADD CONSTRAINT area_blocks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY solarise.bank_loans
    ADD CONSTRAINT bank_loans_consumer_id_key UNIQUE (consumer_id);

ALTER TABLE ONLY solarise.bank_loans
    ADD CONSTRAINT bank_loans_pkey PRIMARY KEY (id);

ALTER TABLE ONLY solarise.consumer_transfers
    ADD CONSTRAINT consumer_transfers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY solarise.consumers
    ADD CONSTRAINT consumers_aadhaar_no_key UNIQUE (aadhaar_no);

ALTER TABLE ONLY solarise.consumers
    ADD CONSTRAINT consumers_electric_consumer_no_key UNIQUE (electric_consumer_no);

ALTER TABLE ONLY solarise.consumers
    ADD CONSTRAINT consumers_pan_no_key UNIQUE (pan_no);

ALTER TABLE ONLY solarise.consumers
    ADD CONSTRAINT consumers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY solarise.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY solarise.installation_progress
    ADD CONSTRAINT installation_progress_pkey PRIMARY KEY (id);

ALTER TABLE ONLY solarise.installation_progress
    ADD CONSTRAINT installation_progress_project_id_item_key UNIQUE (project_id, item);

ALTER TABLE ONLY solarise.material_deliveries
    ADD CONSTRAINT material_deliveries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY solarise.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY solarise.ownership_transfers
    ADD CONSTRAINT ownership_transfers_action_id_key UNIQUE (action_id);

ALTER TABLE ONLY solarise.ownership_transfers
    ADD CONSTRAINT ownership_transfers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY solarise.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY solarise.projects
    ADD CONSTRAINT projects_consumer_id_key UNIQUE (consumer_id);

ALTER TABLE ONLY solarise.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);

ALTER TABLE ONLY solarise.projects
    ADD CONSTRAINT projects_registration_no_key UNIQUE (registration_no);

ALTER TABLE ONLY solarise.status_history
    ADD CONSTRAINT status_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY solarise.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY solarise.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);

ALTER TABLE ONLY solarise.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- 6. Indexes for solarise schema

CREATE INDEX IF NOT EXISTS idx_action_required_project ON solarise.action_required USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_action_required_status ON solarise.action_required USING btree (status);
CREATE INDEX IF NOT EXISTS idx_consumers_area_block ON solarise.consumers USING btree (area_block_id);
CREATE INDEX IF NOT EXISTS idx_consumers_created_by ON solarise.consumers USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_consumers_electric_no ON solarise.consumers USING btree (electric_consumer_no);
CREATE INDEX IF NOT EXISTS idx_documents_consumer ON solarise.documents USING btree (consumer_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON solarise.documents USING btree (status);
CREATE INDEX IF NOT EXISTS idx_installation_progress_project ON solarise.installation_progress USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_material_deliveries_project ON solarise.material_deliveries USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON solarise.notifications USING btree (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_payments_project ON solarise.payments USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_projects_consumer ON solarise.projects USING btree (consumer_id);
CREATE INDEX IF NOT EXISTS idx_projects_site_manager ON solarise.projects USING btree (assigned_site_manager);
CREATE INDEX IF NOT EXISTS idx_projects_status ON solarise.projects USING btree (current_status);
CREATE INDEX IF NOT EXISTS idx_status_history_project ON solarise.status_history USING btree (project_id);

-- 7. Foreign Key Constraints for solarise schema

ALTER TABLE ONLY solarise.action_required
    ADD CONSTRAINT action_required_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES solarise.users(id);

ALTER TABLE ONLY solarise.action_required
    ADD CONSTRAINT action_required_project_id_fkey FOREIGN KEY (project_id) REFERENCES solarise.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY solarise.action_required
    ADD CONSTRAINT action_required_raised_by_fkey FOREIGN KEY (raised_by) REFERENCES solarise.users(id);

ALTER TABLE ONLY solarise.action_required
    ADD CONSTRAINT action_required_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES solarise.users(id);

ALTER TABLE ONLY solarise.bank_loans
    ADD CONSTRAINT bank_loans_consumer_id_fkey FOREIGN KEY (consumer_id) REFERENCES solarise.consumers(id) ON DELETE CASCADE;

ALTER TABLE ONLY solarise.consumer_transfers
    ADD CONSTRAINT consumer_transfers_consumer_id_fkey FOREIGN KEY (consumer_id) REFERENCES solarise.consumers(id) ON DELETE CASCADE;

ALTER TABLE ONLY solarise.consumer_transfers
    ADD CONSTRAINT consumer_transfers_from_agent_id_fkey FOREIGN KEY (from_agent_id) REFERENCES solarise.users(id);

ALTER TABLE ONLY solarise.consumer_transfers
    ADD CONSTRAINT consumer_transfers_to_agent_id_fkey FOREIGN KEY (to_agent_id) REFERENCES solarise.users(id);

ALTER TABLE ONLY solarise.consumers
    ADD CONSTRAINT consumers_area_block_id_fkey FOREIGN KEY (area_block_id) REFERENCES solarise.area_blocks(id);

ALTER TABLE ONLY solarise.consumers
    ADD CONSTRAINT consumers_created_by_fkey FOREIGN KEY (created_by) REFERENCES solarise.users(id);

ALTER TABLE ONLY solarise.documents
    ADD CONSTRAINT documents_consumer_id_fkey FOREIGN KEY (consumer_id) REFERENCES solarise.consumers(id) ON DELETE CASCADE;

ALTER TABLE ONLY solarise.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES solarise.users(id);

ALTER TABLE ONLY solarise.documents
    ADD CONSTRAINT documents_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES solarise.users(id);

ALTER TABLE ONLY solarise.installation_progress
    ADD CONSTRAINT installation_progress_done_by_fkey FOREIGN KEY (done_by) REFERENCES solarise.users(id);

ALTER TABLE ONLY solarise.installation_progress
    ADD CONSTRAINT installation_progress_project_id_fkey FOREIGN KEY (project_id) REFERENCES solarise.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY solarise.material_deliveries
    ADD CONSTRAINT material_deliveries_project_id_fkey FOREIGN KEY (project_id) REFERENCES solarise.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY solarise.material_deliveries
    ADD CONSTRAINT material_deliveries_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES solarise.users(id);

ALTER TABLE ONLY solarise.notifications
    ADD CONSTRAINT notifications_project_id_fkey FOREIGN KEY (project_id) REFERENCES solarise.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY solarise.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES solarise.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY solarise.ownership_transfers
    ADD CONSTRAINT ownership_transfers_action_id_fkey FOREIGN KEY (action_id) REFERENCES solarise.action_required(id) ON DELETE CASCADE;

ALTER TABLE ONLY solarise.payments
    ADD CONSTRAINT payments_project_id_fkey FOREIGN KEY (project_id) REFERENCES solarise.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY solarise.payments
    ADD CONSTRAINT payments_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES solarise.users(id);

ALTER TABLE ONLY solarise.projects
    ADD CONSTRAINT projects_assigned_site_manager_fkey FOREIGN KEY (assigned_site_manager) REFERENCES solarise.users(id);

ALTER TABLE ONLY solarise.projects
    ADD CONSTRAINT projects_consumer_id_fkey FOREIGN KEY (consumer_id) REFERENCES solarise.consumers(id) ON DELETE CASCADE;

ALTER TABLE ONLY solarise.status_history
    ADD CONSTRAINT status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES solarise.users(id);

ALTER TABLE ONLY solarise.status_history
    ADD CONSTRAINT status_history_project_id_fkey FOREIGN KEY (project_id) REFERENCES solarise.projects(id) ON DELETE CASCADE;
