import { useEffect, useState } from "react";

// Thin strip at the top when the phone has no connection. The schedule keeps
// working from the copy saved on the phone; changes sync when back online.
export default function OfflineBanner() {
  const [offline, setOffline] = useState(typeof navigator !== "undefined" && navigator.onLine === false);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (!offline) return null;
  return (
    <div data-testid="offline-banner" style={{ position: "sticky", top: 0, zIndex: 40, padding: "calc(env(safe-area-inset-top, 0px) + 6px) 14px 6px", background: "oklch(30% 0.02 260)", color: "white", fontSize: 12, fontWeight: 600, textAlign: "center" }}>
      You're offline — showing your saved schedule. Changes will sync when you're back online.
    </div>
  );
}
