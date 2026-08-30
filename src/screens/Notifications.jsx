import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import EventCard from "../components/EventCard";
import BottomNav from "../components/BottomNav";
import { ChevronLeftIcon, BellIcon } from "../components/Icons";
import { SectionLabel } from "../components/UI";
import { isOpenEvent } from "../lib/groups";

export default function Notifications() {
  const { events, profile } = useApp();
  const navigate = useNavigate();

  const pending = events.filter((e) => e.participants?.[profile.uid]?.status === "pending" && e.status !== "cancelled");
  const openToJoin = events.filter((e) => isOpenEvent(e) && e.status !== "cancelled" && !e.participants?.[profile.uid]);

  const empty = pending.length === 0 && openToJoin.length === 0;

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
      </div>

      <BottomNav />
    </div>
  );
}
