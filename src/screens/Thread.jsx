import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import { Header, HomeButton } from "../components/UI";
import { SendIcon } from "../components/Icons";

export default function Thread() {
  const { uid } = useParams();
  const { team, profile, subscribeThread, sendDM } = useApp();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const endRef = useRef(null);
  const other = team?.members?.[uid];

  useEffect(() => subscribeThread(uid, setMessages), [uid]);
  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [messages.length]);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim() || !other) return;
    await sendDM(other, text.trim());
    setText("");
  }

  if (!other) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header title="Message" onBack={() => history.back()} />
        <div style={{ padding: 24, color: "var(--text-faint)", fontSize: 14 }}>Couldn't find that teammate.</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Header
        title={other.name}
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar uid={other.uid} initials={other.initials} color={other.color} size={30} />
            <HomeButton />
          </div>
        }
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 13, padding: "40px 0" }}>
            Say hi to {other.name.split(" ")[0]} 👋
          </div>
        )}
        {messages.map((m) => {
          const mine = m.fromUid === profile.uid;
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  maxWidth: "78%",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-lg)",
                  borderBottomRightRadius: mine ? 4 : 16,
                  borderBottomLeftRadius: mine ? 16 : 4,
                  background: mine ? "var(--accent)" : "white",
                  border: mine ? "none" : "var(--border-width, 1px) solid var(--border)",
                  color: mine ? "var(--accent-text)" : "var(--text)",
                  fontSize: 14,
                }}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} style={{ flexShrink: 0, padding: "10px 16px 24px 16px", display: "flex", gap: 10, background: "var(--bg)" }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          style={{ flex: 1, border: "var(--border-width, 1px) solid var(--border)", borderRadius: 999, padding: "12px 16px", fontSize: 14, outline: "none", background: "var(--card)" }}
        />
        <button type="submit" style={{ width: 44, height: 44, borderRadius: 999, border: "none", background: "var(--accent)", color: "var(--accent-text)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <SendIcon />
        </button>
      </form>
    </div>
  );
}
