// Real email delivery via a small Netlify serverless function
// (netlify/functions/send-email.js) that sends through the team admin's
// own Gmail account — no third-party email service, no paid Firebase plan.
// See that file's header comment, and SETUP.md, for the one-time setup.
//
// The function reports back whether it actually sent anything (it quietly
// no-ops if Gmail isn't configured yet in Netlify), so callers should
// check `result.sent` rather than assuming success.

const SHARED_SECRET = import.meta.env.VITE_APP_SHARED_SECRET || "";

async function send({ to, subject, text }) {
  try {
    const res = await fetch("/.netlify/functions/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-app-secret": SHARED_SECRET },
      body: JSON.stringify({ to, subject, text }),
    });
    const data = await res.json().catch(() => ({}));
    return { sent: false, ...data };
  } catch {
    return { sent: false, reason: "network-error" };
  }
}

export async function sendInviteEmail({ toEmail, toName, teamName, invitedByName, appUrl }) {
  return send({
    to: toEmail,
    subject: `You're invited to ${teamName} on Mercer Tennis Program`,
    text: `Hi ${toName || ""},\n\n${invitedByName} added you to ${teamName}. Sign up with this email address (${toEmail}) at ${appUrl} to see the team's schedule.\n\n— Mercer Tennis Program`,
  });
}

export async function sendJoinedEmail({ toEmail, toName, teamName, appUrl }) {
  return send({
    to: toEmail,
    subject: `You're on the team — ${teamName}`,
    text: `Hi ${toName || ""},\n\nYou've joined ${teamName} on Mercer Tennis Program. Open ${appUrl} anytime to see the schedule, join practices and matches, and chat with your teammates.\n\n— Mercer Tennis Program`,
  });
}

export async function sendRemovedEmail({ toEmail, toName, teamName }) {
  return send({
    to: toEmail,
    subject: `You've been removed from ${teamName}`,
    text: `Hi ${toName || ""},\n\nYou've been removed from ${teamName} on Mercer Tennis Program and no longer have access to its schedule. If you think this was a mistake, reach out to your team admin.\n\n— Mercer Tennis Program`,
  });
}

export async function sendEventEmails({ recipients, teamName, title, date, startTime, location, organizerName, appUrl, winter = false }) {
  if (!recipients || recipients.length === 0) return { sent: false, reason: "no-recipients" };
  return send({
    to: recipients.map((r) => r.email),
    subject: winter ? `You're playing: ${title} — ${prettyDate(date)}` : `New ${title} posted — ${teamName}`,
    text: winter
      ? `${organizerName} put you on ${title} for ${teamName} on ${prettyDate(date)} at ${startTime}${location ? `, ${location}` : ""}. You're confirmed — if you can't make it, open your spot in the app so a teammate can take it: ${appUrl}\n\n— Mercer Tennis Program`
      : `${organizerName} posted a new ${title} for ${teamName} on ${date} at ${startTime}, ${location}. Open ${appUrl} to join.\n\n— Mercer Tennis Program`,
  });
}

export async function sendAddedToEventEmail({ recipients, teamName, title, date, startTime, location, organizerName, appUrl, winter = false }) {
  if (!recipients || recipients.length === 0) return { sent: false, reason: "no-recipients" };
  return send({
    to: recipients.map((r) => r.email),
    subject: `You've been added to ${title} — ${teamName}`,
    text: `${organizerName} added you to ${title} for ${teamName} on ${date} at ${startTime}${location ? `, ${location}` : ""}. ${winter ? "You're confirmed — if you can't make it, open your spot in the app" : "Open the app to accept or decline"}: ${appUrl}\n\n— Mercer Tennis Program`,
  });
}

// Fired once, at the moment a vacation-vs-assignment conflict is
// detected (either the player just added a vacation that overlaps a
// game they're already on, or an admin just assigned them to a game
// during an existing vacation). Goes to the team's admins so someone can
// actually reassign the slot — see src/lib/vacations.js.
export async function sendVacationConflictEmail({ adminRecipients, playerName, title, date, teamName, appUrl }) {
  if (!adminRecipients || adminRecipients.length === 0) return { sent: false, reason: "no-recipients" };
  return send({
    to: adminRecipients.map((r) => r.email),
    subject: `Vacation conflict — ${playerName} is assigned to ${title} on ${date}`,
    text: `${playerName} is on the roster for ${title} (${date}) for ${teamName}, but that date falls inside a vacation they've marked in the app. You may want to reassign that slot. Open ${appUrl} to review it.\n\n— Mercer Tennis Program`,
  });
}

