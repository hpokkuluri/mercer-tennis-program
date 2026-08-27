export default function Avatar({ initials, color, size = 34, ring, style = {} }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: color?.bg || "oklch(88% 0.01 90)",
        color: color?.text || "oklch(40% 0.01 260)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700,
        fontSize: Math.round(size * 0.36),
        flexShrink: 0,
        boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
        ...style,
      }}
    >
      {initials}
    </div>
  );
}
