import { hasFirebaseConfig } from "./firebaseConfig";
import * as local from "./localData";

export const USING_FIREBASE = hasFirebaseConfig();

let backend = local;
let readyPromise = Promise.resolve();

if (USING_FIREBASE) {
  // Lazy-loaded so the demo build never even downloads the firebase SDK.
  readyPromise = import("./firebaseData").then((mod) => {
    backend = mod;
  });
}

export async function ready() {
  await readyPromise;
}

// auth
export const signUp = (...a) => backend.signUp(...a);
export const signIn = (...a) => backend.signIn(...a);
export const signOutUser = (...a) => backend.signOutUser(...a);
export const onAuthChange = (...a) => backend.onAuthChange(...a);
export const resetPassword = (...a) => backend.resetPassword(...a);
export const changePassword = (...a) => backend.changePassword(...a);
export const updateProfileTeam = (...a) => backend.updateProfileTeam(...a);
export const updateUserProfile = (...a) => backend.updateUserProfile(...a);

// teams
export const createTeam = (...a) => backend.createTeam(...a);
export const joinTeam = (...a) => backend.joinTeam(...a);
export const subscribeTeam = (...a) => backend.subscribeTeam(...a);
export const setSeason = (...a) => backend.setSeason(...a);
export const setAdmin = (...a) => backend.setAdmin(...a);
export const updateMemberInTeam = (...a) => backend.updateMemberInTeam(...a);
export const removeMember = (...a) => backend.removeMember(...a);
export const inviteMemberByEmail = (...a) => backend.inviteMemberByEmail(...a);

// events
export const subscribeEvents = (...a) => backend.subscribeEvents(...a);
export const createEvent = (...a) => backend.createEvent(...a);
export const respondToEvent = (...a) => backend.respondToEvent(...a);
export const reassignInvite = (...a) => backend.reassignInvite(...a);
export const cancelEvent = (...a) => backend.cancelEvent(...a);
export const addParticipants = (...a) => backend.addParticipants(...a);
export const joinEvent = (...a) => backend.joinEvent(...a);
export const withdrawFromEvent = (...a) => backend.withdrawFromEvent(...a);
export const setWinterResult = (...a) => backend.setWinterResult(...a);
export const addSummerResult = (...a) => backend.addSummerResult(...a);
export const deleteSummerResult = (...a) => backend.deleteSummerResult(...a);

// comments
export const subscribeComments = (...a) => backend.subscribeComments(...a);
export const postComment = (...a) => backend.postComment(...a);

// announcements
export const subscribeAnnouncements = (...a) => backend.subscribeAnnouncements(...a);
export const postAnnouncement = (...a) => backend.postAnnouncement(...a);

// direct messages
export const subscribeConversations = (...a) => backend.subscribeConversations(...a);
export const subscribeThread = (...a) => backend.subscribeThread(...a);
export const sendDM = (...a) => backend.sendDM(...a);
