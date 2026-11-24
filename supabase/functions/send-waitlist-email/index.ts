// Sends the Google Play closed-test link once to each waitlist address that
// has been added as a tester (tester_added_at set) and not yet emailed
// (notified_at null). Called every hour by pg_cron; it only does real work
// when the Europe/Rome hour is 22 (see join/schedule.sql).
//
// Secrets (set with `supabase secrets set`, never commit them):
//   RESEND_API_KEY   Resend API key with sending permission
//   FROM_EMAIL       verified sender, e.g. "Sudoku <hello@your-domain.com>"
//   CRON_SECRET      shared secret checked against the x-cron-secret header
//   DRY_RUN          "true" to list recipients without sending
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const DRY_RUN = (Deno.env.get("DRY_RUN") ?? "true") === "true";

const PLAY_URL = "https://play.google.com/store/apps/details?id=com.egenesio.sudoku";
const SUBJECT = "Sudoku su Android: il link per installare l'app / Sudoku on Android: install link";

const TEXT = `Ciao!

Sei nel test chiuso di Sudoku su Google Play. Ecco il link per installare l'app:
${PLAY_URL}

Grazie per aiutarci a provarla!

---

Hi!

You are in the Sudoku closed test on Google Play. Here is the link to install the app:
${PLAY_URL}

Thanks for helping us test it!

Reply to this email if you no longer want to receive messages about the test.`;

const HTML = `<p>Ciao!</p>
<p>Sei nel test chiuso di Sudoku su Google Play. Ecco il link per installare l'app:</p>
<p><a href="${PLAY_URL}">${PLAY_URL}</a></p>
<p>Grazie per aiutarci a provarla!</p>
<hr>
<p>Hi!</p>
<p>You are in the Sudoku closed test on Google Play. Here is the link to install the app:</p>
<p><a href="${PLAY_URL}">${PLAY_URL}</a></p>
<p>Thanks for helping us test it!</p>
<p style="color:#888;font-size:12px">Reply to this email if you no longer want to receive messages about the test.</p>`;

const sbHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function pendingEmails(): Promise<string[]> {
  const url = `${SUPABASE_URL}/rest/v1/waitlist?select=email&tester_added_at=not.is.null&notified_at=is.null&order=created_at.asc`;
  const res = await fetch(url, { headers: sbHeaders });
  if (!res.ok) throw new Error(`select failed: HTTP ${res.status}`);
  const rows: { email: string }[] = await res.json();
  return rows.map((r) => r.email);
}

async function markNotified(emails: string[]) {
  const list = emails.map((e) => `"${e.replace(/"/g, '\\"')}"`).join(",");
  const url = `${SUPABASE_URL}/rest/v1/waitlist?email=in.(${encodeURIComponent(list)})`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify({ notified_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`mark failed: HTTP ${res.status}`);
}

async function sendBatch(emails: string[]) {
  const payload = emails.map((to) => ({ from: FROM_EMAIL, to, subject: SUBJECT, html: HTML, text: TEXT }));
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`resend failed: HTTP ${res.status} ${await res.text()}`);
}

Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("forbidden", { status: 403 });
  }

  try {
    const emails = await pendingEmails();
    if (DRY_RUN) {
      return Response.json({ dry_run: true, count: emails.length, emails });
    }
    if (!RESEND_KEY || !FROM_EMAIL) {
      return Response.json({ error: "RESEND_API_KEY and FROM_EMAIL must be set" }, { status: 500 });
    }

    let sent = 0;
    for (let i = 0; i < emails.length; i += 100) {
      const chunk = emails.slice(i, i + 100);
      await sendBatch(chunk);
      await markNotified(chunk); // only after Resend accepted the chunk
      sent += chunk.length;
    }
    return Response.json({ sent });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
});
