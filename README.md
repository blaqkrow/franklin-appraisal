# Franklin Offshore Staff Appraisal System

Web-based performance appraisal platform built to the [Franklin_Appraisal_PRD.docx](../Franklin_Appraisal_PRD.docx)
specification, covering both **Production Worker (Franklin Rigging)** and **Office Staff** form
types with the full workflow state machine, weighted scoring, gate factor rule, role-based views,
and OneDrive/Power Automate hooks.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- In-memory data store (globals) — drop-in replaceable with Supabase
- Power Automate webhooks for notifications and OneDrive archive (optional, set in `.env`)

## Run

```bash
cd franklin-appraisal
npm install
npm run dev
```

Open http://localhost:3000

## Roles (switch via the bar under the header)

- **Admin / HR** — create appraisals, manage employees, configure criteria, export CSV, bulk-seed cycle
- **HOD** (Ian Lew, Production Head) — score each factor, add remarks, submit for countersign
- **Senior Management** (Trevor Lim) — countersign, override any score with justification, or reject to HOD
- **HR Receiver** — accept completed appraisal; triggers OneDrive archive (`pdf_path` is recorded)
- **Employee** (John Tan) — read-only view with weights and confidential sections hidden; acknowledge receipt

The demo seeds one pending appraisal for John Tan (F0042, Rigging Fabrication) so you can walk the
entire workflow end-to-end.

## Workflow

`draft → pending_hod → pending_countersign → pending_hr → pending_employee_ack → completed`

Additional states: `gate_fail`, `rejected_to_hod`, `rejected_to_admin`, `hod_overdue`.

## Scoring

- Each factor has a weight; factor score = rating × weight.
- Overall = sum of factor scores, rounded to 2 dp.
- Production Worker factor 01 (Safety & Compliance) is a **Gate Factor**: rating 1 caps overall at 2.0 and routes to `gate_fail`.
- Performance band is auto-classified per the PRD ranges.
- Ratings of 1 or 5 require HOD remarks; the form blocks submission otherwise.

## Power Automate

Set webhook URLs in `.env.local`:

```
PA_SUBMIT_URL=https://prod-xx.eastasia.logic.azure.com/...
PA_COUNTERSIGN_URL=...
PA_HR_ACCEPT_URL=...
PA_REJECT_URL=...
PA_ACK_URL=...
```

The system calls them on state transitions with a JSON payload containing the appraisal ID and
context. If blank, transitions still succeed (local-only demo mode).

## Data

The seed lives in `src/lib/store.ts`. To swap to Supabase, replace the map-backed functions with
calls matching the schema in the PRD §11.

## File layout

```
src/
  app/
    page.tsx                    Dashboard
    appraisals/                 List, new, detail
    employees/                  Admin manager
    criteria/                   Criteria reference
    guidelines/                 Guidelines reference
    api/                        REST endpoints
  components/                   Header, RoleBar, ScoringMatrix, AppraisalForm, etc
  lib/
    criteria.ts                 Factor definitions (both forms)
    scoring.ts                  Weighted score + gate logic
    workflow.ts                 State machine + permissions
    period.ts                   Cycle & deadline
    store.ts                    In-memory repo with seed
    notify.ts                   Power Automate webhook client
    session.ts                  Role cookie
```
