import { useState, useEffect } from "react";
import { setCurrentUser as setGlobalUser } from "./config.js";
import LoginScreen from "./LoginScreen.jsx";
import PublicSignPage from "./PublicSignPage.jsx";
import FTIDashboard from "./FTIDashboard.jsx";

function AppWrapper() {
  const [currentUser, setCurrentUser] = useState(null);

  // Public signature page — intercept /sign/:token before login
  const signMatch = window.location.pathname.match(/^\/sign\/(.+)$/);
  if (signMatch) return <PublicSignPage token={signMatch[1]} />;

  // Check for saved session
  useEffect(() => {
    const saved = sessionStorage.getItem("fti_user");
    if (saved) {
      try {
        const user = JSON.parse(saved);
        setGlobalUser(user.name);
        setCurrentUser(user);
      } catch (e) { sessionStorage.removeItem("fti_user"); }
    }
  }, []);

  const handleLogin = (user) => {
    setGlobalUser(user.name);
    setCurrentUser(user);
    sessionStorage.setItem("fti_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    setGlobalUser("");
    setCurrentUser(null);
    sessionStorage.removeItem("fti_user");
  };

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;
  return <FTIDashboard currentUser={currentUser} onLogout={handleLogout} />;
}

export default AppWrapper;
