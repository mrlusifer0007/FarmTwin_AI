import { useState } from "react";
import AppShell from "../components/AppShell.jsx";
import { useTranslation } from "react-i18next";
import i18n from "../i18n.js";

const LANG_MAP = { en: "English", hi: "हिन्दी (Hindi)", mr: "मराठी (Marathi)" };

export default function Settings({ user, role, onSwitchRole, onLogout, onLanguageChange }) {
  const { t } = useTranslation();
  const [selectedLang, setSelectedLang] = useState(user?.language || "en");
  const [saved, setSaved] = useState(false);

  const handleLangSave = () => {
    i18n.changeLanguage(selectedLang);
    if (onLanguageChange) onLanguageChange(selectedLang);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AppShell
      user={user}
      role={role}
      onSwitchRole={onSwitchRole}
      onLogout={onLogout}
      onLanguageChange={onLanguageChange}
      title={t("settings.title")}
      subtitle={t("settings.subtitle")}
    >
      {/* Profile card */}
      <div className="card" style={{ maxWidth: 480, marginBottom: "1.25rem" }}>
        <h3 style={{ fontSize: "1.05rem", marginBottom: "1rem" }}>{t("settings.profile")}</h3>
        <div className="field-group">
          <label>{t("settings.name")}</label>
          <input value={user.name} disabled />
        </div>
        <div className="field-group">
          <label>{t("settings.phone")}</label>
          <input value={user.phone || ""} disabled />
        </div>
      </div>

      {/* Language change card */}
      <div className="card" style={{ maxWidth: 480, marginBottom: "1.25rem" }}>
        <h3 style={{ fontSize: "1.05rem", marginBottom: "1rem" }}>{t("settings.change_language")}</h3>
        <div className="field-group">
          <label>{t("settings.language")}</label>
          <select
            value={selectedLang}
            onChange={(e) => {
              setSelectedLang(e.target.value);
              // Live preview as they choose
              i18n.changeLanguage(e.target.value);
            }}
          >
            {Object.entries(LANG_MAP).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <button
          className="btn-primary"
          onClick={handleLangSave}
          style={{ marginTop: "0.5rem" }}
        >
          {t("common.save")}
        </button>
        {saved && (
          <p style={{ color: "var(--healthy)", fontSize: "0.85rem", marginTop: "0.5rem", fontWeight: 600 }}>
            ✓ {t("settings.language_saved")}
          </p>
        )}
      </div>

      {/* Account view card */}
      <div className="card" style={{ maxWidth: 480 }}>
        <h3 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>{t("settings.accountview")}</h3>
        <p style={{ color: "#6b6455", fontSize: "0.88rem", marginTop: 0 }}>
          {t("settings.accountdesc")}
        </p>
        <div className="toggle-row">
          <button
            className={`toggle-option${role === "farmer" ? " active" : ""}`}
            onClick={() => onSwitchRole("farmer")}
          >
            {t("login.farmer")}
          </button>
          <button
            className={`toggle-option${role === "buyer" ? " active" : ""}`}
            onClick={() => onSwitchRole("buyer")}
          >
            {t("login.buyer")}
          </button>
        </div>
      </div>

      <button
        className="btn-secondary"
        style={{ marginTop: "1.5rem" }}
        onClick={onLogout}
      >
        {t("settings.logout")}
      </button>
    </AppShell>
  );
}
