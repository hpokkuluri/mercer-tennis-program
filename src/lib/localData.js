// Local demo backend: no server, no Firebase project needed. Everything
// lives in this browser's localStorage and syncs live across tabs (open
// two tabs signed in as two different members to see live updates).
//
// IMPORTANT: sign-in here is NOT secure — passwords are stored in plain
// text in your browser, purely so the login screen has something to
// check against while you try the app out. Swap in firebaseData.js
// (see SETUP.md) for real, secure accounts before using this with an
// actual team.

const USERS_KEY = "rallypoint.local.users"; // email -> {uid, email, password, name, initials, color}
// The "who's signed in" pointer lives in sessionStorage (per-tab), not
// localStorage (shared across tabs) — on purpose. That means you can open
// two tabs, sign up/in as two different teammates, and try the real
// "someone else responds" experience locally, before wiring up Firebase.
const SESSION_KEY = "rallypoint.local.session"; // uid of signed-in user
const TEAMS_KEY = "rallypoint.local.teams";
const EVENTS_KEY = "rallypoint.local.events";
const COMMENTS_KEY = "rallypoint.local.comments"; // eventId -> [comments]
const ANN_KEY = "rallypoint.local.announcements"; // teamId -> [posts]
const DM_KEY = "rallypoint.local.dms"; // convoId -> {participants, messages: []}
const INVITE_KEY = "rallypoint.local.invites"; // normalizedEmail -> {teamId, invitedBy, invitedByName, createdAt}

import { initials as initialsOf, colorFor } from "./identity";

function readAll(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}
function writeAll(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("rallypoint:local-write", { detail: { key } }));
}
function genId(prefix) {
  return prefix + "_" + Math.random().toString(36).slice(2, 10);
}
function listen(cb) {
  window.addEventListener("rallypoint:local-write", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("rallypoint:local-write", cb);
    window.removeEventListener("storage", cb);
  };
}

// ---------- auth ----------

export async function signUp({ email, password, name }) {
  const users = readAll(USERS_KEY);
  const normalizedEmail = email.trim().toLowerCase();
  if (users[normalizedEmail]) throw new Error("An account with that email already exists.");
  const uid = genId("u");
  const profile = {
    uid,
    email: normalizedEmail,
    password,
    name,
    initials: initialsOf(name),
    color: colorFor(uid),
  };

  // If an admin already invited this email to a team, land them straight
  // in it instead of the "join by code" screen.
  const invites = readAll(INVITE_KEY);
  const pending = invites[normalizedEmail];
  if (pending) {
    const teams = readAll(TEAMS_KEY);
    const team = teams[pending.teamId];
    if (team) {
      team.members[uid] = { uid, name: profile.name, initials: profile.initials, color: profile.color, isAdmin: false };
      writeAll(TEAMS_KEY, teams);
      profile.teamId = pending.teamId;
    }
    delete invites[normalizedEmail];
    writeAll(INVITE_KEY, invites);
  }

  users[normalizedEmail] = profile;
  writeAll(USERS_KEY, users);
  sessionStorage.setItem(SESSION_KEY, uid);
  return profile;
}

export async function signIn({ email, password }) {
  const users = readAll(USERS_KEY);
  const normalizedEmail = email.trim().toLowerCase();
  const profile = users[normalizedEmail];
  if (!profile || profile.password !== password) throw new Error("Wrong email or password.");
  sessionStorage.setItem(SESSION_KEY, profile.uid);
  return profile;
}

export async function signOutUser() {
  sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent("rallypoint:local-write", { detail: { key: SESSION_KEY } }));
}

export async function resetPassword({ email }) {
  const users = readAll(USERS_KEY);
  const normalizedEmail = email.trim().toLowerCase();
  if (!users[normalizedEmail]) throw new Error("No account with that email.");
  // Local demo mode can't send real email — this is a stand-in so the
  // screen still works while you try the app out.
  throw new Error("Password reset needs a real account — connect Firebase (see SETUP.md) for this to send an actual email.");
}

export function onAuthChange(cb) {
  const handler = () => {
    const uid = sessionStorage.getItem(SESSION_KEY);
    if (!uid) return cb(null);
    const users = readAll(USERS_KEY);
    const profile = Object.values(users).find((u) => u.uid === uid);
    cb(profile || null);
  };
  handler();
  return listen(handler);
}

export async function updateProfileTeam(uid, teamId) {
  const users = readAll(USERS_KEY);
  const email = Object.keys(users).find((e) => users[e].uid === uid);
  if (!email) return;
  users[email].teamId = teamId;
  writeAll(USERS_KEY, users);
}

export async function updateUserProfile(uid, { name, color } = {}) {
  const users = readAll(USERS_KEY);
  const email = Object.keys(users).find((e) => users[e].uid === uid);
  if (!email) return null;
  if (name) {
    users[email].name = name;
    users[email].initials = initialsOf(name);
  }
  if (color) users[email].color = color;
  writeAll(USERS_KEY, users);
  return users[email];
}

