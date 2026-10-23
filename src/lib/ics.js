// Calendar (.ics) for one player's games — used by the "Download" button in
// the app and by the netlify/functions/calendar feed that phones subscribe
// to (so it keeps updating as spots change hands). Pure: no browser or
// Node-only APIs.

const TZ = "America/New_York";

// "2026-10-24" + "09:00" in New York → "20261024T130000Z"
export function nyToUtc(date, time = "00:00") {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  // Offset of New York at that moment (handles EDT/EST).
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(guess));
  const g = (t) => Number(parts.find((p) => p.type === t).value);
  const asNy = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"));
  const utc = new Date(guess + (guess - asNy));
  return utc.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// Lines over 75 octets must be folded.
const fold = (line) => {
  const out = [];
  let rest = line;
  // 60 characters keeps emoji / accented names safely under 75 bytes.
  while (rest.length > 60) {
    out.push(rest.slice(0, 60));
    rest = " " + rest.slice(60);
  }
  out.push(rest);
  return out.join("\r\n");
};

export function myCalendarEvents(events, uid) {
  return events.filter((e) => e.status !== "cancelled" && e.date && ["accepted", "pending", "open"].includes(e.participants?.[uid]?.status));
}

export function buildIcs({ events, uid, members = {}, teamName = "Mercer Tennis", appUrl = "", now = new Date() }) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mercer Tennis Program//Games//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(`${teamName} — my games`)}`,
    "X-WR-TIMEZONE:America/New_York",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];
  for (const e of myCalendarEvents(events, uid)) {
    const start = e.startTime || "09:00";
    const end = e.endTime && e.endTime > start ? e.endTime : `${String(Math.min(23, Number(start.slice(0, 2)) + 2)).padStart(2, "0")}${start.slice(2)}`;
    const me = e.participants[uid];
    const others = Object.values(e.participants || {})
      .filter((p) => p.uid !== uid && p.status !== "declined")
      .map((p) => (members[p.uid]?.name || p.name || "").split(" ")[0]);
    const note = me.status === "pending" ? " (please confirm)" : me.status === "open" ? " (your spot is open)" : "";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@mercertennis`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${nyToUtc(e.date, start)}`,
      `DTEND:${nyToUtc(e.date, end)}`,
      `SUMMARY:${esc(`🎾 ${e.title}${note}`)}`,
      `DESCRIPTION:${esc(`With ${others.join(", ") || "—"}${e.note ? `\n${e.note}` : ""}${appUrl ? `\n${appUrl}/#/event/${e.id}` : ""}`)}`,
      ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
      ...(appUrl ? [`URL:${appUrl}/#/event/${e.id}`] : []),
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:Tennis in 2 hours",
      "TRIGGER:-PT2H",
      "END:VALARM",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
