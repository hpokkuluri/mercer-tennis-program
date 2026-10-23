import { useAppOptional } from "../context/AppContext";

// Shows a teammate's photo when they've added one (Settings → Photo),
// otherwise their initials on their colour. Pass `uid` to look the photo up.
export default function Avatar({ uid, photo, initials, color, size = 34, ring, style = {} }) {
  const app = useAppOptional();
  const src = photo || (uid && app?.team?.members?.[uid]?.photo) || (uid && app?.profile?.uid === uid && app?.profile?.photo) || null;
  const base = {
    width: size,
    height: size,
    borderRadius: 999,
    flexShrink: 0,
    boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
    ...style,
  };
  if (src) {
    return <img src={src} alt="" width={size} height={size} style={{ ...base, objectFit: "cover", display: "block", background: color?.bg }} />;
  }
  return (
    <div
      style={{
        ...base,
        background: color?.bg || "oklch(88% 0.01 90)",
        color: color?.text || "oklch(40% 0.01 260)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {initials}
    </div>
  );
}
