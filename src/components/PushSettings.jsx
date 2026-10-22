import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { Card, SectionLabel, SecondaryButton, PrimaryButton } from "./UI";
import { pushStatus, enablePush, disablePush, notify } from "../lib/push";

const reasons = {
  denied: "Notifications are blocked for this app. Allow them in your phone's Settings → Notifications, then come back.",
  dismissed: "No problem — tap again whenever you're ready.",
  "not-configured": "Notifications aren't switched on for the team yet — the admin needs to finish setup in Netlify.",
  "save-failed": "Couldn't save this phone — check your connection and try again.",
};

// "Phone notifications" card in Settings.
export default function PushSettings() {
  const { profile, team } = useApp();
  const [status, setStatus] = useState("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    pushStatus().then(setStatus).catch(() => setStatus("unsupported"));
  }, []);

  async function turnOn() {
    setBusy(true);
    setMsg("");
    try {
      const res = await enablePush();
      if (res.ok) {
        setStatus("on");
        setMsg("You're set — you'll get game reminders and slot updates on this phone.");
      } else {
        setMsg(reasons[res.reason] || "Couldn't turn notifications on.");
        setStatus(await pushStatus());
      }
    } catch {
      setMsg("Couldn't turn notifications on.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    await disablePush().catch(() => {});
    setStatus("off");
    setMsg("Notifications are off on this phone.");
    setBusy(false);
  }

  function test() {
    notify({ teamId: team?.id, uids: [profile.uid], title: "Test from Mercer Tennis 🎾", body: "Notifications are working on this phone.", url: "/#/" });
    setMsg("Sent — it should pop up in a few seconds (lock the phone or switch apps to see it as a banner).");
  }

  if (status === "loading") return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <SectionLabel>Phone notifications</SectionLabel>
      <Card data-testid="push-card" style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
          Weekend game reminders (Wed & Fri evening), when you're added to a game, when a spot opens or gets taken, and cancellations.
        </div>
        {status === "on" && (
          <>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--green-text)" }}>✓ On for this phone</div>
            <div style={{ display: "flex", gap: 10 }}>
              <SecondaryButton type="button" onClick={test} style={{ flex: 1 }}>Send a test</SecondaryButton>
              <SecondaryButton type="button" onClick={turnOff} disabled={busy} style={{ flex: 1 }}>Turn off</SecondaryButton>
            </div>
          </>
        )}
        {status === "off" && (
          <PrimaryButton data-testid="push-on" type="button" onClick={turnOn} disabled={busy}>
            {busy ? "Turning on…" : "Turn on notifications"}
          </PrimaryButton>
        )}
        {status === "ios-install" && (
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            On iPhone, notifications only work from the installed app: in <b>Safari</b> tap <b>Share</b> → <b>Add to Home Screen</b>, open the app from that icon, then come back here. (Needs iOS 16.4 or newer.)
          </div>
        )}
        {status === "denied" && <div style={{ fontSize: 13 }}>{reasons.denied}</div>}
        {status === "unsupported" && <div style={{ fontSize: 13, color: "var(--text-faint)" }}>This browser can't show notifications. On iPhone use Safari and add the app to your Home Screen; on Android use Chrome.</div>}
        {msg && <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{msg}</div>}
      </Card>
    </div>
  );
}
