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
export const squashName = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, "");

// aliases: { squashedSheetName: member } — set by the admin in the Import
// preview when a sheet name doesn't match anyone automatically.
export function matchPlayers(playersRaw, members, aliases = {}) {
  const tokens = String(playersRaw || "")
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);

  const byEmail = new Map(members.filter((m) => m.email).map((m) => [m.email.toLowerCase(), m]));
  const byName = new Map(members.map((m) => [m.name.trim().toLowerCase(), m]));
  const squash = squashName;
  const bySquashed = new Map();
  members.forEach((m) => {
    const k = squash(m.name);
    bySquashed.set(k, bySquashed.has(k) ? null : m); // null = ambiguous
  });
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
    const hit =
      aliases[squash(token)] ||
      byEmail.get(lower) ||
      byName.get(lower) ||
      bySquashed.get(squash(token)) ||
      (firstNameCounts.get(lower) === 1 ? byFirstName.get(lower) : undefined);
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
export function buildRowPreview(row, members, existingEvents = [], aliases = {}) {
  const { matched, unmatched } = matchPlayers(row.playersRaw, members, aliases);
  const errors = [];
  if (!row.date) errors.push("Missing/unreadable date");
  if (!row.title) errors.push("Missing title");
  if (!row.startTime) errors.push("Missing start time");
  if (matched.length === 0) errors.push("No players matched");
  const existing =
    Boolean(row.date) && Boolean(row.title)
      ? existingEvents.find(
          (e) => e.mode === "winter" && e.status !== "cancelled" && e.date === row.date && e.title.trim().toLowerCase() === row.title.trim().toLowerCase()
        ) || null
      : null;
  const missing = existing ? matched.filter((m) => !existing.participants?.[m.uid]) : [];
  return { ...row, matched, unmatched, errors, duplicate: Boolean(existing), existing, missing, valid: errors.length === 0 };
}

export function templateCSV() {
  return [
    "Date,Start Time,End Time,Location,Title,Players",
    "2026-12-05,18:00,19:30,Riverside Courts · Court 3,vs Cedar Park Club,Alex Kim; Priya Rao; Jordan Lee",
    "2026-12-12,18:00,19:30,Riverside Courts · Court 1,Doubles Drills,alex@example.com; priya@example.com",
  ].join("\n");
}

// ---------------------------------------------------------------------
// Season-grid format (Hari's TennisSchedule.xlsx layout)
//
//   one row per court slot:  Wk | Day (SAT / SUN1 / SUN2) | Time (900) | Date | <player cols…>
//   one column per player:   header row holds the player names (SIVA, RAO, …)
//   cell values:             a name  -> scheduled for that slot
//                            1       -> scheduled and already played
//                            V       -> on vacation that day
//                            blank   -> not playing
//
// Summary rows above the slots (ENTITLED / PLAYED / PSC …) are ignored.
// Detected automatically — the list format above still works unchanged.
// ---------------------------------------------------------------------

