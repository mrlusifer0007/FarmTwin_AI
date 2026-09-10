import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../services/api.js";
import AppShell from "../components/AppShell.jsx";

const STATUS_BADGE = { pending: "badge-pending", accepted: "badge-accepted", rejected: "badge-rejected" };

export default function Offers({ user, role, onSwitchRole, onLogout, onLanguageChange }) {
  const { t } = useTranslation();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const FULFILLMENT_LABEL = { 
    awaiting_payment: t("inbox.awaiting_payment"), 
    paid: t("inbox.paid"), 
    delivered: t("inbox.delivered") 
  };

  const load = () => api.myOffers(user.id).then(setOffers).finally(() => setLoading(false));

  useEffect(load, [user.id]);

  const markPaid = async (offerId) => {
    setBusyId(offerId);
    try {
      await api.updateFulfillment(offerId, "paid");
      load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppShell user={user} role={role} onSwitchRole={onSwitchRole} onLogout={onLogout} onLanguageChange={onLanguageChange} title={t("buyer.my_offers")} subtitle={t("offers_page.subtitle")}>
      {loading && <p style={{ color: "#6b6455" }}>{t("common.loading")}</p>}
      {!loading && offers.length === 0 && (
        <div className="card empty-state">
          <p>{t("offers_page.no_offers")}</p>
        </div>
      )}
      <div className="card">
        {offers.map((o) => (
          <div className="list-row" key={o.id}>
            <div>
              <strong>{o.crop}{o.variety ? ` \u00b7 ${o.variety}` : ""}</strong>
              <div style={{ fontSize: "0.82rem", color: "#6b6455" }}>
                {t("offers_page.your_offer")} &#8377;{o.offer_price} {o.quantity ? `${t("inbox.for_label")} ${o.quantity} ${o.unit || ""}` : ""} &middot; {t("inbox.farmer_label")}: {o.counterparty_name || "\u2013"}
              </div>
              {o.message && <div style={{ fontSize: "0.8rem", color: "#8a8272", marginTop: "0.2rem" }}>&ldquo;{o.message}&rdquo;</div>}
              {o.status === "accepted" && (
                <div style={{ fontSize: "0.8rem", color: "var(--canopy)", marginTop: "0.3rem", fontWeight: 600 }}>
                  {FULFILLMENT_LABEL[o.fulfillment_status] || t("inbox.awaiting_payment")}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className={`badge ${STATUS_BADGE[o.status] || "badge-pending"}`}>{o.status}</span>
              {o.status === "accepted" && o.fulfillment_status === "awaiting_payment" && (
                <button className="btn-primary" disabled={busyId === o.id} onClick={() => markPaid(o.id)}>
                  {t("offers_page.mark_paid")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
