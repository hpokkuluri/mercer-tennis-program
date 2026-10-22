import { createContext, useContext, useEffect, useState } from "react";
import { initials as initialsOf, colorFor } from "../lib/identity";
import * as db from "../lib/db";
import { sendJoinedEmail, sendRemovedEmail, sendAddedToEventEmail, sendVacationConflictEmail, sendSlotClaimedEmail, sendSlotOpenedEmail, sendSlotTakenEmail } from "../lib/email";
import { genVacationId, conflictsForRange } from "../lib/vacations";

const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [dbReady, setDbReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null); // {uid, email, name, initials, color, teamId?}
  const [team, setTeam] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    db.ready().then(() => setDbReady(true));
  }, []);

  useEffect(() => {
    if (!dbReady) return undefined;
    const unsub = db.onAuthChange((p) => {
      setProfile(p);
      setAuthLoading(false);
    });
    return unsub;
  }, [dbReady]);

  useEffect(() => {
    if (!dbReady || !profile?.teamId) {
      setTeam(null);
      setEvents([]);
      return undefined;
    }
    // Guards against a write-triggers-resubscribe echo (the local demo
    // backend's storage events aren't scoped to a single key, so writing
    // users.teamId below can immediately re-invoke this same callback).
    let handledRemoval = false;
    const unsubTeam = db.subscribeTeam(profile.teamId, (t) => {
      // If an admin removed us, this team snapshot no longer lists us as a
      // member — send ourselves back to onboarding instead of getting stuck
      // looking at a team we can no longer read anything from.
      if (t && !t.members?.[profile.uid]) {
        if (handledRemoval) return;
        handledRemoval = true;
        db.updateProfileTeam(profile.uid, null).catch(() => {});
        setProfile((p) => (p ? { ...p, teamId: null } : p));
        setTeam(null);
        setEvents([]);
        return;
      }
      setTeam(t);
    });
    const unsubEvents = db.subscribeEvents(profile.teamId, setEvents);
    return () => {
      unsubTeam();
      unsubEvents();
    };
  }, [dbReady, profile?.teamId]);

  async function signUp({ email, password, name }) {
    const p = await db.signUp({ email, password, name });
    setProfile(p);
    return p;
  }
  async function signIn({ email, password }) {
    const p = await db.signIn({ email, password });
    setProfile(p);
    return p;
  }
  async function signOut() {
    await db.signOutUser();
    setProfile(null);
    setTeam(null);
    setEvents([]);
  }
  async function resetPassword(email) {
    await db.resetPassword({ email });
  }
  async function changePassword({ currentPassword, newPassword }) {
    await db.changePassword({ currentPassword, newPassword });
  }
  async function updateProfile({ name, color } = {}) {
    await db.updateUserProfile(profile.uid, { name, color });
    const patch = {};
    if (name) {
      patch.name = name;
      patch.initials = initialsOf(name);
    }
    if (color) patch.color = color;
    if (team && Object.keys(patch).length > 0) {
      await db.updateMemberInTeam(team.id, profile.uid, patch);
    }
    setProfile((p) => (p ? { ...p, ...patch } : p));
  }

  async function createTeam({ name, code, season }) {
    const adminProfile = { name: profile.name, initials: profile.initials || initialsOf(profile.name), color: profile.color || colorFor(profile.uid), email: profile.email };
    const t = await db.createTeam({ name, code, season, adminUid: profile.uid, adminProfile });
    setProfile({ ...profile, teamId: t.id });
    return t;
  }

  async function joinTeamByCode(code) {
    const memberProfile = { name: profile.name, initials: profile.initials || initialsOf(profile.name), color: profile.color || colorFor(profile.uid), email: profile.email };
    const t = await db.joinTeam({ code, uid: profile.uid, profile: memberProfile });
    setProfile({ ...profile, teamId: t.id });
    if (profile.email) {
      sendJoinedEmail({ toEmail: profile.email, toName: profile.name, teamName: t.name, appUrl: window.location.origin }).catch(() => {});
    }
    return t;
  }

  const isAdmin = Boolean(team?.members?.[profile?.uid]?.isAdmin);

  // Every teammate's email (players without one are simply skipped), minus the given uids.
  const teamEmails = (excludeUids = []) =>
    Object.values(team?.members || {})
      .filter((m) => m.email && !excludeUids.includes(m.uid))
      .map((m) => m.email);

  const value = {
    dbReady,
    authLoading,
    usingFirebase: db.USING_FIREBASE,
    profile,
    team,
    events,
    isAdmin,
    signUp,
    signIn,
    signOut,
    resetPassword,
    createTeam,
    joinTeamByCode,
    setAdmin: (uid, isAdminFlag) => db.setAdmin(team.id, uid, isAdminFlag),
    removeMember: async (uid) => {
      const m = team.members?.[uid];
      await db.removeMember(team.id, uid);
      if (m?.email) {
        sendRemovedEmail({ toEmail: m.email, toName: m.name, teamName: team.name, appUrl: window.location.origin }).catch(() => {});
      }
    },
    inviteMemberByEmail: (email) => db.inviteMemberByEmail(team.id, email, profile.uid, profile.name),
    setRequireSubscription: (value) => db.setRequireSubscription(team.id, value),
    setPayments: (payments) => db.setPayments(team.id, payments),
    setSchedulerSetup: (scheduler) => db.setSchedulerSetup(team.id, scheduler),
    updateMemberInTeam: (uid, patch) => db.updateMemberInTeam(team.id, uid, patch),
    // Used by Import to fill in players on games it created earlier (no emails; recomputes status).
    mergeParticipants: (eventId, participants) => db.addParticipants(team.id, eventId, participants),
    addPlaceholderMember: (data) => db.addPlaceholderMember(team.id, data),
    changePassword,
    updateProfile,
    createEvent: (data) => db.createEvent(team.id, data),
    respondToEvent: (eventId, status) => db.respondToEvent(team.id, eventId, profile.uid, status),
    reassignInvite: (eventId, toMember) =>
      db.reassignInvite(team.id, eventId, profile.uid, toMember.uid, toMember.name, toMember.initials, toMember.color),
    // Slot trading. Players act for themselves (uid defaults to the signed-in
    // player); admins can act for anyone — needed for roster players who
    // don't have a login yet.
    openSlot: async (eventId, uid = profile.uid) => {
      const event = events.find((e) => e.id === eventId);
      const who = uid === profile.uid ? profile : team.members?.[uid];
      await db.openSlot(team.id, eventId, uid);
      if (event) {
        sendSlotOpenedEmail({
          recipients: teamEmails([uid]),
          openerName: who?.name || "A teammate",
          title: event.title,
          date: event.date,
          startTime: event.startTime,
          teamName: team.name,
          appUrl: window.location.origin,
        }).catch(() => {});
      }
    },
    closeSlot: (eventId, uid = profile.uid) => db.closeSlot(team.id, eventId, uid),
    claimSlot: async (eventId, fromUid, toUid = profile.uid, { quietOpener = false } = {}) => {
      const opener = team.members?.[fromUid];
      const taker = toUid === profile.uid ? { ...team.members?.[toUid], ...profile } : team.members?.[toUid];
      if (!taker) return;
      const event = events.find((e) => e.id === eventId);
      await db.claimSlot(team.id, eventId, fromUid, toUid, taker.name, taker.initials || initialsOf(taker.name), taker.color || colorFor(toUid));
      if (event) {
        // Everyone else hears the spot is gone; the opener gets their own note below.
        sendSlotTakenEmail({
          recipients: teamEmails([toUid, fromUid]).concat(taker.email && toUid !== profile.uid ? [taker.email] : []),
          claimedByName: taker.name,
          openerName: opener?.name || "A teammate",
          title: event.title,
          date: event.date,
          startTime: event.startTime,
          teamName: team.name,
          appUrl: window.location.origin,
        }).catch(() => {});
      }
      if (!quietOpener && opener?.email && event) {
        sendSlotClaimedEmail({
          toEmail: opener.email,
          toName: opener.name,
          title: event.title,
          date: event.date,
          claimedByName: taker.name,
          teamName: team.name,
          appUrl: window.location.origin,
        }).catch(() => {});
      }
    },
    // Admin: replace one player with another in a single step (no "open" email in between).
    swapPlayer: async (eventId, fromUid, toUid) => {
      await db.openSlot(team.id, eventId, fromUid);
      await value.claimSlot(eventId, fromUid, toUid);
    },
    cancelEvent: (eventId) => db.cancelEvent(team.id, eventId),
    deleteEvents: (eventIds) => db.deleteEvents(team.id, eventIds),
    addParticipants: async (eventId, uids) => {
      const event = events.find((e) => e.id === eventId);
      const newParticipants = {};
      const emailRecipients = [];
      uids.forEach((uid) => {
        const m = team.members?.[uid];
        if (!m) return;
        newParticipants[uid] = { uid, name: m.name, initials: m.initials, color: m.color, status: "pending" };
        if (m.email) emailRecipients.push({ email: m.email, name: m.name });
      });
      await db.addParticipants(team.id, eventId, newParticipants);
      if (event && emailRecipients.length > 0) {
        sendAddedToEventEmail({
          recipients: emailRecipients,
          teamName: team.name,
          title: event.title,
          date: event.date,
          startTime: event.startTime,
          location: event.location,
          organizerName: profile.name,
          appUrl: window.location.origin,
        }).catch(() => {});
      }
    },
    joinEvent: (eventId) =>
      db.joinEvent(team.id, eventId, { uid: profile.uid, name: profile.name, initials: profile.initials || initialsOf(profile.name), color: profile.color || colorFor(profile.uid) }),
    withdrawFromEvent: (eventId) => db.withdrawFromEvent(team.id, eventId, profile.uid),
    setWinterResult: (eventId, { outcome, score }) =>
      db.setWinterResult(team.id, eventId, { outcome, score, recordedBy: profile.uid, recordedByName: profile.name, recordedAt: Date.now() }),
    addSummerResult: (eventId, { teamALabel, teamBLabel, winner, score }) =>
      db.addSummerResult(team.id, eventId, { teamALabel, teamBLabel, winner, score, recordedBy: profile.uid, recordedByName: profile.name, recordedAt: Date.now() }),
    deleteSummerResult: (eventId, resultId) => db.deleteSummerResult(team.id, eventId, resultId),
    subscribeComments: (eventId, cb) => db.subscribeComments(eventId, cb, team.id),
    postComment: (eventId, text) => db.postComment(eventId, { authorId: profile.uid, authorName: profile.name, text }, team.id),
    subscribeAnnouncements: (cb) => db.subscribeAnnouncements(team.id, cb),
    postAnnouncement: (text) => db.postAnnouncement(team.id, { authorId: profile.uid, authorName: profile.name, text }),
    subscribeConversations: (cb) => db.subscribeConversations(profile.uid, cb, team.id),
    subscribeThread: (otherUid, cb) => db.subscribeThread(profile.uid, otherUid, cb, team.id),
    sendDM: (toMember, text) => db.sendDM(team.id, profile.uid, toMember, text),

    // Vacation days live directly on the member record — see src/lib/vacations.js.
    addVacation: async ({ start, end }) => {
      const vacations = [...(team.members[profile.uid]?.vacations || []), { id: genVacationId(), start, end }];
      await db.updateMemberInTeam(team.id, profile.uid, { vacations });
      const conflicts = conflictsForRange(events, profile.uid, start, end);
      if (conflicts.length > 0) {
        const admins = Object.values(team.members).filter((m) => m.isAdmin && m.email && m.uid !== profile.uid);
        if (admins.length > 0) {
          conflicts.forEach((e) => {
            sendVacationConflictEmail({
              adminRecipients: admins,
              playerName: profile.name,
              title: e.title,
              date: e.date,
              teamName: team.name,
              appUrl: window.location.origin,
            }).catch(() => {});
          });
        }
      }
      return conflicts;
    },
    removeVacation: async (vacationId) => {
      const vacations = (team.members[profile.uid]?.vacations || []).filter((v) => v.id !== vacationId);
      await db.updateMemberInTeam(team.id, profile.uid, { vacations });
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
