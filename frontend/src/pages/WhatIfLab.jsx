import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Sliders, AlertTriangle, ArrowRight, Zap, RefreshCw } from "lucide-react";
import { api } from "../services/api.js";
import AppShell from "../components/AppShell.jsx";

export default function WhatIfLab({ user, role, onSwitchRole, onLogout, onLanguageChange }) {
  const { t } = useTranslation();
  const [scenario, setScenario] = useState("");
  const [outcome, setOutcome] = useState("");
  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");

  useEffect(() => {
    if (user?.id) {
      api
        .listFarms(user.id)
        .then((f) => {
          setFarms(f || []);
          if (f && f.length > 0) setSelectedFarmId(f[0].id);
        })
        .catch(() => {});
    }
  }, [user]);

  const handleSimulate = async () => {
    if (!scenario.trim()) return;
    if (!selectedFarmId) {
      setOutcome("You need to register a farm first to run simulations.");
      return;
    }
    setLoading(true);
    setOutcome("");
    try {
      const res = await api.simulateScenario(selectedFarmId, scenario, user?.language || "en");
      setOutcome(res.outcome);
    } catch {
      setOutcome("Failed to run simulation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedFarm = farms.find((f) => f.id === selectedFarmId);

  return (
    <AppShell
      user={user}
      role={role}
      onSwitchRole={onSwitchRole}
      onLogout={onLogout}
      onLanguageChange={onLanguageChange}
      title="AI What-If Simulation"
      subtitle="Test farm decisions before you make them with AI predictive analytics"
    >
      <div className="max-w-xl mx-auto space-y-6">
        {/* Farm Selector Banner */}
        {farms.length === 0 ? (
          <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-center space-y-2">
            <div className="text-3xl">🌾</div>
            <h3 className="text-base font-bold text-amber-950">No Farm Found</h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              The What-If Simulator requires data from your farm (soil, crop, location). Please register a farm first from the Dashboard.
            </p>
          </div>
        ) : farms.length > 1 ? (
          <div className="p-4 rounded-2xl bg-white/90 border border-slate-200 shadow-sm space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              SELECT FARM BOUNDARY:
            </label>
            <select
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-semibold bg-slate-50 focus:outline-none focus:border-purple-500"
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  🌾 {f.farm_name} ({f.crop})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {/* Main What-If Simulator Card (New-Age Dark Purple Accent Glassmorphism) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-slate-900 text-slate-100 p-6 lg:p-8 rounded-3xl border border-purple-500/30 shadow-2xl space-y-6 relative overflow-hidden ${
            farms.length === 0 ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                AI What-If Simulation
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Test farm decisions before you make them. Our AI predicts changes in yield, crop stress, and risks for {selectedFarm ? selectedFarm.farm_name : "your field"}.
              </p>
            </div>
          </div>

          {/* Input & Action */}
          <div className="space-y-3">
            <input
              type="text"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSimulate()}
              placeholder=""
              className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-slate-100 outline-none focus:border-purple-500 transition-colors"
            />
            <button
              onClick={handleSimulate}
              disabled={loading || !scenario.trim()}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                loading
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30"
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {t("dashboard.simulating")}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Simulate
                </>
              )}
            </button>
          </div>

          {/* Quick Scenario Preset Chips */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Popular Presets:
            </div>
            <div className="flex flex-col gap-2">
              {[
                "What if rainfall increases by 25%?",
                "What if I apply urea today?",
                "What if I harvest 1 week early?",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setScenario(s)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/60 text-left transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <span>{s}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          {/* Output Drawer / Result */}
          <AnimatePresence>
            {outcome && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-2xl bg-purple-950/60 border border-purple-500/40 space-y-2"
              >
                <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  {t("dashboard.predicted_outcome")}
                </div>
                <div className="text-xs text-slate-200 leading-relaxed font-medium whitespace-pre-wrap">
                  {outcome}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AppShell>
  );
}
