/* One-time importer: pulls the Oakframe Media OS — Import folder's contents
   straight from Google Drive into the live Supabase project — onboarding
   packets/checklists/SOPs into onboarding_resources (surfaced automatically
   on staff onboarding checklists), everything else (contracts, forms,
   department manuals, financials) into the general documents library.
   File bytes stream Drive -> Supabase directly; nothing is cached locally
   or sent anywhere else. Run with: node import.js [--dry-run] */
const path = require("path");
const crypto = require("crypto");
const { google } = require("googleapis");
const { createClient } = require("@supabase/supabase-js");

const manifest = require("./manifest.json");
const DRY_RUN = process.argv.includes("--dry-run");

function requireEnv(name) {
  const v = process.env[name];
  if (!v) { console.error(`Missing required env var: ${name}`); process.exit(1); }
  return v;
}

async function main() {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const credsPath = requireEnv("GOOGLE_APPLICATION_CREDENTIALS");

  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(credsPath),
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  const drive = google.drive({ version: "v3", auth });
  const supabase = createClient(supabaseUrl, supabaseKey);

  let ok = 0, failed = 0;
  for (const item of manifest) {
    process.stdout.write(`${item.name} ... `);
    try {
      const buffer = item.isGoogleNative
        ? Buffer.from((await drive.files.export({ fileId: item.fileId, mimeType: item.exportMimeType }, { responseType: "arraybuffer" })).data)
        : Buffer.from((await drive.files.get({ fileId: item.fileId, alt: "media" }, { responseType: "arraybuffer" })).data);

      const id = crypto.randomUUID();
      const storagePath = `${item.table}/${id}/${item.filename}`;

      if (DRY_RUN) { console.log(`OK (dry-run, ${buffer.length} bytes -> ${storagePath})`); ok++; continue; }

      const { error: uploadError } = await supabase.storage.from("attachments").upload(storagePath, buffer);
      if (uploadError) throw uploadError;

      const row = item.table === "onboarding_resources"
        ? { id, name: item.name, category: item.category, audience: item.audience, storage_path: storagePath, size_bytes: buffer.length }
        : { id, name: item.name, category: item.category, file_type: path.extname(item.filename).slice(1), storage_path: storagePath, size_bytes: buffer.length, confidential: !!item.confidential };

      const { error: insertError } = await supabase.from(item.table).insert(row);
      if (insertError) throw insertError;

      console.log(`OK (${buffer.length} bytes)`);
      ok++;
    } catch (err) {
      console.log(`FAILED — ${err.message || err}`);
      failed++;
    }
  }
  console.log(`\n${ok} imported, ${failed} failed${DRY_RUN ? " (dry run — nothing was written)" : ""}.`);
  if (failed) process.exit(1);
}

main();