const DAY_RE = /^(SAT|SUN|MON|TUE|WED|THU|FRI)[A-Z]*\s*(\d*)$/i;
const DAY_NAMES = { SAT: "Saturday", SUN: "Sunday", MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday", FRI: "Friday" };
const NAME_RE = /^[A-Za-z][A-Za-z .'-]*$/;
// Summary / checksum columns that sit next to the player columns (PSC, O, TOT…)
const NON_PLAYER = /^(PSC|TOT|TOTAL|SUM|CHECKSUM|COUNT|O|OK|NOTE|NOTES|DAY|TIME|DATE|WK|WEEK)$/i;
function isPlayerHeader(v) {
  const s = String(v).trim();
  return s.length >= 2 && NAME_RE.test(s) && !NON_PLAYER.test(s);
}
// Mercer's indoor slots are 9:00–10:30; the Import screen lets the admin change it.
export const GRID_GAME_MINUTES = 90;

function gridDate(v) {
  if (typeof v === "number" && v < 20000) return ""; // a plain number (time, count), not a date serial
  if (typeof v === "string" && !/^\s*(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s*$/.test(v)) return "";
  return toISODate(v);
}

// 900 -> 09:00, 1830 -> 18:30; also accepts "9:00", "9:00 AM", Excel time fractions.
export function gridTime(v) {
  if (v === "" || v == null) return "";
  const s = String(v).trim();
  if (/^\d{3,4}$/.test(s)) {
    const n = parseInt(s, 10);
    const h = Math.floor(n / 100);
    const m = n % 100;
    if (h < 24 && m < 60) return `${pad2(h)}:${pad2(m)}`;
  }
  return toHHMM(v);
}

export function addMinutes(hhmm, mins) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const t = Math.min(h * 60 + m + mins, 23 * 60 + 59);
  return `${pad2(Math.floor(t / 60))}:${pad2(t % 60)}`;
}

export function slotTitle(dayRaw) {
  const m = String(dayRaw).trim().match(DAY_RE);
  if (!m) return String(dayRaw).trim();
  const day = DAY_NAMES[m[1].toUpperCase()] || m[1];
  return m[2] ? `${day} · Court ${m[2]}` : `${day} · Court`;
}

function mostCommon(nums) {
  const counts = new Map();
  nums.forEach((n) => counts.set(n, (counts.get(n) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

// Returns null when the sheet doesn't look like a season grid.
export function parseScheduleGrid(aoa) {
  const hits = [];
  aoa.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (!DAY_RE.test(String(row[c]).trim())) continue;
      for (let d = c + 1; d <= c + 3 && d < row.length; d++) {
        if (gridDate(row[d])) {
          hits.push({ r, dayCol: c, dateCol: d });
          return;
        }
      }
    }
  });
  if (hits.length < 2) return null;
  const dayCol = mostCommon(hits.map((h) => h.dayCol));
  const dateCol = mostCommon(hits.map((h) => h.dateCol));
  const timeCol = dateCol - dayCol > 1 ? dayCol + 1 : -1;
  const weekCol = dayCol > 0 ? dayCol - 1 : -1;
  const dataRows = hits.filter((h) => h.dayCol === dayCol && h.dateCol === dateCol).map((h) => h.r);
  const firstData = dataRows[0];

  // Header = the row above the slots with the most name-like cells in player columns.
  let headerRow = -1;
  let best = 0;
  for (let r = 0; r < firstData; r++) {
    const row = aoa[r] || [];
    let n = 0;
    for (let c = dateCol + 1; c < row.length; c++) if (isPlayerHeader(row[c])) n++;
    if (n > best) {
      best = n;
      headerRow = r;
    }
  }
  if (headerRow < 0 || best < 1) return null;
  const players = [];
  (aoa[headerRow] || []).forEach((v, c) => {
    const name = String(v).trim();
    if (c > dateCol && isPlayerHeader(name)) players.push({ col: c, name });
  });

  const rows = [];
  const vacationDates = new Map(); // name -> Set(date)
  const assignedDates = new Map(); // name -> Set(date)
  let emptySlots = 0;
  for (const r of dataRows) {
    const row = aoa[r];
    const date = gridDate(row[dateCol]);
    const startTime = timeCol >= 0 ? gridTime(row[timeCol]) : "";
    const scheduled = [];
    const played = [];
    const noShow = [];
    for (const p of players) {
      const raw = String(row[p.col] ?? "").trim();
      if (!raw) continue;
      const up = raw.toUpperCase();
      if (up === "V" || up === "VAC" || up === "VACATION") {
        if (!vacationDates.has(p.name)) vacationDates.set(p.name, new Set());
        vacationDates.get(p.name).add(date);
        continue;
      }
      if (up === "X") continue; // exchanged — gave the slot away, not playing
      scheduled.push(p.name);
      if (up === "0") noShow.push(p.name); // scheduled but didn't show
      else if (/^(1|✓|✔|Y|P)$/i.test(raw)) played.push(p.name);
      if (!assignedDates.has(p.name)) assignedDates.set(p.name, new Set());
      assignedDates.get(p.name).add(date);
    }
    if (scheduled.length === 0) {
      emptySlots++;
      continue;
    }
    const wk = weekCol >= 0 ? String(row[weekCol]).trim() : "";
    rows.push({
      date,
      startTime,
      endTime: addMinutes(startTime, GRID_GAME_MINUTES),
      location: "",
      title: slotTitle(row[dayCol]),
      playersRaw: scheduled.join(", "),
      playedNames: played,
      noShowNames: noShow,
      note: wk && /^\d+$/.test(wk) ? `Week ${wk}` : "",
    });
  }

  // Collapse each player's V dates into ranges. Neighbouring V dates (≤ 14 days apart) merge into one
  // range unless that player is scheduled to play somewhere in between.
  const vacations = [];
  for (const [name, set] of vacationDates) {
    const dates = [...set].filter(Boolean).sort();
    const busy = [...(assignedDates.get(name) || [])];
    let cur = null;
    const ranges = [];
    for (const d of dates) {
      const gap = cur ? (new Date(d) - new Date(cur.end)) / 86400000 : Infinity;
      const blocked = cur && busy.some((b) => b > cur.end && b < d);
      if (cur && gap <= 14 && !blocked) cur.end = d;
      else {
        cur = { start: d, end: d };
        ranges.push(cur);
      }
    }
    vacations.push({ name, ranges, days: dates.length });
  }

  return { rows, vacations, players: players.map((p) => p.name), emptySlots };
}

// Grid from an already-built array-of-arrays (used by the PDF reader).
export function parseGridFromAoa(aoa, sheetName = "PDF") {
  const grid = parseScheduleGrid(aoa);
  return grid && grid.rows.length > 0 ? { format: "grid", sheetName, ...grid } : null;
}

// Keeps only games dated today or later, and trims vacation ranges to match.
export function fromDate(parsed, today) {
  if (!today) return parsed;
  const rows = parsed.rows.filter((r) => !r.date || r.date >= today);
  const vacations = (parsed.vacations || [])
    .map((v) => ({ ...v, ranges: v.ranges.filter((rg) => rg.end >= today).map((rg) => ({ start: rg.start < today ? today : rg.start, end: rg.end })) }))
    .filter((v) => v.ranges.length > 0);
  return { ...parsed, rows, vacations, pastSkipped: parsed.rows.length - rows.length };
}

// One entry point for both formats. Tries every sheet for the season grid
// (first sheet first), otherwise falls back to the column-list format.
export function parseWorkbook(data, { isCsv = false } = {}) {
  const wb = isCsv ? XLSX.read(data, { type: "string" }) : XLSX.read(data, { type: "array" });
  for (const name of wb.SheetNames) {
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "", raw: true, blankrows: true });
    const grid = parseScheduleGrid(aoa);
    if (grid && grid.rows.length > 0) return { format: "grid", sheetName: name, ...grid };
  }
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return { format: "list", sheetName: wb.SheetNames[0], rows: raw.map(normalizeRow).filter((r) => r.date || r.title || r.playersRaw), vacations: [] };
}
