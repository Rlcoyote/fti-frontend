import { BrowserRouter } from "react-router-dom";
import { useApp } from "./AppContext.jsx";
import LoginScreen from "./LoginScreen.jsx";
import PublicSignPage from "./PublicSignPage.jsx";
import FTIDashboard from "./FTIDashboard.jsx";

function AppWrapper() {
  const { currentUser } = useApp();

  // Public sign page bypasses auth — handle it before router for backward compat
  const signMatch = window.location.pathname.match(/^\/sign\/(.+)$/);
  if (signMatch) return <PublicSignPage token={signMatch[1]} />;

  if (!currentUser) return <LoginScreen />;

  // Authenticated — wrap dashboard in BrowserRouter so all internal navigation uses URLs.
  return (
    <BrowserRouter>
      <FTIDashboard />
    </BrowserRouter>
  );
}

export default AppWrapper;
