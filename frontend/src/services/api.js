// Standard backend port
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch (err) {
    if (err.message.includes("Failed to fetch")) {
      throw new Error("Unable to connect to the backend server. Please make sure the backend is running on port 8000.");
    }
    throw err;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  createUser: (data) =>
    request("/api/users", { method: "POST", body: JSON.stringify(data) }),

  loginUser: (data) =>
    request("/api/users/login", { method: "POST", body: JSON.stringify(data) }),

  getUser: (id) => request(`/api/users/${id}`),

  createFarm: (data) =>
    request("/api/farms", { method: "POST", body: JSON.stringify(data) }),

  listFarms: (userId) =>
    request(`/api/farms${userId ? `?user_id=${userId}` : ""}`),

  getFarm: (id) => request(`/api/farms/${id}`),

  getNdvi: (farmId) =>
    request(`/api/farms/${farmId}/ndvi`).then((d) => ({
      ...d,
      // Normalize: backend returns { current: { ndvi_mean, ... }, ... }
      // Frontend FarmTwinView expects { ndvi: number }
      ndvi: d?.current?.ndvi_mean ?? d?.ndvi_mean ?? d?.ndvi ?? null,
    })),

  getNdviHistory: (farmId, days = 90) =>
    request(`/api/farms/${farmId}/ndvi/history?days=${days}`),

  getNdviGrid: (farmId, gridSize = 3) =>
    request(`/api/farms/${farmId}/ndvi/grid?grid_size=${gridSize}`),

  getWeather: (farmId) =>
    request(`/api/farms/${farmId}/weather`).then((d) => ({
      ...d,
      // Normalize: backend returns { current: { temperature_c, humidity_pct, condition } }
      // Frontend FarmTwinView expects { temperature, humidity }
      // Dashboard weather badge expects { description }
      temperature: d?.current?.temperature_c ?? d?.temperature ?? null,
      humidity: d?.current?.humidity_pct ?? d?.humidity ?? null,
      description: d?.current?.condition ?? d?.description ?? null,
    })),

  getInsight: (farmId) => request(`/api/farms/${farmId}/insight`),

  getHealthPrediction: (farmId) =>
    request(`/api/farms/${farmId}/health`).then((d) => ({
      ...d,
      // ExplainableRiskPanel needs possible_causes; health endpoint doesn't return it
      // so we fetch insight in parallel if possible_causes is missing
      possible_causes: d?.possible_causes ?? [],
    })),

  getRecommendations: (farmId, language = "en") =>
    request(`/api/farms/${farmId}/recommendations?language=${language}`)
      .then((d) => {
        // Backend returns { farm_id, health_label, recommendations: [...] }
        // Dashboard expects a flat array
        if (Array.isArray(d)) return d;
        if (Array.isArray(d?.recommendations)) return d.recommendations;
        return [];
      }),

  askAssistant: (farmId, question, language) =>
    request(`/api/farms/${farmId}/ask`, {
      method: "POST",
      body: JSON.stringify({ question, language }),
    }),

  // ---- AI Selling Advisor ----
  getMarketAdvice: (crop, { quantity, farmId } = {}) => {
    const params = new URLSearchParams({ crop });
    if (quantity) params.set("quantity", quantity);
    if (farmId) params.set("farm_id", farmId);
    return request(`/api/market/advisor?${params.toString()}`);
  },

  // ---- Medicine Assistant ----
  askMedicineAssistant: (question, crop, language = "en") =>
    request("/api/assistant/medicine", {
      method: "POST",
      body: JSON.stringify({ question, crop, language }),
    }),

  // ---- Disease Detection ----
  detectDisease: async ({ file, crop, userId, farmId, language = "en" }) => {
    const form = new FormData();
    form.append("file", file);
    if (crop) form.append("crop", crop);
    if (userId) form.append("user_id", userId);
    if (farmId) form.append("farm_id", farmId);
    form.append("language", language);
    const res = await fetch(`${API_BASE}/api/disease/detect`, { method: "POST", body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `Request failed: ${res.status}`);
    }
    return res.json();
  },

  getDiseaseHistory: (userId) => request(`/api/disease/history?user_id=${userId}`),

  // ---- Service Hub ----
  getServiceCatalog: () => request("/api/services/catalog"),

  createBooking: (data) =>
    request("/api/services/bookings", { method: "POST", body: JSON.stringify(data) }),

  listBookings: (userId) => request(`/api/services/bookings?user_id=${userId}`),

  // ---- Marketplace ----
  createListing: (data) =>
    request("/api/marketplace/listings", { method: "POST", body: JSON.stringify(data) }),

  browseListings: ({ crop, state } = {}) => {
    const params = new URLSearchParams();
    if (crop) params.set("crop", crop);
    if (state) params.set("state", state);
    const qs = params.toString();
    return request(`/api/marketplace/listings${qs ? `?${qs}` : ""}`);
  },

  myListings: (userId) => request(`/api/marketplace/listings/mine?user_id=${userId}`),

  closeListing: (listingId) =>
    request(`/api/marketplace/listings/${listingId}/close`, { method: "PATCH" }),

  sendOffer: (listingId, data) =>
    request(`/api/marketplace/listings/${listingId}/offers`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listingOffers: (listingId) => request(`/api/marketplace/listings/${listingId}/offers`),

  myOffers: (userId) => request(`/api/marketplace/offers/mine?user_id=${userId}`),

  receivedOffers: (userId) => request(`/api/marketplace/offers/received?user_id=${userId}`),

  updateOfferStatus: (offerId, status) =>
    request(`/api/marketplace/offers/${offerId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  updateFulfillment: (offerId, fulfillmentStatus) =>
    request(`/api/marketplace/offers/${offerId}/fulfillment`, {
      method: "PATCH",
      body: JSON.stringify({ fulfillment_status: fulfillmentStatus }),
    }),

  // ---- Notifications ----
  getNotifications: (userId, role) =>
    request(`/api/notifications?user_id=${userId}&role=${role}`),
  getSoilProfile: (farmId) => request(`/api/farms/${farmId}/soil`), getFarmMemory: (farmId) => request(`/api/farms/${farmId}/memory`), getWeeklyReport: (farmId) => request(`/api/farms/${farmId}/report`), simulateScenario: (farmId, scenario, language = "en") =>
    request(`/api/farms/${farmId}/simulate`, {
      method: "POST",
      body: JSON.stringify({ scenario, language }),
    }),




};


