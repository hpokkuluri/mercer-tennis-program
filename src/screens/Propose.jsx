import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import { Header, Field, PrimaryButton, ErrorText, SectionLabel } from "../components/UI";
import { CalendarIcon, ClockIcon, PinIcon, ChevronRightIcon, CheckIcon } from "../components/Icons";
import { sendEventEmails } from "../lib/email";

export default function Propose() {
  const { season } = useParams(); // 'summer' | 'winter'
  const { team, profile, createEvent } = useApp();
  const navigate = useNavigate();
  const isWinter = season === "winter";

  const [type, setType] = useState("practice");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:30");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState([]);
  const [teamSize, setTeamSize] = useState(4);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const members = Object.values(team?.members || {});

  function toggle(uid) {
    setSelected((s) => (s.includes(uid) ? s.filter((x) => x !== uid) : [...s, uid]));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!date || !location || !title) return setError("Fill in a title, date, and location.");
    if (isWinter && selected.length === 0) return setError("Assign at least one player.");
    setBusy(true);
    try {
      const base = {
        type,
        title,
        date,
        startTime,
        endTime,
        location,
        note,
        mode: season,
        organizerId: profile.uid,
        organizerName: profile.name,
      };
      let id;
      let emailRecipients = [];
      if (isWinter) {
        const participants = {};
        selected.forEach((uid) => {
          const m = members.find((mm) => mm.uid === uid);
          participants[uid] = { uid, name: m.name, initials: m.initials, color: m.color, status: "pending" };
          if (m?.email) emailRecipients.push({ email: m.email, name: m.name });
        });
        id = await createEvent({ ...base, participants });
      } else {
        // Summer is open sign-up: no invite step — it's posted to the whole
        // team on the Summer Schedule and anyone can tap Join. Joins are
        // grouped in order into teams of `teamSize`.
        id = await createEvent({ ...base, participants: {}, joinOrder: [], teamSize });
        emailRecipients = members.filter((m) => m.uid !== profile.uid && m.email).map((m) => ({ email: m.email, name: m.name }));
      }

      if (emailRecipients.length > 0) {
        sendEventEmails({
          recipients: emailRecipients,
          teamName: team?.name,
          title,
          date,
          startTime,
          location,
          organizerName: profile.name,
          appUrl: window.location.origin,
        }).catch(() => {});
      }

      navigate(`/event/${id}`);
    } catch (err) {
      setError(err.message || "Couldn't create that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Header title={isWinter ? "Assign a Game" : "Propose a Game"} />

      <form onSubmit={submit} style={{ flex: 1, overflowY: "auto", padding: "4px 20px 20px 20px", display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", background: "oklch(93% 0.008 90)", borderRadius: "var(--radius-md)", padding: 4, gap: 4 }}>
          {["practice", "match"].map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setType(t)}
              className="display"
              style={{ flex: 1, padding: "10px 0", borderRadius: "var(--radius-sm)", border: "none", fontSize: 14, fontWeight: 700, textTransform: "capitalize", background: type === t ? "var(--accent)" : "transparent", color: type === t ? "var(--accent-text)" : "var(--text-muted)" }}
            >
              {t}
            </button>
          ))}
        </div>

        <Field label="Title" placeholder={type === "match" ? "vs Cedar Park Club" : "Doubles Drills"} value={title} onChange={(e) => setTitle(e.target.value)} />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Row icon={<CalendarIcon />} label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={inputRowStyle} />
          </Row>
          <Row icon={<ClockIcon />} label="Time">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputRowStyle} />
              <span style={{ color: "var(--text-faint)" }}>&ndash;</span>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputRowStyle} />
            </div>
          </Row>
          <Row icon={<PinIcon />} label="Location">
            <input placeholder="Riverside Courts · Court 3" value={location} onChange={(e) => setLocation(e.target.value)} required style={inputRowStyle} />
          </Row>
        </div>

        {isWinter ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <SectionLabel>Assign Players</SectionLabel>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green-solid)" }}>{selected.length} selected</span>
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {members
                .filter((m) => m.uid !== profile.uid)
                .map((m) => {
                  const on = selected.includes(m.uid);
                  return (
                    <button type="button" key={m.uid} onClick={() => toggle(m.uid)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ position: "relative" }}>
                        <Avatar initials={m.initials} color={m.color} size={52} ring={on ? "var(--accent)" : undefined} />
                        {on && (
                          <div style={{ position: "absolute", bottom: -2, right: -2, width: 18, height: 18, borderRadius: 999, background: "var(--accent)", border: "2px solid var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <CheckIcon width={9} height={9} style={{ color: "var(--accent-text)" }} />
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{m.name.split(" ")[0]}</div>
                    </button>
                  );
                })}
            </div>
            {members.length <= 1 && <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>No other teammates yet — invite them from the Team tab.</div>}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionLabel>Players per team</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 16px" }}>
              <button type="button" onClick={() => setTeamSize((n) => Math.max(2, n - 1))} style={stepperBtnStyle}>&minus;</button>
              <div style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 700 }} className="display">{teamSize}</div>
              <button type="button" onClick={() => setTeamSize((n) => Math.min(8, n + 1))} style={stepperBtnStyle}>+</button>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>
              This posts to the whole team — no invites to send. Whoever taps Join first fills Team 1; once {teamSize}/{teamSize} join, it's locked in and the next joiners start filling Team 2.
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SectionLabel>Note (optional)</SectionLabel>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Bring extra balls…"
            rows={3}
            style={{ background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", padding: "14px 16px", fontSize: 14, resize: "none", outline: "none" }}
          />
        </div>

        <ErrorText>{error}</ErrorText>

        <PrimaryButton type="submit" disabled={busy}>
          {busy ? "Posting…" : isWinter ? `Assign ${selected.length || ""} Player${selected.length === 1 ? "" : "s"}` : "Post to Summer Schedule"}
        </PrimaryButton>
      </form>
    </div>
  );
}

const inputRowStyle = { border: "none", outline: "none", fontSize: 15, fontWeight: 700, color: "var(--text)", background: "transparent", width: "100%", fontFamily: "inherit" };
const stepperBtnStyle = { width: 32, height: 32, borderRadius: 999, border: "var(--border-width, 1px) solid var(--border)", background: "oklch(95% 0.006 90)", fontSize: 18, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };

function Row({ icon, label, children }) {
  return (
    <div style={{ background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "var(--accent-soft-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "oklch(40% 0.12 140)" }}>{icon}</div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>{label}</div>
        {children}
      </div>
      <ChevronRightIcon style={{ color: "var(--text-faint)" }} />
    </div>
  );
}
