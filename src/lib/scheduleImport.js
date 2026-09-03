// Parsing + player-matching helpers for the Winter schedule bulk-import
// feature (Schedule → Import, admin-only, Winter season only). Shared by
// both entry points — an uploaded .xlsx/.csv file and a fetched public
// Google Sheet — so both funnel through the same preview/confirm UI in
// src/screens/WinterImport.jsx.
//
// Expected columns (case-insensitive header match, any order):
//   Date | Start Time | End Time | Location | Title | Players
// "Players" is a comma or semicolon separated list of names and/or
// emails, matched against the team's roster (src/lib/vacations.js has
// the sibling vacation-conflict helpers used once rows are matched).

import * as XLSX from "xlsx";

const SHARED_SECRET = import.meta.env.VITE_APP_SHARED_SECRET || "";

// Calls the fetch-sheet Netlify function (server-side CORS proxy) to pull
// a public Google Sheet's contents as CSV text.
export async function fetchGoogleSheetCsv(url) {
  try {
    const res = await fetch("/.netlify/functions/fetch-sheet", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-app-secret": SHARED_SECRET },
      body: JSON.stringify({ url }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) return { ok: false, reason: data.reason || "fetch-failed" };
    return { ok: true, csv: data.csv };
  } catch {
    return { ok: false, reason: "network-error" };
  }
}

const HEADER_ALIASES = {
  date: "date",
  "start time": "startTime",
  start: "startTime",
  starttime: "startTime",
  "end time": "endTime",
  end: "endTime",
  endtime: "endTime",
  location: "location",
  court: "location",
  title: "title",
  event: "title",
  players: "players",
  roster: "players",
  attendees: "players",
};

function normalizeHeader(h) {
  return String(h || "").trim().toLowerCase();
}

// Excel serial date -> JS Date (Excel's epoch, accounting for its
// (incorrect) leap-year treatment of 1900 the same way SheetJS does).
function excelSerialToDate(serial) {
  const utcDays = Math.floor(serial - 25569);
  const utcMs = utcDays * 86400 * 1000;
  return new Date(utcMs);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function toISODate(value) {
  if (value == null || value === "") return "";
  if (value instanceof Date && !isNaN(value)) {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }
  if (typeof value === "number") {
    const d = excelSerialToDate(value);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    let [, mo, day, yr] = m;
    if (yr.length === 2) yr = `20${yr}`;
    return `${yr}-${pad2(mo)}-${pad2(day)}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed)) return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
  return "";
}

export function toHHMM(value) {
  if (value == null || value === "") return "";
  if (typeof value === "number") {
    // Excel time-of-day fraction (0..1) or full serial with a fractional part.
    const fraction = value % 1;
    const totalMinutes = Math.round(fraction * 24 * 60);
    return `${pad2(Math.floor(totalMinutes / 60))}:${pad2(totalMinutes % 60)}`;
  }
  const s = String(value).trim();
  const ampm = s.match(/^(\d{1,2}):?(\d{2})?\s*([AaPp][Mm])$/);
  if (ampm) {
    let [, h, min = "00", mer] = ampm;
    h = parseInt(h, 10);
    if (/pm/i.test(mer) && h !== 12) h += 12;
    if (/am/i.test(mer) && h === 12) h = 0;
    return `${pad2(h)}:${min}`;
  }
  const plain = s.match(/^(\d{1,2}):(\d{2})/);
  if (plain) return `${pad2(plain[1])}:${plain[2]}`;
  return "";
}

// One shared parse path for both an uploaded file's ArrayBuffer and a
// fetched Google Sheet's CSV text.
export function parseWorkbookRows(data, { isCsv = false } = {}) {
  const wb = isCsv ? XLSX.read(data, { type: "string" }) : XLSX.read(data, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return raw.map(normalizeRow).filter((r) => r.date || r.title || r.playersRaw);
}

function normalizeRow(raw) {
  const out = { date: "", startTime: "", endTime: "", location: "", title: "", playersRaw: "" };
  for (const key of Object.keys(raw)) {
    const mapped = HEADER_ALIASES[normalizeHeader(key)];
    if (!mapped) continue;
    if (mapped === "date") out.date = toISODate(raw[key]);
    else if (mapped === "startTime") out.startTime = toHHMM(raw[key]);
    else if (mapped === "endTime") out.endTime = toHHMM(raw[key]);
    else if (mapped === "location") out.location = String(raw[key] || "").trim();
    else if (mapped === "title") out.title = String(raw[key] || "").trim();
    else if (mapped === "players") out.playersRaw = String(raw[key] || "").trim();
  }
  return out;
}

// Matches each comma/semicolon-separated player token against the team
// roster by email (exact, case-insensitive) first, then by full name,
// then by unique first-name. Returns matched member objects plus any
// tokens that couldn't be resolved so the UI can flag them.
export function matchPlayers(playersRaw, members) {
  const tokens = String(playersRaw || "")
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);

  const byEmail = new Map(members.filter((m) => m.email).map((m) => [m.email.toLowerCase(), m]));
  const byName = new Map(members.map((m) => [m.name.trim().toLowerCase(), m]));
  const firstNameCounts = new Map();
  members.forEach((m) => {
    const first = m.name.trim().split(/\s+/)[0].toLowerCase();
    firstNameCounts.set(first, (firstNameCounts.get(first) || 0) + 1);
  });
  const byFirstName = new Map(members.map((m) => [m.name.trim().split(/\s+/)[0].toLowerCase(), m]));

  const matched = [];
  const unmatched = [];
  for (const token of tokens) {
    const lower = token.toLowerCase();
    const hit = byEmail.get(lower) || byName.get(lower) || (firstNameCounts.get(lower) === 1 ? byFirstName.get(lower) : undefined);
    if (hit && !matched.find((m) => m.uid === hit.uid)) matched.push(hit);
    else if (!hit) unmatched.push(token);
  }
  return { matched, unmatched };
}

// existingEvents lets the preview flag a row that looks like it's already
// on the Winter schedule (same date + title) — e.g. the admin re-uploads
// a file after already importing it once, or a corrected version that
// still has most rows unchanged. Flagged rows are still importable (in
// case a second game really is meant to happen that day), just unchecked
// by default so a re-import doesn't silently double-book the team.
export function buildRowPreview(row, members, existingEvents = []) {
  const { matched, unmatched } = matchPlayers(row.playersRaw, members);
  const errors = [];
  if (!row.date) errors.push("Missing/unreadable date");
  if (!row.title) errors.push("Missing title");
  if (!row.startTime) errors.push("Missing start time");
  if (matched.length === 0) errors.push("No players matched");
  const duplicate = Boolean(row.date) && Boolean(row.title) && existingEvents.some(
    (e) => e.mode === "winter" && e.status !== "cancelled" && e.date === row.date && e.title.trim().toLowerCase() === row.title.trim().toLowerCase()
  );
  return { ...row, matched, unmatched, errors, duplicate, valid: errors.length === 0 };
}

export function templateCSV() {
  return [
    "Date,Start Time,End Time,Location,Title,Players",
    "2026-12-05,18:00,19:30,Riverside Courts · Court 3,vs Cedar Park Club,Alex Kim; Priya Rao; Jordan Lee",
    "2026-12-12,18:00,19:30,Riverside Courts · Court 1,Doubles Drills,alex@example.com; priya@example.com",
  ].join("\n");
}
