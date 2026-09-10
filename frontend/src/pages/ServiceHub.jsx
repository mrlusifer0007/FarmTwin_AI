import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import AppShell from "../components/AppShell.jsx";
import { IconServices } from "../components/icons.jsx";
import { useTranslation } from "react-i18next";

const STATUS_BADGE = {
  pending: "badge-pending",
  confirmed: "badge-accepted",
  completed: "badge-healthy",
  cancelled: "badge-rejected",
};

export default function ServiceHub({ user, role, onSwitchRole, onLogout, onLanguageChange }) {
  const { t } = useTranslation();
  const [catalog, setCatalog] = useState([]);
  const [farms, setFarms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [activeService, setActiveService] = useState(null);
  const [form, setForm] = useState({ farm_id: "", scheduled_date: "", area_acres: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const refreshBookings = () => api.listBookings(user.id).then(setBookings).catch(() => {});

  useEffect(() => {
    api.getServiceCatalog().then(setCatalog);
    api.listFarms(user.id).then((f) => {
      setFarms(f);
      setForm((prev) => ({ ...prev, farm_id: f[0]?.id || "" }));
    });
    refreshBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const openBooking = (service) => { setActiveService(service); setError(""); };

  const submitBooking = async (e) => {
    e.preventDefault();
    if (!form.scheduled_date) { setError(t("common.error")); return; }
    setSubmitting(true);
    setError("");
    try {
      await api.createBooking({ user_id: user.id, farm_id: form.farm_id || null, service_type: activeService.id, scheduled_date: form.scheduled_date, area_acres: form.area_acres ? Number(form.area_acres) : null, notes: form.notes || null });
      setActiveService(null);
      setForm({ farm_id: farms[0]?.id || "", scheduled_date: "", area_acres: "", notes: "" });
      refreshBookings();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      user={user}
      role={role}
      onSwitchRole={onSwitchRole}
      onLogout={onLogout}
      onLanguageChange={onLanguageChange}
      title={t("services.title")}
      subtitle={t("services.subtitle")}
    >
      <div className="grid grid-2" style={{ marginBottom: "1.5rem" }}>
        {catalog.map((service) => (
          <div key={service.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <span style={{ fontSize: "1.5rem", color: "var(--canopy)" }}><IconServices /></span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{service.name}</h3>
                  <p style={{ color: "#6b6455", fontSize: "0.88rem", margin: "0.25rem 0 0" }}>{service.description}</p>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
              <strong>&#8377;{service.price_per_acre} {t("services.per_acre")}</strong>
              <button className="btn-primary" onClick={() => openBooking(service)}>{t("common.book_now")}</button>
            </div>
          </div>
        ))}
      </div>

      {activeService && (
        <div className="card" style={{ marginBottom: "1.5rem", maxWidth: 520 }}>
          <h3 style={{ fontSize: "1.05rem", marginBottom: "1rem" }}>{t("services.book", { name: activeService.name })}</h3>
          <form onSubmit={submitBooking}>
            {farms.length > 0 && (
              <div className="field-group">
                <label>{t("common.farm")}</label>
                <select value={form.farm_id} onChange={(e) => setForm({ ...form, farm_id: e.target.value })}>
                  {farms.map((f) => (<option key={f.id} value={f.id}>{f.farm_name}</option>))}
                </select>
              </div>
            )}
            <div className="grid grid-2">
              <div className="field-group">
                <label>{t("common.date")}</label>
                <input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
              </div>
              <div className="field-group">
                <label>{t("common.area_acres")}</label>
                <input type="number" min="0" step="0.1" value={form.area_acres} onChange={(e) => setForm({ ...form, area_acres: e.target.value })} />
              </div>
            </div>
            <div className="field-group">
              <label>{t("common.notes")}</label>
              <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            {error && <p style={{ color: "var(--stress)", fontSize: "0.85rem" }}>{error}</p>}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? t("common.booking") : t("common.confirm_booking")}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setActiveService(null)}>{t("common.cancel")}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>{t("services.my_bookings")}</h3>
        {bookings.length === 0 && <p style={{ color: "#6b6455", fontSize: "0.9rem" }}>{t("services.no_bookings")}</p>}
        {bookings.map((b) => (
          <div className="list-row" key={b.id}>
            <div>
              <strong>{b.service_type === "spray" ? t("services.spray") : t("services.crop_cutting")}</strong>
              <div style={{ fontSize: "0.8rem", color: "#6b6455" }}>
                {b.scheduled_date} {b.area_acres ? `· ${b.area_acres} acres` : ""}
              </div>
            </div>
            <span className={`badge ${STATUS_BADGE[b.status] || "badge-pending"}`}>{b.status}</span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
