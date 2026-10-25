import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ScoreBoard from "../components/ScoreBoard";
import { pairings, playersOf, teamsOf, cleanSets, setsForSave, hasStarted } from "../lib/scorecard";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import { Header, Card, Badge, SectionLabel, PrimaryButton, SecondaryButton } from "../components/UI";
import { RacketIcon, TrophyIcon, CalendarIcon, PinIcon, CheckIcon, XIcon, DotsIcon, SwapIcon, WarningIcon } from "../components/Icons";
import { isOpenEvent, computeGroups } from "../lib/groups";
import { isOnVacation } from "../lib/vacations";

const statusMap = {
  confirmed: { tone: "green", label: "Confirmed" },
  pending: { tone: "amber", label: "Pending" },
  attention: { tone: "red", label: "Needs a player" },
};

export default function EventDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    events, team, profile, isAdmin, respondToEvent, reassignInvite, cancelEvent, subscribeComments, postComment,
    joinEvent, withdrawFromEvent, setWinterResult, addSummerResult, deleteSummerResult, addParticipants,
    openSlot, closeSlot, claimSlot, swapPlayer, updateEventFields,
  } = useApp();
  const event = events.find((e) => e.id === id);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const [reassignOpen, setReassignOpen] = useState(false);
  const [givingUp, setGivingUp] = useState(false);
  const [closingSlot, setClosingSlot] = useState(false);
  const [claimingUid, setClaimingUid] = useState(null);

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
  const openSlots = participants.filter((p) => p.status === "open");
  const s = statusMap[event.status] || statusMap.pending;
  const me = event.participants?.[profile.uid];
  const canRespond = !open && me && me.status === "pending";
  const canStillReassign = !open && me && me.status !== "accepted";
  const availableToReassign = members.filter((m) => !event.participants?.[m.uid]);
  // Spot trading closes once the game has started.
  const isUpcoming = !open && !hasStarted(event);
  // Pending players already have Decline/Reassign; this is for someone
  // who already accepted and only later found out they can't make it
  // (a new conflict, a vacation, etc.) — no other way to back out.
  const canGiveUpSlot = !open && isUpcoming && me && me.status === "accepted";
  // Admins can trade any player's spot on an upcoming Winter game — the only
  // way to do it for roster players who don't have a login.
  const adminSlots = isAdmin && !open && isUpcoming && event.status !== "cancelled";
  const firstName = (uid) => (team?.members?.[uid]?.name || event.participants?.[uid]?.name || "").split(" ")[0];
  const adminActions = adminSlots
    ? {
        candidates: [...availableToReassign].sort((a, b) => Number((b.subDates || []).includes(event.date)) - Number((a.subDates || []).includes(event.date))),
        date: event.date,
        openFor: async (uid) => {
          await openSlot(event.id, uid);
          await postComment(event.id, `🔄 ${firstName(uid)}'s spot is open — anyone on the team can claim it (opened by ${profile.name.split(" ")[0]}).`);
        },
        takeBack: async (uid) => {
          await closeSlot(event.id, uid);
          await postComment(event.id, `🔒 ${firstName(uid)}'s spot is back — no longer up for grabs.`);
        },
        giveTo: async (fromUid, toUid) => {
          await claimSlot(event.id, fromUid, toUid);
          await postComment(event.id, `✅ ${firstName(toUid)} took ${firstName(fromUid)}'s spot (set by ${profile.name.split(" ")[0]}).`);
        },
        swap: async (fromUid, toUid) => {
          await swapPlayer(event.id, fromUid, toUid);
          await postComment(event.id, `🔁 ${firstName(toUid)} is playing instead of ${firstName(fromUid)} (set by ${profile.name.split(" ")[0]}).`);
        },
      }
    : null;

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
  async function giveUpSlot() {
    setGivingUp(true);
    try {
      await openSlot(event.id);
      await postComment(event.id, `🔄 ${profile.name.split(" ")[0]}'s spot is open — anyone on the team can claim it (Slot Marketplace).`);
    } finally {
      setGivingUp(false);
    }
  }
  async function cancelOpenSlot() {
    setClosingSlot(true);
    try {
      await closeSlot(event.id);
      await postComment(event.id, `🔒 ${profile.name.split(" ")[0]} took their spot back — no longer up for grabs.`);
    } finally {
      setClosingSlot(false);
    }
  }
  async function claim(fromUid) {
    setClaimingUid(fromUid);
    try {
      await claimSlot(event.id, fromUid);
      await postComment(event.id, `✅ ${profile.name.split(" ")[0]} claimed the open spot.`);
    } finally {
      setClaimingUid(null);
    }
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
            <RosterGroup label="Accepted" tone="green" people={accepted} icon={<CheckIcon width={16} height={16} style={{ color: "var(--green-solid)" }} />} team={team} eventDate={event.date} admin={adminActions} />
            <RosterGroup label="Pending" tone="amber" people={pending} icon={<span style={{ color: "var(--amber-solid)" }}><DotsIcon width={14} height={14} /></span>} team={team} eventDate={event.date} admin={adminActions} />
            <RosterGroup label="Declined" tone="red" people={declined} icon={<XIcon width={15} height={15} style={{ color: "var(--red-solid)" }} />} team={team} eventDate={event.date} />
            {openSlots.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "oklch(45% 0.12 250)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Open · {openSlots.length}</div>
                <div style={{ background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                  {openSlots.map((p, i) => (
                    <div key={p.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: i < openSlots.length - 1 ? "1px solid var(--border-soft)" : "none" }}>
                      <Avatar uid={p.uid} initials={p.initials} color={p.color} size={34} />
                      <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{p.name}'s spot — up for grabs</div>
                      {p.uid !== profile.uid && !event.participants?.[profile.uid] && (
                        <SecondaryButton style={{ width: "auto", padding: "8px 14px" }} disabled={claimingUid === p.uid} onClick={() => claim(p.uid)}>
                          {claimingUid === p.uid ? "…" : "Claim"}
                        </SecondaryButton>
                      )}
                    </div>
                  ))}
                  {adminActions && openSlots.map((p) => (
                    <AdminOpenSlotBar key={`admin-${p.uid}`} person={p} admin={adminActions} />
                  ))}
                </div>
              </div>
            )}
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
          <>
            {playersOf(event).length >= 2 && (
              <ScoreCardSection
                event={event}
                members={team?.members || {}}
                canEdit={event.status !== "cancelled" && (isAdmin || Boolean(event.participants?.[profile.uid]))}
                startOpen={Boolean(location.state?.score)}
                onSave={(scorecard) => updateEventFields(event.id, { scorecard })}
                profile={profile}
              />
            )}
            {event.result && (
              <WinterResult event={event} profile={profile} isAdmin={isAdmin} onSave={(data) => setWinterResult(event.id, data)} />
            )}
          </>
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
        {canGiveUpSlot && (
          <SecondaryButton tone="neutral" disabled={givingUp} onClick={giveUpSlot}>
            {givingUp ? "Opening your spot…" : "Can't make it? Open your spot to the team"}
          </SecondaryButton>
        )}
        {!open && me?.status === "open" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12.5, color: "var(--text-faint)", textAlign: "center" }}>
              Your spot is open in the Slot Marketplace — waiting for a teammate to claim it.
            </div>
            <SecondaryButton tone="neutral" disabled={closingSlot} onClick={cancelOpenSlot}>
              {closingSlot ? "Cancelling…" : "Cancel — I'll play after all"}
            </SecondaryButton>
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
                  <Avatar uid={m.uid} initials={m.initials} color={m.color} size={26} />
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
            <Avatar uid={p.uid} initials={p.initials} color={p.color} size={30} />
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
                <Avatar uid={m.uid} initials={m.initials} color={m.color} size={48} ring={on ? "var(--accent)" : undefined} />
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

