import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import AppShell from "../components/AppShell.jsx";
import { CROPS } from "../utils/constants.js";
import { useTranslation } from "react-i18next";

const UNITS = ["Quintal", "Kg", "Tonne"];
const EMPTY_OFFER = { offer_price: "", quantity: "", message: "" };

export default function Marketplace({ user, role, onSwitchRole, onLogout, onLanguageChange }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState(role === "buyer" ? "browse" : "create");
  const [listings, setListings] = useState([]);
  const [mine, setMine] = useState([]);
  const emptyListing = { crop: "", variety: "", quantity: "", unit: "Quintal", expected_price: "", state: user.state || "", district: user.district || "", description: "" };
  const [form, setForm] = useState(emptyListing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [offerTarget, setOfferTarget] = useState(null);
  const [offerForm, setOfferForm] = useState(EMPTY_OFFER);
  const [offerSentIds, setOfferSentIds] = useState([]);

  const loadBrowse = () => api.browseListings().then(setListings).catch((e) => setError(e.message));
  const loadMine = () => api.myListings(user.id).then(setMine).catch(() => {});

  useEffect(() => {
    loadBrowse();
    if (role === "farmer") loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const submitListing = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.createListing({ user_id: user.id, crop: form.crop, variety: form.variety || null, quantity: Number(form.quantity), unit: form.unit, expected_price: Number(form.expected_price), state: form.state || null, district: form.district || null, description: form.description || null });
      setForm(emptyListing);
      loadBrowse();
      loadMine();
      setTab("browse");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitOffer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.sendOffer(offerTarget.id, { buyer_id: user.id, offer_price: Number(offerForm.offer_price), quantity: offerForm.quantity ? Number(offerForm.quantity) : null, message: offerForm.message || null });
      setOfferSentIds((prev) => [...prev, offerTarget.id]);
      setOfferTarget(null);
      setOfferForm(EMPTY_OFFER);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const visibleListings = role === "farmer" && tab === "mine" ? mine : listings;

  const renderListing = (l) => (
    <div key={l.id} className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h4 style={{ margin: 0 }}>{l.crop}</h4>
          <p style={{ margin: "0.15rem 0 0", color: "#6b6455", fontSize: "0.85rem" }}>{l.variety || "–"}</p>
        </div>
        <span className={`badge ${l.status === "active" ? "badge-active" : "badge-sold"}`}>{l.status}</span>
      </div>
      <p style={{ fontSize: "0.85rem", margin: "0.6rem 0 0.2rem" }}>{t("common.quantity")}: {l.quantity} {l.unit}</p>
      <p style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--soil)", margin: "0.2rem 0" }}>&#8377;{l.expected_price}</p>
      {(l.district || l.state) && (
        <p style={{ fontSize: "0.8rem", color: "#6b6455", margin: 0 }}>&#128205; {[l.district, l.state].filter(Boolean).join(", ")}</p>
      )}
      {role === "buyer" && l.status === "active" && (
        offerSentIds.includes(l.id) ? (
          <button className="btn-secondary" style={{ width: "100%", marginTop: "0.85rem" }} disabled>{t("common.offer_sent")}</button>
        ) : (
          <button className="btn-primary" style={{ width: "100%", marginTop: "0.85rem" }} onClick={() => setOfferTarget(l)}>{t("common.send_offer")}</button>
        )
      )}
      {role === "farmer" && tab === "mine" && l.status === "active" && (
        <button className="btn-secondary" style={{ width: "100%", marginTop: "0.85rem" }} onClick={async () => { await api.closeListing(l.id); loadMine(); loadBrowse(); }}>
          {t("common.close_listing")}
        </button>
      )}
    </div>
  );

  return (
    <AppShell user={user} role={role} onSwitchRole={onSwitchRole} onLogout={onLogout} onLanguageChange={onLanguageChange} title={t("marketplace.title")} subtitle={t("marketplace.subtitle")}>
      <div className="tabs">
        {role === "farmer" && (
          <button className={`tab${tab === "create" ? " active" : ""}`} onClick={() => setTab("create")}>{t("marketplace.create_listing")}</button>
        )}
        <button className={`tab${tab === "browse" ? " active" : ""}`} onClick={() => setTab("browse")}>{t("marketplace.browse")}</button>
        {role === "farmer" && (
          <button className={`tab${tab === "mine" ? " active" : ""}`} onClick={() => setTab("mine")}>{t("marketplace.my_listings")}</button>
        )}
      </div>

      {error && <p style={{ color: "var(--stress)" }}>{error}</p>}

      {tab === "create" && role === "farmer" && (
        <form className="card" style={{ maxWidth: 640, marginBottom: "1.5rem" }} onSubmit={submitListing}>
          <div className="grid grid-2">
            <div className="field-group">
              <label>{t("marketplace.crop_name")}</label>
              <select value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })}>
                <option value="" disabled>{t("marketplace.select_crop")}</option>
                {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field-group"><label>{t("common.variety")}</label><input value={form.variety} onChange={(e) => setForm({ ...form, variety: e.target.value })} /></div>
            <div className="field-group"><label>{t("common.quantity")}</label><input required type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
            <div className="field-group">
              <label>{t("common.unit")}</label>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="field-group"><label>{t("marketplace.expected_price")}</label><input required type="number" min="0" value={form.expected_price} onChange={(e) => setForm({ ...form, expected_price: e.target.value })} /></div>
            <div className="field-group"><label>{t("common.state")}</label><input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            <div className="field-group"><label>{t("common.district")}</label><input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></div>
          </div>
          <div className="field-group"><label>{t("common.description")}</label><textarea rows="2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? t("common.publishing") : t("marketplace.create_listing")}</button>
        </form>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ fontSize: "1.05rem", margin: 0 }}>
          {tab === "mine" ? t("marketplace.my_listings") : t("marketplace.available_listings")}
        </h3>
        {tab === "browse" && user.district && (
          <p style={{ fontSize: "0.85rem", margin: 0, color: "var(--canopy)" }}>
            {t("marketplace.suggestions")} <strong>{user.district}, {user.state}</strong>
          </p>
        )}
      </div>

      {visibleListings.length === 0 && <p style={{ color: "#6b6455" }}>{t("marketplace.no_listings")}</p>}

      {tab === "browse" && user.district && visibleListings.some(l => l.district === user.district) && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h4 style={{ fontSize: "0.95rem", color: "var(--soil)", marginBottom: "0.5rem" }}>{t("marketplace.local_matches", { district: user.district })}</h4>
          <div className="grid grid-auto">{visibleListings.filter(l => l.district === user.district).map(renderListing)}</div>
          <h4 style={{ fontSize: "0.95rem", color: "#6b6455", marginTop: "1.5rem", marginBottom: "0.5rem" }}>{t("marketplace.other_listings")}</h4>
        </div>
      )}

      <div className="grid grid-auto">
        {visibleListings.filter(l => !(tab === "browse" && user.district && l.district === user.district)).map(renderListing)}
      </div>

      {offerTarget && (
        <div className="card" style={{ marginTop: "1.5rem", maxWidth: 480 }}>
          <h3 style={{ fontSize: "1.05rem", marginBottom: "1rem" }}>{t("marketplace.send_offer_title")} &middot; {offerTarget.crop}</h3>
          <form onSubmit={submitOffer}>
            <div className="field-group"><label>{t("marketplace.your_offer_price", { unit: offerTarget.unit })}</label><input required type="number" min="0" value={offerForm.offer_price} onChange={(e) => setOfferForm({ ...offerForm, offer_price: e.target.value })} /></div>
            <div className="field-group"><label>{t("common.quantity")}</label><input type="number" min="0" value={offerForm.quantity} onChange={(e) => setOfferForm({ ...offerForm, quantity: e.target.value })} /></div>
            <div className="field-group"><label>{t("marketplace.message_optional")}</label><textarea rows="2" value={offerForm.message} onChange={(e) => setOfferForm({ ...offerForm, message: e.target.value })} /></div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? t("common.sending") : t("common.send_offer")}</button>
              <button type="button" className="btn-secondary" onClick={() => setOfferTarget(null)}>{t("common.cancel")}</button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
