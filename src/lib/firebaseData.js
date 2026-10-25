// Real backend: Google's Firebase (free Spark plan) — Auth for real
// email/password accounts, Firestore for everything else. Same function
// names/shapes as localData.js so screens never need to know which
// backend is active — see db.js.

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteField,
  writeBatch,
  FieldPath,
} from "firebase/firestore";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { firebaseConfig } from "./firebaseConfig";
import { initials as initialsOf, colorFor } from "./identity";
import { computeGroups, isOpenEvent } from "./groups";

const app = initializeApp(firebaseConfig);
// Keeps a copy of the team's data on the phone so the schedule still opens
// with no signal (and changes made offline sync when it's back).
function makeDb() {
  try {
    return initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch {
    return getFirestore(app);
  }
}
export const db = makeDb();
export const auth = getAuth(app);

// iPhone home-screen apps often have a flaky first network request right
// after launch (auth/network-request-failed). Retry a couple of times before
// giving up, and give a plain-English message if it still fails.
async function withNetRetry(fn) {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (e?.code !== "auth/network-request-failed") throw e;
      if (i >= 2) throw new Error("Couldn't reach the sign-in server. Check your Wi-Fi or mobile data (and turn off any VPN / iCloud Private Relay), then try again.");
      await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
    }
  }
}

// ---------- auth ----------

export async function signUp({ email, password, name }) {
  const normalized = email.trim().toLowerCase();
  const cred = await withNetRetry(() => createUserWithEmailAndPassword(auth, normalized, password));
  await updateProfile(cred.user, { displayName: name });
  const profile = {
    uid: cred.user.uid,
    email: cred.user.email,
    name,
    initials: initialsOf(name),
    color: colorFor(cred.user.uid),
  };

  // If an admin already invited this email to a team, land them straight
  // in it instead of the "join by code" screen.
  const inviteSnap = await getDoc(doc(db, "invites", normalized));
  if (inviteSnap.exists()) {
    const invite = inviteSnap.data();
    await setDoc(doc(db, "teams", invite.teamId, "members", cred.user.uid), {
      uid: cred.user.uid,
      name: profile.name,
      initials: profile.initials,
      color: profile.color,
      email: profile.email,
      isAdmin: false,
    });
    profile.teamId = invite.teamId;
    await deleteDoc(doc(db, "invites", normalized)).catch(() => {});
  }

  await setDoc(doc(db, "users", cred.user.uid), profile);
  return profile;
}

export async function signIn({ email, password }) {
  const cred = await withNetRetry(() => signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password));
  const snap = await getDoc(doc(db, "users", cred.user.uid));
  return snap.exists() ? snap.data() : { uid: cred.user.uid, email: cred.user.email, name: cred.user.displayName };
}

// For calling our own Netlify functions as the signed-in user.
export async function getIdToken() {
  return auth.currentUser ? auth.currentUser.getIdToken() : null;
}

export async function signOutUser() {
  await signOut(auth);
}

export async function resetPassword({ email }) {
  await withNetRetry(() => sendPasswordResetEmail(auth, email.trim().toLowerCase()));
}

export async function changePassword({ currentPassword, newPassword }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, newPassword);
}

export function onAuthChange(cb) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return cb(null);
    const snap = await getDoc(doc(db, "users", user.uid));
    cb(snap.exists() ? snap.data() : { uid: user.uid, email: user.email, name: user.displayName });
  });
}

export async function updateProfileTeam(uid, teamId) {
  await updateDoc(doc(db, "users", uid), { teamId });
}

export async function updateUserProfile(uid, { name, color } = {}) {
  const patch = {};
  if (name) {
    patch.name = name;
    patch.initials = initialsOf(name);
  }
  if (color) patch.color = color;
  if (Object.keys(patch).length === 0) return patch;
  await updateDoc(doc(db, "users", uid), patch);
  if (name && auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: name }).catch(() => {});
  }
  return patch;
}

