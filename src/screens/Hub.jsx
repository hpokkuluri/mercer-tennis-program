import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import BottomNav from "../components/BottomNav";
import { BellIcon, ChevronRightIcon } from "../components/Icons";
import Logo from "../components/Logo";
import NextGameCard from "../components/NextGameCard";
import InstallBanner from "../components/InstallBanner";
import { notOver } from "../lib/gameTime";

export default function Hub() {
  const { team, events, profile, badge, eventsLoaded } = useApp();
  const navigate = useNavigate();

  const summerEvents = events.filter((e) => e.mode === "summer");
  const winterEvents = events.filter((e) => e.mode === "winter");
  const badgeCount = badge;

  const nextOf = (list) =>
    list
      .filter((e) => e.status !== "cancelled" && notOver(e))
      .sort((a, b) => (a.date + (a.startTime || "")).localeCompare(b.date + (b.startTime || "")))[0];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 12px) 24px 0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <Logo size={36} showText={false} />
          <div>
            <div className="display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>{team?.name}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Pick a schedule</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => navigate("/notifications")}
            style={{ position: "relative", width: 40, height: 40, borderRadius: 999, background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <BellIcon style={{ color: "var(--text)" }} />
            {badgeCount > 0 && (
              <div data-testid="bell-count" style={{ position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, background: "var(--red-solid)", color: "white", fontSize: 10.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg)" }}>
                {badgeCount > 99 ? "99+" : badgeCount}
              </div>
            )}
          </button>
          <button onClick={() => navigate("/settings")} style={{ background: "none", border: "none", padding: 0 }} aria-label="Settings">
            <Avatar uid={profile.uid} initials={profile.initials} color={profile.color} size={40} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <InstallBanner />
        {!eventsLoaded ? <SkeletonCard tall /> : <NextGameCard />}
        {!eventsLoaded ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
        <>
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
        </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function SkeletonCard({ tall }) {
  return <div className="skeleton" style={{ height: tall ? 170 : 128, borderRadius: "var(--radius-lg)" }} />;
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
