import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";
import AppShell from "../components/AppShell.jsx";
import { useTranslation } from "react-i18next";

export default function BuyerDashboard({ user, role, onSwitchRole, onLogout, onLanguageChange }) {
  const { t } = useTranslation();
  const [listings, setListings] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.browseListings(), api.myOffers(user.id)])
      .then(([l, o]) => { setListings(l); setOffers(o); })
      .finally(() => setLoading(false));
  }, [user.id]);

  const accepted = offers.filter((o) => o.status === "accepted").length;
  const pending = offers.filter((o) => o.status === "pending").length;
  const rejected = offers.filter((o) => o.status === "rejected").length;
  const marketAverage = listings.length
    ? Math.round(listings.reduce((sum, l) => sum + Number(l.expected_price), 0) / listings.length)
    : null;

  return (
    <AppShell
      user={user}
      role={role}
      onSwitchRole={onSwitchRole}
      onLogout={onLogout}
      onLanguageChange={onLanguageChange}
      title={t("buyer.title")}
      subtitle={t("buyer.welcome", { name: user.name })}
      actions={
        <>
          <Link to="/marketplace" className="btn-primary" style={{ textDecoration: "none" }}>{t("buyer.browse")}</Link>
          <Link to="/offers" className="btn-sky" style={{ textDecoration: "none" }}>{t("buyer.my_offers")}</Link>
          <Link to="/inbox" className="btn-amber" style={{ textDecoration: "none" }}>{t("buyer.inbox")}</Link>
        </>
      }
    >
      <div className="grid grid-4" style={{ marginBottom: "1rem" }}>
        <div className="stat-tile tile-accent-canopy">
          <div className="stat-label">{t("buyer.available_crops")}</div>
          <div className="stat-value">{loading ? "–" : listings.length}</div>
          <div style={{ fontSize: "0.78rem", color: "#6b6455" }}>{t("buyer.marketplace_listings")}</div>
        </div>
        <div className="stat-tile tile-accent-sky">
          <div className="stat-label">{t("buyer.offers_sent")}</div>
          <div className="stat-value">{loading ? "–" : offers.length}</div>
          <div style={{ fontSize: "0.78rem", color: "#6b6455" }}>{t("buyer.my_offers")}</div>
        </div>
        <div className="stat-tile tile-accent-amber">
          <div className="stat-label">{t("buyer.successful_deals")}</div>
          <div className="stat-value">{loading ? "–" : accepted}</div>
          <div style={{ fontSize: "0.78rem", color: "#6b6455" }}>{t("buyer.accepted")}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">{t("buyer.current_price")}</div>
          <div className="stat-value">{marketAverage ? `₹${marketAverage}` : "–"}</div>
          <div style={{ fontSize: "0.78rem", color: "#6b6455" }}>{t("buyer.market_average")}</div>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: "1.5rem" }}>
        <div className="stat-tile tile-accent-amber">
          <div className="stat-value">{pending}</div>
          <div style={{ fontSize: "0.8rem", color: "#6b6455" }}>{t("buyer.pending_offers")}</div>
        </div>
        <div className="stat-tile tile-accent-canopy">
          <div className="stat-value">{accepted}</div>
          <div style={{ fontSize: "0.8rem", color: "#6b6455" }}>{t("buyer.accepted_offers")}</div>
        </div>
        <div className="stat-tile tile-accent-stress">
          <div className="stat-value">{rejected}</div>
          <div style={{ fontSize: "0.8rem", color: "#6b6455" }}>{t("buyer.rejected_offers")}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ fontSize: "1.05rem", margin: 0 }}>{t("buyer.latest_listings")}</h3>
        <Link to="/marketplace" style={{ fontSize: "0.85rem", color: "var(--canopy)" }}>{t("common.view_all")}</Link>
      </div>
      <div className="grid grid-auto">
        {listings.slice(0, 3).map((l) => (
          <div key={l.id} className="card">
            <h4 style={{ margin: 0 }}>{l.crop}</h4>
            <p style={{ margin: "0.15rem 0 0.6rem", color: "#6b6455", fontSize: "0.85rem" }}>{l.variety || "–"}</p>
            <p style={{ margin: "0 0 0.2rem", fontSize: "0.85rem" }}>{t("common.quantity")}: {l.quantity} {l.unit}</p>
            <p style={{ fontWeight: 700, color: "var(--soil)", margin: 0 }}>&#8377;{l.expected_price}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
