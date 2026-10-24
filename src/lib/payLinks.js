// Links that open a payment app with the payee and amount filled in.
//  - Venmo: app deep link (venmo://) when installed, else the Venmo website.
//  - PayPal: paypal.me link — opens the PayPal app if installed, else the site.
//  - Apple Cash: Apple has no public link into Apple Cash, so open Messages
//    to the payer with the amount typed; the player taps Apple Cash there.
// Zelle has no shared link (it lives in each bank's app) — copy buttons cover it.

export const isIOS = () =>
  typeof navigator !== "undefined" && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
const isMobile = () => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const cleanHandle = (s) => String(s || "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?(paypal\.me|venmo\.com)\/(u\/)?/i, "").replace(/\/.*$/, "");

export function venmoLinks({ username, amount, note }) {
  const u = cleanHandle(username);
  if (!u) return null;
  const q = `txn=pay&recipients=${encodeURIComponent(u)}&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`;
  return { app: `venmo://paycharge?${q}`, web: `https://account.venmo.com/pay?${q}` };
}

export function paypalLink({ name, amount }) {
  const n = cleanHandle(name);
  return n ? `https://paypal.me/${encodeURIComponent(n)}/${amount.toFixed(2)}USD` : null;
}

export function appleCashLink({ phone, amount, note }) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const to = digits.length === 10 ? `+1${digits}` : `+${digits}`;
  const body = encodeURIComponent(`Apple Pay $${amount.toFixed(2)} — ${note}`);
  return `sms:${to}${isIOS() ? "&" : "?"}body=${body}`;
}

// Try the app; if the phone doesn't switch away (app not installed), go to the website.
export function openVenmo(links) {
  if (!links) return;
  if (!isMobile()) {
    window.open(links.web, "_blank", "noopener");
    return;
  }
  let left = false;
  const onHide = () => {
    if (document.visibilityState === "hidden") left = true;
  };
  document.addEventListener("visibilitychange", onHide);
  window.location.href = links.app;
  setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    if (!left) window.location.href = links.web;
  }, 1400);
}
