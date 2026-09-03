// Server-side proxy for the Winter-schedule "import from Google Sheets"
// feature. The client can't fetch a Google Sheet's CSV export directly
// (CORS), so this function does it instead and hands back the raw CSV
// text. Same free-tier, no-paid-service approach as send-email.js: no
// Google API key or OAuth needed as long as the sheet is shared
// "Anyone with the link can view" — the gviz CSV export endpoint works
// for any publicly-viewable sheet with no auth.
//
// Required Netlify environment variable (already set for send-email.js —
// this reuses the same one, no new secret to configure):
//   APP_SHARED_SECRET — must match VITE_APP_SHARED_SECRET in the app's
//                        .env, so only the app itself can call this.

const MAX_CSV_BYTES = 2 * 1024 * 1024; // 2 MB — plenty for a season's schedule

function extractSheetId(input) {
  const raw = String(input || "").trim();
  const urlMatch = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (urlMatch) return urlMatch[1];
  // Also accept a bare sheet ID pasted directly.
  if (/^[a-zA-Z0-9_-]{20,}$/.test(raw)) return raw;
  return null;
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const sharedSecret = process.env.APP_SHARED_SECRET;
  const providedSecret = event.headers["x-app-secret"] || event.headers["X-App-Secret"];
  if (!sharedSecret || providedSecret !== sharedSecret) {
    console.log("fetch-sheet: rejected — unauthorized (missing/mismatched shared secret)");
    return { statusCode: 401, body: JSON.stringify({ ok: false, reason: "unauthorized" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ ok: false, reason: "invalid-json" }) };
  }

  const sheetId = extractSheetId(payload.url || payload.sheetId);
  if (!sheetId) {
    console.log("fetch-sheet: rejected — could not parse a sheet id/url");
    return { statusCode: 400, body: JSON.stringify({ ok: false, reason: "invalid-sheet-url" }) };
  }

  const gid = payload.gid ? `&gid=${encodeURIComponent(payload.gid)}` : "";
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${gid}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(exportUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.log(`fetch-sheet: upstream error — status=${res.status}`);
      const reason = res.status === 404 ? "sheet-not-found-or-not-public" : "upstream-error";
      return { statusCode: 502, body: JSON.stringify({ ok: false, reason, status: res.status }) };
    }

    const text = await res.text();
    if (text.length > MAX_CSV_BYTES) {
      console.log("fetch-sheet: rejected — sheet too large");
      return { statusCode: 413, body: JSON.stringify({ ok: false, reason: "too-large" }) };
    }
    // A private sheet's gviz endpoint responds 200 with an HTML sign-in
    // page rather than CSV — catch that case explicitly.
    if (/^\s*<html/i.test(text) || /accounts\.google\.com/i.test(text)) {
      console.log("fetch-sheet: rejected — sheet is not publicly viewable");
      return { statusCode: 403, body: JSON.stringify({ ok: false, reason: "not-public" }) };
    }

    console.log(`fetch-sheet: ok — sheetId=${sheetId} bytes=${text.length}`);
    return { statusCode: 200, body: JSON.stringify({ ok: true, csv: text }) };
  } catch (err) {
    const reason = err.name === "AbortError" ? "timeout" : "fetch-failed";
    console.log(`fetch-sheet: FAILED — ${reason} — ${err.message}`);
    return { statusCode: 500, body: JSON.stringify({ ok: false, reason, error: err.message }) };
  }
};
