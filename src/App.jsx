import { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { useApp } from "./AppContext.jsx";
import LoginScreen from "./LoginScreen.jsx";
import PublicSignPage from "./PublicSignPage.jsx";
import PinSetupPage from "./PinSetupPage.jsx";
import FTIDashboard from "./FTIDashboard.jsx";
import UpdateBanner from "./UpdateBanner.jsx";

function AppWrapper() {
  const { currentUser } = useApp();

  // v28.311 — JSA sign-link params LATCHED at mount. The sign flow must win
  // regardless of session state: a logged-in phone previously rendered the
  // dashboard and silently ignored ?jsa_sign= (the "clicked the text and
  // nothing happened" field failure), and a user who logged in mid-flow had
  // the sign panel swapped out from under them. LoginScreen strips the query
  // once it reads it, so the latch (not the live URL) keeps this branch
  // stable for the whole visit; DONE offers OPEN THE APP to exit.
  const [jsaSignFlow] = useState(() => new URLSearchParams(window.location.search).has("jsa_sign"));

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

  if (jsaSignFlow)
    return (
      <>
        <UpdateBanner />
        <LoginScreen />
      </>
    );

  if (!currentUser)
    return (
      <>
        <UpdateBanner />
        <LoginScreen />
      </>
    );

  // Authenticated — wrap dashboard in BrowserRouter so all internal navigation uses URLs.
  return (
    <BrowserRouter>
      <UpdateBanner />
      <FTIDashboard />
    </BrowserRouter>
  );
}

export default AppWrapper;
