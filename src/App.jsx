import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import Shell from "./components/Shell";
import Login from "./screens/Login";
import OnboardTeam from "./screens/OnboardTeam";

// Everything past the login/onboarding gate is code-split so the first
// paint (and the local demo/Firebase auth check) only downloads what it
// needs — this matters most for WinterImport, which pulls in the xlsx
// parsing library, and it costs nothing on navigation since Vite
// prefetches the chunk on hover/click.
const Hub = lazy(() => import("./screens/Hub"));
const Notifications = lazy(() => import("./screens/Notifications"));
const Schedule = lazy(() => import("./screens/Schedule"));
const Propose = lazy(() => import("./screens/Propose"));
const EventDetail = lazy(() => import("./screens/EventDetail"));
const Team = lazy(() => import("./screens/Team"));
const Messages = lazy(() => import("./screens/Messages"));
const Thread = lazy(() => import("./screens/Thread"));
const Settings = lazy(() => import("./screens/Settings"));
const More = lazy(() => import("./screens/More"));
const VacationDays = lazy(() => import("./screens/VacationDays"));
const GameLedger = lazy(() => import("./screens/GameLedger"));
const Payments = lazy(() => import("./screens/Payments"));
const SlotMarketplace = lazy(() => import("./screens/SlotMarketplace"));
const WinterImport = lazy(() => import("./screens/WinterImport"));

function RouteLoading() {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="display" style={{ color: "var(--text-faint)", fontSize: 14 }}>Loading…</div>
    </div>
  );
}

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
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/summer" element={<Schedule season="summer" />} />
        <Route path="/winter" element={<Schedule season="winter" />} />
        <Route path="/propose/:season" element={<Propose />} />
        <Route path="/winter/import" element={<WinterImport />} />
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/team" element={<Team />} />
        <Route path="/more" element={<More />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:uid" element={<Thread />} />
        <Route path="/vacations" element={<VacationDays />} />
        <Route path="/ledger" element={<GameLedger />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/marketplace" element={<SlotMarketplace />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
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
