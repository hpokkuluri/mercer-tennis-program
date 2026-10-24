import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { Header, Card, SectionLabel, PrimaryButton, SecondaryButton, HomeButton, Badge } from "../components/UI";
import { CheckIcon, PlusIcon, TrashIcon, WarningIcon } from "../components/Icons";
import { computeSplit, defaultPayments, money, round2, parsePaymentSheet, applyPaymentSheet } from "../lib/payments";
import { venmoLinks, paypalLink, appleCashLink, openVenmo, isIOS } from "../lib/payLinks";

const input = {
  width: "100%",
  minWidth: 0,
  border: "var(--border-width, 1px) solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "9px 10px",
  fontSize: 13.5,
  outline: "none",
  background: "var(--card)",
  boxSizing: "border-box",
};

const chip = {
  fontSize: 12,
  fontWeight: 700,
  padding: "6px 11px",
  borderRadius: 999,
  border: "var(--border-width, 1px) solid var(--border)",
  background: "var(--card)",
  color: "var(--text)",
};

function Small({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 4 }}>{children}</div>;
}

function ReceivedToggle({ on, disabled, onClick, testid }) {
  return (
    <button
      type="button"
      data-testid={testid}
      onClick={onClick}
      disabled={disabled}
      title={on ? "Received" : "Not received yet"}
      style={{
        width: 26,
        height: 26,
        borderRadius: 999,
        flexShrink: 0,
        border: on ? "none" : "1.5px solid var(--border)",
        background: on ? "var(--green-solid)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled && !on ? 0.5 : 1,
      }}
    >
      {on && <CheckIcon width={13} height={13} style={{ color: "white" }} />}
    </button>
  );
}

