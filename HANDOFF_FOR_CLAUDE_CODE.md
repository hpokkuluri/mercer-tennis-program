# Handoff: Mercer Tennis Program

You're picking this project up from a Claude session that was running in a sandboxed cloud
container with no ability to `git push` to GitHub or reach Netlify's API — every deploy had to
go through a slow manual loop (zip the code → Hari extracts it → drags files into GitHub's web
upload page → commits → waits for Netlify to auto-build). That was working but painfully slow
for debugging. You're running locally on Hari's machine, so **you have real git and network
access — use it.** Push directly to GitHub. Use the Netlify CLI. Don't make Hari drag and drop
files by hand.

## Hard constraint — read this first

**Nothing in this app can cost money, ever.** That means: Firebase free Spark plan only (no
Blaze, no billing account), Netlify free tier only, no paid third-party services of any kind.
Email is sent via a Netlify serverless Function using Gmail SMTP with a free "App Password" —
not a paid transactional email service like SendGrid/Postmark/etc. Keep this constraint in mind
for every technical decision. If a fix would require a paid tier of anything, find a free
alternative instead and flag it to Hari rather than assuming it's fine.

## What this app is

A free tennis team scheduling PWA (installable to iOS/Android home screen) for Hari and his
tennis group. React + Vite frontend, Firebase (Auth + Firestore) backend, hosted on Netlify.
Live at **https://mercertennisprogram.netlify.app**.

Two independent schedules per team: ❄️ Winter (admin assigns specific players to a slot; each
accepts/declines/reassigns) and ☀️ Summer (open sign-up — anyone posts, anyone joins, joiners
group into teams of a configurable size in join order). Plus: team roster/invites, announcements,
per-event comments, 1:1 direct messages, a 6-theme system (not just accent color — full
font/shape/shadow/background changes per theme), a "game history" feature (Winter: win/loss +
score vs the outside opponent; Summer: pick two formed teams, mark the winner, add a score —
any member can log/edit/remove results, shown inline on the event page), and a Notifications
screen (bell icon on the home screen) listing pending items (unanswered Winter assignments, open
Summer events not yet joined).

## Accounts & where things live

- **GitHub repo:** https://github.com/hpokkuluri/mercer-tennis-program (private). This zip's
  `.git` folder already has the full commit history — you can `git remote add origin
  https://github.com/hpokkuluri/mercer-tennis-program.git` and push directly (Hari will need to
  auth you, e.g. via `gh auth login` or a PAT — ask him).
- **Netlify:** https://app.netlify.com, site name `mercertennisprogram`. Signed in with
  **harrysaysargo@gmail.com**. Git-linked to the GitHub repo above — pushing to `main` auto-
  deploys. You can also install the Netlify CLI (`npm i -g netlify-cli`, `netlify login`,
  `netlify link`) to deploy directly, tail function logs (`netlify functions:log send-email` or
  `netlify watch`), and manage env vars from the terminal instead of the dashboard.
- **Firebase console:** https://console.firebase.google.com, project **MercerTennisProgram**.
  Signed in with **hpokkuluri@gmail.com**. Free Spark plan, no card on file — keep it that way.
  Auth (email/password) + Firestore.
- **Outbound email account** (the app's own sender, unrelated to the two logins above): Gmail
  `mercertennisprogram@gmail.com`, password `Tennis2026`, with 2-Step Verification on and an App
  Password generated for SMTP: `cllngoxtrwwpzbgm`.

## Environment variables (set in Netlify dashboard → Project configuration → Environment
variables, NOT in the repo — `.env` is gitignored but included in this zip so local dev works
immediately)

```
VITE_FIREBASE_API_KEY=AIzaSyASEg2eUvM_vEyjB6HTf5oJEm9DGo48sSg
VITE_FIREBASE_AUTH_DOMAIN=mercertennisprogram.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mercertennisprogram
VITE_FIREBASE_STORAGE_BUCKET=mercertennisprogram.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=267524287694
VITE_FIREBASE_APP_ID=1:267524287694:web:c9423ce94e4ba7a587f49f
VITE_APP_SHARED_SECRET=yLAAgEOSubbJbrYtL3LASPkzX0auPfhO
```