// Doubles score card: pick the pairs, enter up to three sets.
function ScoreCardSection({ event, members, canEdit, startOpen, onSave, profile }) {
  const uids = playersOf(event);
  const [A0, B0] = teamsOf(event);
  const options = pairings(uids);
  const startIdx = Math.max(0, options.findIndex(([a]) => a.length === A0.length && a.every((u) => A0.includes(u))));
  const [open, setOpen] = useState(startOpen && canEdit);
  const [pairIdx, setPairIdx] = useState(startIdx);
  const existing = cleanSets(event.scorecard?.sets);
  const [sets, setSets] = useState(() => {
    const base = existing.map(([x, y]) => [String(x), String(y)]);
    while (base.length < 3) base.push(["", ""]);
    return base;
  });
  const [busy, setBusy] = useState(false);
  const first = (uid) => (members[uid]?.name || event.participants?.[uid]?.name || "?").split(" ")[0];
  const started = hasStarted(event);

  const [error, setError] = useState("");
  async function save(clear = false) {
    setBusy(true);
    setError("");
    try {
      const [teamA, teamB] = options[pairIdx] || [A0, B0];
      const clean = clear ? [] : setsForSave(sets);
      await onSave({ teamA, teamB, sets: clean, recordedBy: profile?.uid || "", recordedByName: profile?.name || "", recordedAt: Date.now() });
      setOpen(false);
    } catch (e) {
      setError(`Couldn't save — ${e?.message || "please try again"}`);
    } finally {
      setBusy(false);
    }
  }

  const cell = { width: 54, textAlign: "center", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-sm)", padding: "9px 4px", fontSize: 16, fontWeight: 700, background: "var(--card)", color: "var(--text)" };

  if (!open) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionLabel>Score card</SectionLabel>
          {canEdit && (
            <button type="button" data-testid="score-edit" onClick={() => setOpen(true)} className="display" style={{ background: "none", border: "none", color: "var(--text-muted)", fontWeight: 700, fontSize: 12.5 }}>
              {existing.length ? "Edit score" : started ? "Add score" : "Set pairs"}
            </button>
          )}
        </div>
        <Card style={{ padding: "14px" }}>
          <ScoreBoard event={event} members={members} size="lg" />
          {event.scorecard?.recordedByName && existing.length > 0 && (
            <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 10 }}>Score entered by {event.scorecard.recordedByName}</div>
          )}
          {!existing.length && <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 10 }}>{started ? "No score yet — any of the four players can add it." : "Pairs for this game. Score can be added once it starts."}</div>}
        </Card>
      </div>
    );
  }

  return (
    <div data-testid="score-form" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SectionLabel>{existing.length ? "Edit score" : "Add score"}</SectionLabel>
      {options.length > 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>Who played together?</div>
          {options.map(([a, b], i) => (
            <button
              key={i}
              type="button"
              data-testid={`pairing-${i}`}
              onClick={() => setPairIdx(i)}
              style={{ textAlign: "left", padding: "10px 12px", borderRadius: "var(--radius-md)", fontSize: 13.5, fontWeight: 600, border: pairIdx === i ? "2px solid var(--accent)" : "var(--border-width, 1px) solid var(--border)", background: pairIdx === i ? "var(--accent-soft-bg)" : "var(--card)", color: "var(--text)" }}
            >
              {a.map(first).join(" & ")} <span style={{ color: "var(--text-faint)", fontWeight: 700, margin: "0 6px" }}>vs</span> {b.map(first).join(" & ")}
            </button>
          ))}
        </div>
      )}
      {started && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 11.5, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase" }}>
            <span style={{ width: 44 }} />
            <span style={{ width: 54, textAlign: "center" }}>{(options[pairIdx] || [A0])[0].map(first).join(" & ").slice(0, 12)}</span>
            <span style={{ width: 54, textAlign: "center" }}>{(options[pairIdx] || [A0, B0])[1].map(first).join(" & ").slice(0, 12)}</span>
          </div>
          {sets.map(([x, y], i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ width: 44, fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)" }}>Set {i + 1}</span>
              <input data-testid={`set-${i}-a`} inputMode="numeric" value={x} onChange={(e) => setSets((ss) => ss.map((s2, j) => (j === i ? [e.target.value.replace(/\D/g, "").slice(0, 2), s2[1]] : s2)))} style={cell} />
              <input data-testid={`set-${i}-b`} inputMode="numeric" value={y} onChange={(e) => setSets((ss) => ss.map((s2, j) => (j === i ? [s2[0], e.target.value.replace(/\D/g, "").slice(0, 2)] : s2)))} style={cell} />
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <SecondaryButton onClick={() => setOpen(false)} style={{ flex: 1 }}>Cancel</SecondaryButton>
        <PrimaryButton data-testid="score-save" onClick={() => save(false)} disabled={busy} style={{ flex: 2 }}>
          {busy ? "Saving…" : started ? "Save score" : "Save pairs"}
        </PrimaryButton>
      </div>
      {error && <div data-testid="score-error" style={{ fontSize: 12.5, color: "var(--red-text)", fontWeight: 600 }}>{error}</div>}
      {existing.length > 0 && (
        <button type="button" onClick={() => save(true)} style={{ background: "none", border: "none", color: "var(--red-text)", fontWeight: 700, fontSize: 12.5 }}>
          Clear score
        </button>
      )}
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

const miniBtn = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--text-muted)",
  background: "var(--border-soft)",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "6px 10px",
  whiteSpace: "nowrap",
};
const miniSelect = {
  flex: 1,
  minWidth: 0,
  fontSize: 12.5,
  padding: "6px 8px",
  borderRadius: "var(--radius-sm)",
  border: "var(--border-width, 1px) solid var(--border)",
  background: "var(--card)",
};

// Admin controls under a confirmed/pending player: open their spot to the
// team, or swap them straight out for someone else.
function AdminRowActions({ person, admin }) {
  const [mode, setMode] = useState(null); // null | "swap"
  const [busy, setBusy] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
      setMode(null);
    }
  };
  if (mode === "swap") {
    return (
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <select data-testid={`swap-select-${person.name}`} defaultValue="" disabled={busy} onChange={(e) => e.target.value && run(() => admin.swap(person.uid, e.target.value))} style={miniSelect}>
          <option value="">Play instead of {person.name.split(" ")[0]}…</option>
          {admin.candidates.map((m) => (
            <option key={m.uid} value={m.uid}>{m.name}{(m.subDates || []).includes(admin.date) ? " — on sub list" : ""}{isOnVacation(m, admin.date) ? " — on vacation" : ""}</option>
          ))}
        </select>
        <button type="button" style={miniBtn} onClick={() => setMode(null)}>Cancel</button>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
      <button type="button" data-testid={`admin-open-${person.name}`} style={miniBtn} disabled={busy} onClick={() => run(() => admin.openFor(person.uid))}>
        {busy ? "…" : "Open spot to team"}
      </button>
      {admin.candidates.length > 0 && (
        <button type="button" data-testid={`admin-swap-${person.name}`} style={miniBtn} disabled={busy} onClick={() => setMode("swap")}>
          Swap player
        </button>
      )}
    </div>
  );
}

