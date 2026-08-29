# Connecting RallyPoint to a free Firebase project

Right now the app runs on a **local demo backend** — no account, no
setup, but data only lives in one browser and nothing is secure. This
guide gets you onto **real, free, cloud-hosted accounts** shared across
everyone's phones. It takes about 10 minutes, no credit card required.

## 1. Create a Firebase project (free)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in with any Google account.
2. Click **Add project**, give it a name (e.g. "RallyPoint"), and finish the wizard (you can turn off Google Analytics — not needed).
3. This puts you on the **Spark plan**, which is free forever for an app this size (no card on file).

## 2. Turn on Authentication

1. In the left sidebar, click **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password**.

## 3. Turn on Firestore (the database)

1. In the left sidebar, click **Build → Firestore Database → Create database**.
2. Pick any region close to your team, start in **production mode**.
3. Once it's created, open the **Rules** tab and paste in the contents of `firestore.rules` from this project, then click **Publish**. This makes sure only signed-in teammates can read/write your team's data.

## 4. Get your web app config

1. Click the gear icon → **Project settings**.
2. Scroll to **Your apps**, click the **</>** (web) icon to register a new web app (nickname it anything, e.g. "RallyPoint Web"). Skip the hosting checkbox for now.
3. It'll show you a `firebaseConfig` object with `apiKey`, `authDomain`, etc. — keep this tab open.

## 5. Wire it into the app

1. In this project's folder, copy `.env.example` to a new file named `.env`.
2. Fill in each value from the `firebaseConfig` you just saw:

   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

3. Restart the dev server (`npm run dev`) if it was running — the login screen's demo-mode banner should disappear, meaning you're now talking to real Firebase.

## 6. Put it online for free (Firebase Hosting)

This gives your team a real `https://your-team.web.app` link, no app store needed.

```bash
npm install -g firebase-tools
firebase login
npm run build
firebase init hosting   # pick your project, "dist" as the public directory, "yes" to single-page app rewrite
firebase deploy
```

Share the link Firebase gives you. Anyone who opens it on their phone can tap **Share → Add to Home Screen** (iOS Safari) or the **install** prompt (Android Chrome) to get it looking and feeling like a real app icon.

## Notes on "free"

- Firebase Spark plan: free forever at this scale — no credit card needed to sign up for it.
- Firebase Hosting free tier: 10 GB storage / 360 MB per day transferred — enormous overkill for a team scheduling app.
- The only cost that could ever appear later is **publishing to Apple's or Google's app stores as a native app** ($99/yr or $25 one-time) — this project deliberately avoids that by being an installable web app instead.
- Real push notifications (a phone buzzing even when the app is closed) need a paid Firebase plan (Blaze) to run the server-side trigger function. This version updates live while the app is open, and shows a badge/dot for unread invites, but doesn't send OS-level push yet — a reasonable next upgrade if it turns out you need it.
