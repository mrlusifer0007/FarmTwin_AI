import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import i18n from "./i18n.js";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import NewFarm from "./pages/NewFarm.jsx";
import FarmDetail from "./pages/FarmDetail.jsx";
import WeatherIntelligence from "./pages/WeatherIntelligence.jsx";
import AIAdvisor from "./pages/AIAdvisor.jsx";
import DiseaseDetection from "./pages/DiseaseDetection.jsx";
import ServiceHub from "./pages/ServiceHub.jsx";
import Marketplace from "./pages/Marketplace.jsx";
import BuyerDashboard from "./pages/BuyerDashboard.jsx";
import Offers from "./pages/Offers.jsx";
import Inbox from "./pages/Inbox.jsx";
import Settings from "./pages/Settings.jsx";
import WhatIfLab from "./pages/WhatIfLab.jsx";

const STORAGE_KEY = "agritwin_user";
const ROLE_KEY = "agritwin_role";

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedUser = JSON.parse(stored);
        if (parsedUser?.language) {
          i18n.changeLanguage(parsedUser.language);
        }
        return parsedUser;
      }
    } catch (err) {
      console.error("Failed to parse stored user from localStorage:", err);
      localStorage.removeItem(STORAGE_KEY);
    }
    return null;
  });

  const [role, setRole] = useState(() => {
    return localStorage.getItem(ROLE_KEY) || "farmer";
  });
  const navigate = useNavigate();

  const handleLogin = (u, r) => {
    setUser(u);
    // Apply language immediately on login
    if (u && u.language) {
      i18n.changeLanguage(u.language);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    const initialRole = r || "farmer";
    setRole(initialRole);
    localStorage.setItem(ROLE_KEY, initialRole);
    navigate(initialRole === "buyer" ? "/buyer" : "/dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    i18n.changeLanguage("en");
    navigate("/");
  };

  const handleSwitchRole = (newRole) => {
    setRole(newRole);
    localStorage.setItem(ROLE_KEY, newRole);
    navigate(newRole === "buyer" ? "/buyer" : "/dashboard");
  };

  // Called from Settings page when user changes language mid-session
  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    if (user) {
      const updated = { ...user, language: lang };
      setUser(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  const common = {
    user,
    role,
    onSwitchRole: handleSwitchRole,
    onLogout: handleLogout,
    onLanguageChange: handleLanguageChange,
  };

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to={role === "buyer" ? "/buyer" : "/dashboard"} /> : <Login onLogin={handleLogin} />}
      />
      <Route path="/dashboard" element={user ? <Dashboard {...common} /> : <Navigate to="/" />} />
      <Route path="/farms/new" element={user ? <NewFarm {...common} /> : <Navigate to="/" />} />
      <Route path="/farms/:farmId" element={user ? <FarmDetail {...common} /> : <Navigate to="/" />} />
      <Route path="/weather" element={user ? <WeatherIntelligence {...common} /> : <Navigate to="/" />} />
      <Route path="/what-if" element={user ? <WhatIfLab {...common} /> : <Navigate to="/" />} />
      <Route path="/advisor" element={user ? <AIAdvisor {...common} /> : <Navigate to="/" />} />
      <Route path="/disease-detection" element={user ? <DiseaseDetection {...common} /> : <Navigate to="/" />} />
      <Route path="/services" element={user ? <ServiceHub {...common} /> : <Navigate to="/" />} />
      <Route path="/marketplace" element={user ? <Marketplace {...common} /> : <Navigate to="/" />} />
      <Route path="/buyer" element={user ? <BuyerDashboard {...common} /> : <Navigate to="/" />} />
      <Route path="/offers" element={user ? <Offers {...common} /> : <Navigate to="/" />} />
      <Route path="/inbox" element={user ? <Inbox {...common} /> : <Navigate to="/" />} />
      <Route path="/settings" element={user ? <Settings {...common} /> : <Navigate to="/" />} />
    </Routes>
  );
}
