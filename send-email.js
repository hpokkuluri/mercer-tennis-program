// Sends real email through the team admin's own Gmail account (SMTP with a
// free, revocable Google "App Password") — no third-party email service,
// no paid Firebase plan. See SETUP.md for the one-time setup: turning on
// 2-Step Verification, generating an App Password, and adding the env
// vars below in Netlify's site settings.
//
// Required Netlify environment variables:
//   GMAIL_USER           — the Gmail address to send from
//   GMAIL_APP_PASSWORD   — the 16-character App Password (not the real password)
//   APP_SHARED_SECRET    — any string you make up; must match VITE_APP_SHARED_SECRET
//                           in the app's .env, so this function only accepts
//                           requests from the app itself (not a stray bot that
//                           finds the URL).
//
// Until GMAIL_USER/GMAIL_APP_PASSWORD are set, this quietly reports
// "not configured" instead of failing — the rest of the app works either way.

import nodemailer from "nodemailer";

const MAX_RECIPIENTS = 100;

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const sharedSecret = process.env.APP_SHARED_SECRET;
  const providedSecret = event.headers["x-app-secret"] || event.headers["X-App-Secret"];
  if (!sharedSecret || providedSecret !== sharedSecret) {
    console.log("send-email: rejected — unauthorized (missing/mismatched shared secret)");
    return { statusCode: 401, body: JSON.stringify({ sent: false, reason: "unauthorized" }) };
  }

  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.log("send-email: not-configured — GMAIL_USER/GMAIL_APP_PASSWORD missing in this environment");
    return { statusCode: 200, body: JSON.stringify({ sent: false, reason: "not-configured" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    console.log("send-email: rejected — invalid JSON body");
    return { statusCode: 400, body: JSON.stringify({ sent: false, reason: "invalid-json" }) };
  }

  const { to, subject, text } = payload;
  const recipients = Array.isArray(to) ? to : [to];
  const cleanRecipients = recipients.filter(Boolean);
  console.log(`send-email: request — subject="${subject}" recipients=${cleanRecipients.length} (${cleanRecipients.join(", ")})`);
  if (cleanRecipients.length === 0 || !subject || !text) {
    console.log("send-email: rejected — missing-fields (no recipients, subject, or body text)");
    return { statusCode: 400, body: JSON.stringify({ sent: false, reason: "missing-fields" }) };
  }
  if (cleanRecipients.length > MAX_RECIPIENTS) {
    console.log("send-email: rejected — too-many-recipients");
    return { statusCode: 400, body: JSON.stringify({ sent: false, reason: "too-many-recipients" }) };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    // Fail fast instead of hanging until the platform's own timeout kills
    // the function with a less useful error.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  try {
    const info = await transporter.sendMail({
      from: `"Mercer Tennis Program" <${GMAIL_USER}>`,
      to: GMAIL_USER,
      bcc: cleanRecipients,
      subject,
      text,
    });
    console.log(`send-email: sent OK — count=${cleanRecipients.length} messageId=${info?.messageId || "?"} response=${info?.response || "?"}`);
    return { statusCode: 200, body: JSON.stringify({ sent: true, count: cleanRecipients.length }) };
  } catch (err) {
    console.log(`send-email: FAILED to send — ${err.message}`);
    return { statusCode: 500, body: JSON.stringify({ sent: false, reason: "send-failed", error: err.message }) };
  }
};