// Admin-only editor for the season's court costs.
function Setup({ initial, members, slotTitles, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(initial)));
  const [saving, setSaving] = useState(false);
  const memberNames = Object.values(members).map((m) => m.name).sort();

  const setCourt = (i, patch) => setDraft((d) => ({ ...d, courts: d.courts.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }));
  const addCourt = () =>
    setDraft((d) => ({
      ...d,
      courts: [...d.courts, { id: `c${Date.now().toString(36)}`, label: `Court ${d.courts.length + 1}`, slotTitle: "", payerName: "", payerUid: "", amount: "", phone: "" }],
    }));
  const removeCourt = (i) => setDraft((d) => ({ ...d, courts: d.courts.filter((_, idx) => idx !== i) }));

  async function save() {
    setSaving(true);
    const byName = new Map(Object.values(members).map((m) => [m.name.trim().toLowerCase(), m.uid]));
    const clean = {
      ...draft,
      totalWeeks: Number(draft.totalWeeks) || 0,
      playersPerGame: Number(draft.playersPerGame) || 4,
      courts: draft.courts.map((c) => ({
        ...c,
        amount: round2(String(c.amount).replace(/[$,\s]/g, "")),
        payerName: (c.payerName || "").trim(),
        payerUid: byName.get((c.payerName || "").trim().toLowerCase()) || "",
        phone: (c.phone || "").trim(),
        venmo: (c.venmo || "").trim().replace(/^@/, ""),
        paypal: (c.paypal || "").trim(),
      })),
    };
    await onSave(clean);
    setSaving(false);
  }

  const titles = [...new Set([...slotTitles, ...draft.courts.map((c) => c.slotTitle).filter(Boolean)])];

  return (
    <Card data-testid="pay-setup" style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Small>Total weeks</Small>
          <input data-testid="pay-weeks" type="number" inputMode="numeric" value={draft.totalWeeks} onChange={(e) => setDraft({ ...draft, totalWeeks: e.target.value })} style={input} />
        </div>
        <div style={{ flex: 1 }}>
          <Small>Players per game</Small>
          <input type="number" inputMode="numeric" value={draft.playersPerGame} onChange={(e) => setDraft({ ...draft, playersPerGame: e.target.value })} style={input} />
        </div>
      </div>

      <datalist id="pay-member-names">
        {memberNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {draft.courts.map((c, i) => (
        <div key={c.id} data-testid="pay-court-edit" style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px", borderRadius: "var(--radius-md)", background: "var(--bg, oklch(97% 0.005 90))", border: "var(--border-width, 1px) solid var(--border-soft, var(--border))" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ width: 80 }}>
              <Small>Court</Small>
              <input value={c.label} onChange={(e) => setCourt(i, { label: e.target.value })} style={input} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Small>Games on schedule</Small>
              <select value={c.slotTitle} onChange={(e) => setCourt(i, { slotTitle: e.target.value })} style={input}>
                <option value="">— pick a slot —</option>
                {titles.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {draft.courts.length > 1 && (
              <button type="button" onClick={() => removeCourt(i)} title="Remove court" style={{ border: "none", background: "var(--red-bg)", color: "var(--red-text)", borderRadius: "var(--radius-sm)", height: 38, width: 38, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <TrashIcon />
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1.2, minWidth: 0 }}>
              <Small>Paid by</Small>
              <input data-testid="pay-payer" list="pay-member-names" value={c.payerName} onChange={(e) => setCourt(i, { payerName: e.target.value })} placeholder="Name" style={input} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Small>Amount paid</Small>
              <input data-testid="pay-amount" inputMode="decimal" value={c.amount} onChange={(e) => setCourt(i, { amount: e.target.value })} placeholder="$0.00" style={input} />
            </div>
          </div>
          <div>
            <Small>Zelle / phone (also used for Apple Pay)</Small>
            <input data-testid="pay-phone" inputMode="tel" value={c.phone} onChange={(e) => setCourt(i, { phone: e.target.value })} placeholder="732 555 0100" style={input} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Small>Venmo username (optional)</Small>
              <input data-testid="pay-venmo" value={c.venmo || ""} onChange={(e) => setCourt(i, { venmo: e.target.value })} placeholder="@alladi-r" style={input} autoCapitalize="none" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Small>PayPal.Me name (optional)</Small>
              <input data-testid="pay-paypal" value={c.paypal || ""} onChange={(e) => setCourt(i, { paypal: e.target.value })} placeholder="alladir" style={input} autoCapitalize="none" />
            </div>
          </div>
        </div>
      ))}

      <SecondaryButton type="button" onClick={addCourt} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <PlusIcon /> Add court / member
      </SecondaryButton>
      <div style={{ display: "flex", gap: 10 }}>
        {onCancel && (
          <SecondaryButton type="button" onClick={onCancel} style={{ flex: 1 }}>
            Cancel
          </SecondaryButton>
        )}
        <PrimaryButton type="button" onClick={save} disabled={saving} style={{ flex: 2 }}>
          {saving ? "Saving…" : "Save & split"}
        </PrimaryButton>
      </div>
    </Card>
  );
}

// Admin: take game counts, payer, Zelle and amount straight from the
// payment sheet (Excel file or a shared Google Sheet link).
function SheetLoader({ payments, members, onApply }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState(null);
  const [link, setLink] = useState("");

  async function readAoa(sheets) {
    for (const aoa of sheets) {
      const parsed = parsePaymentSheet(aoa);
      if (parsed) return parsed;
    }
    return null;
  }
  function show(parsed) {
    if (!parsed) {
      setPreview(null);
      return setMsg('Couldn\'t find the payment table — it needs a row of player names, then rows like "SAT | Games | 9 | 9 …".');
    }
    setMsg("");
    setPreview({ parsed, ...applyPaymentSheet(payments, parsed, members) });
  }
  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      show(await readAoa(wb.SheetNames.map((n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: "", raw: false }))));
    } catch {
      setMsg("Couldn't read that file — use the .xlsx (Google Sheets: File → Download → Microsoft Excel).");
    } finally {
      setBusy(false);
    }
  }
  async function onLink() {
    if (!link.trim()) return;
    setBusy(true);
    try {
      const [{ fetchGoogleSheetCsv }, XLSX] = await Promise.all([import("../lib/scheduleImport"), import("xlsx")]);
      const res = await fetchGoogleSheetCsv(link.trim());
      if (!res.ok) return setMsg('Couldn\'t open that sheet. Share it as "Anyone with the link → Viewer", and copy the link while the payment tab is open.');
      const wb = XLSX.read(res.csv, { type: "string" });
      show(await readAoa([XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "", raw: false })]));
    } catch {
      setMsg("Couldn't open that sheet — try the Excel file instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card data-testid="sheet-loader" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>Load from your payment sheet</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Uses the sheet's game counts per player (instead of counting the schedule), plus each court's payer, Zelle number and amount.</div>
      <label style={{ display: "block" }}>
        <input data-testid="sheet-file" type="file" accept=".xlsx,.xls,.csv" onChange={onFile} style={{ display: "none" }} />
        <span style={{ display: "block", textAlign: "center", padding: "10px", borderRadius: "var(--radius-md)", border: "var(--border-width, 1px) solid var(--border)", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>{busy ? "Reading…" : "Choose Excel file"}</span>
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="…or paste a Google Sheet link" style={input} />
        <SecondaryButton type="button" onClick={onLink} disabled={busy} style={{ width: 80 }}>Fetch</SecondaryButton>
      </div>
      {msg && <div style={{ fontSize: 12.5, color: "var(--amber-text)" }}>{msg}</div>}
      {preview && (
        <div data-testid="sheet-preview" style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 6, borderTop: "1px solid var(--border-soft, var(--border))" }}>
          {preview.parsed.courts.map((c) => (
            <div key={c.label} style={{ fontSize: 12.5 }}>
              <b>{c.label}</b>: {Object.values(c.counts).reduce((a, b) => a + b, 0)} player-games · paid by {c.payerName || "—"}
              {c.amount ? ` · ${money(c.amount)}` : ""}
              {c.phone ? ` · ${c.phone}` : ""}
            </div>
          ))}
          {preview.unmatched.length > 0 && (
            <div style={{ display: "flex", gap: 5, fontSize: 12, color: "var(--amber-text)" }}>
              <WarningIcon width={12} height={12} style={{ flexShrink: 0, marginTop: 2 }} />
              Not on the roster, skipped: {preview.unmatched.join(", ")}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <SecondaryButton type="button" onClick={() => setPreview(null)} style={{ flex: 1 }}>Cancel</SecondaryButton>
            <PrimaryButton data-testid="sheet-apply" type="button" onClick={async () => { await onApply(preview.payments); setPreview(null); setMsg("Loaded — counts and payers now follow your sheet."); }} style={{ flex: 2 }}>
              Use these numbers
            </PrimaryButton>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Payments() {
  const { team, events, profile, isAdmin, setPayments, claimPaid, setReceived } = useApp();
  const [copied, setCopied] = useState("");
  // iPhone home-screen apps sometimes refuse navigator.clipboard silently,
  // so fall back to the old select-and-copy trick and only say "Copied"
  // once something actually landed on the clipboard.
  const copy = async (key, text) => {
    const legacy = () => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
      document.body.appendChild(ta);
      ta.focus();
      ta.setSelectionRange(0, text.length);
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      ta.remove();
      return ok;
    };
    let ok = legacy();
    if (!ok && navigator.clipboard?.writeText) {
      ok = await navigator.clipboard.writeText(text).then(() => true, () => false);
    }
    setCopied(ok ? key : `fail:${key}`);
    setTimeout(() => setCopied(""), ok ? 1500 : 4000);
  };
  const members = team?.members || {};
  const stored = team?.payments;
  const payments = stored || defaultPayments();
  const configured = Boolean(stored) && payments.courts.some((c) => Number(c.amount) > 0);

  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState("players");
  const [editCounts, setEditCounts] = useState(false);

  const split = useMemo(() => computeSplit(payments, events, members), [payments, events, members]);
  const slotTitles = useMemo(
    () => [...new Set(events.filter((e) => e.mode === "winter" && e.status !== "cancelled").map((e) => e.title))].sort(),
    [events]
  );
  const me = split.players.find((p) => p.uid === profile.uid);

  const save = async (next) => {
    await setPayments(next);
    setEditing(false);
  };
  const toggleReceived = (courtId, uid) => setReceived(courtId, uid, !payments.received?.[courtId]?.[uid]);
  // Claims waiting on me (as the court's payer) or on any admin.
  const toConfirm = split.courts.flatMap((c) =>
    isAdmin || (c.payerUid && c.payerUid === profile.uid) ? c.rows.filter((r) => r.claimed).map((r) => ({ court: c, row: r })) : []
  );
  const setOverride = (courtId, uid, value, scheduled) => {
    const overrides = { ...(payments.overrides || {}) };
    overrides[courtId] = { ...(overrides[courtId] || {}) };
    if (value === "" || Number(value) === scheduled) delete overrides[courtId][uid];
    else overrides[courtId][uid] = Math.max(0, Math.round(Number(value)));
    setPayments({ ...payments, overrides });
  };

  const tabBtn = (key, label) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      style={{ flex: 1, border: "none", padding: "9px 0", borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: 13, background: tab === key ? "var(--accent)" : "transparent", color: tab === key ? "var(--accent-text)" : "var(--text-muted)" }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Header title="Payments" right={<HomeButton />} />
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 24px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
        {(!configured || editing) && isAdmin && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <SectionLabel>Season setup</SectionLabel>
            {!configured && (
              <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                Enter what each member paid for their court. Each court's cost is split across the players by how many games they have on that court's slot in the Winter schedule.
              </div>
            )}
            <Setup initial={payments} members={members} slotTitles={slotTitles} onSave={save} onCancel={configured ? () => setEditing(false) : null} />
            {!configured && <SheetLoader payments={payments} members={members} onApply={setPayments} />}
          </div>
        )}

        {!configured && !isAdmin && <div style={{ fontSize: 13.5, color: "var(--text-faint)" }}>Your admin hasn't set up this season's court payments yet.</div>}

        {configured && (
          <>
            {toConfirm.length > 0 && (
              <Card data-testid="pay-confirm" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, borderColor: "var(--amber-text)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>💸 Payments to confirm</div>
                {toConfirm.map(({ court, row }) => (
                  <div key={court.id + row.uid} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b>{row.name}</b> says they paid {court.payerUid === profile.uid ? "you" : court.payerName} <b>{money(row.owes)}</b> · {court.label}
                    </div>
                    <button type="button" data-testid={`confirm-${court.id}-${row.name}`} onClick={() => setReceived(court.id, row.uid, true)} className="display" style={{ border: "none", borderRadius: 999, padding: "6px 12px", fontWeight: 700, fontSize: 12.5, background: "var(--accent)", color: "var(--accent-text)" }}>
                      Got it
                    </button>
                  </div>
                ))}
              </Card>
            )}

            {me ? (
              <Card data-testid="pay-mine" style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <div className="display" style={{ fontSize: 16, fontWeight: 700 }}>Your share</div>
                  <div className="display" style={{ fontSize: 22, fontWeight: 800, color: me.due > 0 ? "var(--text)" : "var(--green-text)" }}>{me.due > 0 ? money(me.due) : "Paid up"}</div>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: -6 }}>
                  {me.games} games this season · {money(me.total)} total
                </div>
                {me.lines.map((l) => (
                  <div key={l.courtId} style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 10, borderTop: "1px solid var(--border-soft, var(--border))" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                        {l.self ? `${l.label} — your own court` : `Pay ${l.payerName || "—"} ${money(l.owes)}`}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {l.label} · {l.games} game{l.games === 1 ? "" : "s"}
                        {!l.self && l.phone ? (
                          <>
                            {" · Zelle "}
                            <a href={`tel:${l.phone.replace(/[^\d+]/g, "")}`} style={{ color: "var(--text)", fontWeight: 700 }}>{l.phone}</a>
                          </>
                        ) : null}
                      </div>
                    </div>
                    {l.received ? <Badge tone="green">{l.self ? "Covered" : "Received"}</Badge> : l.claimed ? <Badge tone="neutral">Sent</Badge> : <Badge tone="amber">Due</Badge>}
                  </div>
                  {!l.received && !l.self && (() => {
                    const note = `${team?.name || "Tennis"} — ${l.label} court share`;
                    const v = venmoLinks({ username: l.venmo, amount: l.owes, note });
                    const pp = paypalLink({ name: l.paypal, amount: l.owes });
                    const ac = isIOS() ? appleCashLink({ phone: l.phone, amount: l.owes, note }) : null;
                    if (!v && !pp && !ac) return null;
                    return (
                      <div data-testid={`pay-apps-${l.courtId}`} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {v && (
                          <button type="button" data-testid={`venmo-${l.courtId}`} onClick={() => openVenmo(v)} style={{ ...chip, background: "#008CFF", color: "white", border: "none" }}>
                            Venmo {money(l.owes)}
                          </button>
                        )}
                        {pp && (
                          <a href={pp} target="_blank" rel="noreferrer" data-testid={`paypal-${l.courtId}`} style={{ ...chip, textDecoration: "none", background: "#003087", color: "white", border: "none" }}>
                            PayPal {money(l.owes)}
                          </a>
                        )}
                        {ac && (
                          <a href={ac} data-testid={`applecash-${l.courtId}`} style={{ ...chip, textDecoration: "none", background: "#000", color: "white", border: "none" }}>
                            Apple Pay {money(l.owes)}
                          </a>
                        )}
                      </div>
                    );
                  })()}
                  {!l.received && !l.self && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: -2 }}>
                      {l.phone && (
                        <button type="button" onClick={() => copy(`p${l.courtId}`, l.phone.replace(/[^\d+]/g, ""))} style={chip}>
                          {copied === `p${l.courtId}` ? "Copied ✓" : copied === `fail:p${l.courtId}` ? `Copy blocked — ${l.phone.replace(/[^\d+]/g, "")}` : "Copy Zelle #"}
                        </button>
                      )}
                      <button type="button" onClick={() => copy(`a${l.courtId}`, l.owes.toFixed(2))} style={chip}>
                        {copied === `a${l.courtId}` ? "Copied ✓" : copied === `fail:a${l.courtId}` ? `Copy blocked — ${l.owes.toFixed(2)}` : `Copy ${money(l.owes)}`}
                      </button>
                      {l.claimed ? (
                        <span style={{ fontSize: 12, color: "var(--text-muted)", alignSelf: "center" }}>
                          Waiting for {l.payerName || "the payer"} to confirm ·{" "}
                          <button type="button" onClick={() => claimPaid(l.court, money(l.owes), false)} style={{ border: "none", background: "none", padding: 0, textDecoration: "underline", color: "var(--text-muted)", fontSize: 12 }}>undo</button>
                        </span>
                      ) : (
                        <button type="button" data-testid={`ive-paid-${l.courtId}`} onClick={() => claimPaid(l.court, money(l.owes), true)} style={{ ...chip, background: "var(--accent)", color: "var(--accent-text)", border: "none" }}>
                          I've paid
                        </button>
                      )}
                    </div>
                  )}
                  </div>
                ))}
              </Card>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text-faint)" }}>You're not on any Winter games, so you don't owe anything.</div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              {[
                ["Paid for courts", split.totalPaid],
                ["Split across players", split.totalReceivable],
                ["Still outstanding", split.totalOutstanding],
              ].map(([label, v]) => (
                <div key={label} style={{ flex: 1, background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 6px", textAlign: "center" }}>
                  <div className="display" style={{ fontSize: 15, fontWeight: 800 }}>{money(v)}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)" }}>
              {tabBtn("players", "By player")}
              {tabBtn("courts", "By court")}
            </div>

            {tab === "players" && (
              <div data-testid="pay-players" style={{ background: "var(--card)", border: "var(--border-width, 1px) solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                <div style={{ display: "flex", padding: "9px 12px", fontSize: 10.5, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", borderBottom: "1px solid var(--border-soft, var(--border))" }}>
                  <div style={{ flex: 1 }}>Player</div>
                  {split.courts.map((c) => (
                    <div key={c.id} style={{ width: 52, textAlign: "right" }}>{c.label}</div>
                  ))}
                  <div style={{ width: 64, textAlign: "right" }}>Total</div>
                </div>
                {split.players.map((p) => (
                  <div key={p.uid} data-testid="pay-player-row" style={{ display: "flex", alignItems: "center", padding: "9px 12px", fontSize: 12.5, borderBottom: "1px solid var(--border-soft, var(--border))", background: p.uid === profile.uid ? "var(--accent-soft-bg)" : "transparent" }}>
                    <div style={{ flex: 1, minWidth: 0, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                      <div style={{ fontSize: 10.5, fontWeight: 500, color: "var(--text-faint)" }}>{p.games} games{p.due > 0 && p.due < p.total ? ` · ${money(p.due)} due` : p.due === 0 ? " · paid up" : ""}</div>
                    </div>
                    {split.courts.map((c) => {
                      const l = p.lines.find((x) => x.courtId === c.id);
                      return (
                        <div key={c.id} style={{ width: 52, textAlign: "right", color: !l ? "var(--text-faint)" : l.received ? "var(--green-text)" : "var(--text)" }}>
                          {l ? `$${Math.round(l.owes)}` : "–"}
                        </div>
                      );
                    })}
                    <div style={{ width: 64, textAlign: "right", fontWeight: 700 }}>{money(p.total)}</div>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: "var(--text-faint)", padding: "8px 12px" }}>Green = received. Amounts per court rounded to the dollar here; totals are exact.</div>
              </div>
            )}

            {tab === "courts" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {isAdmin && <SheetLoader payments={payments} members={members} onApply={setPayments} />}
                {isAdmin && (
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5 }}>
                    <input data-testid="edit-counts" type="checkbox" checked={editCounts} onChange={(e) => setEditCounts(e.target.checked)} />
                    Adjust game counts (if the agreed split differs from the schedule)
                  </label>
                )}
                {isAdmin && editCounts && Object.keys(payments.overrides || {}).some((k) => Object.keys(payments.overrides[k] || {}).length) && (
                  <SecondaryButton type="button" onClick={() => setPayments({ ...payments, overrides: {} })}>
                    Reset all counts to the schedule
                  </SecondaryButton>
                )}
                {split.courts.map((c) => {
                  const canMark = isAdmin || (c.payerUid && c.payerUid === profile.uid);
                  const short = c.slots > 0 && c.scheduledTotal < c.slots;
                  return (
                    <Card key={c.id} data-testid="pay-court" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 700 }}>
                          {c.label} — paid by {c.payerName || "—"} · {money(c.amount)}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                          {c.slotTitle || "no slot picked"} · {money(c.rate)} per player per game
                          {c.phone ? ` · Zelle ${c.phone}` : ""}
                        </div>
                      </div>
                      {short && (
                        <div style={{ display: "flex", gap: 5, fontSize: 11.5, color: "var(--amber-text)" }}>
                          <WarningIcon width={12} height={12} style={{ flexShrink: 0, marginTop: 1 }} />
                          The schedule has {c.scheduledTotal} of {c.slots} player-games for this court ({payments.totalWeeks} weeks × {payments.playersPerGame}). If past weeks weren't imported, re-import with "Start from today" unticked, or adjust counts.
                        </div>
                      )}
                      {(editCounts
                        ? Object.values(members)
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((m) => c.rows.find((x) => x.uid === m.uid) || { uid: m.uid, name: m.name, games: 0, scheduled: 0, owes: 0, self: c.payerUid === m.uid, received: false })
                        : c.rows
                      ).map((r) => (
                        <div key={r.uid} data-testid="pay-court-row" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontWeight: 600 }}>{r.name}</span>
                            {r.self && <span style={{ fontSize: 11, color: "var(--text-faint)" }}> · paid this court</span>}
                            {r.claimed && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--amber-text)" }}> · says paid</span>}
                          </div>
                          {editCounts ? (
                            <input
                              key={`${c.id}-${r.uid}-${r.games}`}
                              data-testid={`count-${c.id}-${r.name}`}
                              type="number"
                              inputMode="numeric"
                              defaultValue={r.games}
                              onBlur={(e) => setOverride(c.id, r.uid, e.target.value, r.scheduled)}
                              style={{ ...input, width: 56, padding: "5px 6px", textAlign: "right" }}
                            />
                          ) : (
                            <div style={{ width: 56, textAlign: "right", color: "var(--text-muted)" }}>
                              {r.games} g{r.overridden ? "*" : ""}
                            </div>
                          )}
                          <div style={{ width: 72, textAlign: "right", fontWeight: 700 }}>{money(r.owes)}</div>
                          <ReceivedToggle testid={`recv-${c.id}-${r.name}`} on={r.received} disabled={!canMark || r.self} onClick={() => toggleReceived(c.id, r.uid)} />
                        </div>
                      ))}
                      <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 8, borderTop: "1px solid var(--border-soft, var(--border))", fontSize: 12.5 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>{c.totalGames} player-games · total to collect</span>
                          <b>{money(c.receivable)}</b>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: c.outstanding > 0 ? "var(--amber-text)" : "var(--green-text)" }}>
                          <span>Outstanding</span>
                          <b data-testid={`outstanding-${c.id}`}>{money(c.outstanding)}</b>
                        </div>
                        {Math.abs(c.diff) >= 0.01 && (
                          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-faint)" }}>
                            <span>{c.diff > 0 ? "Over" : "Short"} vs. amount paid</span>
                            <span>{money(Math.abs(c.diff))}</span>
                          </div>
                        )}
                      </div>
                      {canMark && <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Tap the circle when a player's payment arrives.</div>}
                    </Card>
                  );
                })}
                {isAdmin && editCounts && <div style={{ fontSize: 11, color: "var(--text-faint)" }}>* = adjusted from the schedule. Clear a box (or set it back) to follow the schedule again.</div>}
              </div>
            )}

            {isAdmin && !editing && (
              <SecondaryButton type="button" onClick={() => setEditing(true)}>
                Edit courts, amounts & weeks
              </SecondaryButton>
            )}
          </>
        )}
      </div>
    </div>
  );
}