// ---------- teams ----------

export async function createTeam({ name, code, season, adminUid, adminProfile }) {
  const normalized = code.trim().toUpperCase();
  const teamsRef = collection(db, "teams");
  const existing = await new Promise((resolve, reject) => {
    const unsub = onSnapshot(query(teamsRef, where("code", "==", normalized)), (s) => {
      unsub();
      resolve(s);
    }, reject);
  });
  if (!existing.empty) throw new Error("That team code is taken — try another.");

  const teamDoc = await addDoc(teamsRef, {
    code: normalized,
    name: name || `Team ${normalized}`,
    season: season || "summer",
    adminUids: [adminUid],
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, "teams", teamDoc.id, "members", adminUid), {
    uid: adminUid,
    name: adminProfile.name,
    initials: adminProfile.initials,
    color: adminProfile.color,
    email: adminProfile.email,
    isAdmin: true,
  });
  await updateProfileTeam(adminUid, teamDoc.id);
  const snap = await getDoc(doc(db, "teams", teamDoc.id));
  return { id: teamDoc.id, ...snap.data() };
}

export async function joinTeam({ code, uid, profile }) {
  const normalized = code.trim().toUpperCase();
  const teamsRef = collection(db, "teams");
  const found = await new Promise((resolve, reject) => {
    const unsub = onSnapshot(query(teamsRef, where("code", "==", normalized)), (s) => {
      unsub();
      resolve(s);
    }, reject);
  });
  if (found.empty) throw new Error("No team found with that code.");
  const teamId = found.docs[0].id;
  await setDoc(doc(db, "teams", teamId, "members", uid), {
    uid,
    name: profile.name,
    initials: profile.initials,
    color: profile.color,
    email: profile.email,
    isAdmin: false,
  });
  await updateProfileTeam(uid, teamId);
  return { id: teamId, ...found.docs[0].data() };
}

export function subscribeTeam(teamId, cb) {
  const unsubTeam = onSnapshot(doc(db, "teams", teamId), (snap) => {
    if (!snap.exists()) return cb(null);
    const base = { id: snap.id, ...snap.data() };
    onSnapshot(collection(db, "teams", teamId, "members"), (memSnap) => {
      const members = {};
      memSnap.forEach((m) => (members[m.id] = m.data()));
      cb({ ...base, members });
    });
  });
  return unsubTeam;
}

export async function setSeason(teamId, season) {
  await updateDoc(doc(db, "teams", teamId), { season });
}

// Team-level "Require sign-up to join" switch. Missing on older teams = true.
// Court-cost split (More → Payments) — see src/lib/payments.js.
// Saved setup for the season planner (Winter Schedule → Plan).
export async function setSchedulerSetup(teamId, scheduler) {
  await updateDoc(doc(db, "teams", teamId), { scheduler });
}

// One mark inside payments (e.g. ["claimed", courtId, uid]) without
// rewriting the rest — so a player tapping "I've paid" can't clobber an
// admin's edit made at the same moment. value null removes it.
export async function setTeamFields(teamId, patch) {
  await updateDoc(doc(db, "teams", teamId), patch);
}

export async function setPaymentMark(teamId, path, value) {
  await updateDoc(doc(db, "teams", teamId), { [["payments", ...path].join(".")]: value == null ? deleteField() : value });
}

export async function setPayments(teamId, payments) {
  await updateDoc(doc(db, "teams", teamId), { payments });
}

export async function setRequireSubscription(teamId, value) {
  await updateDoc(doc(db, "teams", teamId), { requireSubscription: !!value });
}

