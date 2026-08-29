import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import BottomNav from "../components/BottomNav";
import { SectionLabel } from "../components/UI";

export default function Messages() {
  const { team, profile, subscribeConversations } = useApp();
  const navigate = useNavigate();
  const [convos, setConvos] = useState([]);

  useEffect(() => subscribeConversations(setConvos), [team?.id]);

  const members = Object.values(team?.members || {}).filter((m) => m.uid !== profile.uid);
  const convoOtherUid = (c) => c.participants.find((p) => p !== profile.uid);
  const memberById = Object.fromEntries(members.map((m) => [m.uid, m]));
  const talked = new Set(convos.map(convoOtherUid));
  const untouched = members.filter((m) => !talked.has(m.uid));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 12px) 24px 4px 24px", flexShrink: 0 }}>
        <div className="display" style={{ fontSize: 20, fontWeight: 700 }}>Messages</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        {convos.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <SectionLabel>Recent</SectionLabel>
            <div style={{ background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              {convos.map((c, i) => {
                const other = memberById[convoOtherUid(c)];
                if (!other) return null;
                return (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/messages/${other.uid}`)}
                    style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "none", background: "none", borderBottom: i < convos.length - 1 ? "1px solid var(--border-soft)" : "none" }}
                  >
                    <Avatar initials={other.initials} color={other.color} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{other.name}</div>
                      <div style={{ fontSize: 12.5, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.lastMessage}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SectionLabel>{convos.length > 0 ? "Start a new chat" : "Teammates"}</SectionLabel>
          {untouched.length === 0 && convos.length === 0 && <div style={{ fontSize: 13, color: "var(--text-faint)" }}>No teammates yet.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {untouched.map((m) => (
              <button
                key={m.uid}
                onClick={() => navigate(`/messages/${m.uid}`)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--card)" }}
              >
                <Avatar initials={m.initials} color={m.color} size={34} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
