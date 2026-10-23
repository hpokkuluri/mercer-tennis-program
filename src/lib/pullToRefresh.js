// Pull down at the top of any screen to reload — only in the installed app,
// since a browser tab already has its own pull-to-refresh.
export function installPullToRefresh() {
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (!standalone) return;
  const ind = document.createElement("div");
  ind.id = "mtp-ptr";
  ind.textContent = "↓";
  document.body.appendChild(ind);
  const THRESH = 80;
  let startY = null;
  let pulled = 0;

  const scroller = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const oy = getComputedStyle(n).overflowY;
      if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight) return n;
    }
    return document.scrollingElement;
  };
  document.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;
      const s = scroller(e.target);
      startY = s && s.scrollTop <= 0 ? e.touches[0].clientY : null;
      pulled = 0;
    },
    { passive: true }
  );
  document.addEventListener(
    "touchmove",
    (e) => {
      if (startY == null) return;
      pulled = Math.max(0, e.touches[0].clientY - startY);
      const p = Math.min(pulled, THRESH * 1.5);
      ind.style.opacity = p > 10 ? "1" : "0";
      ind.style.transform = `translate(-50%, ${p * 0.6 - 40}px) rotate(${p >= THRESH ? 180 : 0}deg)`;
    },
    { passive: true }
  );
  document.addEventListener("touchend", () => {
    if (startY != null && pulled >= THRESH) {
      ind.textContent = "⟳";
      window.location.reload();
      return;
    }
    startY = null;
    ind.style.opacity = "0";
    ind.style.transform = "translate(-50%, -60px)";
  });
}
