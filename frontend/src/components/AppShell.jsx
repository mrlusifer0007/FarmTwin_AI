import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../services/api.js";
import {
  IconDashboard,
  IconFarm,
  IconAdvisor,
  IconWeather,
  IconLeaf,
  IconServices,
  IconMarketplace,
  IconInbox,
  IconSettings,
  IconLogout,
  IconSearch,
  IconSliders,
} from "./icons.jsx";
import NotificationBell from "./NotificationBell.jsx";
import FloatingChatbot from "./FloatingChatbot.jsx";
import { ToastProvider, useToast } from "./Toast.jsx";
import i18n from "../i18n.js";
import { ChevronDown, ChevronRight, Wifi, WifiOff } from "lucide-react";

const LANG_OPTIONS = [
  { value: "en", label: "EN" },
  { value: "hi", label: "हि" },
  { value: "mr", label: "म" },
];

function greeting(t) {
  const h = new Date().getHours();
  if (h < 12) return t("greeting.morning");
  if (h < 17) return t("greeting.afternoon");
  return t("greeting.evening");
}

function AppShellContent({
  user,
  role,
  onSwitchRole,
  onLogout,
  onLanguageChange,
  title,
  subtitle,
  actions,
  children,
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSidebarMenu, setShowSidebarMenu] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const searchInputRef = useRef(null);

  // Accordion State: collapse non-active categories by default
  const [openGroups, setOpenGroups] = useState({
    overview: true,
    intelligence: false,
    ai_support: false,
    market: false,
    communication: false,
    system: false,
  });

  // Offline / Online Detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success("✓ Connection restored");
    };
    const handleOffline = () => {
      setIsOffline(true);
      toast.warning("⚠ You're offline. Showing latest cached data.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toast]);

  // Ctrl+K Shortcut Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const SEARCH_ITEMS = [
    { label: "AI Seller & Market Advisor", path: "/advisor", keywords: ["ai seller", "seller", "advisor", "market", "mandi", "price", "sell", "crop price"] },
    { label: "AI What-If Simulation", path: "/what-if", keywords: ["what if", "simulation", "simulate", "yield", "risk", "decision", "lab"] },
    { label: "Weather & Soil Information", path: "/weather", keywords: ["weather", "soil", "rain", "temperature", "humidity", "forecast", "sun", "wind"] },
    { label: "Dashboard & Farm Digital Twin", path: "/dashboard", keywords: ["dashboard", "home", "farm", "twin", "risk", "soil", "acres", "field"] },
    { label: "Disease Detection", path: "/disease-detection", keywords: ["disease", "pests", "detection", "leaf", "scan", "crop health", "diagnosis"] },
    { label: "Service Hub", path: "/services", keywords: ["services", "service hub", "spray", "harvester", "drone", "booking"] },
    { label: "Marketplace", path: "/marketplace", keywords: ["marketplace", "buy", "sell", "listing", "offers", "trade", "crop"] },
    { label: "Inbox & Messages", path: "/inbox", keywords: ["inbox", "messages", "offers", "chat", "notification"] },
    { label: "Settings", path: "/settings", keywords: ["settings", "profile", "language", "account", "logout"] },
  ];

  const searchFiltered = searchTerm.trim()
    ? SEARCH_ITEMS.filter((item) => {
        const query = searchTerm.toLowerCase();
        return (
          item.label.toLowerCase().includes(query) ||
          item.keywords.some((k) => k.includes(query))
        );
      })
    : [];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchFiltered.length > 0) {
      navigate(searchFiltered[0].path);
      setSearchTerm("");
      setShowSearchDropdown(false);
    }
  };

  // Structured Accordion Navigation Schema
  const NAV_GROUPS = [
    {
      id: "overview",
      title: "OVERVIEW",
      items: [
        { to: "/dashboard", label: t("nav.dashboard", "Dashboard"), icon: IconDashboard },
      ],
    },
    {
      id: "intelligence",
      title: "FARM INTELLIGENCE",
      items: [
        { to: "/weather", label: "Weather & Soil", icon: IconWeather },
        { to: "/disease-detection", label: t("nav.disease", "Disease Detection"), icon: IconLeaf },
      ],
    },
    {
      id: "ai_support",
      title: "AI & DECISION SUPPORT",
      items: [
        { to: "/what-if", label: t("nav.what_if", "What-if Simulation"), icon: IconSliders },
        { to: "/advisor", label: "AI Insights & Seller", icon: IconAdvisor },
      ],
    },
    {
      id: "market",
      title: "MARKET & SERVICES",
      items: [
        { to: "/marketplace", label: t("nav.marketplace", "Marketplace"), icon: IconMarketplace },
        { to: "/services", label: t("nav.services", "Service Hub"), icon: IconServices },
        { to: "/offers", label: "Offers & Buyer", icon: IconFarm },
      ],
    },
    {
      id: "communication",
      title: "COMMUNICATION",
      items: [
        { to: "/inbox", label: t("nav.inbox", "Inbox"), icon: IconInbox },
      ],
    },
    {
      id: "system",
      title: "SYSTEM",
      items: [
        { to: "/settings", label: t("nav.settings", "Settings"), icon: IconSettings },
      ],
    },
  ];

  // Auto-expand group containing current pathname
  useEffect(() => {
    NAV_GROUPS.forEach((grp) => {
      if (grp.items.some((item) => location.pathname === item.to || location.pathname.startsWith(item.to + "/"))) {
        setOpenGroups((prev) => ({ ...prev, [grp.id]: true }));
      }
    });
  }, [location.pathname]);

  const toggleGroup = (groupId) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const today = new Date().toLocaleDateString(
    user?.language === "hi" ? "hi-IN" : user?.language === "mr" ? "mr-IN" : "en-IN",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  );

  const currentLang = i18n.language || "en";

  const handleLangSwitch = (lang) => {
    if (onLanguageChange) onLanguageChange(lang);
    else i18n.changeLanguage(lang);
  };

  return (
    <div className="shell">
      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-amber-500 text-slate-900 px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 border-b border-amber-600 shadow-sm z-50">
          <WifiOff className="w-4 h-4 animate-bounce" />
          <span>⚠️ You're offline. Showing the latest cached farm data.</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sidebar" style={{ display: isSidebarHidden ? "none" : "flex", background: "linear-gradient(180deg, #0b291f 0%, #061913 100%)" }}>
        <div className="sidebar-brand" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
          <div>
            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.5px" }}>FarmTwin AI</span>
            <span style={{ display: "block", fontSize: "0.72rem", color: "#aae5aa", opacity: 0.9, fontWeight: 600, marginTop: "2px" }}>
              {t("nav.smart_farming", "Smart Farming Platform")}
            </span>
          </div>

          <button
            onClick={() => setShowSidebarMenu((prev) => !prev)}
            style={{
              background: showSidebarMenu ? "rgba(255, 255, 255, 0.15)" : "transparent",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "8px",
              color: "#e8e4d9",
              padding: "6px 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            title="Sidebar Menu"
            aria-label="Sidebar Menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="5" cy="19" r="2.2" fill="currentColor" />
              <circle cx="12" cy="12" r="2.2" fill="currentColor" />
              <circle cx="19" cy="5" r="2.2" fill="currentColor" />
            </svg>
          </button>

          {showSidebarMenu && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                width: "200px",
                background: "#0c2b21",
                borderRadius: "12px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.12)",
                padding: "0.5rem",
                zIndex: 1000,
                color: "#e8e4d9",
              }}
            >
              <div
                onClick={() => {
                  setShowSidebarMenu(false);
                  setIsSidebarHidden(true);
                }}
                style={{
                  padding: "0.6rem 0.75rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "background 0.15s ease",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span>👈</span> Hide Sidebar
              </div>
              <div
                onClick={() => {
                  setShowSidebarMenu(false);
                  onSwitchRole(role === "buyer" ? "farmer" : "buyer");
                }}
                style={{
                  padding: "0.6rem 0.75rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "background 0.15s ease",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span>🔄</span>
                {t("common.switch_to", {
                  role: role === "buyer" ? t("common.farmer") : t("common.buyer"),
                })}
              </div>

              <Link
                to="/settings"
                onClick={() => setShowSidebarMenu(false)}
                style={{
                  padding: "0.6rem 0.75rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#e8e4d9",
                  textDecoration: "none",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "background 0.15s ease",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span>⚙️</span> {t("nav.settings")}
              </Link>

              <div
                onClick={() => {
                  setShowSidebarMenu(false);
                  onLogout();
                }}
                style={{
                  padding: "0.6rem 0.75rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#f87171",
                  cursor: "pointer",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "0.2rem",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  transition: "background 0.15s ease",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "rgba(248,113,113,0.12)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span>🚪</span> {t("common.logout")}
              </div>
            </div>
          )}
        </div>

        {/* Accordion Menu Navigation */}
        <nav className="sidebar-nav" style={{ padding: "0.75rem 0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {NAV_GROUPS.map((grp) => {
            const isOpen = !!openGroups[grp.id];
            return (
              <div key={grp.id} className="space-y-1">
                {/* Group Header Button */}
                <button
                  onClick={() => toggleGroup(grp.id)}
                  aria-expanded={isOpen}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.4rem 0.6rem",
                    background: "transparent",
                    border: "none",
                    color: "#88ab98",
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    borderRadius: "6px",
                    transition: "color 0.15s ease",
                  }}
                  className="hover:text-emerald-300"
                >
                  <span>{grp.title}</span>
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                  )}
                </button>

                {/* Group Items */}
                {isOpen && (
                  <div className="space-y-1 pl-1">
                    {grp.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        location.pathname === item.to ||
                        (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`sidebar-link ${isActive ? "active" : ""}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            padding: "0.55rem 0.75rem",
                            borderRadius: "12px",
                            fontSize: "0.82rem",
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? "#0b291f" : "#d1e2d6",
                            background: isActive ? "#aae5aa" : "transparent",
                            transition: "all 0.15s ease",
                            textDecoration: "none",
                          }}
                        >
                          <span className="sidebar-icon" style={{ opacity: isActive ? 1 : 0.8 }}>
                            <Icon />
                          </span>
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Weather Mini-Report in Sidebar below Settings */}
        <div style={{ margin: "0.5rem 0.5rem 0.85rem", padding: "0.75rem 0.85rem", background: "rgba(255, 255, 255, 0.07)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "12px", color: "#e8e4d9" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#aae5aa", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>TODAY</div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <span style={{ fontSize: "1.4rem" }}>☀️</span>
            <div>
              <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#ffffff" }}>27°C</div>
              <div style={{ fontSize: "0.7rem", color: "#88ab98" }}>Feels like 28°C</div>
            </div>
          </div>
          <div style={{ fontSize: "0.72rem", color: "#d1e2d6", display: "flex", flexDirection: "column", gap: "0.15rem", fontWeight: 500 }}>
            <div>Rain probability 20%</div>
            <div>Humidity 71%</div>
            <div>Wind 12 km/h</div>
          </div>
        </div>

        <div className="sidebar-footer" style={{ padding: "0.85rem", fontSize: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <strong style={{ fontSize: "0.9rem", color: "#fff", display: "block" }}>{user?.name || "Farmer"}</strong>
          {user?.email && <div style={{ fontSize: "0.76rem", color: "#88ab98", wordBreak: "break-all" }}>📧 {user.email}</div>}
          {user?.phone && <div style={{ fontSize: "0.76rem", color: "#88ab98" }}>📞 {user.phone}</div>}
          <div style={{ marginTop: "4px", fontSize: "0.75rem", color: "#88ab98" }}>
            {role === "buyer" ? t("login.buyer") : t("login.farmer")}
          </div>
          <button
            onClick={() => onSwitchRole(role === "buyer" ? "farmer" : "buyer")}
            className="btn-ghost"
            style={{ color: "#aae5aa", padding: "0.4rem 0 0", display: "block", fontSize: "0.75rem", cursor: "pointer" }}
          >
            {t("common.switch_to", {
              role: role === "buyer" ? t("common.farmer") : t("common.buyer"),
            })}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="shell-main" style={{ background: "#f7fbf8" }}>
        <header className="shell-topbar" style={{ background: "#ffffff", borderBottom: "1px solid #e2ebd9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            {isSidebarHidden && (
              <button
                onClick={() => setIsSidebarHidden(false)}
                style={{
                  background: "#134e43",
                  border: "none",
                  borderRadius: "8px",
                  color: "#ffffff",
                  padding: "6px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  boxShadow: "0 2px 8px rgba(19,78,67,0.2)",
                }}
                title="Show Sidebar"
                aria-label="Show Sidebar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="5" cy="19" r="2.2" fill="currentColor" />
                  <circle cx="12" cy="12" r="2.2" fill="currentColor" />
                  <circle cx="19" cy="5" r="2.2" fill="currentColor" />
                </svg>
                <span>Show Sidebar</span>
              </button>
            )}

            <div>
              <h2 className="display" style={{ fontSize: "1.18rem", color: "#0f382c", fontWeight: 800 }}>
                {greeting(t)}, {user?.name?.split(" ")[0]}
                <span style={{ marginLeft: "0.4rem" }}>👋</span>
              </h2>
              <p style={{ margin: "0.15rem 0 0", fontSize: "0.82rem", color: "#556e60", fontWeight: 500 }}>
                {today}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Search input with Ctrl+K shortcut */}
            <form
              onSubmit={handleSearchSubmit}
              style={{
                position: "relative",
                display: window.innerWidth > 720 ? "block" : "none",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#557964",
                  zIndex: 2,
                }}
              >
                <IconSearch />
              </span>
              <input
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                placeholder="Search farms, crops, weather, reports..."
                style={{
                  paddingLeft: "2.4rem",
                  paddingRight: "3rem",
                  width: 280,
                  height: 38,
                  borderRadius: "12px",
                  border: "1px solid #dce7dc",
                  background: "#f7faf8",
                  fontSize: "0.82rem",
                  color: "#132c23",
                  outline: "none",
                  transition: "all 0.2s ease",
                }}
                className="focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              />
              <span
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: "#88ab98",
                  background: "#eaf5ee",
                  border: "1px solid #c2e3cb",
                  padding: "1px 6px",
                  borderRadius: "6px",
                  pointerEvents: "none",
                }}
              >
                Ctrl K
              </span>

              {showSearchDropdown && searchTerm.trim() && (
                <div
                  style={{
                    position: "absolute",
                    top: "44px",
                    left: 0,
                    right: 0,
                    background: "#ffffff",
                    borderRadius: "14px",
                    boxShadow: "0 10px 28px rgba(12,43,33,0.15)",
                    border: "1px solid #dce7dc",
                    overflow: "hidden",
                    zIndex: 1000,
                    minWidth: "280px",
                  }}
                >
                  {searchFiltered.length > 0 ? (
                    searchFiltered.map((item) => (
                      <div
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          setSearchTerm("");
                          setShowSearchDropdown(false);
                        }}
                        style={{
                          padding: "0.7rem 0.9rem",
                          fontSize: "0.82rem",
                          color: "#132c23",
                          fontWeight: 600,
                          cursor: "pointer",
                          borderBottom: "1px solid #edf4ee",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          transition: "background 0.15s ease",
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = "#eaf5ee")}
                        onMouseOut={(e) => (e.currentTarget.style.background = "#ffffff")}
                      >
                        <span style={{ color: "#134e43" }}>🔍</span> {item.label}
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "0.75rem 0.9rem", fontSize: "0.8rem", color: "#556e60" }}>
                      No matching page found
                    </div>
                  )}
                </div>
              )}
            </form>

            {/* Language Switcher */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#eaf5ee",
                borderRadius: "16px",
                padding: "2px",
                gap: "1px",
                border: "1px solid #c2e3cb",
              }}
              title="Switch language"
            >
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleLangSwitch(opt.value)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "12px",
                    border: "none",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    background: currentLang === opt.value ? "#134e43" : "transparent",
                    color: currentLang === opt.value ? "#ffffff" : "#556e60",
                    transition: "all 0.15s",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <NotificationBell userId={user?.id} role={role} />

            <span className="role-pill" style={{ background: "#eaf5ee", color: "#134e43", border: "1px solid #c2e3cb", fontWeight: 700, borderRadius: "12px" }}>
              {role === "buyer" ? t("login.buyer") : t("login.farmer")}
            </span>

            {/* User Profile Dropdown */}
            <div style={{ position: "relative" }}>
              <div
                onClick={() => setShowProfileMenu((prev) => !prev)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#134e43",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  boxShadow: "0 2px 6px rgba(19,78,67,0.2)",
                  cursor: "pointer",
                  flexShrink: 0,
                  border: "2px solid #aae5aa",
                  transition: "all 0.15s ease",
                }}
                title={user?.name || "Profile"}
              >
                {user?.name
                  ? user.name
                      .trim()
                      .split(/\s+/)
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : "U"}
              </div>

              {showProfileMenu && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "45px",
                    width: "240px",
                    background: "#ffffff",
                    borderRadius: "16px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                    border: "1px solid #e7e3d8",
                    padding: "1rem",
                    zIndex: 1000,
                    color: "#1c2419",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "0.75rem",
                      paddingBottom: "0.75rem",
                      borderBottom: "1px solid #eee8db",
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "#134e43",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "1rem",
                      }}
                    >
                      {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div style={{ overflow: "hidden" }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          color: "#1c2419",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {user?.name || "User"}
                      </div>
                      <span className="role-pill" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>
                        {role === "buyer" ? t("login.buyer") : t("login.farmer")}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.55rem",
                      fontSize: "0.82rem",
                      color: "#4a4436",
                      marginBottom: "0.85rem",
                    }}
                  >
                    {user?.email && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>📧</span>
                        <span style={{ wordBreak: "break-all", fontWeight: 500 }}>{user.email}</span>
                      </div>
                    )}
                    {user?.phone && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>📞</span>
                        <span style={{ fontWeight: 500 }}>{user.phone}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "10px",
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      color: "#991b1b",
                      fontWeight: 600,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                    }}
                  >
                    {t("common.logout")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="shell-content">
          {(title || actions) && (
            <div className="page-head">
              <div>
                {title && <h1 className="display" style={{ fontSize: "1.6rem", fontWeight: 800 }}>{title}</h1>}
                {subtitle && <p style={{ fontSize: "0.88rem", color: "#556e60" }}>{subtitle}</p>}
              </div>
              {actions && (
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  {actions}
                </div>
              )}
            </div>
          )}
          {children}
        </div>
      </div>

      <FloatingChatbot user={user} />
    </div>
  );
}

export default function AppShell(props) {
  return (
    <ToastProvider>
      <AppShellContent {...props} />
    </ToastProvider>
  );
}
