import { useNavigate } from "react-router-dom";
import { ChevronLeftIcon } from "./Icons";

export function Header({ title, onBack, right }) {
  const navigate = useNavigate();
  return (
    <div
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
        padding: "calc(env(safe-area-inset-top, 0px) + 12px) 20px 12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}
    >
      {onBack !== false ? (
        <button
          onClick={() => (onBack ? onBack() : navigate(-1))}
          style={{ width: 36, height: 36, borderRadius: 999, background: "var(--card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <ChevronLeftIcon />
        </button>
      ) : (
        <div style={{ width: 36, height: 36 }} />
      )}
      <div className="display" style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{title}</div>
      {right || <div style={{ width: 36, height: 36 }} />}
    </div>
  );
}

export function Field({ label, ...props }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      <input
        {...props}
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "13px 14px",
          fontSize: 15,
          color: "var(--text)",
          outline: "none",
        }}
      />
    </label>
  );
}

export function PrimaryButton({ children, disabled, style = {}, ...props }) {
  return (
    <button
      disabled={disabled}
      {...props}
      className="display"
      style={{
        width: "100%",
        border: "none",
        borderRadius: 14,
        padding: "15px 0",
        background: disabled ? "oklch(88% 0.02 125)" : "var(--accent)",
        color: "var(--accent-text)",
        fontSize: 15,
        fontWeight: 700,
        boxShadow: disabled ? "none" : "0 4px 14px color-mix(in oklch, var(--accent) 35%, transparent)",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, tone = "neutral", style = {}, ...props }) {
  const tones = {
    neutral: { border: "1.5px solid oklch(88% 0.008 90)", color: "var(--text-muted)" },
    amber: { border: "1.5px solid var(--amber-solid)", color: "var(--amber-text)" },
    red: { border: "1.5px solid var(--red-solid)", color: "var(--red-text)" },
  };
  return (
    <button
      {...props}
      className="display"
      style={{
        width: "100%",
        background: "var(--card)",
        borderRadius: 14,
        padding: "14px 0",
        fontSize: 14,
        fontWeight: 700,
        ...tones[tone],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Card({ children, style = {} }) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 1px 2px oklch(20% 0.02 260 / 0.05)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children, style = {} }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", ...style }}>
      {children}
    </div>
  );
}

export function Badge({ tone = "green", children }) {
  const tones = {
    green: { background: "var(--green-bg)", color: "var(--green-text)" },
    amber: { background: "var(--amber-bg)", color: "var(--amber-text)" },
    red: { background: "var(--red-bg)", color: "var(--red-text)" },
    neutral: { background: "oklch(93% 0.008 90)", color: "var(--text-muted)" },
  };
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, ...tones[tone] }}>{children}</span>
  );
}

export function ErrorText({ children }) {
  if (!children) return null;
  return <div style={{ fontSize: 13, color: "var(--red-text)", background: "var(--red-bg)", borderRadius: 10, padding: "10px 12px" }}>{children}</div>;
}
