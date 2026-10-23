import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Header, Card, SectionLabel, PrimaryButton, SecondaryButton, ErrorText, HomeButton } from "../components/UI";
import { UploadIcon, WarningIcon, CheckIcon, XIcon } from "../components/Icons";
import { parseWorkbook, parseGridFromAoa, fromDate, buildRowPreview, matchPlayers, squashName, templateCSV, fetchGoogleSheetCsv, addMinutes, GRID_GAME_MINUTES } from "../lib/scheduleImport";
import { genVacationId, formatRange } from "../lib/vacations";
import { sendImportedEventEmail } from "../lib/email";
import SeasonEmailButton from "../components/SeasonEmailButton";

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Admin-only "start over": permanently deletes Winter games (upcoming only,
// or the whole season), optionally clearing everyone's vacation days too.
// Needs DELETE typed to confirm, since nothing here can be undone.
function ClearWinter({ events, team, deleteEvents, updateMemberInTeam }) {
  const [scope, setScope] = useState("upcoming");
  const [clearVacations, setClearVacations] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const today = localToday();
  const winter = events.filter((e) => e.mode === "winter");
  const targets = scope === "all" ? winter : winter.filter((e) => e.date >= today);
  const vacCount = Object.values(team?.members || {}).reduce((n, m) => n + (m.vacations?.length || 0), 0);
  const nothing = targets.length === 0 && !(clearVacations && vacCount > 0);

  async function run() {
    if (confirm.trim().toUpperCase() !== "DELETE" || nothing) return;
    setBusy(true);
    setDone("");
    try {
      const n = targets.length;
      if (n > 0) await deleteEvents(targets.map((e) => e.id));
      let v = 0;
      if (clearVacations) {
        for (const m of Object.values(team?.members || {})) {
          if (m.vacations?.length) {
            v += m.vacations.length;
            await updateMemberInTeam(m.uid, { vacations: [] });
          }
        }
      }
      setDone(`Deleted ${n} game${n === 1 ? "" : "s"}${clearVacations ? ` and ${v} vacation range${v === 1 ? "" : "s"}` : ""}.`);
      setConfirm("");
    } catch (err) {
      setDone(err.message || "Couldn't delete — check that you're still an admin.");
    } finally {
      setBusy(false);
    }
  }

  const radio = (value, label) => (
    <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5 }}>
      <input type="radio" name="clear-scope" checked={scope === value} onChange={() => setScope(value)} />
      <span>{label}</span>
    </label>
  );

  return (
    <div data-testid="clear-winter" style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
      <SectionLabel>Clear Winter schedule</SectionLabel>
      <Card style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, borderColor: "var(--red-bg)" }}>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
          Permanently deletes Winter games so you can import again from scratch. Summer games aren't touched. This can't be undone.
        </div>
        {radio("upcoming", `Upcoming games only — from today (${winter.filter((e) => e.date >= today).length})`)}
        {radio("all", `All Winter games, including past (${winter.length})`)}
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5 }}>
          <input data-testid="clear-vacations" type="checkbox" checked={clearVacations} onChange={(e) => setClearVacations(e.target.checked)} />
          <span>Also clear everyone's Vacation Days ({vacCount} range{vacCount === 1 ? "" : "s"})</span>
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            data-testid="clear-confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder='Type DELETE to confirm'
            style={{ flex: 1, minWidth: 0, border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 12px", fontSize: 13.5, outline: "none", background: "var(--card)" }}
          />
          <button
            type="button"
            data-testid="clear-run"
            onClick={run}
            disabled={busy || nothing || confirm.trim().toUpperCase() !== "DELETE"}
            className="display"
            style={{ border: "none", borderRadius: "var(--radius-md)", padding: "0 14px", fontWeight: 700, fontSize: 13, background: "var(--red-text)", color: "white", opacity: busy || nothing || confirm.trim().toUpperCase() !== "DELETE" ? 0.45 : 1 }}
          >
            {busy ? "Deleting…" : `Delete ${targets.length}`}
          </button>
        </div>
        {done && <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{done}</div>}
      </Card>
    </div>
  );
}