// Add a roster player with no Firebase Auth account (used while
// requireSubscription is off, e.g. for testing a season before anyone signs
// up). Synthetic uid; no invite email is sent.
export async function addPlaceholderMember(teamId, { name, email } = {}) {
  const clean = (name || "").trim();
  if (!clean) throw new Error("Enter a name.");
  const uid = `placeholder_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const member = {
    uid,
    name: clean,
    initials: initialsOf(clean),
    color: colorFor(uid),
    email: (email || "").trim().toLowerCase(),
    isAdmin: false,
    placeholder: true,
  };
  await setDoc(doc(db, "teams", teamId, "members", uid), member);
  return member;
}

export async function setAdmin(teamId, uid, isAdmin) {
  await updateDoc(doc(db, "teams", teamId, "members", uid), { isAdmin });
}

export async function updateMemberInTeam(teamId, uid, patch) {
  await updateDoc(doc(db, "teams", teamId, "members", uid), patch);
}

export async function removeMember(teamId, uid) {
  await deleteDoc(doc(db, "teams", teamId, "members", uid));
}

// Add someone by email. If they already have an account, they're added to
// the team immediately. If not, an invite doc is stashed so that whenever
// they do sign up with that email, they land straight in this team.
export async function inviteMemberByEmail(teamId, email, invitedByUid, invitedByName) {
  const normalized = email.trim().toLowerCase();
  const usersSnap = await getDocs(query(collection(db, "users"), where("email", "==", normalized)));
  if (!usersSnap.empty) {
    const existing = usersSnap.docs[0].data();
    const memberRef = doc(db, "teams", teamId, "members", existing.uid);
    const memberSnap = await getDoc(memberRef);
    if (memberSnap.exists()) throw new Error(`${existing.name} is already on the team.`);
    await setDoc(memberRef, { uid: existing.uid, name: existing.name, initials: existing.initials, color: existing.color, email: existing.email, isAdmin: false });
    await updateProfileTeam(existing.uid, teamId);
    return { status: "added", name: existing.name };
  }

  await setDoc(doc(db, "invites", normalized), {
    teamId,
    invitedBy: invitedByUid,
    invitedByName,
    createdAt: serverTimestamp(),
  });
  return { status: "invited" };
}

// ---------- events ----------

function recomputeStatus(event) {
  if (isOpenEvent(event)) {
    const { groups } = computeGroups(event);
    return groups.some((g) => g.full) ? "confirmed" : "pending";
  }
  const values = Object.values(event.participants || {});
  if (values.some((p) => p.status === "declined")) return "attention";
  if (values.length > 0 && values.every((p) => p.status === "accepted")) return "confirmed";
  return "pending";
}

export function subscribeEvents(teamId, cb) {
  const q = query(collection(db, "teams", teamId, "events"));
  return onSnapshot(q, (snap) => {
    const events = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((e) => e.status !== "cancelled")
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
    cb(events);
  });
}

export async function createEvent(teamId, data) {
  const ref = await addDoc(collection(db, "teams", teamId, "events"), {
    ...data,
    status: recomputeStatus({ ...data }),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function respondToEvent(teamId, eventId, uid, status) {
  const ref = doc(db, "teams", teamId, "events", eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const participants = { ...snap.data().participants };
  if (!participants[uid]) return;
  participants[uid] = { ...participants[uid], status, respondedAt: Date.now() };
  await updateDoc(ref, { participants, status: recomputeStatus({ ...snap.data(), participants }) });
}

export async function reassignInvite(teamId, eventId, fromUid, toUid, toName, toInitials, toColor) {
  const ref = doc(db, "teams", teamId, "events", eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const participants = { ...snap.data().participants };
  delete participants[fromUid];
  participants[toUid] = { uid: toUid, name: toName, initials: toInitials, color: toColor, status: "pending", reassignedFrom: fromUid };
  await updateDoc(ref, { participants, status: recomputeStatus({ ...snap.data(), participants }) });
}

// Slot marketplace (Winter only): a player who can't make a game they're
// on the roster for opens their slot up to the whole team, instead of
// having to already know who's free to hand it directly to (that's what
// reassignInvite above is for). Anyone else on the team can then claim
// it — see claimSlot.
export async function openSlot(teamId, eventId, uid) {
  const ref = doc(db, "teams", teamId, "events", eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const participants = { ...snap.data().participants };
  if (!participants[uid]) return;
  participants[uid] = { ...participants[uid], status: "open", openedAt: Date.now() };
  await updateDoc(ref, { participants, status: recomputeStatus({ ...snap.data(), participants }) });
}

export async function claimSlot(teamId, eventId, fromUid, toUid, toName, toInitials, toColor) {
  const ref = doc(db, "teams", teamId, "events", eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const participants = { ...snap.data().participants };
  if (!participants[fromUid] || participants[fromUid].status !== "open") return;
  delete participants[fromUid];
  participants[toUid] = { uid: toUid, name: toName, initials: toInitials, color: toColor, status: "accepted", claimedFrom: fromUid, joinedAt: Date.now() };
  await updateDoc(ref, { participants, status: recomputeStatus({ ...snap.data(), participants }) });
}

// Undo an open slot before anyone claims it — the player changed their
// mind and can play after all. No-ops if it's already been claimed (the
// participant is no longer "open" by then, so there's nothing to take back).
export async function closeSlot(teamId, eventId, uid) {
  const ref = doc(db, "teams", teamId, "events", eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const participants = { ...snap.data().participants };
  if (!participants[uid] || participants[uid].status !== "open") return;
  const { openedAt: _openedAt, ...rest } = participants[uid];
  participants[uid] = { ...rest, status: "accepted" };
  await updateDoc(ref, { participants, status: recomputeStatus({ ...snap.data(), participants }) });
}

// Permanently removes games (admin only — see firestore.rules). Batched
// because a season is ~70 games; Firestore allows 500 writes per batch.
export async function deleteEvents(teamId, eventIds) {
  for (let i = 0; i < eventIds.length; i += 400) {
    const batch = writeBatch(db);
    eventIds.slice(i, i + 400).forEach((id) => batch.delete(doc(db, "teams", teamId, "events", id)));
    await batch.commit();
  }
}

// Swap one player for another on a game, keeping their status (used when a
// no-login roster entry is linked to the player's real account).
export async function replaceParticipant(teamId, eventId, fromUid, toParticipant, joinOrder) {
  const ref = doc(db, "teams", teamId, "events", eventId);
  const args = [new FieldPath("participants", fromUid), deleteField(), new FieldPath("participants", toParticipant.uid), toParticipant];
  if (joinOrder) args.push("joinOrder", joinOrder);
  await updateDoc(ref, ...args);
}

export async function updateEventFields(teamId, eventId, patch) {
  await updateDoc(doc(db, "teams", teamId, "events", eventId), patch);
}

export async function cancelEvent(teamId, eventId) {
  await updateDoc(doc(db, "teams", teamId, "events", eventId), { status: "cancelled" });
}

// Admin/organizer adding more players to an already-posted Winter event
// (the initial Propose form only assigns an opening roster — teams often
// need to fill a spot later). newParticipants is keyed by uid, same shape
// as the participants created at propose time.
export async function addParticipants(teamId, eventId, newParticipants) {
  const ref = doc(db, "teams", teamId, "events", eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const participants = { ...snap.data().participants, ...newParticipants };
  await updateDoc(ref, { participants, status: recomputeStatus({ ...snap.data(), participants }) });
}

// Open sign-up (Summer): anyone can join a posted practice/match — no
// invite step. Joins are grouped in the order they happen into teams of
// event.teamSize (first N lock in Team 1, the next batch queues toward
// Team 2, and so on).
export async function joinEvent(teamId, eventId, member) {
  const ref = doc(db, "teams", teamId, "events", eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const event = snap.data();
  if (event.participants?.[member.uid]) return;
  const groupsBefore = computeGroups(event).groups.filter((g) => g.full).length;

  const participants = { ...event.participants, [member.uid]: { uid: member.uid, name: member.name, initials: member.initials, color: member.color, status: "accepted", joinedAt: Date.now() } };
  const joinOrder = [...(event.joinOrder || []), member.uid];
  const updated = { ...event, participants, joinOrder };
  await updateDoc(ref, { participants, joinOrder, status: recomputeStatus(updated) });

  const { groups } = computeGroups(updated);
  const groupsAfter = groups.filter((g) => g.full).length;
  if (groupsAfter > groupsBefore) {
    const teamSize = event.teamSize || 4;
    const newGroup = groups[groupsAfter - 1];
    const names = newGroup.uids.map((uid) => participants[uid]?.name?.split(" ")[0]).join(", ");
    await postComment(eventId, {
      authorId: "system",
      authorName: "Mercer Tennis Program",
      text: `🎉 Team ${groupsAfter} is set (${teamSize}/${teamSize}): ${names}`,
    }, teamId);
  }
}

export async function withdrawFromEvent(teamId, eventId, uid) {
  const ref = doc(db, "teams", teamId, "events", eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const event = snap.data();
  if (!event.participants?.[uid]) return;
  const participants = { ...event.participants };
  delete participants[uid];
  const joinOrder = (event.joinOrder || []).filter((x) => x !== uid);
  const updated = { ...event, participants, joinOrder };
  await updateDoc(ref, { participants, joinOrder, status: recomputeStatus(updated) });
}

// Game results. Winter events (a single team vs an outside opponent) get
// one win/loss + score result. Summer events can split into multiple
// internally-formed teams, so results there are a list of head-to-head
// matchups between those teams. Any team member can log a result — see
// firestore.rules (events/{eventId} update is already open to any member).
export async function setWinterResult(teamId, eventId, result) {
  await updateDoc(doc(db, "teams", teamId, "events", eventId), { result });
}

export async function addSummerResult(teamId, eventId, result) {
  const id = `res_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await updateDoc(doc(db, "teams", teamId, "events", eventId), { [`results.${id}`]: result });
  return id;
}

