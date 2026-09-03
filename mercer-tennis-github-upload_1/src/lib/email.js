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

export async function sendEventEmails({ recipients, teamName, title, date, startTime, location, organizerName, appUrl }) {
  if (!recipients || recipients.length === 0) return { sent: false, reason: "no-recipients" };
  return send({
    to: recipients.map((r) => r.email),
    subject: `New ${title} posted — ${teamName}`,
    text: `${organizerName} posted a new ${title} for ${teamName} on ${date} at ${startTime}, ${location}. Open ${appUrl} to join.\n\n— Mercer Tennis Program`,
  });
}

export async function sendAddedToEventEmail({ recipients, teamName, title, date, startTime, location, organizerName, appUrl }) {
  if (!recipients || recipients.length === 0) return { sent: false, reason: "no-recipients" };
  return send({
    to: recipients.map((r) => r.email),
    subject: `You've been added to ${title} — ${teamName}`,
    text: `${organizerName} added you to ${title} for ${teamName} on ${date} at ${startTime}, ${location}. Open ${appUrl} to accept or decline.\n\n— Mercer Tennis Program`,
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
