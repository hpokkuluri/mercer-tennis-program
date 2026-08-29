# RallyPoint

A scheduling app for a tennis team: propose matches and practices,
teammates accept, decline, or reassign their spot to someone else, and
everyone sees one shared schedule. Built as an installable web app
(PWA) so it lives on your phone's home screen without an App Store.

## Features

- **Real accounts** — email/password login (via Firebase Auth once connected, see below).
- **Teams with a join code** — create a team or join one with a code; the creator starts as admin and can promote others.
- **Two season modes**, switchable by an admin any time:
  - **Summer** — anyone proposes a match/practice and invites teammates; each invited player accepts or declines.
  - **Winter** — only admins assign specific players to a date/time; assigned players still confirm, or reassign their spot to a teammate if they can't make it.
  - Reassigning works in either mode — declined or still-pending invites can be handed off to anyone not already on the event.
- **Live status** — an event flips to *Confirmed* the moment everyone's accepted, or flags *Needs a player* if someone declines.
- **Comments** on each event for coordinating details.
- **Team announcements** board for updates everyone should see.
- **Direct messages** between any two teammates.
- **Installable** — "Add to Home Screen" on iOS/Android turns it into a real app icon, works full-screen.

## Running it

```bash
npm install
npm run dev
```

Open the printed local URL. Out of the box this runs on a **local demo
backend** (no setup, but data stays in one browser and isn't secure) —
open two tabs and sign up as two different people to try the real
"someone else responds" flow.

To connect real, free, cloud-hosted accounts that sync across every
teammate's own phone, follow **[SETUP.md](./SETUP.md)** — it walks
through creating a free Firebase project (~10 minutes, no credit card)
and deploying to a free `https://your-team.web.app` link.

## Project shape

```
src/
  lib/            data layer — localData.js (demo) and firebaseData.js (real),
                  both implementing the same functions, picked by db.js
  context/        AppContext.jsx — the one place screens read app state from
  components/     shared UI: Avatar, EventCard, BottomNav, icons, buttons...
  screens/        one file per screen (Login, Schedule, Propose, EventDetail, Team, Messages, Thread...)
```

Swapping backends never touches a screen file — every screen calls
functions off `useApp()`, and `AppContext` is the only place that
calls into `lib/db.js`.
