# What's new in this build

This adds the feature set from your screenshots on top of the existing
satellite/NDVI digital twin, plus a new sidebar/topbar UI shell across
every screen.

## New pages (frontend)
- **Farmer Dashboard** (`/dashboard`) — AI Final Decision card (sell/hold) + quick actions + your farms.
- **Weather Intelligence** (`/weather`) — current conditions, today's sunrise/sunset/rain chance, air quality, 7‑day forecast, weather alerts, AI farming advice.
- **AI Selling Advisor** (`/advisor`) — price estimate, mandi comparison map, hold/sell recommendation.
- **AI Crop Disease Detection** (`/disease-detection`) — upload a leaf photo, get an AI screening result.
- **Medicine Assistant** (`/medicine-assistant`) — chat for pest/disease/nutrient guidance.
- **Farm Service Hub** (`/services`) — book spray / crop‑cutting services.
- **Marketplace** (`/marketplace`) — create listings (farmer) / send offers (buyer).
- **Buyer Dashboard** (`/buyer`), **My Offers** (`/offers`), **Inbox** (`/inbox`), **Settings** (`/settings`).
- A Farmer ⇄ Buyer view switch (sidebar footer or Settings) — same account, two views, for demo purposes since there's no separate buyer auth flow yet.

## New backend (real, not stubbed)
- `services/weather.py` — extended Open‑Meteo integration (condition text, wind, pressure, sunrise/sunset, UV, 7‑day forecast) + a real air‑quality call + disclosed rule‑based alerts/advice.
- `services/disease.py` + `routes/disease.py` — sends your uploaded photo to Claude as an **image input** for a structured screening result. Real model call, explicitly framed as a screening aid, not a lab diagnosis.
- `services/assistant.py` (`ask_general`) + `/api/assistant/medicine` — reuses your existing Claude-powered assistant with a pest/disease persona.
- `routes/marketplace.py`, `routes/services.py` — full CRUD-backed marketplace (listings, offers, accept/reject, close/delist) and service bookings, with new ORM tables (`marketplace_listings`, `offers`, `service_bookings`, `disease_scans`) and a `role` column on `users`. Accepted offers get a lightweight **fulfillment tracker** (`awaiting_payment` → `paid` → `delivered`) — a shared checklist both sides can advance, not a real payment gateway.
- `routes/notifications.py` — real, on-the-fly notifications (pending offers received, offers resolved, upcoming bookings, live weather alerts) surfaced via a working bell dropdown in the topbar.
- `services/market.py` + `routes/market.py` — **the one deliberately "honest mock"**: there's no free, keyless live mandi price API, so this is a disclosed, deterministic estimator (representative base price nudged by your farm's real recent rainfall/temperature) with a 3‑mandi demo network. The response includes a `methodology` field explaining exactly this — swap it for a real Agmarknet integration later without touching the frontend.

## To run it
1. `cd backend && pip install -r requirements.txt` (now includes `python-multipart` for image uploads).
2. Set `ANTHROPIC_API_KEY` in `backend/.env` — required for Disease Detection and Medicine Assistant.
3. Tables are created automatically on startup (`Base.metadata.create_all`), including the four new ones — no manual migration needed for a fresh DB. `models/schema.sql` is updated too, for reference/manual setup.
4. `cd frontend && npm install && npm run dev` — no new frontend dependencies were added, everything uses packages already in `package.json` (react-router-dom, leaflet).

## Known limitations, stated plainly
- The fulfillment tracker (paid/delivered) is a shared status checklist, not a real payment gateway — no money actually moves.
- Notifications have no persisted "read" state yet — a pending offer keeps showing until it's accepted/rejected.
- The buyer/farmer "role switch" is a UI convenience on one account, not a real multi-account auth system.
- Disease Detection is a screening aid (Claude vision + a cautious prompt), not a certified diagnostic tool — the UI and API responses say so.
- AI Selling Advisor prices are a disclosed estimate, not a live mandi feed (see `methodology` in the API response) — there's no free, keyless Agmarknet-equivalent to wire up instead.
