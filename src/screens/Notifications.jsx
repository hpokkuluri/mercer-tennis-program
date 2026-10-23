import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import EventCard from "../components/EventCard";
import BottomNav from "../components/BottomNav";
import { ChevronLeftIcon, BellIcon, WarningIcon, SwapIcon } from "../components/Icons";
import { SectionLabel, Card } from "../components/UI";
import { pendingInvites, openToJoinEvents, myVacationConflicts, teammateVacationConflicts, openSlotsToClaim } from "../lib/notifications";

export default function Notifications() {
  const { team, events, profile, isAdmin } = useApp();
  const navigate = useNavigate();

  const pending = pendingInvites(events, profile.uid);
  const openToJoin = openToJoinEvents(events, profile.uid);
  const myConflicts = myVacationConflicts(team, events, profile.uid);
  const teamConflicts = isAdmin ? teammateVacationConflicts(team, events, profile.uid) : [];
  const claimable = openSlotsToClaim(events, profile.uid);

  const empty = pending.length === 0 && openToJoin.length === 0 && myConflicts.length === 0 && teamConflicts.length === 0 && claimable.length === 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 12px) 24px 0 24px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <button
          onClick={() => navigate("/")}
          style={{ width: 36, height: 36, borderRadius: 999, background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          <ChevronLeftIcon />
        </button>
        <div className="display" style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>Notifications</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        {empty && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-faint)", fontSize: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <BellIcon style={{ width: 28, height: 28, opacity: 0.4 }} />
            You're all caught up. Nothing needs your attention right now.
          </div>
        )}

        {pending.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionLabel style={{ padding: "0 0 2px 2px" }}>Awaiting your response ({pending.length})</SectionLabel>
            {pending.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}

        {openToJoin.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionLabel style={{ padding: "0 0 2px 2px" }}>Open to join ({openToJoin.length})</SectionLabel>
            {openToJoin.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}

        {myConflicts.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionLabel style={{ padding: "0 0 2px 2px" }}>Your vacation conflicts ({myConflicts.length})</SectionLabel>
            {myConflicts.map(({ vacation, event }, i) => (
              <Card key={i} onClick={() => navigate(`/event/${event.id}`)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 999, background: "var(--red-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--red-text)" }}>
                  <WarningIcon />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{event.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 1 }}>
                    {event.date} falls inside your vacation ({vacation.start} – {vacation.end})
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {claimable.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionLabel style={{ padding: "0 0 2px 2px" }}>Open slots you could claim ({claimable.length})</SectionLabel>
            {claimable.map(({ event, opener }) => (
              <Card key={event.id + opener.uid} onClick={() => navigate(`/event/${event.id}`)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar uid={opener.uid} initials={opener.initials} color={opener.color} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{event.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 1 }}>{opener.name.split(" ")[0]}'s spot is open — {event.date}</div>
                </div>
                <SwapIcon style={{ color: "var(--text-faint)", flexShrink: 0 }} />
              </Card>
            ))}
          </div>
        )}

        {isAdmin && teamConflicts.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionLabel style={{ padding: "0 0 2px 2px" }}>Team vacation conflicts ({teamConflicts.length})</SectionLabel>
            {teamConflicts.map(({ member, vacation, event }, i) => (
              <Card key={i} onClick={() => navigate(`/event/${event.id}`)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar uid={member.uid} initials={member.initials} color={member.color} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{member.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 1 }}>
                    {event.title} on {event.date} — during their {vacation.start} – {vacation.end} vacation
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
