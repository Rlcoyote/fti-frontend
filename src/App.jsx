import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { setCurrentUser as setGlobalUser } from "./config.js";
import LoginScreen from "./LoginScreen.jsx";
import PublicSignPage from "./PublicSignPage.jsx";
import FTIDashboard from "./FTIDashboard.jsx";

// Public sign route — bypasses authentication entirely
function PublicSignRoute() {
  const token = window.location.pathname.match(/^\/sign\/(.+)$/)?.[1];
  return <PublicSignPage token={token} />;
}

function AppWrapper() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Check for saved session on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("fti_user");
    if (saved) {
      try {
        const user = JSON.parse(saved);
        setGlobalUser(user.name);
        setCurrentUser(user);
      } catch (e) { sessionStorage.removeItem("fti_user"); }
    }
    setAuthChecked(true);
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

  // Public sign page bypasses auth — handle it before router for backward compat
  const signMatch = window.location.pathname.match(/^\/sign\/(.+)$/);
  if (signMatch) return <PublicSignPage token={signMatch[1]} />;

  // Wait for session check to complete before rendering anything
  if (!authChecked) return null;

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  // Authenticated — wrap dashboard in BrowserRouter so all internal navigation uses URLs
  return (
    <BrowserRouter>
      <FTIDashboard currentUser={currentUser} onLogout={handleLogout} />
    </BrowserRouter>
  );
}

export default AppWrapper;
