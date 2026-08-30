// The Mercer Tennis Program mark: a racquet + ball glyph with "MTP" set
// inside the tile. Uses --accent/--accent-text/--radius-md so it re-themes
// itself automatically with the rest of the app (see src/lib/themes.js) —
// never hardcode colors here.
export default function Logo({ size = 40, showText = true, style = {} }) {
  const iconSize = Math.round(size * 0.54);
  const canShowText = showText && size >= 32;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "var(--radius-md)",
        background: "var(--accent)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: Math.max(1, Math.round(size * 0.02)),
        flexShrink: 0,
        ...style,
      }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
        <g transform="rotate(-18 52 44)">
          <ellipse cx="52" cy="40" rx="24" ry="30" fill="none" stroke="var(--accent-text)" strokeWidth="9" />
          <rect x="46" y="68" width="12" height="42" rx="6" fill="var(--accent-text)" />
        </g>
        <circle cx="82" cy="80" r="21" fill="oklch(88% 0.19 105)" stroke="var(--accent-text)" strokeWidth="5" />
      </svg>
      {canShowText && (
        <div
          className="display"
          style={{
            fontWeight: 800,
            fontSize: Math.max(7, Math.round(size * 0.155)),
            letterSpacing: "0.06em",
            color: "var(--accent-text)",
            lineHeight: 1,
          }}
        >
          MTP
        </div>
      )}
    </div>
  );
}
