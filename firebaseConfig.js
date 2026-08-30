// Fill these in from your own free Firebase project (see SETUP.md) and
// put them in a .env file — see .env.example. Until then, hasFirebaseConfig()
// is false and the app runs on the built-in local demo backend instead.

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function hasFirebaseConfig() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}
