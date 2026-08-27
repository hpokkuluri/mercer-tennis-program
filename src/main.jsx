import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./theme.css";
import App from "./App.jsx";
import { applyTheme, getStoredThemeId } from "./lib/themes";
import { setUpdateSW } from "./lib/pwaUpdate";

applyTheme(getStoredThemeId());

// Installed home-screen apps (especially on iOS) only get a fresh copy of
// the app shell when the service worker actually takes over and the page
// reloads — otherwise a relaunch can silently keep showing an old cached
// version even after you've deployed an update. This registers the worker
// and reloads automatically the moment a new version is ready, so opening
// the app is enough to pick up the latest build.
setUpdateSW(registerSW({ immediate: true }));

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
