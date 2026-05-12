import { BrowserRouter } from "react-router-dom";
import { useApp } from "./AppContext.jsx";
import LoginScreen from "./LoginScreen.jsx";
import PublicSignPage from "./PublicSignPage.jsx";
import PinSetupPage from "./PinSetupPage.jsx";
import PublicPrivacyPolicy from "./PublicPrivacyPolicy.jsx";
import FTIDashboard from "./FTIDashboard.jsx";

function AppWrapper() {
  const { currentUser } = useApp();

  // Public sign page bypasses auth — handle it before router for backward compat
  const signMatch = window.location.pathname.match(/^\/sign\/(.+)$/);
  if (signMatch) return <PublicSignPage token={signMatch[1]} />;

  // PIN setup page (v27.56) — emailed setup link; also bypasses login since
  // the employee may not have login access yet and the link is self-authenticating.
  if (window.location.pathname === "/set-pin") return <PinSetupPage />;

  // Privacy policy (v28.55) — public legal page hosted in the app rather
  // than on the IONOS marketing site, where the WordPress privacy-policy
  // template was a blank placeholder. Twilio A2P campaign Privacy Policy
  // URL points here.
  if (window.location.pathname === "/privacy-policy") return <PublicPrivacyPolicy />;

  if (!currentUser) return <LoginScreen />;

  // Authenticated — wrap dashboard in BrowserRouter so all internal navigation uses URLs.
  return (
    <BrowserRouter>
      <FTIDashboard />
    </BrowserRouter>
  );
}

export default AppWrapper;
