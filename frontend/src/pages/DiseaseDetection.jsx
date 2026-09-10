import { useEffect, useRef, useState } from "react";
import { api } from "../services/api.js";
import AppShell from "../components/AppShell.jsx";
import { IconUpload, IconLeaf } from "../components/icons.jsx";
import { CROPS } from "../utils/constants.js";
import { useTranslation } from "react-i18next";

const STATUS_BADGE = {
  Healthy: "badge-healthy",
  "At Risk": "badge-moderate",
  Diseased: "badge-stressed",
};

export default function DiseaseDetection({ user, role, onSwitchRole, onLogout, onLanguageChange }) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState("Wheat");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    api.getDiseaseHistory(user.id).then(setHistory).catch(() => {});
  }, [user.id]);

  const pickFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError("");
    setPreview(URL.createObjectURL(f));
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.detectDisease({ file, crop, userId: user.id, language: user.language });
      setResult(res);
      setHistory((h) => [res, ...h]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      user={user}
      role={role}
      onSwitchRole={onSwitchRole}
      onLogout={onLogout}
      onLanguageChange={onLanguageChange}
      title={t("disease.title")}
      subtitle={t("disease.subtitle")}
    >
      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <div className="card">
          <div className="field-group">
            <label>{t("disease.crop")}</label>
            <select value={crop} onChange={(e) => setCrop(e.target.value)}>
              {CROPS.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>

          <div
            className={`dropzone${dragOver ? " drag-over" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
          >
            {preview ? (
              <img src={preview} alt="Crop preview" style={{ maxHeight: 220, borderRadius: 8, margin: "0 auto" }} />
            ) : (
              <>
                <div style={{ fontSize: "1.8rem", color: "var(--canopy)", marginBottom: "0.5rem" }}><IconUpload /></div>
                <p style={{ margin: 0, fontWeight: 600 }}>{t("disease.drop_photo")}</p>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem" }}>{t("disease.file_types")}</p>
              </>
            )}
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => pickFile(e.target.files?.[0])} />
          </div>

          {error && <p style={{ color: "var(--stress)", fontSize: "0.85rem", marginTop: "0.75rem" }}>{error}</p>}

          <button className="btn-primary" style={{ width: "100%", marginTop: "1rem" }} onClick={handleAnalyze} disabled={!file || loading}>
            {loading ? t("disease.analyzing") : t("disease.analyze")}
          </button>
        </div>

        <div className="card">
          <h3 style={{ fontSize: "1.05rem", marginBottom: "1rem" }}>{t("disease.result_title")}</h3>
          {!result && !loading && (
            <div className="empty-state" style={{ padding: "2rem 1rem" }}>
              <div style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}><IconLeaf /></div>
              <p>{t("disease.result_empty")}</p>
            </div>
          )}
          {loading && <p style={{ color: "#6b6455" }}>{t("disease.screening")}</p>}
          {result && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <span className={`badge ${STATUS_BADGE[result.status] || "badge-moderate"}`}>{result.status}</span>
                <span style={{ fontSize: "0.78rem", color: "#6b6455" }}>{t("disease.confidence")} {result.confidence_label}</span>
              </div>
              <h4 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem" }}>{result.disease_name}</h4>
              <p style={{ fontSize: "0.9rem", color: "var(--soil)" }}>{result.summary}</p>
              <div className="card" style={{ background: "rgba(77,112,66,0.08)", marginTop: "0.75rem" }}>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.35rem" }}>{t("disease.recommended_action")}</div>
                <p style={{ margin: 0, fontSize: "0.88rem" }}>{result.recommended_action}</p>
              </div>
              <button
                className="btn-sky"
                style={{ marginTop: "1rem", width: "100%" }}
                onClick={() => {
                  const event = new CustomEvent("agrimitra:open", {
                    detail: { question: `My ${crop} crop was screened as "${result.disease_name}" (${result.status}). What treatment and pesticide should I use?` },
                  });
                  window.dispatchEvent(event);
                }}
              >
                {t("disease.ask_agrimitra")}
              </button>
            </div>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <h3 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>{t("disease.recent_scans")}</h3>
          {history.slice(0, 6).map((s) => (
            <div className="list-row" key={s.scan_id}>
              <div>
                <strong>{s.disease_name}</strong>
                <div style={{ fontSize: "0.8rem", color: "#6b6455" }}>{s.crop || "–"} &middot; {new Date(s.created_at).toLocaleDateString()}</div>
              </div>
              <span className={`badge ${STATUS_BADGE[s.status] || "badge-moderate"}`}>{s.status}</span>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
