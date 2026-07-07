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

## To actually connect a project

I need two values from your Supabase project's **Settings → API** page:

1. **Project URL** (`https://xxxxx.supabase.co`)
2. **`anon` public key**

(Never the `service_role` key — that one must never ship to a browser. The
`anon` key is meant to be public; RLS is what actually enforces access, and
that's exactly what these migrations do.)

Once I have those, next steps are:

1. Run these three migrations against your project (via the Supabase SQL
   editor, or `supabase db push` if you're using the CLI).
2. Wire `js/supabaseClient.js` with your URL/anon key and replace the
   click-to-impersonate login screen with real Supabase Auth (email +
   password, or magic link).
3. Rework the `js/core.js` store to read/write Supabase instead of
   localStorage, with Realtime subscriptions keeping every signed-in user's
   view in sync.
4. Remove `js/data.js` (the seed/demo data) entirely — a fresh install
   starts completely empty; the first person to sign up becomes Owner.
