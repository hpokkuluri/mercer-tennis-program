import { useNavigate, useLocation } from "react-router-dom";
import { ScheduleTabIcon, TeamTabIcon, ChatIcon } from "./Icons";

const TABS = [
  { path: "/", label: "Schedule", Icon: ScheduleTabIcon },
  { path: "/team", label: "Team", Icon: TeamTabIcon },
  { path: "/messages", label: "Messages", Icon: ChatIcon },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      style={{
        flexShrink: 0,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "var(--card)",
        borderTop: "var(--border-width, 1px) solid var(--border)",
        display: "flex",
        position: "sticky",
        bottom: 0,
      }}
    >
      {TABS.map(({ path, label, Icon }) => {
        const active =
          path === "/"
            ? location.pathname === "/" || location.pathname === "/summer" || location.pathname === "/winter"
            : location.pathname === path;
        return (
          <button
            key={path}
            data-testid={`nav-${label.toLowerCase()}`}
            onClick={() => navigate(path)}
            style={{
              flex: 1,
              border: "none",
              background: "none",
              padding: "10px 0 8px 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              color: active ? "var(--green-solid)" : "var(--text-faint)",
            }}
          >
            <Icon />
            <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
