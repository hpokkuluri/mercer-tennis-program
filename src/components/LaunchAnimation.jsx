import { useEffect, useState } from "react";

// Opening animation (4 s) on a fresh app launch: a player tosses the ball
// and serves, the ball flies across the court, bounces, and lands where the
// Mercer Tennis logo pops in. Tap anywhere to skip. Phones set to "Reduce
// Motion" get a short fade of the logo instead. Plays once per launch
// (sessionStorage), not when moving between screens.

const KEY = "mtp.launchPlayed";
const DURATION = 4000;

export function shouldPlayLaunch() {
  try {
    return sessionStorage.getItem(KEY) !== "1";
  } catch {
    return true;
  }
}

const css = `
.mtp-launch { position: fixed; inset: 0; z-index: 1000; background: #93c100; overflow: hidden; cursor: pointer;
  animation: mtp-out 0.46s ease-in 3.54s forwards; }
.mtp-launch.skip { animation: mtp-out .25s ease-in forwards; }
.mtp-launch svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.mtp-court { opacity: 0; animation: mtp-fade 0.57s ease-out 0.06s forwards; }
.mtp-player { opacity: 0; transform-box: fill-box; animation: mtp-fade 0.34s ease-out 0.17s forwards, mtp-player-out 0.46s ease-in 2.63s forwards; }
.mtp-toss { transform-origin: 104px 520px; animation: mtp-toss-arm 1.26s ease-in-out 0.34s both; }
.mtp-swing { transform-origin: 122px 500px; animation: mtp-swing-arm 1.37s cubic-bezier(.45,0,.35,1) 0.4s both; }
.mtp-ball { offset-path: path("M 100 470 C 100 360, 118 360, 120 410 C 170 380, 235 400, 250 455 C 255 420, 225 360, 195 330"); offset-rotate: 0deg;
  offset-distance: 0%; opacity: 0; animation: mtp-ball 2.11s cubic-bezier(.35,.1,.4,1) 0.46s forwards; }
.mtp-shadow { opacity: 0; transform-box: fill-box; transform-origin: center; animation: mtp-shadow 0.57s ease-out 1.77s forwards; }
.mtp-court { animation: mtp-fade 0.57s ease-out 0.06s forwards, mtp-dim 0.57s ease-in 2.4s forwards; }
@keyframes mtp-dim { from { opacity: 1; } to { opacity: .35; } }
.mtp-logo { opacity: 0; transform: scale(.2); transform-origin: 195px 330px; animation: mtp-pop 0.69s cubic-bezier(.2,1.6,.4,1) 2.4s forwards; }
.mtp-name { opacity: 0; transform: translateY(14px); animation: mtp-rise 0.57s ease-out 2.91s forwards; }
.mtp-sub { opacity: 0; transform: translateY(10px); animation: mtp-rise 0.57s ease-out 3.14s forwards; }
.mtp-skip { position: absolute; left: 0; right: 0; bottom: calc(env(safe-area-inset-bottom, 0px) + 26px); text-align: center;
  font: 600 12px system-ui, -apple-system, sans-serif; color: rgba(29,42,0,.55); opacity: 0; animation: mtp-fade 0.46s ease-out 0.91s forwards; }
@keyframes mtp-fade { to { opacity: 1; } }
@keyframes mtp-out { to { opacity: 0; visibility: hidden; } }
@keyframes mtp-player-out { to { opacity: 0; transform: translateX(-20px); } }
@keyframes mtp-toss-arm { 0% { transform: rotate(0deg); } 35% { transform: rotate(-150deg); } 70% { transform: rotate(-150deg); } 100% { transform: rotate(-20deg); } }
/* 0 = racket low at the side; +60 = dropped behind the back; -160 = straight up at contact; -240 = follow-through across the body */
@keyframes mtp-swing-arm { 0% { transform: rotate(0deg); } 40% { transform: rotate(60deg); } 69% { transform: rotate(-160deg); } 100% { transform: rotate(-240deg); } }
@keyframes mtp-ball {
  0% { opacity: 1; offset-distance: 0%; animation-timing-function: ease-out; }
  20% { offset-distance: 13%; animation-timing-function: ease-in; }
  42% { offset-distance: 27%; animation-timing-function: linear; }
  70% { offset-distance: 62%; animation-timing-function: ease-out; }
  94% { offset-distance: 98%; opacity: 1; }
  100% { offset-distance: 100%; opacity: 0; }
}
@keyframes mtp-shadow { 0% { opacity: 0; transform: scale(.4); } 40% { opacity: .35; transform: scale(1); } 100% { opacity: 0; transform: scale(1.4); } }
@keyframes mtp-pop { 0% { opacity: 0; transform: scale(.2); } 60% { opacity: 1; transform: scale(1.12); } 100% { opacity: 1; transform: scale(1); } }
@keyframes mtp-rise { to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) {
  .mtp-launch { animation: mtp-out .4s ease-in 1.2s forwards; }
  .mtp-court, .mtp-player, .mtp-ball, .mtp-shadow, .mtp-skip { display: none; }
  .mtp-logo, .mtp-name, .mtp-sub { animation: mtp-fade .5s ease-out forwards; transform: none; }
}
`;

