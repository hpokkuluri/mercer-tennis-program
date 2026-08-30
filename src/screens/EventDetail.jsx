import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import { Header, Card, Badge, SectionLabel, PrimaryButton, SecondaryButton } from "../components/UI";
import { RacketIcon, TrophyIcon, CalendarIcon, PinIcon, CheckIcon, XIcon, DotsIcon, SwapIcon } from "../components/Icons";
import { isOpenEvent, computeGroups } from "../lib/groups";

const statusMap = {
  confirmed: { tone: "green", label: "Confirmed" },
  pending: { tone: "amber", label: "Pending" },
  attention: { tone: "red", label: "Needs a player" },
};

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    events, team, profile, isAdmin, respondToEvent, reassignInvite, cancelEvent, subscribeComments, postComment,
    joinEvent, withdrawFromEvent, setWinterResult, addSummerResult, deleteSummerResult, addParticipants,
  } = useApp();
  const event = events.find((e) => e.id === id);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const [reassignOpen, setReassignOpen] = useState(false);

  useEffect(() => {
    if (!event) return undefined;
    return subscribeComments(event.id, setComments);
  }, [event?.id]);

  const members = useMemo(() => Object.values(team?.members || {}), [team]);

  if (!event) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header title="Event" />
        <div style={{ padding: 24, color: "var(--text-faint)", fontSize: 14 }}>This event isn't around anymore.</div>
      </div>
    );
  }

  const open = isOpenEvent(event);
  const participants = Object.values(event.participants || {});
  const accepted = participants.filter((p) => p.status === "accepted");
  const pending = participants.filter((p) => p.status === "pending");
  const declined = participants.filter((p) => p.status === "declined");
  const s = statusMap[event.status] || statusMap.pending;
  const me = event.participants?.[profile.uid];
  const canRespond = !open && me && me.status === "pending";
  const canStillReassign = !open && me && me.status !== "accepted";
  const availableToReassign = members.filter((m) => !event.participants?.[m.uid]);

  const { teamSize, groups } = open ? computeGroups(event) : { teamSize: 0, groups: [] };
  const meJoined = open && Boolean(event.participants?.[profile.uid]);
  const notYetJoined = open ? members.filter((m) => !event.participants?.[m.uid]) : [];

  async function respond(status) {
    await respondToEvent(event.id, status);
  }
  async function reassignTo(m) {
    await reassignInvite(event.id, m);
    setReassignOpen(false);
  }
  async function submitComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    await postComment(event.id, comment.trim());
    setComment("");
  }
  async function join() {
    await joinEvent(event.id);
  }
  async function withdraw() {
    await withdrawFromEvent(event.id);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Header
        title="Event Details"
        right={
          (isAdmin || event.organizerId === profile.uid) && (
            <div style={{ width: 36, height: 36, borderRadius: 999, background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <DotsIcon style={{ color: "var(--text)" }} />
            </div>
          )
        }
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: event.type === "match" ? "var(--green-text)" : "var(--blue)" }}>
              {event.type === "match" ? <TrophyIcon /> : <RacketIcon />}
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{event.type}</span>
            </div>
            <Badge tone={s.tone}>{s.label}</Badge>
          </div>
          <div className="display" style={{ fontSize: 20, fontWeight: 700 }}>{event.title}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text)", opacity: 0.85 }}>
              <CalendarIcon width={15} height={15} />
              {new Date(event.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} · {event.startTime}&ndash;{event.endTime}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text)", opacity: 0.85 }}>
              <PinIcon width={15} height={15} /> {event.location}
            </div>
          </div>
          {event.note && (
            <div style={{ background: "oklch(95% 0.02 90)", borderRadius: "var(--radius-md)", padding: "12px 14px", fontSize: 13, fontStyle: "italic", color: "oklch(38% 0.01 260)" }}>
              &ldquo;{event.note}&rdquo;
            </div>
          )}
          {open ? (
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", paddingTop: 4 }}>
              Open sign-up — posted to the whole team, no invites needed.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>{accepted.length} of {participants.length} accepted</div>
              <div style={{ height: 6, borderRadius: 999, background: "oklch(93% 0.008 90)", overflow: "hidden" }}>
                <div style={{ width: `${participants.length ? (accepted.length / participants.length) * 100 : 0}%`, height: "100%", background: "var(--amber-solid)" }} />
              </div>
            </div>
          )}
        </Card>

        {open ? (
          groups.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-faint)", textAlign: "center", padding: "12px 0" }}>
              Nobody's joined yet — be the first!
            </div>
          ) : (
            groups.map((g) => (
              <GroupCard key={g.index} group={g} teamSize={teamSize} participants={event.participants} />
            ))
          )
        ) : (
          <>
            <RosterGroup label="Accepted" tone="green" people={accepted} icon={<CheckIcon width={16} height={16} style={{ color: "var(--green-solid)" }} />} />
            <RosterGroup label="Pending" tone="amber" people={pending} icon={<span style={{ color: "var(--amber-solid)" }}><DotsIcon width={14} height={14} /></span>} />
            <RosterGroup label="Declined" tone="red" people={declined} icon={<XIcon width={15} height={15} style={{ color: "var(--red-solid)" }} />} />
            {(isAdmin || event.organizerId === profile.uid) && event.status !== "cancelled" && availableToReassign.length > 0 && (
              <AddPlayers candidates={availableToReassign} onAdd={(uids) => addParticipants(event.id, uids)} />
            )}
          </>
        )}

        {open ? (
          <SummerResults
            event={event}
            groups={groups}
            profile={profile}
            isAdmin={isAdmin}
            onAdd={(data) => addSummerResult(event.id, data)}
            onDelete={(resultId) => deleteSummerResult(event.id, resultId)}
          />
        ) : (
          <WinterResult
            event={event}
            profile={profile}
            isAdmin={isAdmin}
            onSave={(data) => setWinterResult(event.id, data)}
          />
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionLabel>Comments</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {comments.length === 0 && <div style={{ fontSize: 13, color: "var(--text-faint)" }}>No comments yet.</div>}
            {comments.map((c) => (
              <div key={c.id} style={{ background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{c.authorName}</div>
                <div style={{ fontSize: 13.5, color: "var(--text)", marginTop: 2 }}>{c.text}</div>
              </div>
            ))}
          </div>
          <form onSubmit={submitComment} style={{ display: "flex", gap: 8 }}>
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment…"
              style={{ flex: 1, border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 12px", fontSize: 13.5, outline: "none" }}
            />
            <button type="submit" className="display" style={{ border: "none", background: "var(--accent)", color: "var(--accent-text)", borderRadius: "var(--radius-md)", padding: "0 16px", fontWeight: 700, fontSize: 13 }}>
              Send
            </button>
          </form>
        </div>
      </div>

      <div style={{ flexShrink: 0, padding: "10px 20px 26px 20px", background: "var(--bg)", display: "flex", flexDirection: "column", gap: 10 }}>
        {open && event.status !== "cancelled" && (
          meJoined ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-faint)", textAlign: "center" }}>
                You're in {groups.find((g) => g.uids.includes(profile.uid))?.full ? "a confirmed team" : "the group waiting to fill a team"}.
              </div>
              <SecondaryButton tone="neutral" onClick={withdraw}>Leave</SecondaryButton>
            </div>
          ) : (
            <PrimaryButton data-testid="join-btn" onClick={join}>Join {event.type === "match" ? "Match" : "Practice"}</PrimaryButton>
          )
        )}
        {canRespond && !reassignOpen && (
          <div style={{ display: "flex", gap: 12 }}>
            <SecondaryButton data-testid="decline-btn" tone="neutral" onClick={() => respond("declined")} style={{ flex: 1 }}>Decline</SecondaryButton>
            <button data-testid="reassign-btn" onClick={() => setReassignOpen(true)} style={{ flex: 0.9, background: "var(--card)", border: "var(--border-width, 1.5px) solid var(--border)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--text-muted)", fontWeight: 700, fontSize: 13 }} className="display">
              <SwapIcon /> Reassign
            </button>
            <PrimaryButton data-testid="accept-btn" onClick={() => respond("accepted")} style={{ flex: 1.3 }}>Accept</PrimaryButton>
          </div>
        )}
        {!canRespond && me?.status === "declined" && !reassignOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12.5, color: "var(--text-faint)", textAlign: "center" }}>You declined this one.</div>
            <SecondaryButton data-testid="reassign-btn" onClick={() => setReassignOpen(true)}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><SwapIcon /> Reassign Your Spot</span>
            </SecondaryButton>
          </div>
        )}
        {canStillReassign && reassignOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionLabel>Give your spot to…</SectionLabel>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {availableToReassign.length === 0 && <div style={{ fontSize: 13, color: "var(--text-faint)" }}>Everyone on the team is already invited.</div>}
              {availableToReassign.map((m) => (
                <button key={m.uid} onClick={() => reassignTo(m)} style={{ background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar initials={m.initials} color={m.color} size={26} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</span>
                </button>
              ))}
            </div>
            <SecondaryButton onClick={() => setReassignOpen(false)}>Cancel</SecondaryButton>
          </div>
        )}

        {!canRespond && (isAdmin || event.organizerId === profile.uid) && event.status !== "cancelled" && (
          <>
            {open && notYetJoined.length > 0 && (
              <SecondaryButton
                tone="amber"
                onClick={() => postComment(event.id, `👋 Still open — ${notYetJoined.map((p) => p.name.split(" ")[0]).join(", ")} haven't joined yet.`)}
              >
                Nudge the Team
              </SecondaryButton>
            )}
            {!open && pending.length > 0 && (
              <SecondaryButton
                tone="amber"
                onClick={() => postComment(event.id, `👋 Reminder: still waiting on ${pending.map((p) => p.name.split(" ")[0]).join(", ")}.`)}
              >
                Remind Pending Players
              </SecondaryButton>
            )}
            <button onClick={async () => { await cancelEvent(event.id); navigate("/"); }} style={{ background: "none", border: "none", color: "var(--red-solid)", fontWeight: 700, fontSize: 13 }} className="display">
              Cancel Event
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function GroupCard({ group, teamSize, participants }) {
  const people = group.uids.map((uid) => participants[uid]).filter(Boolean);
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="display" style={{ fontSize: 15, fontWeight: 700 }}>Team {group.index + 1}</div>
        <Badge tone={group.full ? "green" : "amber"}>{group.full ? "Confirmed" : `Forming · ${people.length}/${teamSize}`}</Badge>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {people.map((p) => (
          <div key={p.uid} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar initials={p.initials} color={p.color} size={30} />
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.name}</div>
          </div>
        ))}
        {!group.full &&
          Array.from({ length: teamSize - people.length }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, opacity: 0.4 }}>
              <div style={{ width: 30, height: 30, borderRadius: 999, border: "1.5px dashed var(--border)" }} />
              <div style={{ fontSize: 13.5, color: "var(--text-faint)" }}>Open spot</div>
            </div>
          ))}
      </div>
    </Card>
  );
}

