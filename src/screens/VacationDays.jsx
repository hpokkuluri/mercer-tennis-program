import { useState } from "react";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import { Header, Card, SectionLabel, PrimaryButton, ErrorText, HomeButton } from "../components/UI";
import { TrashIcon, WarningIcon } from "../components/Icons";
import { allTeamConflicts, conflictsForRange, formatRange } from "../lib/vacations";

export default function VacationDays() {
  const { team, events, profile, isAdmin, addVacation, removeVacation } = useApp();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const mine = team?.members?.[profile.uid]?.vacations || [];
  const sorted = [...mine].sort((a, b) => a.start.localeCompare(b.start));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!start || !end) return setError("Pick a start and end date.");
    if (end < start) return setError("End date can't be before the start date.");
    setBusy(true);
    try {
      const conflicts = await addVacation({ start, end });
      setStart("");
      setEnd("");
      if (conflicts.length > 0) {
        setNotice(
          `Saved — heads up, you're already on the roster for ${conflicts.length} game${conflicts.length === 1 ? "" : "s"} during this range (${conflicts.map((c) => c.title).join(", ")}). Your admin has been notified.`
        );
      } else {
        setNotice("Saved.");
      }
    } catch (err) {
      setError(err.message || "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  }

  const teamConflicts = isAdmin ? allTeamConflicts(team, events) : [];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Header title="Vacation Days" right={<HomeButton />} />

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 24px 20px", display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionLabel>Add a vacation range</SectionLabel>
          <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: -4 }}>
            If you're already assigned to a Winter game in this range, we'll flag it right away and let your admin know.
          </div>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>From</span>
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} required style={{ background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px 14px", fontSize: 14, color: "var(--text)", outline: "none" }} />
              </label>
              <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>To</span>
                <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} required style={{ background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px 14px", fontSize: 14, color: "var(--text)", outline: "none" }} />
              </label>
            </div>
            <ErrorText>{error}</ErrorText>
            {notice && <div style={{ fontSize: 12.5, color: notice.startsWith("Saved.") ? "var(--green-text)" : "var(--amber-text)", background: notice.startsWith("Saved.") ? "var(--green-bg)" : "var(--amber-bg)", borderRadius: "var(--radius-sm)", padding: "10px 12px", lineHeight: 1.5 }}>{notice}</div>}
            <PrimaryButton type="submit" disabled={busy}>{busy ? "Saving…" : "Add Vacation"}</PrimaryButton>
          </form>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionLabel>Your vacation days</SectionLabel>
          {sorted.length === 0 && <div style={{ fontSize: 13, color: "var(--text-faint)" }}>None added yet.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sorted.map((v) => {
              const conflicts = conflictsForRange(events, profile.uid, v.start, v.end);
              return (
                <Card key={v.id} style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{formatRange(v.start, v.end)}</div>
                    {conflicts.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, fontSize: 12, fontWeight: 600, color: "var(--red-text)" }}>
                        <WarningIcon /> Conflicts with {conflicts.length} game{conflicts.length === 1 ? "" : "s"}
                      </div>
                    )}
                  </div>
                  <button onClick={() => removeVacation(v.id)} style={{ background: "var(--red-bg)", border: "none", borderRadius: "var(--radius-sm)", padding: "8px 10px", color: "var(--red-text)", display: "flex", alignItems: "center" }}>
                    <TrashIcon />
                  </button>
                </Card>
              );
            })}
          </div>
        </div>

        {isAdmin && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionLabel>Team conflicts</SectionLabel>
            {teamConflicts.length === 0 && <div style={{ fontSize: 13, color: "var(--text-faint)" }}>No conflicts across the team right now.</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {teamConflicts.map(({ member, vacation, event }, i) => (
                <Card key={i} style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar initials={member.initials} color={member.color} size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{member.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 1 }}>
                      {event.title} on {event.date} — during their {formatRange(vacation.start, vacation.end)} vacation
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
