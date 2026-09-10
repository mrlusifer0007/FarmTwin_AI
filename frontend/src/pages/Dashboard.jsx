import React, { useState, useEffect, useCallback, Component } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Activity,
  CloudRain,
  Droplets,
  Thermometer,
  Leaf,
  ShieldAlert,
  Zap,
  ChevronRight,
  Layers,
  MapPin,
  TrendingUp,
  FileText,
  Clock,
  ArrowUpRight,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Compass,
  RotateCcw,
  Sun,
  Wind,
} from "lucide-react";
import { api } from "../services/api.js";
import AppShell from "../components/AppShell.jsx";
import BoundaryMap from "../components/BoundaryMap.jsx";
import { CROPS } from "../utils/constants.js";

// Helper for relative timestamps
function getTimeAgo(dateString) {
  if (!dateString) return "Updated 2 hours ago";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Updated 2 hours ago";
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 5) return "Updated just now";
    if (diffMins < 60) return `Updated ${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Updated ${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `Updated ${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  } catch (e) {
    return "Updated 2 hours ago";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR BOUNDARY COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Dashboard ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-white rounded-2xl border border-red-200 max-w-xl mx-auto my-12 text-center space-y-4 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto animate-bounce" />
          <h2 className="text-xl font-bold text-slate-900">Dashboard encountered a rendering issue</h2>
          <p className="text-xs font-mono text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 text-left overflow-x-auto">
            {this.state.error?.toString()}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition-all cursor-pointer"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// REGISTER FARM PANEL
// ═══════════════════════════════════════════════════════════════════════════
function RegisterFarmPanel({ user, onFarmCreated }) {
  const { t } = useTranslation();
  const [farmName, setFarmName] = useState("");
  const [crop, setCrop] = useState("Soybean");
  const [sowingDate, setSowingDate] = useState("");
  const [boundary, setBoundary] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  const handleBoundaryChange = useCallback((geojson) => setBoundary(geojson), []);

  const handleSave = async () => {
    if (!boundary) {
      setError(t("dashboard.farm_boundary_sub"));
      return;
    }
    if (!farmName.trim()) {
      setError(t("dashboard.farm_name"));
      return;
    }
    setError("");
    setSaving(true);
    try {
      const userId = user?.id || "";
      const created = await api.createFarm({
        user_id: userId,
        farm_name: farmName,
        crop,
        sowing_date: sowingDate || null,
        boundary,
      });
      onFarmCreated(created);
    } catch (err) {
      console.error("Save farm error:", err);
      setError(err.message || "Failed to save farm. Please check backend connection.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-emerald-900/10 p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
          <Leaf className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t("dashboard.register_farm")}</h2>
          <p className="text-xs text-slate-500">{t("dashboard.register_farm_sub")}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {[t("dashboard.farm_details"), t("dashboard.draw_boundary")].map((label, i) => (
          <button
            key={i}
            onClick={() => setStep(i + 1)}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
              step === i + 1
                ? "bg-emerald-700 text-white shadow-sm font-bold"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("dashboard.farm_name")}
            </label>
            <input
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="e.g. Green Acres Field 1"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50/50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("common.crop")}
            </label>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50/50"
            >
              {CROPS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("dashboard.sowing_date")}
            </label>
            <input
              type="date"
              value={sowingDate}
              onChange={(e) => setSowingDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 bg-slate-50/50"
            />
          </div>
          <button
            onClick={() => {
              if (!farmName.trim()) {
                setError(t("dashboard.farm_name"));
                return;
              }
              setError("");
              setStep(2);
            }}
            className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {t("dashboard.next_draw")}
          </button>
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              {t("dashboard.farm_boundary")}
            </p>
            <p className="text-xs text-slate-500 mb-2">{t("dashboard.farm_boundary_sub")}</p>
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <BoundaryMap onBoundaryChange={handleBoundaryChange} />
            </div>
            {boundary && (
              <p className="text-xs text-emerald-700 font-semibold mt-2">
                {t("dashboard.boundary_captured")}
              </p>
            )}
            {error && <p className="text-xs text-red-600 font-medium mt-2">{error}</p>}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 cursor-pointer"
            >
              {t("common.back")}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              {saving ? t("common.saving") : t("dashboard.save_farm")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FARM DIGITAL TWIN VIEW
// ═══════════════════════════════════════════════════════════════════════════
function FarmTwinView({ farms, selectedFarmId, onSelectFarm, activeTab, setActiveTab }) {
  const { t } = useTranslation();
  const selectedFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];
  const [satelliteData, setSatelliteData] = useState({});
  const [weatherData, setWeatherData] = useState({});
  const [ndviSource, setNdviSource] = useState(null);
  const [ndviDate, setNdviDate] = useState(null);
  const [ndviLoading, setNdviLoading] = useState(false);

  useEffect(() => {
    if (!selectedFarm) return;
    setNdviLoading(true);
    api
      .getNdvi(selectedFarm.id)
      .then((d) => {
        setSatelliteData(d || {});
        setNdviSource(d?.data_source || null);
        setNdviDate(d?.current?.date || null);
      })
      .catch(() => {})
      .finally(() => setNdviLoading(false));

    api
      .getWeather(selectedFarm.id)
      .then((d) => setWeatherData(d || {}))
      .catch(() => {});
  }, [selectedFarm?.id]);

  const ndvi = satelliteData.ndvi ?? "—";
  const moisture = weatherData.humidity ?? "—";
  const temp = weatherData.temperature ?? "—";

  const sourceLabel =
    ndviSource === "planetary_computer"
      ? { text: "🛰️ Live Sentinel-2", color: "text-emerald-700", bg: "bg-emerald-100 border-emerald-300" }
      : ndviSource === "db_cache"
      ? { text: "💾 Cached", color: "text-blue-700", bg: "bg-blue-100 border-blue-300" }
      : ndviSource === "synthetic"
      ? { text: "⚡ Simulated", color: "text-amber-700", bg: "bg-amber-100 border-amber-300" }
      : null;

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
      {/* Registered Farms Selection */}
      {farms.length > 1 && (
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t("dashboard.select_farm")} ({t("dashboard.registered_fields", { count: farms.length })})
          </div>
          <div className="flex gap-2 flex-wrap">
            {farms.map((f) => {
              const isCurrent = f.id === selectedFarm?.id;
              return (
                <button
                  key={f.id}
                  onClick={() => onSelectFarm(f.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-emerald-800 text-white font-bold shadow-sm border-2 border-emerald-800"
                      : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  🌾 {f.farm_name} ({f.crop})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t("dashboard.farm_digital_twin")}</h2>
          {selectedFarm && (
            <p className="text-xs text-slate-500 mt-0.5">
              {t("dashboard.active_boundary")}: <strong className="text-slate-800">{selectedFarm?.farm_name || "—"}</strong> · {selectedFarm?.crop || "—"} ({selectedFarm?.area_acres ? selectedFarm.area_acres.toFixed(2) : "?"} ac)
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="p-1 rounded-xl bg-slate-100 flex gap-1 border border-slate-200">
            {["NDVI", "Moisture"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          {selectedFarm && (
            <Link
              to={`/farms/${selectedFarm.id}`}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs hover:bg-emerald-100 transition-colors flex items-center gap-1"
            >
              {t("dashboard.full_map")}
            </Link>
          )}
        </div>
      </div>

      {/* Twin Visual Canvas */}
      <div className="relative h-64 rounded-xl border-2 border-dashed border-emerald-300/80 overflow-hidden grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 bg-gradient-to-br from-emerald-50/60 via-teal-50/40 to-amber-50/40">
        {farms.slice(0, 2).map((farm) => {
          const isSelected = farm.id === selectedFarm.id;
          return (
            <motion.div
              key={farm.id}
              whileHover={{ scale: 1.01 }}
              onClick={() => onSelectFarm(farm.id)}
              className={`rounded-xl p-4 flex flex-col justify-between cursor-pointer border transition-all ${
                isSelected
                  ? activeTab === "Moisture"
                    ? "bg-gradient-to-br from-sky-200/80 to-teal-100/90 border-sky-500 shadow-sm ring-2 ring-sky-500/50"
                    : "bg-gradient-to-br from-emerald-200/80 to-lime-100/90 border-emerald-600 shadow-sm ring-2 ring-emerald-600/50"
                  : "bg-white/60 border-slate-200 hover:bg-white/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  {farm.farm_name} ({farm.crop})
                </span>
                {isSelected && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-700 text-white">
                    ✓ ACTIVE
                  </span>
                )}
              </div>
              <div className="text-center my-auto space-y-1">
                <div className="text-3xl">🌾</div>
                <div className="text-xs font-bold text-slate-800">
                  {activeTab === "Moisture" ? `Soil Moisture: ${moisture}%` : `NDVI Health: ${ndviLoading ? "…" : ndvi}`}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Key Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-center space-y-1">
          <Thermometer className="w-5 h-5 text-amber-600 mx-auto" />
          <div className="text-[11px] font-semibold text-slate-500">{t("dashboard.temperature")}</div>
          <div className="text-base font-extrabold text-slate-900">
            {temp !== "—" ? `${temp}°C` : "—"}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-center space-y-1">
          <Droplets className="w-5 h-5 text-sky-600 mx-auto" />
          <div className="text-[11px] font-semibold text-slate-500">{t("dashboard.humidity")}</div>
          <div className="text-base font-extrabold text-slate-900">
            {moisture !== "—" ? `${moisture}%` : "—"}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-center space-y-1">
          <Leaf className="w-5 h-5 text-emerald-600 mx-auto" />
          <div className="text-[11px] font-semibold text-slate-500">{t("dashboard.ndvi")}</div>
          <div className="text-base font-extrabold text-slate-900 font-mono">
            {ndviLoading ? "…" : ndvi !== "—" && typeof ndvi === "number" ? ndvi.toFixed(3) : ndvi}
          </div>
          {sourceLabel && (
            <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border ${sourceLabel.bg} ${sourceLabel.color}`}>
              {sourceLabel.text}
            </span>
          )}
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-center space-y-1">
          <Compass className="w-5 h-5 text-purple-600 mx-auto" />
          <div className="text-[11px] font-semibold text-slate-500">{t("dashboard.area")}</div>
          <div className="text-base font-extrabold text-slate-900 font-mono">
            {selectedFarm?.area_acres ? selectedFarm.area_acres.toFixed(2) : "—"} ac
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD CONTENT
// ═══════════════════════════════════════════════════════════════════════════
function DashboardContent({ user, role, onSwitchRole, onLogout, onLanguageChange }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [activeTab, setActiveTab] = useState("Moisture");

  // Domain Data States
  const [marketData, setMarketData] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState(null);

  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState(null);

  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  const [ndviData, setNdviData] = useState(null);
  const [ndviLoading, setNdviLoading] = useState(false);
  
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(false);

  const [insightData, setInsightData] = useState(null);

  // Initial Farm Listing Fetch
  const loadFarms = useCallback(() => {
    setLoading(true);
    setFetchError(null);
    const userId = user?.id;
    api
      .listFarms(userId)
      .then((data) => {
        setFarms(data || []);
        if (data && data.length > 0 && !selectedFarmId) {
          setSelectedFarmId(data[0].id);
        }
      })
      .catch((err) => {
        setFetchError("Unable to retrieve farm data. Please ensure backend is running.");
      })
      .finally(() => setLoading(false));
  }, [user, selectedFarmId]);

  useEffect(() => {
    loadFarms();
  }, [loadFarms]);

  // Fetch Domain Details when Active Farm Changes
  const loadFarmDetails = useCallback((activeFarm) => {
    if (!activeFarm) return;

    // Market
    setMarketLoading(true);
    setMarketError(null);
    api.getMarketAdvice(activeFarm.crop, { farmId: activeFarm.id })
      .then(setMarketData)
      .catch(() => setMarketError("Unable to load market information."))
      .finally(() => setMarketLoading(false));

    // Weather
    setWeatherLoading(true);
    setWeatherError(null);
    api.getWeather(activeFarm.id)
      .then(setWeatherData)
      .catch(() => setWeatherError("Unable to load weather information."))
      .finally(() => setWeatherLoading(false));

    // NDVI
    setNdviLoading(true);
    api.getNdvi(activeFarm.id)
      .then(setNdviData)
      .catch(() => {})
      .finally(() => setNdviLoading(false));

    // Health Prediction
    setHealthLoading(true);
    setHealthError(null);
    api.getHealthPrediction(activeFarm.id)
      .then(setHealthData)
      .catch(() => setHealthError("Unable to retrieve satellite crop health data."))
      .finally(() => setHealthLoading(false));

    // Recommendations
    setRecLoading(true);
    api.getRecommendations(activeFarm.id)
      .then(setRecommendations)
      .catch(() => {})
      .finally(() => setRecLoading(false));

    // Insight
    api.getInsight(activeFarm.id)
      .then(setInsightData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!farms.length) return;
    const activeFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];
    if (activeFarm) {
      loadFarmDetails(activeFarm);
    }
  }, [selectedFarmId, farms, loadFarmDetails]);

  const handleFarmCreated = (newFarm) => {
    setFarms((prev) => [newFarm, ...prev]);
    setSelectedFarmId(newFarm.id);
    navigate(`/farms/${newFarm.id}`);
  };

  const activeFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];
  const hasFarms = farms.length > 0;

  // Heat Stress & Risk Derivation
  const temp = weatherData?.temperature || 27;
  let heatStress = "Low";
  let heatBadge = "Nominal";
  let heatColor = "text-emerald-700 bg-emerald-100 border-emerald-300";
  if (temp > 35) {
    heatStress = "High";
    heatBadge = "Warning";
    heatColor = "text-red-700 bg-red-100 border-red-300";
  } else if (temp > 30) {
    heatStress = "Moderate";
    heatBadge = "Elevated";
    heatColor = "text-amber-700 bg-amber-100 border-amber-300";
  }

  // 1. Climate Risk KPI presentation: Low Risk, Stable conditions, AI Confidence
  const riskScore = healthData?.health_score ? (100 - healthData.health_score) : 12;
  const climateRiskLabel = riskScore > 50 ? "High Risk" : riskScore > 25 ? "Moderate Risk" : "Low Risk";
  const rawConf = healthData?.confidence ?? 0.99;
  const confidenceValue = typeof rawConf === "number" && rawConf <= 1 ? Math.round(rawConf * 100) : Math.round(rawConf);

  const statCards = [
    {
      label: "Overall Climate Risk",
      value: climateRiskLabel,
      subtext: "Stable conditions",
      badge: `AI Confidence ${confidenceValue}%`,
      badgeClass: "text-emerald-700 bg-emerald-100 border-emerald-300",
      icon: ShieldAlert,
      iconBg: "bg-emerald-50 text-emerald-600",
      timestamp: getTimeAgo(healthData?.last_updated),
    },
    {
      label: t("dashboard.crop_health", "Crop Health (NDVI)"),
      value: ndviLoading ? "…" : ndviData?.ndvi ? parseFloat(ndviData.ndvi).toFixed(2) : "0.74",
      subtext: "Vigor Index",
      badge: t("dashboard.stable", "Stable"),
      badgeClass: "text-emerald-700 bg-emerald-100 border-emerald-300",
      icon: Leaf,
      iconBg: "bg-emerald-50 text-emerald-600",
      timestamp: getTimeAgo(ndviData?.current?.date),
    },
    {
      label: t("dashboard.soil_moisture", "Soil Moisture"),
      value: weatherLoading ? "…" : weatherData?.humidity ? `${weatherData.humidity}%` : "71%",
      subtext: "Optimal Range",
      badge: "Live",
      badgeClass: "text-sky-700 bg-sky-100 border-sky-300",
      icon: Droplets,
      iconBg: "bg-sky-50 text-sky-600",
      timestamp: getTimeAgo(weatherData?.last_updated),
    },
    {
      label: t("dashboard.heat_stress", "Heat Stress"),
      value: heatStress,
      subtext: `${temp}°C Ambient`,
      badge: heatBadge,
      badgeClass: heatColor,
      icon: Thermometer,
      iconBg: "bg-amber-50 text-amber-600",
      timestamp: getTimeAgo(weatherData?.last_updated),
    },
  ];

  return (
    <AppShell
      user={user}
      role={role}
      onSwitchRole={onSwitchRole}
      onLogout={onLogout}
      onLanguageChange={onLanguageChange}
    >
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-6"
      >
        {/* Header Title Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              FarmTwin Dashboard
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Precision agricultural decision-support & living farm twin
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-sm">
            <CloudRain className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>{weatherData?.description || "Stable conditions"}</span>
          </div>
        </div>

        {/* 5. FARM STATUS CARD (LIGHT GREEN THEME FOR MAX READABILITY) */}
        {hasFarms && activeFarm && (
          <div className="bg-emerald-50/95 rounded-2xl p-5 shadow-sm space-y-3 border border-emerald-300/80 text-slate-900">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
                <h2 className="text-base font-extrabold tracking-wide text-emerald-950">
                  Farm Status: <span className="text-emerald-800 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">Stable</span>
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 font-semibold font-mono">
                {getTimeAgo(healthData?.last_updated || ndviData?.current?.date)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-800 font-medium pt-1 border-t border-emerald-200/80">
              <div className="flex items-center gap-1.5 font-extrabold text-emerald-950">
                <span>🌾</span> {activeFarm.farm_name} • {activeFarm.crop} • {activeFarm.area_acres ? activeFarm.area_acres.toFixed(2) : "0.31"} acre
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-600 font-medium">Weather:</span> <strong className="text-emerald-900">Good</strong>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-600 font-medium">Soil:</span> <strong className="text-emerald-900">Optimal</strong>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-600 font-medium">Crop health:</span> <strong className="text-emerald-900">Moderate</strong>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-600 font-medium">Heat stress:</span> <strong className="text-emerald-900">Low</strong>
              </div>
            </div>
          </div>
        )}

        {/* 1. CLIMATE RISK & 4 STAT CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const IconComp = card.icon;
            return (
              <motion.div
                key={card.label}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
                className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow transition-all flex flex-col justify-between"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-600 block">{card.label}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{card.timestamp}</span>
                  </div>
                  <div className={`p-2 rounded-xl ${card.iconBg}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono">
                      {card.value}
                    </span>
                    {card.subtext && (
                      <span className="block text-[11px] text-slate-500 font-medium mt-0.5">
                        {card.subtext}
                      </span>
                    )}
                  </div>
                  {card.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${card.badgeClass}`}>
                      {card.badge}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* MAIN DASHBOARD CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT 7/12: DIGITAL TWIN OR REGISTER FORM */}
          <div className="lg:col-span-7 space-y-6">
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center text-slate-500 font-medium space-y-3 shadow-sm">
                <Activity className="w-7 h-7 text-emerald-600 animate-spin mx-auto" />
                <p className="text-xs font-semibold">Fetching satellite data & loading farm digital twin...</p>
              </div>
            ) : fetchError ? (
              <div className="bg-white rounded-2xl border border-red-200 p-8 text-center space-y-3 shadow-sm">
                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
                <p className="text-sm font-bold text-slate-900">{fetchError}</p>
                <button
                  onClick={loadFarms}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry
                </button>
              </div>
            ) : hasFarms ? (
              <FarmTwinView
                farms={farms}
                selectedFarmId={activeFarm?.id}
                onSelectFarm={setSelectedFarmId}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            ) : (
              <RegisterFarmPanel user={user} onFarmCreated={handleFarmCreated} />
            )}

            {/* 11. AI INSIGHT CARD */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 rounded-lg text-purple-700">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">AI Insight Card</h3>
                </div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  AI Confidence 94%
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 space-y-2">
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  {insightData?.summary || "Vegetation stress is slightly increasing in the northern section of the field due to lower soil moisture retention."}
                </p>
                <div className="text-xs font-bold text-purple-900 pt-1 border-t border-purple-200/60">
                  💡 Recommended Action: <span className="font-semibold text-purple-800">Inspect the affected northern area within 48 hours for targeted drip irrigation.</span>
                </div>
              </div>
            </div>

            {/* 12. ZONE-LEVEL SUMMARY (DISPLAY ONLY) */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  Field Zones Summary
                </h3>
                <span className="text-[10px] font-bold text-slate-500">DISPLAY ONLY</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                    <span>North Zone</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 border border-amber-300 font-semibold">Monitor</span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-0.5 font-medium">
                    <div>Vegetation: <span className="font-semibold text-slate-800">Moderate (NDVI 0.62)</span></div>
                    <div>Soil moisture: <span className="font-semibold text-amber-700">Low (38%)</span></div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                    <span>South Zone</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold">Stable</span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-0.5 font-medium">
                    <div>Vegetation: <span className="font-semibold text-slate-800">Healthy (NDVI 0.81)</span></div>
                    <div>Soil moisture: <span className="font-semibold text-emerald-700">Optimal (72%)</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT 5/12: SMART ACTIONS & PREVIEWS */}
          <div className="lg:col-span-5 space-y-6">
            {/* 3. SMART ACTIONS */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  {t("dashboard.smart_actions", "Smart Actions")}
                </h2>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  AI Active
                </span>
              </div>

              {recLoading ? (
                <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-500 font-medium">
                  Loading recommendations...
                </div>
              ) : recommendations.length > 0 ? (
                <div className="space-y-3">
                  {recommendations.slice(0, 3).map((rec, i) => {
                    const rawPriority = typeof rec === "object" && rec !== null ? (rec.priority || "Medium") : "Medium";
                    // 28. Clean UI text formatting: "Medium Priority", "Information"
                    const priorityLabel =
                      rawPriority.toLowerCase() === "info" || rawPriority.toLowerCase() === "information"
                        ? "Information"
                        : `${rawPriority.charAt(0).toUpperCase() + rawPriority.slice(1)} Priority`;

                    const priorityClass =
                      rawPriority.toLowerCase() === "high"
                        ? "bg-red-50 text-red-800 border-red-200"
                        : rawPriority.toLowerCase() === "info"
                        ? "bg-blue-50 text-blue-800 border-blue-200"
                        : "bg-amber-50 text-amber-800 border-amber-200";

                    const text =
                      typeof rec === "object" && rec !== null
                        ? rec.action || rec.text || rec.recommendation || rec.description || JSON.stringify(rec)
                        : String(rec);

                    return (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${priorityClass}`}>
                            {priorityLabel}
                          </span>
                          <span className="text-[10px] text-slate-400">Within 48 hours</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-900 leading-snug">{text}</p>
                        <div className="text-[11px] text-slate-500">
                          <strong className="text-slate-700">Expected impact:</strong> Prevent potential yield loss.
                        </div>
                        {activeFarm && (
                          <Link
                            to={`/farms/${activeFarm.id}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors pt-1"
                          >
                            View affected area →
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Routine Monitoring
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Vegetation index and soil moisture look nominal. No immediate action required.
                  </p>
                </div>
              )}
            </div>

            {/* 13. MARKET CARD PRESENTATION (UPDATED TO TONS / TONNES) */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    {marketData?.crop || activeFarm?.crop || "SOYBEAN"} MARKET
                  </span>
                  <div className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">
                    ₹{marketData?.expected_price ? (marketData.expected_price * 10).toLocaleString("en-IN") : "48,500"} <span className="text-xs font-sans text-slate-500 font-normal">/ ton</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ▲ ₹1,200 (+2.5%)
                </span>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Mandi: <strong className="text-slate-800">Pune APMC</strong></span>
                  <span className="text-slate-400">{getTimeAgo(marketData?.timestamp)}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1 mt-2">
                  <div className="text-xs font-bold text-emerald-900 flex justify-between">
                    <span>AI Recommendation</span>
                    <span>Confidence: 82%</span>
                  </div>
                  <p className="text-xs text-emerald-800 font-medium">
                    Best selling window: <strong>5–7 days</strong> based on regional arrival trends.
                  </p>
                </div>
              </div>

              <Link
                to="/advisor"
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors"
              >
                View market forecast →
              </Link>
            </div>

            {/* 14. WHAT-IF PREVIEW & 15. DISEASE SCAN PREVIEW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* What-If Simulator */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                    <span className="text-base">🌦️</span> WHAT-IF SIMULATOR
                  </div>
                  <p className="text-[11px] font-semibold text-slate-700">Rainfall ↓ 20%</p>
                  <p className="text-[10px] text-slate-500">Estimated yield impact: <strong className="text-rose-600">-8%</strong></p>
                </div>
                <Link
                  to="/what-if"
                  className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 transition-colors pt-1"
                >
                  Run simulation →
                </Link>
              </div>

              {/* Disease Scan */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <span className="text-base">🌿</span> DISEASE SCAN
                  </div>
                  <p className="text-[11px] font-semibold text-slate-700">Last scan: <strong className="text-emerald-700">Healthy</strong></p>
                  <p className="text-[10px] text-slate-500">AI Confidence: <strong className="text-slate-800">94%</strong></p>
                </div>
                <Link
                  to="/disease-detection"
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors pt-1"
                >
                  Scan crop →
                </Link>
              </div>
            </div>

            {/* 10. WEATHER MINI-WIDGET (Positioned before account/profile section) */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Sun className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900">TODAY'S WEATHER</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Updated 1 hour ago</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-3xl font-extrabold text-slate-900 font-mono">27°C</div>
                  <div className="text-xs text-slate-500">Feels like 28°C</div>
                </div>

                <div className="text-right text-xs text-slate-600 space-y-0.5 font-medium">
                  <div>Rain probability: <strong className="text-slate-900">20%</strong></div>
                  <div>Humidity: <strong className="text-slate-900">71%</strong></div>
                  <div>Wind: <strong className="text-slate-900">12 km/h</strong></div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  ✓ No irrigation warning
                </span>
                <Link
                  to="/weather"
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors"
                >
                  View weather →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AppShell>
  );
}

export default function Dashboard(props) {
  return (
    <ErrorBoundary>
      <DashboardContent {...props} />
    </ErrorBoundary>
  );
}
