// GET → { configured, publicKey } for the app to subscribe a phone to notifications.
import { adminReady, vapidKeys, json } from "../lib/server.js";

export default async () => {
  if (!adminReady()) return json(200, { configured: false });
  const { publicKey } = await vapidKeys();
  return json(200, { configured: true, publicKey });
};
