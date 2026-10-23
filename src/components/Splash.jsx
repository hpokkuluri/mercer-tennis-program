// Same look as the launch screen in index.html, so opening the app goes
// green logo → app with no white flash in between.
export default function Splash() {
  return (
    <div data-testid="splash" style={{ position: "fixed", inset: 0, background: "#93c100", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, zIndex: 100 }}>
      <img src="/icons/icon-512.png" alt="" width={112} height={112} style={{ borderRadius: 26, boxShadow: "0 10px 30px rgba(0,0,0,.18)" }} />
      <div style={{ font: "800 20px/1.2 system-ui, -apple-system, sans-serif", color: "#1d2a00", letterSpacing: "-0.01em" }}>Mercer Tennis</div>
    </div>
  );
}