export default function LaunchAnimation({ onDone }) {
  const [skipping, setSkipping] = useState(false);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      // private mode — it'll just play again next time
    }
    const t = setTimeout(onDone, reduced ? 1600 : DURATION);
    return () => clearTimeout(t);
  }, [onDone, reduced]);

  const skip = () => {
    if (skipping) return;
    setSkipping(true);
    setTimeout(onDone, 260);
  };

  return (
    <div className={`mtp-launch${skipping ? " skip" : ""}`} data-testid="launch-animation" onClick={skip} role="presentation">
      <style>{css}</style>
      <svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {/* court in perspective */}
        <g className="mtp-court" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="3" strokeLinejoin="round">
          <path d="M 40 650 L 130 380 L 260 380 L 350 650 Z" />
          <path d="M 113 430 L 277 430" />
          <path d="M 70 560 L 320 560" />
          <path d="M 195 430 L 195 560" />
          <path d="M 92 480 L 298 480" stroke="rgba(29,42,0,.6)" strokeWidth="5" />
          <path d="M 92 462 L 92 480 M 298 462 L 298 480" stroke="rgba(29,42,0,.6)" strokeWidth="3" />
        </g>
        <ellipse className="mtp-shadow" cx="250" cy="457" rx="11" ry="3.5" fill="rgba(29,42,0,.6)" />

        {/* player silhouette, serving */}
        <g className="mtp-player" fill="#1d2a00">
          <circle cx="112" cy="470" r="15" />
          <path d="M 100 488 Q 112 482 126 490 L 132 560 Q 116 566 98 560 Z" />
          <path d="M 102 556 L 86 640 L 98 642 L 114 572 Z" />
          <path d="M 124 556 L 148 636 L 160 632 L 132 560 Z" />
          {/* toss arm */}
          <g className="mtp-toss">
            <path d="M 104 498 L 72 528 L 78 536 L 110 508 Z" />
          </g>
          {/* racket arm */}
          <g className="mtp-swing">
            <path d="M 120 498 L 156 520 L 151 528 L 116 508 Z" />
            <line x1="153" y1="524" x2="176" y2="540" stroke="#1d2a00" strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="190" cy="550" rx="15" ry="20" transform="rotate(-55 190 550)" fill="none" stroke="#1d2a00" strokeWidth="4.5" />
          </g>
        </g>

        {/* ball */}
        <circle className="mtp-ball" r="9" fill="#f4ff6b" stroke="#1d2a00" strokeWidth="1.5" />

        {/* logo + name */}
        <g className="mtp-logo">
          <rect x="139" y="274" width="112" height="112" rx="26" fill="rgba(0,0,0,.18)" transform="translate(0 6)" />
          <image href="/icons/icon-512.png" x="139" y="274" width="112" height="112" clipPath="inset(0 round 26px)" />
        </g>
        <text className="mtp-name" x="195" y="430" textAnchor="middle" fill="#1d2a00" style={{ font: "800 26px system-ui, -apple-system, sans-serif", letterSpacing: "-0.02em" }}>
          Mercer Tennis
        </text>
        <text className="mtp-sub" x="195" y="456" textAnchor="middle" fill="rgba(29,42,0,.7)" style={{ font: "600 13px system-ui, -apple-system, sans-serif", letterSpacing: "0.22em" }}>
          PROGRAM
        </text>
      </svg>
      {!reduced && <div className="mtp-skip">Tap to skip</div>}
    </div>
  );
}