function downloadTemplate() {
  const blob = new Blob([templateCSV()], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "winter-schedule-template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function WinterImport() {
  const { team, events, profile, isAdmin, createEvent, updateMemberInTeam, mergeParticipants, deleteEvents, updateEventFields } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [sheetUrl, setSheetUrl] = useState("");
  const [rows, setRows] = useState([]); // preview rows, each with an `included` flag
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null); // { created, skipped, vacations }
  const [format, setFormat] = useState("list"); // "list" | "grid"
  const [gridInfo, setGridInfo] = useState(null); // { sheetName, emptySlots, players }
  const [vacations, setVacations] = useState([]); // grid V marks, matched to roster
  const [includeVacations, setIncludeVacations] = useState(true);
  const [markConfirmed, setMarkConfirmed] = useState(true);
  const [emailPlayers, setEmailPlayers] = useState(true);
  const [rawParsed, setRawParsed] = useState(null); // whole file, before the from-today filter
  const [fromToday, setFromToday] = useState(true);
  const [pastSkipped, setPastSkipped] = useState(0);
  const [gameMinutes, setGameMinutes] = useState(team?.scheduler?.gameMinutes || GRID_GAME_MINUTES);
  const [nameMap, setNameMap] = useState({}); // sheet name -> member uid, picked by the admin
  const [shown, setShown] = useState(null); // the parsed file currently previewed (after the from-today filter)

  const members = Object.values(team?.members || {});
  const aliases = useMemo(() => {
    const out = {};
    for (const [name, uid] of Object.entries(nameMap)) {
      const m = team?.members?.[uid];
      if (m) out[squashName(name)] = m;
    }
    return out;
  }, [nameMap, team]);
  const memberFor = (name, al = aliases) => matchPlayers(name, members, al).matched[0] || null;

  function loadParsed(parsed) {
    setRawParsed(parsed);
    setFromToday(true);
    showParsed(parsed, true);
  }

  // Grid files usually cover a whole season; by default start from today
  // so weeks already played aren't re-created as games.
  function showParsed(full, onlyUpcoming) {
    const parsed = full.format === "grid" && onlyUpcoming ? fromDate(full, localToday()) : { ...full, pastSkipped: 0 };
    setPastSkipped(parsed.pastSkipped || 0);
    setFormat(parsed.format);
    setShown(parsed);
    if (parsed.format === "grid") {
      setGridInfo({ sheetName: parsed.sheetName, emptySlots: parsed.emptySlots, players: parsed.players });
      setMarkConfirmed(true);
      setEmailPlayers(false); // a whole season at once — don't send dozens of emails per player
    } else {
      setGridInfo(null);
      setVacations([]);
      setEmailPlayers(true);
    }
    applyPreview(parsed, aliases, parsed.format === "grid" && onlyUpcoming);
  }

  // Re-run matching (rows + vacations) — after loading a file, and whenever
  // the admin matches a sheet name to a roster player.
  function applyPreview(parsed, al, upcomingOnly, mins = gameMinutes) {
    if (parsed.format === "grid") {
      setVacations(parsed.vacations.map((v) => ({ ...v, member: memberFor(v.name, al) })));
    }
    loadRows(parsed.rows, upcomingOnly, al, parsed.format, mins);
  }

  function setAlias(sheetName, uid) {
    const next = { ...nameMap, [sheetName]: uid };
    if (!uid) delete next[sheetName];
    setNameMap(next);
    const al = {};
    for (const [name, id] of Object.entries(next)) if (team?.members?.[id]) al[squashName(name)] = team.members[id];
    if (shown) applyPreview(shown, al, fromToday);
  }

  function loadRows(rawRows, upcomingOnly = false, al = aliases, fmt = format, mins = gameMinutes) {
    const preview = rawRows.map((r0) => {
      // Grid sheets only give a start time — the end comes from the game length.
      const r = fmt === "grid" && r0.startTime ? { ...r0, endTime: addMinutes(r0.startTime, Number(mins) || GRID_GAME_MINUTES) } : r0;
      const p = buildRowPreview(r, members, events, al);
      // Grid re-import: a game that's already there gets its missing players filled in,
      // its time corrected and its status refreshed, instead of being created twice.
      if (fmt === "grid" && p.duplicate) {
        const fixTime = p.existing && (p.existing.startTime !== r.startTime || p.existing.endTime !== r.endTime);
        return { ...p, action: "update", fixTime, included: p.valid };
      }
      return { ...p, action: "create", included: p.valid && !p.duplicate };
    });
    setRows(preview);
    setResult(null);
    if (preview.length === 0 && upcomingOnly) setError("No upcoming games in this file — untick \"Start from today\" to see the earlier weeks.");
    else if (preview.length === 0) setError("No rows found — check the file matches the expected columns (see the template).");
    else setError("");
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
        const { readPdfAoa } = await import("../lib/pdfGrid");
        const res = await readPdfAoa(buf);
        if (!res.ok) {
          setRows([]);
          setRawParsed(null);
          return setError(
            "This PDF has no readable text — it was saved as a picture (e.g. printed from a phone or a screenshot). In Excel use File → Save As → PDF, or just upload the .xlsx itself."
          );
        }
        const grid = parseGridFromAoa(res.aoa, file.name);
        if (!grid) {
          setRows([]);
          setRawParsed(null);
          return setError("Couldn't find the schedule grid in that PDF (rows of Day / Time / Date with a column per player). Try uploading the .xlsx instead.");
        }
        return loadParsed(grid);
      }
      loadParsed(parseWorkbook(buf, { isCsv: false }));
    } catch {
      setError("Couldn't read that file — make sure it's a .xlsx, .csv or .pdf export.");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleFetchSheet() {
    if (!sheetUrl.trim()) return setError("Paste a Google Sheet link first.");
    setError("");
    setBusy(true);
    try {
      const res = await fetchGoogleSheetCsv(sheetUrl.trim());
      if (!res.ok) {
        const messages = {
          "not-public": "That sheet isn't shared publicly. In Google Sheets, use Share → \"Anyone with the link\" → Viewer.",
          "sheet-not-found-or-not-public": "Couldn't find that sheet — check the link and sharing settings.",
          "invalid-sheet-url": "That doesn't look like a Google Sheets link.",
          "too-large": "That sheet is too large to import.",
        };
        return setError(messages[res.reason] || "Couldn't fetch that sheet — try again in a moment.");
      }
      loadParsed(parseWorkbook(res.csv, { isCsv: true }));
    } catch {
      setError("Couldn't fetch that sheet — try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  function toggleRow(i) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, included: !r.included } : r)));
  }

  async function confirmImport() {
    const toImport = rows.filter((r) => r.included && r.valid);
    const vacToAdd = format === "grid" && includeVacations ? vacations.filter((v) => v.member) : [];
    if (toImport.length === 0 && vacToAdd.length === 0) return setError("Nothing selected to import.");
    setImporting(true);
    setError("");
    let created = 0;
    let updated = 0;
    const participantFor = (row, m) => {
      const playedMark = format === "grid" && (row.playedNames || []).some((n) => memberFor(n)?.uid === m.uid);
      const noShowMark = format === "grid" && (row.noShowNames || []).some((n) => memberFor(n)?.uid === m.uid);
      const status = noShowMark ? "declined" : format === "grid" && (markConfirmed || playedMark) ? "accepted" : "pending";
      return { uid: m.uid, name: m.name, initials: m.initials, color: m.color, status };
    };
    for (const row of toImport) {
      if (row.action === "update") {
        try {
          const add = {};
          row.missing.forEach((m) => (add[m.uid] = participantFor(row, m)));
          await mergeParticipants(row.existing.id, add); // also refreshes the game's status
          if (row.fixTime) await updateEventFields(row.existing.id, { startTime: row.startTime, endTime: row.endTime });
          updated += 1;
        } catch {
          // keep going
        }
        continue;
      }
      try {
        const participants = {};
        row.matched.forEach((m) => (participants[m.uid] = participantFor(row, m)));
        await createEvent({
          type: /\bvs\b/i.test(row.title) ? "match" : "practice",
          title: row.title,
          date: row.date,
          startTime: row.startTime,
          endTime: row.endTime || row.startTime,
          location: row.location,
          note: row.note || "",
          source: "import",
          mode: "winter",
          organizerId: profile.uid,
          organizerName: profile.name,
          participants,
        });
        created += 1;
        const emailRecipients = row.matched.filter((m) => m.email && m.uid !== profile.uid).map((m) => ({ email: m.email, name: m.name }));
        if (emailPlayers && emailRecipients.length > 0) {
          sendImportedEventEmail({
            recipients: emailRecipients,
            teamName: team?.name,
            title: row.title,
            date: row.date,
            startTime: row.startTime,
            location: row.location,
            organizerName: profile.name,
            appUrl: window.location.origin,
          }).catch(() => {});
        }
      } catch {
        // keep going — report what succeeded
      }
    }
    let vacationsAdded = 0;
    for (const v of vacToAdd) {
      try {
        const existing = team.members[v.member.uid]?.vacations || [];
        const fresh = v.ranges.filter((rg) => !existing.some((e) => e.start === rg.start && e.end === rg.end));
        if (fresh.length === 0) continue;
        await updateMemberInTeam(v.member.uid, { vacations: [...existing, ...fresh.map((rg) => ({ id: genVacationId(), ...rg }))] });
        vacationsAdded += fresh.length;
      } catch {
        // keep going
      }
    }
    setResult({ created, updated, skipped: rows.length - toImport.length, vacations: vacationsAdded, emailed: emailPlayers });
    setRows([]);
    setImporting(false);
  }

  if (!isAdmin) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <Header title="Import Schedule" right={<HomeButton />} />
        <div style={{ padding: 24, color: "var(--text-faint)", fontSize: 14 }}>Only team admins can import a schedule.</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Header title="Import Winter Schedule" right={<HomeButton />} />

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 24px 20px", display: "flex", flexDirection: "column", gap: 22 }}>
        {result ? (
          <Card style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", padding: "28px 16px", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 999, background: "var(--green-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckIcon style={{ color: "var(--green-text)" }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              {result.created > 0 || !result.updated ? `Created ${result.created} game${result.created === 1 ? "" : "s"}` : ""}
              {result.created > 0 && result.updated > 0 ? " · " : ""}
              {result.updated > 0 ? `Updated ${result.updated} existing game${result.updated === 1 ? "" : "s"}` : ""}
            </div>
            {result.skipped > 0 && <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>{result.skipped} row{result.skipped === 1 ? "" : "s"} skipped.</div>}
            {result.vacations > 0 && <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>Added {result.vacations} vacation range{result.vacations === 1 ? "" : "s"}.</div>}
            <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>{result.emailed ? "Assigned players with an email on file have been emailed." : "No emails were sent."}</div>
            {!result.emailed && result.created > 0 && (
              <div style={{ width: "100%", marginTop: 6 }}>
                <SeasonEmailButton compact />
              </div>
            )}
            <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 8 }}>
              <SecondaryButton onClick={() => navigate("/winter")}>View Winter Schedule</SecondaryButton>
              <SecondaryButton onClick={() => setResult(null)}>Import More</SecondaryButton>
            </div>
          </Card>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <SectionLabel>Upload a file</SectionLabel>
              <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>
                An .xlsx or .csv with columns: Date, Start Time, End Time, Location, Title, Players (names or emails, separated by commas or semicolons) — or the season grid as .xlsx or .pdf (Day / Time / Date rows, one column per player; a name = scheduled, 1 = played, 0 = no show, X = exchanged, V = vacation).
              </div>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.pdf,application/pdf" onChange={handleFile} style={{ display: "none" }} id="import-file-input" />
              <div style={{ display: "flex", gap: 10 }}>
                <SecondaryButton type="button" onClick={() => fileInputRef.current?.click()} disabled={busy} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <UploadIcon /> {busy ? "Reading…" : "Choose File"}
                </SecondaryButton>
                <SecondaryButton type="button" onClick={downloadTemplate} style={{ flex: 1 }}>Download Template</SecondaryButton>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <SectionLabel>Or import from Google Sheets</SectionLabel>
              <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>
                Share the sheet as "Anyone with the link → Viewer", then paste its link here. Same columns as above.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                  style={{ flex: 1, background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px 14px", fontSize: 13.5, outline: "none" }}
                />
                <SecondaryButton type="button" onClick={handleFetchSheet} disabled={busy} style={{ width: 100 }}>{busy ? "…" : "Fetch"}</SecondaryButton>
              </div>
            </div>

            <ErrorText>{error}</ErrorText>

            {format === "grid" && gridInfo && rawParsed && (
              <Card data-testid="grid-summary" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Season grid detected — sheet "{gridInfo.sheetName}"</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {gridInfo.players.length} player columns: {gridInfo.players.join(", ")}. {gridInfo.emptySlots > 0 ? `${gridInfo.emptySlots} empty court slot${gridInfo.emptySlots === 1 ? "" : "s"} skipped.` : ""}
                </div>
                {(() => {
                  // Sheet names that didn't match anyone automatically, plus any the admin has matched by hand.
                  const needs = gridInfo.players.filter((n) => nameMap[n] || !matchPlayers(n, members).matched.length);
                  if (needs.length === 0) return null;
                  const open = needs.filter((n) => !nameMap[n]);
                  return (
                    <div data-testid="name-map" style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", borderRadius: "var(--radius-sm)", background: open.length ? "var(--amber-bg, oklch(96% 0.05 85))" : "var(--green-bg)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: open.length ? "var(--amber-text)" : "var(--green-text)" }}>
                        {open.length ? <WarningIcon width={12} height={12} /> : <CheckIcon width={12} height={12} />}
                        {open.length
                          ? `${open.length} name${open.length === 1 ? "" : "s"} in the sheet didn't match the roster — pick who they are, or their games will be short a player.`
                          : "All sheet names matched."}
                      </div>
                      {needs.map((n) => (
                        <label key={n} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                          <span style={{ width: 80, fontWeight: 700 }}>{n}</span>
                          <span style={{ color: "var(--text-faint)" }}>→</span>
                          <select
                            data-testid={`map-${n}`}
                            value={nameMap[n] || ""}
                            onChange={(e) => setAlias(n, e.target.value)}
                            style={{ flex: 1, minWidth: 0, padding: "6px 8px", borderRadius: "var(--radius-sm)", border: "var(--border-width, 1px) solid var(--border)", background: "var(--card)", fontSize: 12.5 }}
                          >
                            <option value="">— not on the team —</option>
                            {[...members].sort((a, b) => a.name.localeCompare(b.name)).map((m) => (
                              <option key={m.uid} value={m.uid}>{m.name}</option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  );
                })()}
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5 }}>
                  <span>Each game lasts</span>
                  <select
                    data-testid="game-minutes"
                    value={gameMinutes}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setGameMinutes(v);
                      if (shown) applyPreview(shown, aliases, fromToday, v);
                    }}
                    style={{ fontSize: 12.5, padding: "4px 6px", borderRadius: "var(--radius-sm)", border: "var(--border-width, 1px) solid var(--border)", background: "var(--card)" }}
                  >
                    {[60, 75, 90, 105, 120].map((m) => (
                      <option key={m} value={m}>{m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`}{m === 90 ? " (9:00–10:30)" : ""}</option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5 }}>
                  <input
                    data-testid="from-today"
                    type="checkbox"
                    checked={fromToday}
                    onChange={(e) => {
                      setFromToday(e.target.checked);
                      if (rawParsed) showParsed(rawParsed, e.target.checked);
                    }}
                  />
                  <span>
                    Start from today — skip weeks already played
                    {fromToday && pastSkipped > 0 ? ` (${pastSkipped} past slot${pastSkipped === 1 ? "" : "s"} left out)` : ""}
                  </span>
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5 }}>
                  <input type="checkbox" checked={markConfirmed} onChange={(e) => setMarkConfirmed(e.target.checked)} />
                  <span>Schedule already agreed — mark every assigned player as confirmed (unticked: only "1" cells are confirmed, the rest must accept in the app)</span>
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5 }}>
                  <input type="checkbox" checked={emailPlayers} onChange={(e) => setEmailPlayers(e.target.checked)} />
                  <span>Email players about each game (one email per game)</span>
                </label>
                {vacations.length > 0 && (
                  <>
                    <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5 }}>
                      <input data-testid="include-vacations" type="checkbox" checked={includeVacations} onChange={(e) => setIncludeVacations(e.target.checked)} />
                      <span>Add "V" days as Vacation Days</span>
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 24 }}>
                      {vacations.map((v) => (
                        <div key={v.name} data-testid="vacation-row" style={{ fontSize: 12, color: v.member ? "var(--text-muted)" : "var(--amber-text)" }}>
                          <b>{v.member ? v.member.name : v.name}</b>: {v.ranges.map((rg) => formatRange(rg.start, rg.end)).join(", ")}
                          {!v.member && " — not on roster, skipped"}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            )}

            {rows.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <SectionLabel>Preview — {rows.length} row{rows.length === 1 ? "" : "s"}</SectionLabel>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green-solid, var(--green-text))" }}>
                    {rows.filter((r) => r.included && r.valid).length} selected
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {rows.map((row, i) => (
                    <Card key={i} style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, opacity: row.valid ? 1 : 0.7 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{row.title || "(untitled)"}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                            {row.date || "no date"} · {row.startTime || "?"}{row.endTime ? `–${row.endTime}` : ""} · {row.location || "no location"}
                          </div>
                        </div>
                        {row.valid ? (
                          <button
                            type="button"
                            onClick={() => toggleRow(i)}
                            style={{ width: 26, height: 26, borderRadius: 999, border: row.included ? "none" : "1.5px solid var(--border)", background: row.included ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                          >
                            {row.included && <CheckIcon width={13} height={13} style={{ color: "var(--accent-text)" }} />}
                          </button>
                        ) : (
                          <div style={{ width: 26, height: 26, borderRadius: 999, background: "var(--red-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <XIcon width={13} height={13} style={{ color: "var(--red-text)" }} />
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {row.matched.length > 0
                          ? row.matched.map((m) => m.name.split(" ")[0] + ((row.playedNames || []).some((n) => matchPlayers(n, [m]).matched.length > 0) ? " ✓" : "")).join(", ")
                          : "No players matched"}
                        {row.note ? ` · ${row.note}` : ""}
                      </div>
                      {row.unmatched.length > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--amber-text)" }}>
                          <WarningIcon width={12} height={12} /> Unmatched: {row.unmatched.join(", ")}
                        </div>
                      )}
                      {row.duplicate && row.action === "update" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: row.missing.length || row.fixTime ? "var(--amber-text)" : "var(--text-faint)" }}>
                          {row.missing.length || row.fixTime ? <WarningIcon width={12} height={12} /> : <CheckIcon width={12} height={12} />}
                          {(() => {
                            const todo = [
                              row.missing.length ? `will add ${row.missing.map((m) => m.name.split(" ")[0]).join(", ")}` : "",
                              row.fixTime ? `will fix time to ${row.startTime}–${row.endTime}` : "",
                            ].filter(Boolean);
                            return todo.length ? `Already imported — ${todo.join(" · ")}` : "Already imported — up to date";
                          })()}
                        </div>
                      )}
                      {row.duplicate && row.action !== "update" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--amber-text)" }}>
                          <WarningIcon width={12} height={12} /> Possible duplicate — a game titled "{row.title}" already exists on {row.date}. Left unchecked; tick it if this one's meant to be separate.
                        </div>
                      )}
                      {row.errors.length > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--red-text)" }}>
                          <WarningIcon width={12} height={12} /> {row.errors.join("; ")}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>

                <PrimaryButton type="button" onClick={confirmImport} disabled={importing || (rows.filter((r) => r.included && r.valid).length === 0 && !(format === "grid" && includeVacations && vacations.some((v) => v.member)))}>
                  {(() => {
                    if (importing) return "Importing…";
                    const sel = rows.filter((r) => r.included && r.valid);
                    const nNew = sel.filter((r) => r.action !== "update").length;
                    const nUpd = sel.length - nNew;
                    if (nUpd === 0) return `Import ${nNew} Game${nNew === 1 ? "" : "s"}`;
                    if (nNew === 0) return `Update ${nUpd} Existing Game${nUpd === 1 ? "" : "s"}`;
                    return `Import ${nNew} New · Update ${nUpd}`;
                  })()}
                </PrimaryButton>
              </div>
            )}

            {rows.length === 0 && <ClearWinter events={events} team={team} deleteEvents={deleteEvents} updateMemberInTeam={updateMemberInTeam} />}
          </>
        )}
      </div>
    </div>
  );
}
