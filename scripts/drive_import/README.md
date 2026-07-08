# Drive → Supabase document import

Imports the 61 real documents already organized in your Drive folder
**"Oakframe Media OS — Import"** into the live app:

- The 14 files in **1 - Onboarding Library (Staff)** → the `onboarding_resources`
  table, tagged `audience: staff`. They'll show up automatically under
  "Resources from HR" on every staff member's onboarding checklist.
- The other 47 (contracts, forms, department manuals, financials) → the
  general `documents` table, each tagged with a category. The Financial
  ones (Budget & P&L, Invoice/AR Tracker, Expense Tracker, Master Pricing
  Sheet) are marked `confidential: true` — executives only.

Nothing is uploaded from this repo or from Claude's session — this script
talks directly to Google Drive and your Supabase project when **you** run
it, using your own credentials.

## 1. Get Google Drive API access (one-time setup, ~5 minutes)

1. Go to https://console.cloud.google.com/ and create (or pick) a project.
2. Enable the **Google Drive API** for that project (APIs & Services → Library).
3. Create a **Service Account** (APIs & Services → Credentials → Create
   Credentials → Service Account). No roles needed.
4. Open the service account → Keys → Add Key → Create new key → JSON.
   Save the downloaded file somewhere safe, e.g. `~/oakframe-drive-key.json`.
5. Copy the service account's email address (looks like
   `something@your-project.iam.gserviceaccount.com`).
6. In Google Drive, right-click the **"Oakframe Media OS — Import"** folder
   → Share → paste that email address → give it **Viewer** access.

## 2. Get your Supabase service role key

Supabase dashboard → Project Settings → API → `service_role` secret key.
**Never commit this or paste it anywhere public** — it bypasses RLS entirely.

## 3. Install and run

```bash
cd scripts/drive_import
npm install
export GOOGLE_APPLICATION_CREDENTIALS=~/oakframe-drive-key.json
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

npm run dry-run   # lists what would be imported, writes nothing
npm run import    # actually uploads the files + inserts the rows
```

The script is safe to re-run if something fails partway — re-running will
create a second copy of anything already imported, so if a run fails
partway, check the Documents / Onboarding library pages in the app before
re-running, and delete any partial rows first.

## Reviewing or changing the categorization first

Everything is driven by `manifest.json` — one entry per file, with its
Drive file ID, destination table, category, and (for onboarding resources)
audience. Edit it freely before running the import if you want to move
something between categories, change staff/client/both, or skip a file
entirely (just delete its entry).