// Admin controls for a spot that's already open: hand it to someone, or give it back.
function AdminOpenSlotBar({ person, admin }) {
  const [busy, setBusy] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "10px 14px", borderTop: "1px solid var(--border-soft)", background: "oklch(97% 0.01 250)" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", whiteSpace: "nowrap" }}>Admin:</span>
      <select data-testid={`give-select-${person.name}`} defaultValue="" disabled={busy} onChange={(e) => e.target.value && run(() => admin.giveTo(person.uid, e.target.value))} style={miniSelect}>
        <option value="">Give {person.name.split(" ")[0]}'s spot to…</option>
        {admin.candidates.map((m) => (
          <option key={m.uid} value={m.uid}>{m.name}{(m.subDates || []).includes(admin.date) ? " — on sub list" : ""}{isOnVacation(m, admin.date) ? " — on vacation" : ""}</option>
        ))}
      </select>
      <button type="button" data-testid={`take-back-${person.name}`} style={miniBtn} disabled={busy} onClick={() => run(() => admin.takeBack(person.uid))}>
        Take back
      </button>
    </div>
  );
}

function RosterGroup({ label, tone, people, icon, team, eventDate, admin }) {
  if (people.length === 0) return null;
  const toneColor = { green: "oklch(40% 0.1 140)", amber: "oklch(45% 0.11 65)", red: "oklch(50% 0.15 25)" }[tone];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: toneColor, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label} · {people.length}</div>
      <div style={{ background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        {people.map((p, i) => {
          const onVacation = eventDate && team?.members?.[p.uid] && isOnVacation(team.members[p.uid], eventDate);
          return (
            <div key={p.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: i < people.length - 1 ? "1px solid var(--border-soft)" : "none" }}>
              <Avatar uid={p.uid} initials={p.initials} color={p.color} size={34} />
              <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
                {p.name}{p.reassignedFrom ? " (reassigned)" : ""}{p.claimedFrom ? " (claimed)" : ""}
                {onVacation && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--red-text)", marginTop: 2 }}>
                    <WarningIcon /> On vacation this date
                  </div>
                )}
                {admin && <AdminRowActions person={p} admin={admin} />}
              </div>
              {icon}
            </div>
          );
        })}
      </div>
    </div>
  );
}