Netlify also needs (server-side only, for the email Function — should already be set there,
just listed here for reference):
```
APP_SHARED_SECRET=yLAAgEOSubbJbrYtL3LASPkzX0auPfhO   (must match VITE_APP_SHARED_SECRET above)
GMAIL_USER=mercertennisprogram@gmail.com
GMAIL_APP_PASSWORD=cllngoxtrwwpzbgm
```

## Firestore security rules

Published manually in Firebase Console → Firestore Database → Rules (Firestore rules are NOT
part of the Netlify build — they're a separate deploy target). The current intended rules are
tracked in `firestore.rules` in this repo. If you have the Firebase CLI available and Hari can
`firebase login`, you can deploy these properly with `firebase deploy --only firestore:rules`
instead of copy-pasting into the console — that'd be a real improvement to set up if you have
the access. Otherwise keep editing `firestore.rules` in the repo and ask Hari to paste-and-
publish it in the console when it changes.

## Active bug — start here

**Symptom:** When a member proposes a new event (Winter assignment or Summer open post), the
"New event posted" notification email (`sendEventEmails` in `src/lib/email.js`, called from
`src/screens/Propose.jsx`) is not being delivered — recipients confirmed nothing in inbox or
spam. This is despite the OTHER three email types (invite-by-email, joined-team, removed-from-
team) all confirmed working in production through the exact same `send-email` Netlify Function.

**What's been ruled out / found so far:**
- The Netlify Function *is* being invoked (confirmed via Function log showing ~950ms–1150ms
  duration runs, consistent with an actual Gmail SMTP attempt) — so the client-side fetch call
  in `Propose.jsx` is firing.
- Added logging to `netlify/functions/send-email.js` (see `console.log` calls — already
  committed, should be in this zip) to print the recipient list and success/failure reason on
  every invocation, to stop guessing.
- Even after Hari uploaded that change and Netlify showed "Published," a fresh Function
  invocation's logs — filtered directly by that request's ID — STILL showed no custom log lines,
  only Netlify's own duration/memory summary. This strongly suggests the manual GitHub-upload
  process did not actually get the updated `send-email.js` into the deployed bundle, even though
  the deploy reported success. This exact "Published but the content didn't actually change"
  failure mode has happened before in this project (a folder-structure issue with the drag-and-
  drop upload flattening/nesting files incorrectly) — worth verifying directly by looking at the
  file on GitHub, or better, just push properly with git so there's no manual-upload step to
  get wrong in the first place.

**Suggested next steps, in order:**
1. Get this repo pushed to GitHub directly via `git push` (not manual upload) so we can trust
   what's actually deployed matches what's in the repo. Confirm on GitHub that
   `netlify/functions/send-email.js` has the `console.log("send-email: request — ...")` line
   in it.
2. Trigger a real deploy (push to `main`, or `netlify deploy --prod` if using the CLI) and
   confirm in the Netlify dashboard that the new deploy actually published this file.
3. Reproduce: propose a new Summer or Winter event as a real user, then check
   `netlify functions:log send-email` (or the dashboard) for the new detailed log lines. They'll
   show either `sent OK` (meaning it's a Gmail-side delivery/spam issue, not a code bug) or a
   specific failure reason (`not-configured`, `unauthorized`, `send-failed` with an error
   message) — fix based on whatever that says.
4. If it does say `sent OK` and email still never arrives, the likely culprit is Gmail treating
   the BCC-based batch send (see `to: GMAIL_USER, bcc: cleanRecipients` in `send-email.js`) as
   spammy for this particular recipient set — consider sending individually instead of one BCC
   blast, or check Gmail's own Sent folder on `mercertennisprogram@gmail.com` to see if it shows
   as sent and to whom.

## Working style Hari expects (from the prior session)

- He's non-technical-leaning but hands-on — happy to click through consoles/dashboards, but
  wants the number of manual steps minimized. Prefer doing things yourself (git push, CLI
  deploys, reading logs) over asking him to click through UIs, now that you actually can.
- He wants credentials/passwords documented in plain text in project docs — he's fine with that,
  it's a private repo for a small friend group. Don't hesitate to write real values into docs
  when it helps future-you (or future Claude Code sessions) operate faster.
- Ship changes as real git commits with clear messages (see `git log` in this repo for the style
  used so far).
- Always keep the "completely free" constraint front and center.