export async function changePassword({ currentPassword, newPassword }) {
  const uid = sessionStorage.getItem(SESSION_KEY);
  const users = readAll(USERS_KEY);
  const email = Object.keys(users).find((e) => users[e].uid === uid);
  if (!email || users[email].password !== currentPassword) throw new Error("Current password is incorrect.");
  users[email].password = newPassword;
  writeAll(USERS_KEY, users);
}

// ---------- teams ----------

export async function createTeam({ name, code, season, adminUid, adminProfile }) {
  const teams = readAll(TEAMS_KEY);
  const normalized = code.trim().toUpperCase();
  if (Object.values(teams).some((t) => t.code === normalized)) {
    throw new Error("That team code is taken — try another.");
  }
  const teamId = genId("team");
  const team = {
    id: teamId,
    code: normalized,
    name: name || `Team ${normalized}`,
    season: season || "summer",
    adminUids: [adminUid],
    createdAt: Date.now(),
    members: {
      [adminUid]: { uid: adminUid, name: adminProfile.name, initials: adminProfile.initials, color: adminProfile.color, email: adminProfile.email, isAdmin: true },
    },
  };
  teams[teamId] = team;
  writeAll(TEAMS_KEY, teams);
  await updateProfileTeam(adminUid, teamId);
  return team;
}

export async function joinTeam({ code, uid, profile }) {
  const teams = readAll(TEAMS_KEY);
  const normalized = code.trim().toUpperCase();
  const team = Object.values(teams).find((t) => t.code === normalized);
  if (!team) throw new Error("No team found with that code.");
  team.members[uid] = { uid, name: profile.name, initials: profile.initials, color: profile.color, email: profile.email, isAdmin: false };
  writeAll(TEAMS_KEY, teams);
  await updateProfileTeam(uid, team.id);
  return team;
}

export function subscribeTeam(teamId, cb) {
  const handler = () => {
    const teams = readAll(TEAMS_KEY);
    cb(teams[teamId] || null);
  };
  handler();
  return listen(handler);
}

export async function setSeason(teamId, season) {
  const teams = readAll(TEAMS_KEY);
  if (!teams[teamId]) return;
  teams[teamId].season = season;
  writeAll(TEAMS_KEY, teams);
}

export async function setAdmin(teamId, uid, isAdmin) {
  const teams = readAll(TEAMS_KEY);
  const team = teams[teamId];
  if (!team) return;
  team.members[uid].isAdmin = isAdmin;
  team.adminUids = Object.values(team.members).filter((m) => m.isAdmin).map((m) => m.uid);
  writeAll(TEAMS_KEY, teams);
}

export async function updateMemberInTeam(teamId, uid, patch) {
  const teams = readAll(TEAMS_KEY);
  const team = teams[teamId];
  if (!team || !team.members[uid]) return;
  Object.assign(team.members[uid], patch);
  writeAll(TEAMS_KEY, teams);
}

export async function removeMember(teamId, uid) {
  const teams = readAll(TEAMS_KEY);
  const team = teams[teamId];
  if (!team) return;
  delete team.members[uid];
  team.adminUids = Object.values(team.members).filter((m) => m.isAdmin).map((m) => m.uid);
  writeAll(TEAMS_KEY, teams);
}

// Add someone by email. If they already have an account, they're added to
// the team immediately. If not, an invite is stashed so that whenever they
// do sign up with that email, they land straight in this team.
export async function inviteMemberByEmail(teamId, email, invitedByUid, invitedByName) {
  const normalized = email.trim().toLowerCase();
  const users = readAll(USERS_KEY);
  const existing = users[normalized];
  const teams = readAll(TEAMS_KEY);
  const team = teams[teamId];
  if (!team) throw new Error("Team not found.");

  if (existing) {
    if (team.members[existing.uid]) throw new Error(`${existing.name} is already on the team.`);
    team.members[existing.uid] = { uid: existing.uid, name: existing.name, initials: existing.initials, color: existing.color, email: existing.email, isAdmin: false };
    writeAll(TEAMS_KEY, teams);
    existing.teamId = teamId;
    writeAll(USERS_KEY, users);
    return { status: "added", name: existing.name };
  }

  const invites = readAll(INVITE_KEY);
  invites[normalized] = { teamId, invitedBy: invitedByUid, invitedByName, createdAt: Date.now() };
  writeAll(INVITE_KEY, invites);
  return { status: "invited" };
}

// ---------- events ----------

import { computeGroups, isOpenEvent } from "./groups";

