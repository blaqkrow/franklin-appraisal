# Franklin Offshore Appraisal System — v2.1

Cloud-hosted, mobile-first digital performance appraisal system for Franklin Offshore International,
implemented to the [Franklin_Appraisal_PRD_v2.1.docx](../Franklin_Appraisal_PRD_v2.1.docx) spec.

## What's in v2.1

- **Two form types** — Non-Office / Workers (11 criteria) and Office Staff (15 criteria)
- **Three appraisal types** — Annual / Confirmation / Promotion
- **5-role workflow** — Appraiser → Appraisee → HOD → Senior Management → HR
- **Section IV confidentiality** — "Not For Discussion With Appraisee" is stripped at the API layer for Appraisees and never rendered
- **Senior Management override** — any score can be overridden with justification; original HOD rating retained
- **N/A criteria** — "if applicable" criteria can be toggled off and are excluded from the maximum
- **Employee Number authentication** — scrypt-hashed passwords, 8-hour sessions, HR-managed reset
- **Mobile-first UI** — 375 px+ usable, large tap targets for scoring, horizontal scroll only on summary tables
- **Reporting** — company summary, score distribution bell curve with Gaussian overlay, department averages, per-appraiser calibration, multi-year employee historical trajectory
- **Org chart import** — CSV upload upserts employees and wires appraiser/HOD/SM relations
- **Audit trail** — every state change, sign-off, and override logged with actor, role, and timestamp

## Tech

- Next.js 14 App Router + TypeScript
- Tailwind CSS (mobile-first)
- Supabase Postgres (project ref `unyxcrjdstdpmwfdqafj`)
- Server-side custom auth (scrypt + HMAC-signed cookie session backed by `sessions` table)
- SVG-rendered bell curve and historical charts (no chart library dep)

## Getting started

```bash
cd franklin-appraisal
npm install
npm run dev
```

Open http://localhost:3000 and sign in.

### Demo logins

All seeded users start with these credentials (they're set on first successful login):

| Role | Employee No | Password |
|---|---|---|
| HR Admin | `HR001` | `admin2026` |
| Senior Management | `MGT001` | `franklin2026` |
| HOD (Production) | `OPS001` | `franklin2026` |
| HOD (Finance) | `OFC001` | `franklin2026` |
| Appraiser | `OPS010` | `franklin2026` |
| Worker | `F0042`, `F0043`, `F0044` | `franklin2026` |
| Office | `F2101`, `F2102`, `F2103` | `franklin2026` |

Walk the workflow: sign in as HR Admin → create an appraisal → sign out → sign in as the Appraiser → score → Appraisee signs → HOD reviews Section IV → SM concurs → HR accepts.

## Supabase

The schema lives in [`supabase/migrations/20260421200000_v2_1_schema.sql`](./supabase/migrations/20260421200000_v2_1_schema.sql).

To apply / re-sync:

```bash
npx supabase link --project-ref unyxcrjdstdpmwfdqafj
npx supabase db push
```

Environment variables (already wired in `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=https://unyxcrjdstdpmwfdqafj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SESSION_SECRET=change-me
SEED_DEFAULT_PASSWORD=franklin2026
```

### Schema (PRD §11)

- `employees` — org chart + scrypt password_hash; fields: employee_no, role, form_type, appraiser_id, hod_id, sm_id
- `appraisal_cycles` — one active cycle at a time (Oct → Sep)
- `appraisals` — per (employee, cycle), auto-computed `total_score`, `max_score`, `overall_pct` via trigger
- `appraisal_scores` — per criterion; `effective_rating` trigger sets to `sm_rating ?? appraiser_rating`
- `appraisal_training` — checkboxes (workers) or text remarks (office)
- `appraisal_narrative` — role-scoped free text
- `section_iv` — confidential; recommendation + justification
- `signatures` — every sign-off with timestamp
- `audit_log` — all transitions and overrides
- `sessions` — server-side session records, HMAC-referenced from cookie
- `org_chart_uploads` — upload history
- `notifications` — outgoing notification queue

All tables have RLS enabled with `service_role` policies. The app mediates all access server-side; the anon key is not given direct table access.

## Role permission matrix

| Role | Sees | Edits |
|---|---|---|
| hr_admin | Everything incl. all employees, all reports, Section IV | Kick off appraisals, reset passwords, bulk-create, upload org chart, edit criteria config, accept/archive |
| senior_management | All appraisals incl. Section IV, all reports | Override scores in `pending_sm`, add SM comments, concur to HR or reject to HOD |
| hod | Only appraisals for their department; Section IV visible | Add HOD comments + Section IV recommendation in `pending_hod` |
| appraiser | Only their direct reports | Rate criteria + add comments + training recs + appraiser overall in `pending_appraiser` |
| appraisee | Only their own appraisal, Section IV **hidden at both API and frontend** | Add Staff Comments + sign in `pending_appraisee` |

## Mobile

The layout is fully responsive with 375 px floor. Rating pills are 44 × 44 px (iOS tap-target compliant), the matrix stacks to card rows on small screens, and the header collapses to a hamburger menu.

## Reports

- `/reports` — company summary, filters by year + department, CSV export
- `/reports` — bell curve with Gaussian overlay and basic stats (mean, σ, median, min, max)
- `/reports` — per-department averages + per-appraiser calibration table
- `/reports/employee/[id]` — multi-year score trajectory line chart per employee

## File layout

```
src/
  app/
    page.tsx                    Dashboard per role
    login/                      Employee Number login
    account/password/           Forced change-password flow
    appraisals/                 List, new, detail
    employees/                  Admin manager + CSV/org-chart import
    reports/                    Summary, bell curve, historical
    criteria/ guidelines/       Reference pages
    api/                        REST endpoints (auth, appraisals, employees, export, hr)
  components/                   Header, ScoringMatrix, AppraisalForm, BellCurve, HistoricalChart, etc
  lib/
    criteria.ts                 11 + 15 criteria, rating scale, training lists, bands
    workflow.ts                 State machine, role/view permissions, Section IV gate
    scoring.ts                  Totals with N/A exclusion, required-comment helpers
    bellcurve.ts                Stats + bucket + Gaussian helpers
    period.ts                   Cycle year + 7-Oct deadline helpers
    repo.ts                     Supabase data access (single source of truth)
    supabase.ts                 Service + anon clients
    password.ts                 scrypt hash/verify
    session.ts                  HMAC-signed session cookies, backed by `sessions` table
  types/
    index.ts                    Domain types mirroring the schema
  middleware.ts                 Protects all routes except /login
supabase/
  config.toml                   CLI config (project_id = franklin-appraisal)
  migrations/
    20260421200000_v2_1_schema.sql   Full v2.1 schema + triggers + RLS + seed
```

## What's still TODO (beyond PRD MVP)

- Resend email + Twilio SMS wiring — stubs exist in env; add API route handlers when keys are present.
- 3-day / 7-day overdue reminders — cron (Vercel Cron or pg_cron) to flip `pending_*` states to `overdue`.
- PDF export per appraisal — currently CSV export at cycle level only.
- Criteria builder UI — post-MVP per PRD.
