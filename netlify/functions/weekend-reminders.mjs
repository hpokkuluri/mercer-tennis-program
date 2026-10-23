// Scheduled: Wednesday and Friday at 6 PM Eastern — emails every
// player their games for the coming weekend, and team admins the whole
// weekend's lineup. Logic lives in ../lib/reminders.js.
//
// Players who turned on phone notifications also get a push.
// Needs (Netlify → Project configuration → Environment variables):
//   FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY — from a Firebase service
//     account key (Firebase console → Project settings → Service accounts →
//     Generate new private key; copy "client_email" and "private_key").
//   GMAIL_USER, GMAIL_APP_PASSWORD — already set for send-email.
// Without the Firebase pair it logs "not-configured" and does nothing.
//
// Cron is UTC and Eastern shifts with daylight saving, so it fires at both
// 22:00 and 23:00 UTC on Wed/Fri and only sends on the run that falls at
// 6 PM or later New York time (22:00 UTC in EDT, 23:00 UTC in EST); the
// reminderLog guard stops a second send the same day. Netlify's "Run now"
// works for a manual test after 6 PM Eastern.

import nodemailer from "nodemailer";
import { buildReminders, reminderWindow } from "../lib/reminders.js";
import { adminReady, db as getDb, pushToUids } from "../lib/server.js";

const APP_URL = process.env.URL || "https://mercertennisprogram.netlify.app";

export default async () => {
  if (!adminReady()) {
    console.log("weekend-reminders: not-configured — FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY missing");
    return new Response("not-configured");
  }
  const db = getDb();
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.log("weekend-reminders: not-configured — GMAIL_USER / GMAIL_APP_PASSWORD missing");
    return new Response("not-configured");
  }
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  const now = new Date();
  const nyHour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(now));
  if (nyHour < 18) {
    console.log(`weekend-reminders: ${nyHour}:00 in New York — waiting for the 6 PM run`);
    return new Response("too-early");
  }
  const { today, start, end } = reminderWindow(now);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" }).format(now);
  const kind = weekday === "Fri" ? "fri" : "wed";
  const runKey = `${today}`;
  let sent = 0;

  const teams = await db.collection("teams").get();
  for (const t of teams.docs) {
    const team = t.data();
    if ((team.reminderLog || {})[runKey]) {
      console.log(`weekend-reminders: ${t.id} already sent for ${runKey}`);
      continue;
    }
    const memSnap = await t.ref.collection("members").get();
    const members = {};
    memSnap.forEach((m) => (members[m.id] = m.data()));
    const evSnap = await t.ref.collection("events").where("date", ">=", start).where("date", "<=", end).get();
    const events = evSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const messages = buildReminders({ team: { ...team, members }, events, appUrl: APP_URL, kind });
    let pushed = 0;
    for (const msg of messages) {
      if (msg.to.length) {
        try {
          await transporter.sendMail({ from: `"Mercer Tennis Program" <${GMAIL_USER}>`, to: GMAIL_USER, bcc: msg.to, subject: msg.subject, text: msg.text });
          sent += 1;
        } catch (err) {
          console.log(`weekend-reminders: send failed (${msg.subject}) — ${err.message}`);
        }
      }
      if (msg.uid && msg.push) {
        try {
          pushed += await pushToUids([msg.uid], msg.push);
        } catch (err) {
          console.log(`weekend-reminders: push failed (${msg.uid}) — ${err.message}`);
        }
      }
    }
    console.log(`weekend-reminders: phone notifications delivered=${pushed}`);
    await t.ref.update({ [`reminderLog.${runKey}`]: { sent: messages.length, at: now.toISOString() } });
    console.log(`weekend-reminders: team ${t.id} ${start}..${end} games=${events.length} emails=${messages.length}`);
  }
  return new Response(`sent ${sent}`);
};

export const config = { schedule: "0 22,23 * * 3,5" };
