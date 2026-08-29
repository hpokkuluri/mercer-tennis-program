import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import Shell from "./components/Shell";
import Login from "./screens/Login";
import OnboardTeam from "./screens/OnboardTeam";
import Hub from "./screens/Hub";
import Schedule from "./screens/Schedule";
import Propose from "./screens/Propose";
import EventDetail from "./screens/EventDetail";
import Team from "./screens/Team";
import Messages from "./screens/Messages";
import Thread from "./screens/Thread";
import Settings from "./screens/Settings";

function Gate() {
  const { authLoading, profile, team } = useApp();

  if (authLoading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="display" style={{ color: "var(--text-faint)", fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  if (!profile) {
    return <Login />;
  }

  if (!team) {
    return <OnboardTeam />;
  }

  return (
    <Routes>
      <Route path="/" element={<Hub />} />
      <Route path="/summer" element={<Schedule season="summer" />} />
      <Route path="/winter" element={<Schedule season="winter" />} />
      <Route path="/propose/:season" element={<Propose />} />
      <Route path="/event/:id" element={<EventDetail />} />
      <Route path="/team" element={<Team />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/messages/:uid" element={<Thread />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Shell>
          <Gate />
        </Shell>
      </HashRouter>
    </AppProvider>
  );
}
