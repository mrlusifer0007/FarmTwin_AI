import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import AppShell from "../components/AppShell.jsx";
import { useTranslation } from "react-i18next";

const STATUS_BADGE = { pending: "badge-pending", accepted: "badge-accepted", rejected: "badge-rejected" };

export default function Inbox({ user, role, onSwitchRole, onLogout, onLanguageChange }) {
  const { t } = useTranslation();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const FULFILLMENT_LABEL = {
    awaiting_payment: t("inbox.awaiting_payment"),
    paid: t("inbox.paid"),
    delivered: t("inbox.delivered"),
  };

  const load = () => {
    const fetcher = role === "buyer" ? api.myOffers(user.id) : api.receivedOffers(user.id);
    fetcher.then(setOffers).finally(() => setLoading(false));
  };

  useEffect(load, [user.id, role]);

  const respond = async (offerId, status) => {
    setBusyId(offerId);
    try { await api.updateOfferStatus(offerId, status); load(); }
    finally { setBusyId(null); }
  };

  const markDelivered = async (offerId) => {
    setBusyId(offerId);
    try { await api.updateFulfillment(offerId, "delivered"); load(); }
    finally { setBusyId(null); }
  };

  return (
    <AppShell
      user={user}
      role={role}
      onSwitchRole={onSwitchRole}
      onLogout={onLogout}
      onLanguageChange={onLanguageChange}
      title={t("inbox.title")}
      subtitle={role === "buyer" ? t("inbox.subtitle_buyer") : t("inbox.subtitle_farmer")}
    >
      {loading && <p style={{ color: "#6b6455" }}>{t("inbox.loading")}</p>}
      {!loading && offers.length === 0 && (
        <div className="card empty-state">
          <p>{role === "buyer" ? t("inbox.no_offers_buyer") : t("inbox.no_offers_farmer")}</p>
        </div>
      )}
      <div className="card">
        {offers.map((o) => (
          <div className="list-row" key={o.id}>
            <div>
              <strong>{o.crop}{o.variety ? ` · ${o.variety}` : ""}</strong>
              <div style={{ fontSize: "0.82rem", color: "#6b6455" }}>
                {role === "buyer" ? t("inbox.farmer_label") : t("inbox.buyer_label")}: {o.counterparty_name || "–"} &middot; {t("inbox.offer_label")} &#8377;{o.offer_price} {o.quantity ? `${t("inbox.for_label")} ${o.quantity} ${o.unit || ""}` : ""}
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
              {role !== "buyer" && o.status === "pending" && (
                <>
                  <button className="btn-secondary" disabled={busyId === o.id} onClick={() => respond(o.id, "accepted")}>{t("common.accept")}</button>
                  <button className="btn-secondary" disabled={busyId === o.id} onClick={() => respond(o.id, "rejected")}>{t("common.reject")}</button>
                </>
              )}
              {role !== "buyer" && o.status === "accepted" && o.fulfillment_status === "paid" && (
                <button className="btn-primary" disabled={busyId === o.id} onClick={() => markDelivered(o.id)}>{t("common.mark_delivered")}</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
