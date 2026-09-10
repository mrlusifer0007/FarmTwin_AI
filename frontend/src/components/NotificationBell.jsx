import { useEffect, useRef, useState } from "react";
import { api } from "../services/api.js";
import { IconBell } from "./icons.jsx";

export default function NotificationBell({ userId, role }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api
        .getNotifications(userId, role)
        .then((data) => !cancelled && setItems(data))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId, role]);

  useEffect(() => {
    const handleClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button className="icon-btn" title="Notifications" onClick={() => setOpen((v) => !v)} style={{ position: "relative" }}>
        <IconBell />
        {items.length > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "var(--stress)",
              border: "1.5px solid var(--paper)",
            }}
          />
        )}
      </button>

      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 0.5rem)",
            width: 320,
            maxHeight: 380,
            overflowY: "auto",
            zIndex: 20,
            boxShadow: "0 8px 24px rgba(45,38,26,0.15)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Notifications</div>
          {items.length === 0 && <p style={{ fontSize: "0.85rem", color: "#6b6455", margin: 0 }}>You're all caught up.</p>}
          {items.map((n) => (
            <div
              key={n.id}
              style={{
                padding: "0.6rem 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "0.85rem", color: n.level === "warning" ? "var(--stress)" : "var(--soil)" }}>
                {n.title}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#6b6455" }}>{n.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
