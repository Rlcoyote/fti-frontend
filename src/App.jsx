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

  // /privacy-policy — the canonical privacy policy lives on the marketing
  // site (www.flotest.com/privacy-policy/), which is also the URL registered
  // with the Twilio A2P campaign. This route only catches stray old links
  // (e.g. an early A2P consent SMS) and bounces them to the real page. The
  // former in-app copy (PublicPrivacyPolicy.jsx — a v28.55 stopgap from when
  // the WordPress page was a blank placeholder) was removed once it had gone
  // stale; a divergent second copy of a legal document is a liability.
  if (window.location.pathname === "/privacy-policy") {
    window.location.replace("https://www.flotest.com/privacy-policy/");
    return null;
  }

  if (!currentUser) return <LoginScreen />;

  // Authenticated — wrap dashboard in BrowserRouter so all internal navigation uses URLs.
  return (
    <BrowserRouter>
      <FTIDashboard />
    </BrowserRouter>
  );
}

export default AppWrapper;
