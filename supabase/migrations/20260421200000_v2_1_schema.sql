-- Franklin Offshore — Appraisal System v2.1 schema
-- Applies PRD v2.1 (21 April 2026): 5-role workflow, 11/15 criteria, Section IV confidentiality,
-- appraisal types (annual/confirmation/promotion), N/A criteria support, bell-curve reporting,
-- Employee Number authentication, org chart routing, training sections per form type.

set search_path = public, extensions;
create extension if not exists pgcrypto;
create extension if not exists citext;

-- ── ENUMS ────────────────────────────────────────────────────────────────────
do $$ begin
  create type form_type as enum ('workers', 'office');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appraisal_type as enum ('annual', 'confirmation', 'promotion');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appraisal_state as enum (
    'draft',
    'pending_appraiser',
    'pending_appraisee',
    'pending_hod',
    'pending_sm',
    'pending_hr',
    'completed',
    'rejected',
    'overdue'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_role as enum (
    'hr_admin',
    'senior_management',
    'hod',
    'appraiser',
    'appraisee'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type recommendation as enum (
    'continue',
    'higher_responsibility',
    'promotion'
  );
exception when duplicate_object then null; end $$;

-- ── EMPLOYEES ────────────────────────────────────────────────────────────────
create table if not exists employees (
  id              uuid primary key default gen_random_uuid(),
  employee_no     citext unique not null,
  name            text not null,
  designation     text,
  department      text,
  date_joined     date,
  email           citext,
  phone           text,
  form_type       form_type not null default 'office',
  role            app_role not null default 'appraisee',
  appraiser_id    uuid references employees(id) on delete set null,
  hod_id          uuid references employees(id) on delete set null,
  sm_id           uuid references employees(id) on delete set null,
  is_active       boolean not null default true,
  password_hash   text,            -- scrypt hash: $scrypt$N=16384,r=8,p=1$salt$hash
  must_change_password boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_employees_appraiser on employees(appraiser_id);
create index if not exists idx_employees_hod on employees(hod_id);
create index if not exists idx_employees_sm on employees(sm_id);
create index if not exists idx_employees_department on employees(department);
create index if not exists idx_employees_active on employees(is_active);

-- ── APPRAISAL CYCLES ─────────────────────────────────────────────────────────
create table if not exists appraisal_cycles (
  id           uuid primary key default gen_random_uuid(),
  cycle_year   int unique not null,        -- year of the 30 Sep end (e.g. 2026 = Oct 2025 – Sep 2026)
  start_date   date not null,
  end_date     date not null,
  deadline_date date not null,              -- 7 Oct of cycle_year
  is_active    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ── APPRAISALS ──────────────────────────────────────────────────────────────
create table if not exists appraisals (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references employees(id) on delete cascade,
  form_type       form_type not null,
  appraisal_type  appraisal_type not null default 'annual',
  cycle_year      int not null,
  state           appraisal_state not null default 'draft',
  appraiser_id    uuid references employees(id),
  hod_id          uuid references employees(id),
  sm_id           uuid references employees(id),
  hr_id           uuid references employees(id),
  total_score     numeric(6,2),       -- sum of effective ratings
  max_score       numeric(6,2),       -- max possible (5 × applicable criteria)
  overall_pct     numeric(6,2),       -- (total / max) * 100
  performance_grade text,             -- derived from bands
  rejected_reason text,
  appraiser_submitted_at timestamptz,
  appraisee_submitted_at timestamptz,
  hod_submitted_at timestamptz,
  sm_submitted_at timestamptz,
  hr_accepted_at  timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (employee_id, cycle_year)
);

create index if not exists idx_appraisals_state on appraisals(state);
create index if not exists idx_appraisals_cycle on appraisals(cycle_year);
create index if not exists idx_appraisals_appraiser on appraisals(appraiser_id);
create index if not exists idx_appraisals_hod on appraisals(hod_id);
create index if not exists idx_appraisals_sm on appraisals(sm_id);
create index if not exists idx_appraisals_employee on appraisals(employee_id);

-- ── APPRAISAL SCORES ─────────────────────────────────────────────────────────
create table if not exists appraisal_scores (
  id                uuid primary key default gen_random_uuid(),
  appraisal_id      uuid not null references appraisals(id) on delete cascade,
  criterion_no      int not null,
  criterion_name    text not null,
  is_applicable     boolean not null default true,
  appraiser_rating  int check (appraiser_rating between 1 and 5),
  sm_rating         int check (sm_rating between 1 and 5),
  effective_rating  int,
  comments          text default '',
  updated_at        timestamptz not null default now(),
  unique (appraisal_id, criterion_no)
);

create index if not exists idx_scores_appraisal on appraisal_scores(appraisal_id);

-- ── APPRAISAL TRAINING ───────────────────────────────────────────────────────
create table if not exists appraisal_training (
  id              uuid primary key default gen_random_uuid(),
  appraisal_id    uuid not null references appraisals(id) on delete cascade,
  training_type   text not null,
  is_selected     boolean,
  remarks         text default '',
  unique (appraisal_id, training_type)
);

-- ── APPRAISAL NARRATIVE ──────────────────────────────────────────────────────
create table if not exists appraisal_narrative (
  appraisal_id              uuid primary key references appraisals(id) on delete cascade,
  appraiser_overall_comments text default '',
  staff_comments            text default '',
  hod_comments              text default '',
  sm_comments               text default '',
  hr_remarks                text default '',
  updated_at                timestamptz not null default now()
);

-- ── SECTION IV — Not For Discussion With Appraisee ───────────────────────────
create table if not exists section_iv (
  appraisal_id       uuid primary key references appraisals(id) on delete cascade,
  confirmation_date  date,
  extension_date     date,
  recommendation     recommendation,
  target_role        text,
  timeframe          text,
  justification      text default '',
  hod_signed_at      timestamptz,
  hod_signed_by      uuid references employees(id),
  sm_signed_at       timestamptz,
  sm_signed_by       uuid references employees(id),
  hr_signed_at       timestamptz,
  hr_signed_by       uuid references employees(id),
  updated_at         timestamptz not null default now()
);

-- ── SIGNATURES (audit of role sign-offs) ─────────────────────────────────────
create table if not exists signatures (
  id             uuid primary key default gen_random_uuid(),
  appraisal_id   uuid not null references appraisals(id) on delete cascade,
  role           app_role not null,
  signed_by_id   uuid not null references employees(id),
  signed_at      timestamptz not null default now(),
  ip_address     text
);

create index if not exists idx_signatures_appraisal on signatures(appraisal_id);

-- ── AUDIT LOG ───────────────────────────────────────────────────────────────
create table if not exists audit_log (
  id            uuid primary key default gen_random_uuid(),
  appraisal_id  uuid references appraisals(id) on delete cascade,
  actor_id      uuid references employees(id) on delete set null,
  actor_role    app_role,
  action        text not null,
  detail        text,
  previous_value jsonb,
  new_value     jsonb,
  at            timestamptz not null default now()
);

create index if not exists idx_audit_appraisal on audit_log(appraisal_id);
create index if not exists idx_audit_at on audit_log(at desc);

-- ── ORG CHART UPLOADS ───────────────────────────────────────────────────────
create table if not exists org_chart_uploads (
  id             uuid primary key default gen_random_uuid(),
  filename       text not null,
  uploaded_by    uuid references employees(id),
  uploaded_at    timestamptz not null default now(),
  row_count      int,
  is_active      boolean not null default true
);

-- ── SESSIONS (custom auth: HMAC-signed cookie stores session id) ────────────
create table if not exists sessions (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references employees(id) on delete cascade,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  user_agent   text
);
create index if not exists idx_sessions_employee on sessions(employee_id);
create index if not exists idx_sessions_expires on sessions(expires_at);

-- ── NOTIFICATIONS LOG ───────────────────────────────────────────────────────
create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  appraisal_id uuid references appraisals(id) on delete cascade,
  recipient_id uuid references employees(id),
  channel      text not null,          -- email | sms | in_app
  event        text not null,
  sent_at      timestamptz default now(),
  status       text default 'queued'
);

-- ── TRIGGERS ────────────────────────────────────────────────────────────────
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists trg_emp_touch on employees;
create trigger trg_emp_touch before update on employees
  for each row execute function touch_updated_at();

drop trigger if exists trg_appr_touch on appraisals;
create trigger trg_appr_touch before update on appraisals
  for each row execute function touch_updated_at();

drop trigger if exists trg_scores_touch on appraisal_scores;
create trigger trg_scores_touch before update on appraisal_scores
  for each row execute function touch_updated_at();

drop trigger if exists trg_narr_touch on appraisal_narrative;
create trigger trg_narr_touch before update on appraisal_narrative
  for each row execute function touch_updated_at();

drop trigger if exists trg_sec4_touch on section_iv;
create trigger trg_sec4_touch before update on section_iv
  for each row execute function touch_updated_at();

-- Keep effective_rating = sm_rating if present else appraiser_rating
create or replace function set_effective_rating() returns trigger as $$
begin
  new.effective_rating := coalesce(new.sm_rating, new.appraiser_rating);
  return new;
end $$ language plpgsql;

drop trigger if exists trg_effective_rating on appraisal_scores;
create trigger trg_effective_rating before insert or update on appraisal_scores
  for each row execute function set_effective_rating();

-- Recompute appraisal totals from scores when scores change
create or replace function recompute_appraisal_totals(p_appraisal uuid) returns void as $$
declare
  v_total numeric(6,2);
  v_max   numeric(6,2);
  v_pct   numeric(6,2);
begin
  select
    coalesce(sum(case when is_applicable and effective_rating is not null then effective_rating end), 0),
    coalesce(sum(case when is_applicable then 5 end), 0)
  into v_total, v_max
  from appraisal_scores
  where appraisal_id = p_appraisal;
  v_pct := case when v_max > 0 then round((v_total / v_max) * 100, 2) else null end;
  update appraisals
     set total_score = v_total,
         max_score   = v_max,
         overall_pct = v_pct
   where id = p_appraisal;
end $$ language plpgsql;

create or replace function trg_recompute_totals() returns trigger as $$
begin
  perform recompute_appraisal_totals(coalesce(new.appraisal_id, old.appraisal_id));
  return null;
end $$ language plpgsql;

drop trigger if exists trg_scores_recompute on appraisal_scores;
create trigger trg_scores_recompute after insert or update or delete on appraisal_scores
  for each row execute function trg_recompute_totals();

-- ── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
-- The app uses the service_role key on the server, which bypasses RLS.
-- We enable RLS anyway to protect against accidental exposure of the anon key.
alter table employees            enable row level security;
alter table appraisal_cycles     enable row level security;
alter table appraisals           enable row level security;
alter table appraisal_scores     enable row level security;
alter table appraisal_training   enable row level security;
alter table appraisal_narrative  enable row level security;
alter table section_iv           enable row level security;
alter table signatures           enable row level security;
alter table audit_log            enable row level security;
alter table org_chart_uploads    enable row level security;
alter table sessions             enable row level security;
alter table notifications        enable row level security;

-- Allow service_role full access (explicit for clarity; service_role bypasses RLS regardless).
drop policy if exists "service full access" on employees;
create policy "service full access" on employees for all to service_role using (true) with check (true);
drop policy if exists "service full access" on appraisal_cycles;
create policy "service full access" on appraisal_cycles for all to service_role using (true) with check (true);
drop policy if exists "service full access" on appraisals;
create policy "service full access" on appraisals for all to service_role using (true) with check (true);
drop policy if exists "service full access" on appraisal_scores;
create policy "service full access" on appraisal_scores for all to service_role using (true) with check (true);
drop policy if exists "service full access" on appraisal_training;
create policy "service full access" on appraisal_training for all to service_role using (true) with check (true);
drop policy if exists "service full access" on appraisal_narrative;
create policy "service full access" on appraisal_narrative for all to service_role using (true) with check (true);
drop policy if exists "service full access" on section_iv;
create policy "service full access" on section_iv for all to service_role using (true) with check (true);
drop policy if exists "service full access" on signatures;
create policy "service full access" on signatures for all to service_role using (true) with check (true);
drop policy if exists "service full access" on audit_log;
create policy "service full access" on audit_log for all to service_role using (true) with check (true);
drop policy if exists "service full access" on org_chart_uploads;
create policy "service full access" on org_chart_uploads for all to service_role using (true) with check (true);
drop policy if exists "service full access" on sessions;
create policy "service full access" on sessions for all to service_role using (true) with check (true);
drop policy if exists "service full access" on notifications;
create policy "service full access" on notifications for all to service_role using (true) with check (true);

-- No anon/authenticated policies: anon cannot read anything directly. The app mediates all access.

-- ── SEED DATA ───────────────────────────────────────────────────────────────
-- Default password for all seeded employees: "franklin2026" (scrypt hashed).
-- HR admin password: "admin2026" (scrypt hashed).
-- Clients should call /login with Employee Number + password.
-- Password hashes will be created by the Node server on seed if not present; we seed with placeholders.

-- Upsert current cycle (2026)
insert into appraisal_cycles (cycle_year, start_date, end_date, deadline_date, is_active)
values (2026, '2025-10-01', '2026-09-30', '2026-10-07', true)
on conflict (cycle_year) do update set is_active = excluded.is_active;

-- Seed employees (passwords set by server on first run)
insert into employees (employee_no, name, designation, department, date_joined, email, phone, form_type, role, is_active)
values
  ('HR001', 'Alex Lim',   'HR Manager',          'Human Resources',      '2018-05-01', 'alex@franklin.com.sg',     '+6591234567', 'office',  'hr_admin',          true),
  ('MGT001','Trevor Lim', 'Managing Director',   'Senior Management',    '2005-01-01', 'trevor@franklin.com.sg',   '+6591234568', 'office',  'senior_management', true),
  ('OPS001','Ian Lew',    'Head of Production',  'Rigging Fabrication',  '2015-03-01', 'ian.lew@franklin.com.sg',  '+6591234569', 'office',  'hod',               true),
  ('OFC001','Mei Tan',    'Finance Manager',     'Finance',              '2016-07-01', 'mei.tan@franklin.com.sg',  '+6591234570', 'office',  'hod',               true),
  ('OPS010','Jason Ng',   'Production Supervisor','Rigging Fabrication', '2017-08-10', 'jason.ng@franklin.com.sg', '+6591234571', 'office',  'appraiser',         true),
  ('F0042', 'John Tan',   'Wire Rope Rigger',    'Rigging Fabrication',  '2020-06-15', 'john.tan@franklin.com.sg', '+6591234572', 'workers', 'appraisee',         true),
  ('F0043', 'Ravi Kumar', 'Senior Rigger',       'Rigging Fabrication',  '2017-02-10', 'ravi.k@franklin.com.sg',   '+6591234573', 'workers', 'appraisee',         true),
  ('F0044', 'Hasan Ismail','Rigger',             'Rigging Fabrication',  '2022-11-01', 'hasan.i@franklin.com.sg',  '+6591234574', 'workers', 'appraisee',         true),
  ('F2101', 'Sarah Wong', 'Accounts Executive',  'Finance',              '2021-08-01', 'sarah.w@franklin.com.sg',  '+6591234575', 'office',  'appraisee',         true),
  ('F2102', 'Daniel Goh', 'Financial Analyst',   'Finance',              '2019-11-15', 'daniel.g@franklin.com.sg', '+6591234576', 'office',  'appraisee',         true),
  ('F2103', 'Priya Devi', 'AR Executive',        'Finance',              '2023-03-20', 'priya.d@franklin.com.sg',  '+6591234577', 'office',  'appraisee',         true)
on conflict (employee_no) do nothing;

-- Wire the org chart
update employees set sm_id = (select id from employees where employee_no='MGT001');
update employees e
   set hod_id = h.id
  from employees h
 where h.employee_no = 'OPS001'
   and e.department = 'Rigging Fabrication'
   and e.employee_no not in ('OPS001','MGT001','HR001');
update employees e
   set hod_id = h.id
  from employees h
 where h.employee_no = 'OFC001'
   and e.department = 'Finance'
   and e.employee_no not in ('OFC001','MGT001','HR001');
-- Appraisers
update employees e set appraiser_id = a.id from employees a
 where a.employee_no='OPS010' and e.department='Rigging Fabrication' and e.role='appraisee';
update employees e set appraiser_id = a.id from employees a
 where a.employee_no='OFC001' and e.department='Finance' and e.role='appraisee';
update employees e set appraiser_id = a.id from employees a
 where a.employee_no='OPS001' and e.employee_no='OPS010';

-- HOD self-references should be cleared
update employees set hod_id = null where employee_no in ('OPS001','OFC001','MGT001','HR001');
update employees set appraiser_id = null where employee_no in ('OPS001','OFC001','MGT001','HR001','HR001');
