import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import EventCard from "../components/EventCard";
import BottomNav from "../components/BottomNav";
import { PlusIcon, ChevronLeftIcon, UploadIcon } from "../components/Icons";
import { SectionLabel } from "../components/UI";

function groupByDate(events) {
  const groups = {};
  for (const e of events) {
    groups[e.date] = groups[e.date] || [];
    groups[e.date].push(e);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export default function Schedule({ season }) {
  const { events, profile, isAdmin } = useApp();
  const navigate = useNavigate();

  const scoped = events.filter((e) => e.mode === season);
  const canPropose = season === "summer" || isAdmin;
  const canImport = season === "winter" && isAdmin;
  const groups = groupByDate(scoped);
  const label = season === "winter" ? "❄️ Winter Schedule" : "☀️ Summer Schedule";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 12px) 24px 0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => navigate("/")}
            style={{ width: 36, height: 36, borderRadius: 999, background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <ChevronLeftIcon />
          </button>
          <div className="display" style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>{label}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {canImport && (
            <button
              onClick={() => navigate("/winter/import")}
              style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 12px", borderRadius: 999, background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}
            >
              <UploadIcon width={14} height={14} />
              Import
            </button>
          )}
          {canImport && (
            <button
              data-testid="plan-btn"
              onClick={() => navigate("/winter/plan")}
              style={{ display: "flex", alignItems: "center", gap: 5, height: 36, padding: "0 12px", borderRadius: 999, background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}
            >
              ✨ Plan
            </button>
          )}
          <Avatar uid={profile.uid} initials={profile.initials} color={profile.color} size={38} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 24px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        {groups.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-faint)", fontSize: 14 }}>
            Nothing scheduled yet.
            {canPropose ? " Tap + to propose a match or practice." : " Check back once your admin assigns the next slot."}
          </div>
        )}
        {groups.map(([date, dayEvents]) => (
          <div key={date} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SectionLabel style={{ padding: "8px 0 2px 2px" }}>
              {new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </SectionLabel>
            {dayEvents.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        ))}
      </div>

      {canPropose && (
        <div
          data-testid="fab-propose"
          onClick={() => navigate(`/propose/${season}`)}
          style={{
            // Pinned to the screen (not the end of a long list), lined up with
            // the app's 460px column on wide screens, just above the bottom bar.
            position: "fixed",
            right: "max(20px, calc((100vw - 460px) / 2 + 20px))",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 92px)",
            zIndex: 30,
            width: 56,
            height: 56,
            borderRadius: 999,
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 6px 16px color-mix(in oklch, var(--accent) 45%, transparent)",
            cursor: "pointer",
          }}
        >
          <PlusIcon style={{ color: "var(--accent-text)" }} />
        </div>
      )}

      <BottomNav />
    </div>
  );
}
