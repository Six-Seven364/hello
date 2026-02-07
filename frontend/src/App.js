import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import AuthPage from "@/pages/AuthPage";
import LockScreen from "@/pages/LockScreen";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("gridlock_token");
    const userData = localStorage.getItem("gridlock_user");
    
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
      const unlocked = sessionStorage.getItem("gridlock_unlocked");
      if (unlocked === "true") {
        setIsUnlocked(true);
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem("gridlock_token", token);
    localStorage.setItem("gridlock_user", JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
    if (!userData.has_lock_code) {
      setIsUnlocked(true);
      sessionStorage.setItem("gridlock_unlocked", "true");
    }
  };

  const handleUnlock = () => {
    setIsUnlocked(true);
    sessionStorage.setItem("gridlock_unlocked", "true");
  };

  const handleLogout = () => {
    localStorage.removeItem("gridlock_token");
    localStorage.removeItem("gridlock_user");
    sessionStorage.removeItem("gridlock_unlocked");
    setIsAuthenticated(false);
    setIsUnlocked(false);
    setUser(null);
  };

  const handleLockCodeSet = (lockType) => {
    const updatedUser = { ...user, has_lock_code: true, lock_type: lockType };
    localStorage.setItem("gridlock_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-cyan-400 font-orbitron text-xl animate-pulse">
          GRIDLOCK
        </div>
      </div>
    );
  }

  return (
    <div className="App min-h-screen bg-[#050505]">
      <div className="scanlines" />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              !isAuthenticated ? (
                <AuthPage onLogin={handleLogin} />
              ) : !isUnlocked && user?.has_lock_code ? (
                <LockScreen user={user} onUnlock={handleUnlock} />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              isAuthenticated && (isUnlocked || !user?.has_lock_code) ? (
                <Dashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/settings"
            element={
              isAuthenticated && (isUnlocked || !user?.has_lock_code) ? (
                <Settings user={user} onLogout={handleLogout} onLockCodeSet={handleLockCodeSet} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#0A0A0A',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            color: '#E0E0E0',
            fontFamily: 'JetBrains Mono, monospace',
          },
        }}
      />
    </div>
  );
}

export default App;
