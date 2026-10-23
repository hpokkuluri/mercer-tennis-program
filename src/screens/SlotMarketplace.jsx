import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import { Header, Card, PrimaryButton, SectionLabel, HomeButton } from "../components/UI";

export default function SlotMarketplace() {
  const { events, profile, claimSlot } = useApp();
  const navigate = useNavigate();
  const [busyKey, setBusyKey] = useState(null);

  const openings = useMemo(() => {
    const out = [];
    events
      .filter((e) => e.mode === "winter" && e.status !== "cancelled")
      .forEach((e) => {
        Object.values(e.participants || {})
          .filter((p) => p.status === "open")
          .forEach((p) => out.push({ event: e, opener: p }));
      });
    return out.sort((a, b) => a.event.date.localeCompare(b.event.date));
  }, [events]);

  async function claim(eventId, fromUid) {
    setBusyKey(eventId + fromUid);
    try {
      await claimSlot(eventId, fromUid);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Header title="Slot Marketplace" right={<HomeButton />} />

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>
          Can't make a Winter game you're assigned to? Open your spot from the event page — it shows up here for any teammate to claim.
        </div>

        <SectionLabel>Open slots · {openings.length}</SectionLabel>
        {openings.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-faint)", fontSize: 14 }}>
            No open slots right now.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {openings.map(({ event, opener }) => {
            const alreadyIn = Boolean(event.participants?.[profile.uid]);
            const key = event.id + opener.uid;
            return (
              <Card key={key} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={() => navigate(`/event/${event.id}`)} style={{ background: "none", border: "none", textAlign: "left", padding: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>{event.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                    {new Date(event.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {event.startTime} · {event.location}
                  </div>
                </button>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar uid={opener.uid} initials={opener.initials} color={opener.color} size={26} />
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{opener.name.split(" ")[0]}'s slot is open</div>
                  </div>
                  {opener.uid === profile.uid ? (
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)" }}>Waiting for a claim</div>
                  ) : alreadyIn ? (
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)" }}>Already on this one</div>
                  ) : (
                    <PrimaryButton style={{ width: "auto", padding: "10px 18px" }} disabled={busyKey === key} onClick={() => claim(event.id, opener.uid)}>
                      {busyKey === key ? "Claiming…" : "Claim"}
                    </PrimaryButton>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
