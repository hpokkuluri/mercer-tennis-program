import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import BottomNav from "../components/BottomNav";
import { SectionLabel, Card } from "../components/UI";
import { GearIcon, TrashIcon, MailIcon } from "../components/Icons";
import { sendInviteEmail } from "../lib/email";

export default function Team() {
  const { team, profile, isAdmin, setAdmin, removeMember, inviteMemberByEmail, subscribeAnnouncements, postAnnouncement } = useApp();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [text, setText] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteNotice, setInviteNotice] = useState("");
  const [removeError, setRemoveError] = useState("");

  useEffect(() => subscribeAnnouncements(setAnnouncements), [team?.id]);

  const members = Object.values(team?.members || {}).sort((a, b) => (b.isAdmin ? 1 : 0) - (a.isAdmin ? 1 : 0));

  async function submitAnnouncement(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await postAnnouncement(text.trim());
    setText("");
  }

  async function submitInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteBusy(true);
    setInviteNotice("");
    try {
      const target = inviteEmail.trim();
      const result = await inviteMemberByEmail(target);
      let notice = result.status === "added" ? `${result.name} was added to the team.` : "Invite saved — they'll join automatically when they sign up with that email.";
      const emailResult = await sendInviteEmail({
        toEmail: target,
        toName: result.name,
        teamName: team?.name,
        invitedByName: profile.name,
        appUrl: window.location.origin,
      }).catch(() => ({ sent: false }));
      notice += emailResult.sent ? " Emailed them too." : " (Email delivery isn't set up yet — tell them yourself for now.)";
      setInviteNotice(notice);
      setInviteEmail("");
    } catch (err) {
      setInviteNotice(err.message || "Couldn't send that invite.");
    } finally {
      setInviteBusy(false);
    }
  }

  async function remove(uid) {
    setRemoveError("");
    try {
      await removeMember(uid);
    } catch (err) {
      setRemoveError(err.message || "Couldn't remove them — make sure the latest Firestore rules are published.");
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 12px) 24px 4px 24px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="display" style={{ fontSize: 20, fontWeight: 700 }}>{team?.name}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Code: {team?.code}</div>
        </div>
        <button
          onClick={() => navigate("/settings")}
          style={{ width: 36, height: 36, borderRadius: 999, background: "var(--card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          <GearIcon style={{ color: "var(--text)" }} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px 24px", display: "flex", flexDirection: "column", gap: 22 }}>
        {isAdmin && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <SectionLabel>Invite by email</SectionLabel>
            <form onSubmit={submitInvite} style={{ display: "flex", gap: 8 }}>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@example.com"
                style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", fontSize: 13.5, outline: "none", background: "var(--card)" }}
              />
              <button type="submit" disabled={inviteBusy} className="display" style={{ border: "none", background: "var(--accent)", color: "var(--accent-text)", borderRadius: 12, padding: "0 16px", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <MailIcon /> {inviteBusy ? "…" : "Invite"}
              </button>
            </form>
            {inviteNotice && <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{inviteNotice}</div>}
            <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
              If they don't have an account yet, tell them to sign up with this email — they'll land straight on the team.
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SectionLabel>Roster · {members.length}</SectionLabel>
          {removeError && <div style={{ fontSize: 12.5, color: "var(--red-text)" }}>{removeError}</div>}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
            {members.map((m, i) => (
              <div key={m.uid} data-testid="member-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: i < members.length - 1 ? "1px solid var(--border-soft)" : "none" }}>
                <Avatar initials={m.initials} color={m.color} size={34} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}{m.uid === profile.uid ? " (you)" : ""}</div>
                  {m.isAdmin && <div style={{ fontSize: 11, fontWeight: 700, color: "var(--green-solid)" }}>Admin</div>}
                </div>
                {m.uid !== profile.uid && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => navigate(`/messages/${m.uid}`)} style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", background: "oklch(95% 0.006 90)", border: "none", borderRadius: 8, padding: "6px 10px" }}>
                      Message
                    </button>
                    {isAdmin && (
                      <button onClick={() => setAdmin(m.uid, !m.isAdmin)} style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", background: "oklch(95% 0.006 90)", border: "none", borderRadius: 8, padding: "6px 10px" }}>
                        {m.isAdmin ? "Demote" : "Make admin"}
                      </button>
                    )}
                    {isAdmin && (
                      <button data-testid="remove-btn" onClick={() => remove(m.uid)} style={{ fontSize: 12, fontWeight: 700, color: "var(--red-text)", background: "var(--red-bg)", border: "none", borderRadius: 8, padding: "6px 8px", display: "flex", alignItems: "center" }}>
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SectionLabel>Announcements</SectionLabel>
          <form onSubmit={submitAnnouncement} style={{ display: "flex", gap: 8 }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Post an update to the team…"
              style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", fontSize: 13.5, outline: "none", background: "var(--card)" }}
            />
            <button type="submit" className="display" style={{ border: "none", background: "var(--accent)", color: "var(--accent-text)", borderRadius: 12, padding: "0 16px", fontWeight: 700, fontSize: 13 }}>
              Post
            </button>
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {announcements.length === 0 && <div style={{ fontSize: 13, color: "var(--text-faint)" }}>No announcements yet.</div>}
            {announcements.map((a) => (
              <Card key={a.id} style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{a.authorName}</div>
                <div style={{ fontSize: 13.5, marginTop: 3 }}>{a.text}</div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