function recomputeStatus(event) {
  if (isOpenEvent(event)) {
    const { groups } = computeGroups(event);
    event.status = groups.some((g) => g.full) ? "confirmed" : "pending";
    return;
  }
  const values = Object.values(event.participants);
  if (values.some((p) => p.status === "declined")) {
    event.status = "attention";
  } else if (values.length > 0 && values.every((p) => p.status === "accepted")) {
    event.status = "confirmed";
  } else {
    event.status = "pending";
  }
}

export function subscribeEvents(teamId, cb) {
  const handler = () => {
    const all = readAll(EVENTS_KEY);
    const events = Object.values(all)
      .filter((e) => e.teamId === teamId && e.status !== "cancelled")
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
    cb(events);
  };
  handler();
  return listen(handler);
}

export async function createEvent(teamId, data) {
  const all = readAll(EVENTS_KEY);
  const id = genId("evt");
  all[id] = { id, teamId, ...data, status: "pending", createdAt: Date.now() };
  recomputeStatus(all[id]);
  writeAll(EVENTS_KEY, all);
  return id;
}

export async function respondToEvent(teamId, eventId, uid, status) {
  const all = readAll(EVENTS_KEY);
  const event = all[eventId];
  if (!event || !event.participants[uid]) return;
  event.participants[uid].status = status;
  event.participants[uid].respondedAt = Date.now();
  recomputeStatus(event);
  writeAll(EVENTS_KEY, all);
}

export async function reassignInvite(teamId, eventId, fromUid, toUid, toName, toInitials, toColor) {
  const all = readAll(EVENTS_KEY);
  const event = all[eventId];
  if (!event) return;
  delete event.participants[fromUid];
  event.participants[toUid] = {
    uid: toUid,
    name: toName,
    initials: toInitials,
    color: toColor,
    status: "pending",
    reassignedFrom: fromUid,
  };
  recomputeStatus(event);
  writeAll(EVENTS_KEY, all);
}

// Slot marketplace (Winter only): a player who can't make a game they're
// on the roster for opens their slot up to the whole team, instead of
// having to already know who's free to hand it directly to (that's what
// reassignInvite above is for). Anyone else on the team can then claim
// it — see claimSlot.
export async function openSlot(teamId, eventId, uid) {
  const all = readAll(EVENTS_KEY);
  const event = all[eventId];
  if (!event || !event.participants[uid]) return;
  event.participants[uid] = { ...event.participants[uid], status: "open", openedAt: Date.now() };
  recomputeStatus(event);
  writeAll(EVENTS_KEY, all);
}

export async function claimSlot(teamId, eventId, fromUid, toUid, toName, toInitials, toColor) {
  const all = readAll(EVENTS_KEY);
  const event = all[eventId];
  if (!event || !event.participants[fromUid] || event.participants[fromUid].status !== "open") return;
  delete event.participants[fromUid];
  event.participants[toUid] = {
    uid: toUid,
    name: toName,
    initials: toInitials,
    color: toColor,
    status: "accepted",
    claimedFrom: fromUid,
    joinedAt: Date.now(),
  };
  recomputeStatus(event);
  writeAll(EVENTS_KEY, all);
}

// Undo an open slot before anyone claims it — the player changed their
// mind and can play after all. No-ops if it's already been claimed (the
// participant is no longer "open" by then, so there's nothing to take back).
export async function closeSlot(teamId, eventId, uid) {
  const all = readAll(EVENTS_KEY);
  const event = all[eventId];
  if (!event || !event.participants[uid] || event.participants[uid].status !== "open") return;
  const { openedAt: _openedAt, ...rest } = event.participants[uid];
  event.participants[uid] = { ...rest, status: "accepted" };
  recomputeStatus(event);
  writeAll(EVENTS_KEY, all);
}

export async function cancelEvent(teamId, eventId) {
  const all = readAll(EVENTS_KEY);
  if (!all[eventId]) return;
  all[eventId].status = "cancelled";
  writeAll(EVENTS_KEY, all);
}

// Admin/organizer adding more players to an already-posted Winter event
// (the initial Propose form only assigns an opening roster — teams often
// need to fill a spot later). newParticipants is keyed by uid, same shape
// as the participants created at propose time.
export async function addParticipants(teamId, eventId, newParticipants) {
  const all = readAll(EVENTS_KEY);
  const event = all[eventId];
  if (!event) return;
  event.participants = { ...event.participants, ...newParticipants };
  recomputeStatus(event);
  writeAll(EVENTS_KEY, all);
}

