import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import BottomNav from "../components/BottomNav";
import { ChevronRightIcon, TrophyIcon, SwapIcon } from "../components/Icons";
import { myVacationConflicts, teammateVacationConflicts } from "../lib/notifications";

function Row({ emoji, Icon, title, subtitle, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        background: "var(--card)",
        border: "var(--border-width, 1px) solid var(--border)",
        borderRadius: "var(--radius-md)",
        textAlign: "left",
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: "var(--radius-sm)", background: "var(--accent-soft-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "oklch(40% 0.12 140)", fontSize: 19 }}>
        {emoji || (Icon && <Icon />)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 1 }}>{subtitle}</div>
      </div>
      {badge > 0 && (
        <div style={{ minWidth: 20, height: 20, borderRadius: 999, background: "var(--red-solid)", color: "white", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
          {badge}
        </div>
      )}
      <ChevronRightIcon style={{ color: "var(--text-faint)" }} />
    </button>
  );
}

export default function More() {
  const { team, events, profile, isAdmin } = useApp();
  const navigate = useNavigate();

  const openSlotsCount = useMemo(
    () => events.filter((e) => e.mode === "winter" && e.status !== "cancelled" && Object.values(e.participants || {}).some((p) => p.status === "open")).length,
    [events]
  );

  const myConflictCount = myVacationConflicts(team, events, profile.uid).length;
  const teamConflictCount = isAdmin ? teammateVacationConflicts(team, events, profile.uid).length : 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 12px) 24px 4px 24px", flexShrink: 0 }}>
        <div className="display" style={{ fontSize: 20, fontWeight: 700 }}>More</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Messaging, vacation days, games & payments, and open slots.</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        {isAdmin && <Row emoji="🛠️" title="Admin Dashboard" subtitle="Unconfirmed games, open spots, who owes, conflicts" onClick={() => navigate("/admin")} />}
        <Row emoji="💬" title="Messaging" subtitle="Direct messages with teammates" onClick={() => navigate("/messages")} />
        <Row emoji="🏖️" title="Vacation Days" subtitle="Let the team know when you're away" badge={myConflictCount} onClick={() => navigate("/vacations")} />
        <Row Icon={TrophyIcon} title="Game History & Ledger" subtitle="Winter games you've played, missed, and have coming up" onClick={() => navigate("/ledger")} />
        <Row emoji="🙋" title="Sub List" subtitle="Days you can fill in — get first dibs on open spots" onClick={() => navigate("/subs")} />
        <Row emoji="📊" title="Season Stats" subtitle="Games played, partners, team leaderboard" onClick={() => navigate("/stats")} />
        <Row emoji="💵" title="Payments" subtitle="Your share of the court fees and who to pay" badge={0} onClick={() => navigate("/payments")} />
        <Row Icon={SwapIcon} title="Slot Marketplace" subtitle="Give up or claim an open Winter slot" badge={openSlotsCount} onClick={() => navigate("/marketplace")} />
        {isAdmin && teamConflictCount > 0 && (
          <div style={{ fontSize: 12.5, color: "var(--red-text)", background: "var(--red-bg)", borderRadius: "var(--radius-sm)", padding: "10px 12px", marginTop: 4 }}>
            ⚠️ {teamConflictCount} teammate{teamConflictCount === 1 ? "" : "s"} {teamConflictCount === 1 ? "has" : "have"} a vacation conflict with an assigned Winter game — see Vacation Days.
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
