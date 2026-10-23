import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Header, Card, SectionLabel, HomeButton } from "../components/UI";
import { ChevronRightIcon } from "../components/Icons";
import { todayStr } from "../lib/notifications";
import { allTeamConflicts } from "../lib/vacations";
import { computeSplit, money } from "../lib/payments";
import SeasonEmailButton from "../components/SeasonEmailButton";

const when = (e) => `${new Date(e.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}${e.startTime ? ` ${e.startTime}` : ""}`;

function Section({ title, count, tone = "neutral", children, testid }) {
  const colors = { ok: "var(--green-text)", warn: "var(--amber-text)", neutral: "var(--text-muted)" };
  return (
    <div data-testid={testid} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <SectionLabel>{title}</SectionLabel>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: colors[tone] }}>{count}</span>
      </div>
      {children}
    </div>
  );
}

// Admin: everything that needs a nudge, on one screen.
export default function AdminDashboard() {
  const { team, events, isAdmin } = useApp();
  const navigate = useNavigate();
  const today = todayStr();
  const in7 = (() => {
    const d = new Date(today + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + 7);
    return d.toISOString().slice(0, 10);
  })();
  const members = team?.members || {};
  const winter = useMemo(() => events.filter((e) => e.mode === "winter" && e.status !== "cancelled" && e.date >= today).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)), [events, today]);
  const week = winter.filter((e) => e.date <= in7);
  const notReady = week.filter((e) => Object.values(e.participants || {}).some((p) => p.status !== "accepted"));
  const openSpots = winter.flatMap((e) => Object.values(e.participants || {}).filter((p) => p.status === "open").map((p) => ({ e, p })));
  const pendingBy = {};
  winter.forEach((e) => Object.values(e.participants || {}).forEach((p) => p.status === "pending" && (pendingBy[p.uid] = (pendingBy[p.uid] || 0) + 1)));
  const conflicts = allTeamConflicts(team, events).filter((c) => c.event.date >= today);
  const pay = team?.payments && team.payments.courts?.some((c) => Number(c.amount) > 0) ? computeSplit(team.payments, events, members) : null;
  const owing = pay ? pay.players.filter((p) => p.due > 0).sort((a, b) => b.due - a.due) : [];
  const claims = pay ? pay.courts.flatMap((c) => c.rows.filter((r) => r.claimed).map((r) => ({ c, r }))) : [];
  const list = Object.values(members);
  const noLogin = list.filter((m) => m.placeholder);
  const noEmail = list.filter((m) => !m.email);

  if (!isAdmin) return <div style={{ padding: 24 }}>Admins only.</div>;

  const row = (key, left, right, onClick) => (
    <button key={key} type="button" onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: "none", border: "none", padding: "8px 0", borderBottom: "1px solid var(--border-soft)" }}>
      <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{left}</div>
      {right && <div style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{right}</div>}
      {onClick && <ChevronRightIcon style={{ color: "var(--text-faint)", flexShrink: 0 }} />}
    </button>
  );
  const empty = (t) => <div style={{ fontSize: 12.5, color: "var(--green-text)", fontWeight: 600 }}>✓ {t}</div>;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Header title="Admin Dashboard" right={<HomeButton />} />
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            ["Games this week", week.length],
            ["Need attention", notReady.length + openSpots.length + conflicts.length],
            ["Owed to payers", pay ? money(pay.totalOutstanding) : "—"],
          ].map(([l, v]) => (
            <div key={l} style={{ flex: 1, background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 6px", textAlign: "center" }}>
              <div className="display" style={{ fontSize: 17, fontWeight: 800 }}>{v}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        <Section testid="dash-email" title="Season schedule email" count="">
          <Card style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Each player gets one email listing all of their upcoming Winter games, who they play with, and how to open a spot.</div>
            <SeasonEmailButton />
          </Card>
        </Section>

        <Section testid="dash-week" title="Next 7 days — not fully confirmed" count={notReady.length} tone={notReady.length ? "warn" : "ok"}>
          <Card style={{ padding: "4px 14px" }}>
            {notReady.length === 0
              ? <div style={{ padding: "8px 0" }}>{empty(week.length ? "Every spot this week is confirmed" : "No games in the next 7 days")}</div>
              : notReady.map((e) => {
                  const ps = Object.values(e.participants || {});
                  const waiting = ps.filter((p) => p.status !== "accepted").map((p) => `${p.name.split(" ")[0]} (${p.status})`);
                  return row(e.id, <><b>{when(e)}</b> · {e.title}<div style={{ fontSize: 11.5, color: "var(--amber-text)" }}>{waiting.join(", ")}</div></>, `${ps.filter((p) => p.status === "accepted").length}/${ps.length}`, () => navigate(`/event/${e.id}`));
                })}
          </Card>
        </Section>

        <Section testid="dash-open" title="Open spots" count={openSpots.length} tone={openSpots.length ? "warn" : "ok"}>
          <Card style={{ padding: "4px 14px" }}>
            {openSpots.length === 0 ? <div style={{ padding: "8px 0" }}>{empty("No open spots")}</div> : openSpots.map(({ e, p }) => row(e.id + p.uid, <><b>{when(e)}</b> · {e.title}<div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{p.name}'s spot</div></>, null, () => navigate(`/event/${e.id}`)))}
          </Card>
        </Section>

        <Section testid="dash-pending" title="Still to confirm (upcoming games)" count={Object.keys(pendingBy).length} tone={Object.keys(pendingBy).length ? "warn" : "ok"}>
          <Card style={{ padding: "4px 14px" }}>
            {Object.keys(pendingBy).length === 0
              ? <div style={{ padding: "8px 0" }}>{empty("Everyone has confirmed")}</div>
              : Object.entries(pendingBy).sort((a, b) => b[1] - a[1]).map(([uid, n]) => row(uid, members[uid]?.name || uid, `${n} game${n === 1 ? "" : "s"}${members[uid]?.placeholder ? " · no login" : ""}`))}
          </Card>
        </Section>

        <Section testid="dash-vac" title="Vacation conflicts" count={conflicts.length} tone={conflicts.length ? "warn" : "ok"}>
          <Card style={{ padding: "4px 14px" }}>
            {conflicts.length === 0 ? <div style={{ padding: "8px 0" }}>{empty("No one is booked on a vacation day")}</div> : conflicts.map((c) => row(c.member.uid + c.event.id, <><b>{c.member.name}</b> on vacation</>, when(c.event), () => navigate(`/event/${c.event.id}`)))}
          </Card>
        </Section>

        <Section testid="dash-pay" title="Payments" count={pay ? `${owing.length} owe` : "not set up"} tone={owing.length ? "warn" : "ok"}>
          <Card style={{ padding: "4px 14px" }}>
            {!pay ? row("setup", "Set up court payments", null, () => navigate("/payments")) : (
              <>
                {claims.length > 0 && row("claims", <b>{claims.length} payment{claims.length === 1 ? "" : "s"} to confirm</b>, null, () => navigate("/payments"))}
                {owing.length === 0 ? <div style={{ padding: "8px 0" }}>{empty("Everyone has paid")}</div> : owing.slice(0, 8).map((p) => row(p.uid, p.name, money(p.due), () => navigate("/payments")))}
                {owing.length > 8 && <div style={{ fontSize: 12, color: "var(--text-faint)", padding: "6px 0" }}>+{owing.length - 8} more</div>}
              </>
            )}
          </Card>
        </Section>

        <Section testid="dash-roster" title="Roster" count={`${list.length} players`}>
          <Card style={{ padding: "4px 14px" }}>
            {(() => {
              const sq = (x) => String(x || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              const real = list.filter((m) => !m.placeholder);
              const dups = noLogin.filter((ph) => real.some((a) => sq(a.name.split(/\s+/)[0]) === sq(ph.name.split(/\s+/)[0])));
              return dups.length
                ? row("dups", <b style={{ color: "var(--amber-text)" }}>Signed up but still a no-login entry too — link them</b>, dups.map((m) => m.name).join(", "), () => navigate("/team"))
                : null;
            })()}
            {row("nologin", "Haven't signed up yet", noLogin.length ? noLogin.map((m) => m.name.split(" ")[0]).join(", ") : "none", () => navigate("/team"))}
            {row("noemail", "No email on file (no emails or reminders)", noEmail.length ? noEmail.map((m) => m.name.split(" ")[0]).join(", ") : "none", () => navigate("/team"))}
          </Card>
        </Section>
      </div>
    </div>
  );
}