// Open sign-up (Summer): anyone can join a posted practice/match — no
// invite step. Joins are grouped in the order they happen into teams of
// event.teamSize (first N lock in Team 1, the next batch queues toward
// Team 2, and so on).
export async function joinEvent(teamId, eventId, member) {
  const all = readAll(EVENTS_KEY);
  const event = all[eventId];
  if (!event || event.participants[member.uid]) return;
  const groupsBefore = computeGroups(event).groups.filter((g) => g.full).length;
  event.participants[member.uid] = {
    uid: member.uid,
    name: member.name,
    initials: member.initials,
    color: member.color,
    status: "accepted",
    joinedAt: Date.now(),
  };
  event.joinOrder = [...(event.joinOrder || []), member.uid];
  recomputeStatus(event);
  writeAll(EVENTS_KEY, all);

  const groupsAfter = computeGroups(event).groups.filter((g) => g.full).length;
  if (groupsAfter > groupsBefore) {
    const teamSize = event.teamSize || 4;
    const newGroup = computeGroups(event).groups[groupsAfter - 1];
    const names = newGroup.uids.map((uid) => event.participants[uid]?.name?.split(" ")[0]).join(", ");
    await postComment(eventId, {
      authorId: "system",
      authorName: "Mercer Tennis Program",
      text: `🎉 Team ${groupsAfter} is set (${teamSize}/${teamSize}): ${names}`,
    });
  }
}

export async function withdrawFromEvent(teamId, eventId, uid) {
  const all = readAll(EVENTS_KEY);
  const event = all[eventId];
  if (!event || !event.participants[uid]) return;
  delete event.participants[uid];
  event.joinOrder = (event.joinOrder || []).filter((x) => x !== uid);
  recomputeStatus(event);
  writeAll(EVENTS_KEY, all);
}

// Game results. Winter events (a single team vs an outside opponent) get
// one win/loss + score result. Summer events can split into multiple
// internally-formed teams, so results there are a list of head-to-head
// matchups between those teams. Any team member can log a result.
export async function setWinterResult(teamId, eventId, result) {
  const all = readAll(EVENTS_KEY);
  const event = all[eventId];
  if (!event) return;
  event.result = result;
  writeAll(EVENTS_KEY, all);
}

export async function addSummerResult(teamId, eventId, result) {
  const all = readAll(EVENTS_KEY);
  const event = all[eventId];
  if (!event) return;
  const id = genId("res");
  event.results = { ...(event.results || {}), [id]: result };
  writeAll(EVENTS_KEY, all);
  return id;
}

export async function deleteSummerResult(teamId, eventId, resultId) {
  const all = readAll(EVENTS_KEY);
  const event = all[eventId];
  if (!event || !event.results) return;
  const results = { ...event.results };
  delete results[resultId];
  event.results = results;
  writeAll(EVENTS_KEY, all);
}

// ---------- comments (per event) ----------

export function subscribeComments(eventId, cb) {
  const handler = () => {
    const all = readAll(COMMENTS_KEY);
    cb((all[eventId] || []).sort((a, b) => a.createdAt - b.createdAt));
  };
  handler();
  return listen(handler);
}

export async function postComment(eventId, { authorId, authorName, text }) {
  const all = readAll(COMMENTS_KEY);
  all[eventId] = all[eventId] || [];
  all[eventId].push({ id: genId("cmt"), authorId, authorName, text, createdAt: Date.now() });
  writeAll(COMMENTS_KEY, all);
}

// ---------- announcements (per team) ----------

export function subscribeAnnouncements(teamId, cb) {
  const handler = () => {
    const all = readAll(ANN_KEY);
    cb((all[teamId] || []).sort((a, b) => b.createdAt - a.createdAt));
  };
  handler();
  return listen(handler);
}

export async function postAnnouncement(teamId, { authorId, authorName, text }) {
  const all = readAll(ANN_KEY);
  all[teamId] = all[teamId] || [];
  all[teamId].push({ id: genId("ann"), authorId, authorName, text, createdAt: Date.now() });
  writeAll(ANN_KEY, all);
}

// ---------- direct messages ----------

function convoId(a, b) {
  return [a, b].sort().join("__");
}

export function subscribeConversations(uid, cb) {
  const handler = () => {
    const all = readAll(DM_KEY);
    const mine = Object.values(all)
      .filter((c) => c.participants.includes(uid))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    cb(mine);
  };
  handler();
  return listen(handler);
}

export function subscribeThread(uidA, uidB, cb) {
  const id = convoId(uidA, uidB);
  const handler = () => {
    const all = readAll(DM_KEY);
    cb((all[id]?.messages || []).sort((a, b) => a.createdAt - b.createdAt));
  };
  handler();
  return listen(handler);
}

export async function sendDM(teamId, fromUid, toMember, text) {
  const id = convoId(fromUid, toMember.uid);
  const all = readAll(DM_KEY);
  const convo = all[id] || { id, teamId, participants: [fromUid, toMember.uid], messages: [] };
  convo.messages.push({ id: genId("msg"), fromUid, text, createdAt: Date.now() });
  convo.updatedAt = Date.now();
  convo.lastMessage = text;
  all[id] = convo;
  writeAll(DM_KEY, all);
}
