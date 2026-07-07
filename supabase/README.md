# Oakframe Media OS — Supabase backend

This directory contains the full schema for running Oakframe Media OS on a
real, multi-user Supabase project instead of the previous localStorage demo.

## What's here

- `migrations/0001_schema.sql` — every table (profiles, clients, leads,
  projects, tasks, invoices, expenses, payroll, equipment, approvals, HR,
  comms, meetings, resources, documents, executive tables, notifications,
  and an append-only `audit_log`). No seed data — the schema is empty on
  a fresh install.
- `migrations/0002_rls.sql` — Row Level Security enabled on every table,
  with policies that mirror the permission matrix from the old client-side
  `js/core.js` (executives see everything; department heads see their
  department; contractors see only assigned clients/projects; interns are
  blocked from delete/approve/finance/HR/payroll; compensation is isolated
  in its own table so a directory lookup can never leak salary; the audit
  log has no UPDATE/DELETE policy for any role, so it's append-only even
  for an executive).
- `migrations/0003_functions.sql` — server-side logic for the handful of
  things RLS can't express on its own: bootstrapping the first sign-up as
  Owner, guarding role/department changes behind HR/exec, notifying another
  user as a side effect of an action, and `decide_approval()` — the
  multi-approver approval chain (a dept head can only decide approvals
  routed to their own department; a "ceo" requirement blocks approval until
  a CEO/owner has actually signed off), applied atomically with its ripple
  effects (flip the linked expense/time-off/invoice) and a notification to
  the requester.

**All three migrations have been applied and exercised against a real
Postgres 16 instance** (with a minimal shim standing in for Supabase's
`auth.users`/`auth.uid()`/`auth.role()`), not just written and hoped for.
The test script covered: department-scoped client/lead visibility, a
Finance junior submitting their own expense vs. being blocked from
submitting one under someone else's name, compensation isolation between
departments, the audit log's append-only guarantee, a dept head being
correctly refused when they try to decide an approval outside their
department, and an executive's blanket override. One real bug was caught
and fixed this way: the original `decide_approval()` wrote a "denied" audit
row and then raised an exception in the same transaction — but raising
rolls back everything since the last savepoint, so that audit row was
silently disappearing. The fix moves denial logging into its own
`log_denied_attempt()` RPC that the client calls in a fresh request right
after it catches the error, mirroring how the old client-side code did it.

## Status — wired

The app is now connected to a live project. `js/config.js` holds the project
URL and **publishable** key (safe for the browser; the `service_role` key is
never used client-side). The client-side data layer (`js/db.js`) reads and
writes these tables through Supabase, real email/password auth has replaced
the old demo login, and the localStorage seed is gone — a fresh install
starts empty and the first person to sign up becomes Owner.

## The one manual step: apply the schema

The migrations still need to run against the project once. Open the Supabase
dashboard → **SQL Editor** and run, in order:

1. `migrations/0001_schema.sql`
2. `migrations/0002_rls.sql`
3. `migrations/0003_functions.sql`

(Or, with the Supabase CLI linked to the project: `supabase db push`.)

Until that's done, sign-up will report that the schema isn't applied yet.
After it's done, create the first account — that account becomes the Owner,
and everyone who signs up afterward lands as an unassigned member for HR or
an executive to place into a department and role.

### Auth settings

By default Supabase requires email confirmation. For a quick internal
rollout you can turn that off under **Authentication → Providers → Email**
(“Confirm email” off); otherwise new users get a confirmation link before
their first sign-in. The app handles both — it tells the user to check their
email when confirmation is required.
