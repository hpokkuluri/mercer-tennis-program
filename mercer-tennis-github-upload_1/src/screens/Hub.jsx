import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import BottomNav from "../components/BottomNav";
import { BellIcon, ChevronRightIcon } from "../components/Icons";
import { isOpenEvent } from "../lib/groups";

export default function Hub() {
  const { team, events, profile } = useApp();
  const navigate = useNavigate();

  const summerEvents = events.filter((e) => e.mode === "summer");
  const winterEvents = events.filter((e) => e.mode === "winter");
  const myPendingCount = events.filter((e) => e.participants?.[profile.uid]?.status === "pending").length;
  const myOpenToJoinCount = summerEvents.filter((e) => isOpenEvent(e) && e.status !== "cancelled" && !e.participants?.[profile.uid]).length;
  const badgeCount = myPendingCount + myOpenToJoinCount;

  const nextOf = (list) => list.find((e) => e.status !== "cancelled");

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 12px) 24px 0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <div className="display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>{team?.name}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Pick a schedule</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", width: 40, height: 40, borderRadius: 999, background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BellIcon style={{ color: "oklch(35% 0.01 260)" }} />
            {badgeCount > 0 && (
              <div style={{ position: "absolute", top: 7, right: 8, width: 8, height: 8, borderRadius: 999, background: "var(--red-solid)", border: "1.5px solid white" }} />
            )}
          </div>
          <Avatar initials={profile.initials} color={profile.color} size={40} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <ScheduleCard
          emoji="☀️"
          title="Summer Schedule"
          subtitle="Open — anyone can propose and accept"
          count={summerEvents.length}
          next={nextOf(summerEvents)}
          onClick={() => navigate("/summer")}
        />
        <ScheduleCard
          emoji="❄️"
          title="Winter Schedule"
          subtitle="Admin assigns players to each slot"
          count={winterEvents.length}
          next={nextOf(winterEvents)}
          onClick={() => navigate("/winter")}
        />
      </div>

      <BottomNav />
    </div>
  );
}

function ScheduleCard({ emoji, title, subtitle, count, next, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--card)",
        border: "var(--border-width, 1px) solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "0 1px 3px oklch(20% 0.02 260 / 0.06)",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>{emoji}</span>
          <div className="display" style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
        </div>
        <ChevronRightIcon style={{ color: "var(--text-faint)" }} />
      </div>
      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{subtitle}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--border-soft)" }}>
        <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>{count} event{count === 1 ? "" : "s"} scheduled</div>
        {next && <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--green-solid)" }}>{next.title}</div>}
      </div>
    </div>
  );
}
