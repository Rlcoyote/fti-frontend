import { BrowserRouter } from "react-router-dom";
import { useApp } from "./AppContext.jsx";
import LoginScreen from "./LoginScreen.jsx";
import PublicSignPage from "./PublicSignPage.jsx";
import PinSetupPage from "./PinSetupPage.jsx";
import FTIDashboard from "./FTIDashboard.jsx";

function AppWrapper() {
  const { currentUser } = useApp();

  // Public sign page bypasses auth — handle it before router for backward compat
  const signMatch = window.location.pathname.match(/^\/sign\/(.+)$/);
  if (signMatch) return <PublicSignPage token={signMatch[1]} />;

  // PIN setup page (v27.56) — emailed setup link; also bypasses login since
  // the employee may not have login access yet and the link is self-authenticating.
  if (window.location.pathname === "/set-pin") return <PinSetupPage />;

  if (!currentUser) return <LoginScreen />;

  // Authenticated — wrap dashboard in BrowserRouter so all internal navigation uses URLs.
  return (
    <BrowserRouter>
      <FTIDashboard />
    </BrowserRouter>
  );
}

export default AppWrapper;
