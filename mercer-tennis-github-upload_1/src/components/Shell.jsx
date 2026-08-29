// The app's outer frame: centers a phone-width column, works full-bleed
// on an actual phone and as a phone-shaped card on desktop.
export default function Shell({ children }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        justifyContent: "center",
        background: "oklch(93% 0.006 95)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          minHeight: "100dvh",
          background: "var(--bg)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          boxShadow: "0 0 40px oklch(20% 0.02 260 / 0.08)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
