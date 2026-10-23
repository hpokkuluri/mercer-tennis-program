import { useState } from "react";
import { useApp } from "../context/AppContext";
import { buildIcs, myCalendarEvents } from "../lib/ics";
import { callFunction } from "../lib/push";

const btn = {
  display: "block",
  textAlign: "center",
  textDecoration: "none",
  padding: "10px 12px",
  borderRadius: "var(--radius-md)",
  border: "var(--border-width, 1px) solid var(--border)",
  background: "var(--card)",
  color: "var(--text)",
  fontWeight: 700,
  fontSize: 13,
};

// Ledger: put my games in my phone's calendar — a live subscription that
// keeps updating (needs the server key), or a one-time download.
export default function CalendarSync() {
  const { events, profile, team, usingFirebase } = useApp();
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState(null);
  const [state, setState] = useState("");
  const count = myCalendarEvents(events, profile.uid).length;

  async function show() {
    setOpen((o) => !o);
    if (links || !usingFirebase) return;
    setState("loading");
    const res = await callFunction("calendar-link", { teamId: team.id }).catch(() => ({}));
    if (res.ok) {
      setLinks(res);
      setState("");
    } else setState(res.reason === "not-configured" ? "not-configured" : "error");
  }

  function download() {
    const ics = buildIcs({ events, uid: profile.uid, members: team.members, teamName: team.name, appUrl: window.location.origin });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "mercer-tennis-games.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button type="button" data-testid="cal-open" onClick={show} style={{ ...btn, background: "var(--accent-soft-bg)", border: "none" }}>
        📅 Add my games to my calendar
      </button>
      {open && (
        <div data-testid="cal-panel" style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: "var(--radius-md)", background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)" }}>
          {links && (
            <>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Subscribe once — your calendar then keeps itself up to date when games change or spots are swapped.</div>
              <a href={links.webcal} style={btn}>iPhone / Mac Calendar</a>
              <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(links.webcal)}`} target="_blank" rel="noreferrer" style={btn}>Google Calendar</a>
              <button
                type="button"
                style={btn}
                onClick={() => {
                  navigator.clipboard?.writeText(links.https);
                  setState("copied");
                }}
              >
                {state === "copied" ? "Link copied ✓" : "Copy calendar link"}
              </button>
            </>
          )}
          {state === "loading" && <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>Getting your calendar link…</div>}
          {(state === "not-configured" || state === "error" || !usingFirebase) && (
            <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Live calendar sync isn't available yet — you can still add your games once:</div>
          )}
          <button type="button" data-testid="cal-download" onClick={download} disabled={count === 0} style={{ ...btn, opacity: count ? 1 : 0.5 }}>
            Download {count} game{count === 1 ? "" : "s"} (.ics, one-time)
          </button>
        </div>
      )}
    </div>
  );
}