export async function deleteSummerResult(teamId, eventId, resultId) {
  await updateDoc(doc(db, "teams", teamId, "events", eventId), { [`results.${resultId}`]: deleteField() });
}

// ---------- comments ----------

export function subscribeComments(eventId, cb, teamId) {
  const q = query(collection(db, "teams", teamId, "events", eventId, "comments"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function postComment(eventId, { authorId, authorName, text }, teamId) {
  await addDoc(collection(db, "teams", teamId, "events", eventId, "comments"), {
    authorId,
    authorName,
    text,
    createdAt: serverTimestamp(),
  });
}

// ---------- announcements ----------

export function subscribeAnnouncements(teamId, cb) {
  const q = query(collection(db, "teams", teamId, "announcements"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function postAnnouncement(teamId, { authorId, authorName, text }) {
  await addDoc(collection(db, "teams", teamId, "announcements"), {
    authorId,
    authorName,
    text,
    createdAt: serverTimestamp(),
  });
}

// ---------- direct messages ----------

function convoId(a, b) {
  return [a, b].sort().join("__");
}

export function subscribeConversations(uid, cb, teamId) {
  const q = query(collection(db, "teams", teamId, "dms"), where("participants", "array-contains", uid));
  return onSnapshot(q, (snap) => {
    const convos = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
    cb(convos);
  });
}

export function subscribeThread(uidA, uidB, cb, teamId) {
  const id = convoId(uidA, uidB);
  const q = query(collection(db, "teams", teamId, "dms", id, "messages"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function sendDM(teamId, fromUid, toMember, text) {
  const id = convoId(fromUid, toMember.uid);
  await setDoc(
    doc(db, "teams", teamId, "dms", id),
    { participants: [fromUid, toMember.uid], updatedAt: serverTimestamp(), lastMessage: text },
    { merge: true }
  );
  await addDoc(collection(db, "teams", teamId, "dms", id, "messages"), {
    fromUid,
    text,
    createdAt: serverTimestamp(),
  });
}