function AddPlayers({ candidates, onAdd }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  function toggle(uid) {
    setSelected((s) => (s.includes(uid) ? s.filter((x) => x !== uid) : [...s, uid]));
  }

  async function submit() {
    setBusy(true);
    try {
      await onAdd(selected);
      setSelected([]);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <SecondaryButton onClick={() => setOpen(true)}>Add Players</SecondaryButton>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <SectionLabel>Add Players</SectionLabel>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {candidates.map((m) => {
          const on = selected.includes(m.uid);
          return (
            <button type="button" key={m.uid} onClick={() => toggle(m.uid)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ position: "relative" }}>
                <Avatar initials={m.initials} color={m.color} size={48} ring={on ? "var(--accent)" : undefined} />
                {on && (
                  <div style={{ position: "absolute", bottom: -2, right: -2, width: 17, height: 17, borderRadius: 999, background: "var(--accent)", border: "2px solid var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CheckIcon width={8} height={8} style={{ color: "var(--accent-text)" }} />
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{m.name.split(" ")[0]}</div>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <SecondaryButton onClick={() => { setOpen(false); setSelected([]); }} style={{ flex: 1 }}>Cancel</SecondaryButton>
        <PrimaryButton onClick={submit} disabled={busy || selected.length === 0} style={{ flex: 1 }}>
          {busy ? "Adding…" : `Add ${selected.length || ""} Player${selected.length === 1 ? "" : "s"}`}
        </PrimaryButton>
      </div>
    </div>
  );
}

function WinterResult({ event, onSave }) {
  const existing = event.result;
  const [formOpen, setFormOpen] = useState(false);
  const [outcome, setOutcome] = useState(existing?.outcome || "win");
  const [score, setScore] = useState(existing?.score || "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await onSave({ outcome, score: score.trim() });
      setFormOpen(false);
    } finally {
      setBusy(false);
    }
  }

  if (!formOpen) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SectionLabel>Result</SectionLabel>
        {existing ? (
          <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div>
              <Badge tone={existing.outcome === "win" ? "green" : "red"}>{existing.outcome === "win" ? "Won" : "Lost"}</Badge>
              {existing.score && <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 700 }}>{existing.score}</span>}
              <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 6 }}>Logged by {existing.recordedByName}</div>
            </div>
            <button onClick={() => setFormOpen(true)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontWeight: 700, fontSize: 12.5 }} className="display">Edit</button>
          </Card>
        ) : (
          <SecondaryButton onClick={() => setFormOpen(true)}>Log Result</SecondaryButton>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <SectionLabel>Log Result</SectionLabel>
      <div style={{ display: "flex", gap: 8 }}>
        {["win", "loss"].map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setOutcome(o)}
            className="display"
            style={{ flex: 1, padding: "10px 0", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: 13.5, textTransform: "capitalize", border: outcome === o ? "2px solid var(--text)" : "var(--border-width, 1px) solid var(--border)", background: outcome === o ? (o === "win" ? "var(--green-bg)" : "var(--red-bg)") : "var(--card)", color: outcome === o ? (o === "win" ? "var(--green-text)" : "var(--red-text)") : "var(--text-muted)" }}
          >
            {o === "win" ? "We won" : "We lost"}
          </button>
        ))}
      </div>
      <input
        value={score}
        onChange={(e) => setScore(e.target.value)}
        placeholder="Score, e.g. 6-4, 6-2"
        style={{ border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px 14px", fontSize: 14, outline: "none", background: "var(--card)", color: "var(--text)" }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <SecondaryButton onClick={() => setFormOpen(false)} style={{ flex: 1 }}>Cancel</SecondaryButton>
        <PrimaryButton onClick={save} disabled={busy} style={{ flex: 1 }}>{busy ? "Saving…" : "Save"}</PrimaryButton>
      </div>
    </div>
  );
}

function SummerResults({ event, groups, onAdd, onDelete, profile, isAdmin }) {
  const fullGroups = groups.filter((g) => g.full);
  const results = Object.entries(event.results || {}).sort((a, b) => (a[1].recordedAt || 0) - (b[1].recordedAt || 0));
  const [formOpen, setFormOpen] = useState(false);
  const [aIndex, setAIndex] = useState(0);
  const [bIndex, setBIndex] = useState(1);
  const [winner, setWinner] = useState("a");
  const [score, setScore] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (aIndex === bIndex) return;
    setBusy(true);
    try {
      await onAdd({
        teamALabel: `Team ${aIndex + 1}`,
        teamBLabel: `Team ${bIndex + 1}`,
        winner,
        score: score.trim(),
      });
      setFormOpen(false);
      setScore("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <SectionLabel>Results</SectionLabel>
      {results.length === 0 && !formOpen && <div style={{ fontSize: 13, color: "var(--text-faint)" }}>No results logged yet.</div>}
      {results.map(([resultId, r]) => (
        <Card key={resultId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {r.winner === "a" ? r.teamALabel : r.teamBLabel} beat {r.winner === "a" ? r.teamBLabel : r.teamALabel}
              {r.score ? ` · ${r.score}` : ""}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 3 }}>Logged by {r.recordedByName}</div>
          </div>
          {(isAdmin || r.recordedBy === profile.uid) && (
            <button onClick={() => onDelete(resultId)} style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: 12.5, fontWeight: 700 }} className="display">Remove</button>
          )}
        </Card>
      ))}

      {fullGroups.length >= 2 && (
        formOpen ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <TeamPicker groups={fullGroups} value={aIndex} onChange={setAIndex} />
              <span style={{ fontSize: 12.5, color: "var(--text-faint)" }}>vs</span>
              <TeamPicker groups={fullGroups} value={bIndex} onChange={setBIndex} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["a", "b"].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWinner(w)}
                  className="display"
                  style={{ flex: 1, padding: "10px 0", borderRadius: "var(--radius-md)", fontWeight: 700, fontSize: 13, border: winner === w ? "2px solid var(--text)" : "var(--border-width, 1px) solid var(--border)", background: winner === w ? "var(--green-bg)" : "var(--card)", color: winner === w ? "var(--green-text)" : "var(--text-muted)" }}
                >
                  Team {(w === "a" ? aIndex : bIndex) + 1} won
                </button>
              ))}
            </div>
            <input
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="Score, e.g. 6-4, 6-2"
              style={{ border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px 14px", fontSize: 14, outline: "none", background: "var(--card)", color: "var(--text)" }}
            />
            {aIndex === bIndex && <div style={{ fontSize: 12, color: "var(--red-text)" }}>Pick two different teams.</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <SecondaryButton onClick={() => setFormOpen(false)} style={{ flex: 1 }}>Cancel</SecondaryButton>
              <PrimaryButton onClick={save} disabled={busy || aIndex === bIndex} style={{ flex: 1 }}>{busy ? "Saving…" : "Save"}</PrimaryButton>
            </div>
          </div>
        ) : (
          <SecondaryButton onClick={() => { setAIndex(fullGroups[0]?.index || 0); setBIndex(fullGroups[1]?.index ?? 1); setFormOpen(true); }}>
            Log a Result
          </SecondaryButton>
        )
      )}
    </div>
  );
}

function TeamPicker({ groups, value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ flex: 1, border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 12px", fontSize: 13.5, fontWeight: 600, background: "var(--card)", color: "var(--text)" }}
    >
      {groups.map((g) => (
        <option key={g.index} value={g.index}>Team {g.index + 1}</option>
      ))}
    </select>
  );
}

function RosterGroup({ label, tone, people, icon }) {
  if (people.length === 0) return null;
  const toneColor = { green: "oklch(40% 0.1 140)", amber: "oklch(45% 0.11 65)", red: "oklch(50% 0.15 25)" }[tone];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: toneColor, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label} · {people.length}</div>
      <div style={{ background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        {people.map((p, i) => (
          <div key={p.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: i < people.length - 1 ? "1px solid var(--border-soft)" : "none" }}>
            <Avatar initials={p.initials} color={p.color} size={34} />
            <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{p.name}{p.reassignedFrom ? " (reassigned)" : ""}</div>
            {icon}
          </div>
        ))}
      </div>
    </div>
  );
}