// Sent per created event when an admin bulk-imports the Winter schedule
// from a spreadsheet — same content/shape as sendEventEmails, kept as
// its own function only so the import flow reads clearly at the call site.
export async function sendImportedEventEmail({ recipients, teamName, title, date, startTime, location, organizerName, appUrl }) {
  if (!recipients || recipients.length === 0) return { sent: false, reason: "no-recipients" };
  return send({
    to: recipients.map((r) => r.email),
    subject: `New ${title} posted — ${teamName}`,
    text: `${organizerName} posted a new ${title} for ${teamName} on ${date} at ${startTime}, ${location}. Open ${appUrl} to accept or decline.\n\n— Mercer Tennis Program`,
  });
}

// Fired the moment someone claims a slot another player opened up (Slot
// Marketplace) — lets the player who gave up their spot know it's really
// gone, since the only other trace of it is a comment on the event page
// they may not check back on.
export async function sendSlotClaimedEmail({ toEmail, toName, title, date, claimedByName, teamName, appUrl }) {
  if (!toEmail) return { sent: false, reason: "no-recipients" };
  return send({
    to: toEmail,
    subject: `Your spot was claimed — ${title} (${date})`,
    text: `Hi ${toName || ""},\n\n${claimedByName} claimed the spot you opened up for ${title} on ${date} for ${teamName}. You're off the roster for that one. Open ${appUrl} if you want to double-check the schedule.\n\n— Mercer Tennis Program`,
  });
}

// To the member who paid for a court, when a player says they've sent their share.
export async function sendPaidClaimEmail({ toEmail, toName, playerName, amount, courtLabel, teamName, appUrl }) {
  if (!toEmail) return { sent: false, reason: "no-recipients" };
  return send({
    to: toEmail,
    subject: `${playerName} says they paid you ${amount} (${courtLabel})`,
    text: `Hi ${toName || ""},\n\n${playerName} marked their ${courtLabel} court share of ${amount} as paid for ${teamName}. Once it's in your account, confirm it in the app: ${appUrl} → More → Payments.\n\n— Mercer Tennis Program`,
  });
}

function prettyDate(date) {
  if (!date) return "";
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// To the whole team (bcc) the moment a player opens their spot, so whoever
// is free can grab it first in the app.
export async function sendSlotOpenedEmail({ recipients, openerName, title, date, startTime, teamName, appUrl, sub = false }) {
  if (!recipients || recipients.length === 0) return { sent: false, reason: "no-recipients" };
  return send({
    to: recipients,
    subject: `${sub ? "You're on the sub list — open spot" : "Open spot"}: ${title} — ${prettyDate(date)}${startTime ? ` ${startTime}` : ""}`,
    text: `${openerName} can't make ${title} on ${prettyDate(date)}${startTime ? ` at ${startTime}` : ""} and has opened their spot for ${teamName}.\n\nFirst to claim it gets it — open ${appUrl}, go to More → Slot Marketplace (or the game itself) and tap Claim.\n\n— Mercer Tennis Program`,
  });
}

// To the whole team (bcc) once an open spot has been claimed, so nobody
// else tries for it.
export async function sendSlotTakenEmail({ recipients, claimedByName, openerName, title, date, startTime, teamName, appUrl }) {
  if (!recipients || recipients.length === 0) return { sent: false, reason: "no-recipients" };
  return send({
    to: recipients,
    subject: `Spot taken: ${title} — ${prettyDate(date)}`,
    text: `${claimedByName} took ${openerName}'s open spot for ${title} on ${prettyDate(date)}${startTime ? ` at ${startTime}` : ""} (${teamName}). That spot is no longer available.\n\nSchedule: ${appUrl}\n\n— Mercer Tennis Program`,
  });
}

// One player's whole Winter schedule (sent once at the start of a season,
// or again after big changes). Built by src/lib/seasonEmail.js.
export async function sendSeasonScheduleEmail({ to, subject, text }) {
  if (!to) return { sent: false, reason: "no-recipients" };
  return send({ to, subject, text });
}
