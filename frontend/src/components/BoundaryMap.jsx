import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet-draw";

// Default center: near Nashik, Maharashtra
const DEFAULT_CENTER = [19.99, 73.79];
const DEFAULT_ZOOM = 15;

/* ─────────────────────────────────────────────────────────────────────────────
   COMPLETE CSS FIX — injects all styles needed for draw-toolbar icons AND
   makes sure the toolbar buttons actually appear as pentagon / rectangle SVGs.
   We also add styles for the search bar overlay.
───────────────────────────────────────────────────────────────────────────── */
const ALL_CSS = `
  /* ── Leaflet-draw toolbar button resets ─────────────────────── */
  .leaflet-draw-toolbar a {
    background-image: none !important;
    background-color: #fff !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 30px !important;
    height: 30px !important;
  }
  .leaflet-draw-toolbar a:hover {
    background-color: #f4f4f4 !important;
  }

  /* ── Polygon (pentagon) icon ─────────────────────────────────── */
  .leaflet-draw-draw-polygon::after {
    content: "";
    display: block;
    width: 18px;
    height: 18px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpolygon points='12,2 22,9 18,21 6,21 2,9' fill='%2335502f' stroke='%2335502f' stroke-width='1'/%3E%3C/svg%3E");
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
  }

  /* ── Rectangle icon ──────────────────────────────────────────── */
  .leaflet-draw-draw-rectangle::after {
    content: "";
    display: block;
    width: 18px;
    height: 18px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='2' y='5' width='20' height='14' fill='none' stroke='%2335502f' stroke-width='2.5' rx='1'/%3E%3C/svg%3E");
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
  }

  /* ── Edit / Delete icons ─────────────────────────────────────── */
  .leaflet-draw-edit-edit::after {
    content: "✏️";
    font-size: 14px;
  }
  .leaflet-draw-edit-remove::after {
    content: "🗑️";
    font-size: 14px;
  }

  /* ── Draw tooltip ───────────────────────────────────────────── */
  .leaflet-draw-tooltip {
    background: #2d4a28;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 0.78rem;
    padding: 4px 8px;
  }
  .leaflet-draw-tooltip:before { border-right-color: #2d4a28; }

  /* ── Search bar overlay ─────────────────────────────────────── */
  .map-search-control {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1000;
    display: flex;
    gap: 4px;
    pointer-events: auto;
  }
  .map-search-input {
    width: 220px;
    padding: 6px 10px;
    border: 2px solid #35502f;
    border-radius: 6px;
    font-size: 0.82rem;
    background: rgba(255,255,255,0.97);
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    outline: none;
  }
  .map-search-input:focus {
    border-color: #4caf50;
    box-shadow: 0 2px 12px rgba(76,175,80,0.3);
  }
  .map-search-btn {
    padding: 6px 12px;
    background: #35502f;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 0.82rem;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    white-space: nowrap;
  }
  .map-search-btn:hover { background: #4caf50; }
  .map-search-results {
    position: absolute;
    top: 38px;
    right: 0;
    width: 280px;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.18);
    z-index: 1001;
    max-height: 220px;
    overflow-y: auto;
  }
  .map-search-result-item {
    padding: 8px 12px;
    font-size: 0.8rem;
    cursor: pointer;
    border-bottom: 1px solid #f0f0f0;
    color: #333;
    line-height: 1.3;
  }
  .map-search-result-item:hover {
    background: #e8f5e9;
    color: #2d4a28;
  }
  .map-search-result-item:last-child { border-bottom: none; }
  .map-search-no-result {
    padding: 10px 12px;
    font-size: 0.8rem;
    color: #888;
    text-align: center;
  }
`;

/* ── Nominatim search helper ─────────────────────────────────────────────── */
async function nominatimSearch(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query
  )}&format=json&addressdetails=1&limit=6&countrycodes=in`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) return [];
  return res.json();
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function BoundaryMap({ onBoundaryChange }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const drawnItemsRef = useRef(null);
  const searchMarkerRef = useRef(null);

  // Search bar state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  /* ── Map init ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (mapRef.current) return;

    // Inject all CSS once
    if (!document.getElementById("agritwin-map-css")) {
      const style = document.createElement("style");
      style.id = "agritwin-map-css";
      style.textContent = ALL_CSS;
      document.head.appendChild(style);
    }

    const map = L.map(containerRef.current, {
      zoomControl: true,
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    mapRef.current = map;

    /* ── Layer 1: Esri Satellite imagery (base) ─────────────────────── */
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, USDA, USGS, GeoEye, IGN, IGP and the GIS User Community',
        maxZoom: 19,
      }
    ).addTo(map);

    /* ── Layer 2: Esri Boundaries & Places (country/state/city labels) ─ */
    L.tileLayer(
      "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { attribution: "", maxZoom: 19, opacity: 1 }
    ).addTo(map);

    /* ── Layer 3: OpenStreetMap label overlay (village / road names) ─── */
    // This transparent overlay adds village names, local roads, and
    // farm/locality labels that Esri's label layer often misses at zoom 15+.
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
      {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
        opacity: 0.9,
      }
    ).addTo(map);

    /* ── Geolocation center ─────────────────────────────────────────── */
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          map.setView(
            [pos.coords.latitude, pos.coords.longitude],
            DEFAULT_ZOOM
          ),
        () => {}
      );
    }

    /* ── Draw feature group ─────────────────────────────────────────── */
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    /* ── Draw control ─────────────────────────────────────────────────
       IMPORTANT: We create the control AFTER the map is ready.
       Both polygon and rectangle are enabled explicitly.
    ─────────────────────────────────────────────────────────────────── */
    const drawControl = new L.Control.Draw({
      position: "topleft",
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          showLength: true,
          shapeOptions: {
            color: "#35502f",
            fillColor: "#35502f",
            fillOpacity: 0.18,
            weight: 2.5,
          },
          icon: new L.DivIcon({
            iconSize: new L.Point(8, 8),
            className: "leaflet-div-icon leaflet-editing-icon",
          }),
          metric: true,
          feet: false,
          repeatMode: false,
          drawError: { color: "#e74c3c", timeout: 1000 },
        },
        rectangle: {
          shapeOptions: {
            color: "#35502f",
            fillColor: "#35502f",
            fillOpacity: 0.18,
            weight: 2.5,
          },
          showArea: true,
          metric: true,
          repeatMode: false,
        },
        // Disable unused tools
        marker: false,
        circle: false,
        circlemarker: false,
        polyline: false,
      },
      edit: {
        featureGroup: drawnItems,
        poly: { allowIntersection: false },
        remove: true,
      },
    });
    map.addControl(drawControl);

    /* ── After control is added, replace the icon sprites with inline SVG ─
       We wait one microtask so Leaflet has rendered the toolbar HTML.        */
    setTimeout(() => {
      // Pentagon SVG for polygon button
      document.querySelectorAll(".leaflet-draw-draw-polygon").forEach((el) => {
        el.style.backgroundImage = "none";
        el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><polygon points="12,2 22,9 18,21 6,21 2,9" fill="#35502f"/></svg>`;
      });
      // Rectangle SVG for rectangle button
      document
        .querySelectorAll(".leaflet-draw-draw-rectangle")
        .forEach((el) => {
          el.style.backgroundImage = "none";
          el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" fill="none" stroke="#35502f" stroke-width="2.5" rx="1"/></svg>`;
        });
    }, 100);

    /* ── Boundary emit ──────────────────────────────────────────────── */
    const emitBoundary = () => {
      const layers = drawnItems.getLayers();
      if (layers.length === 0) {
        onBoundaryChange(null);
        return;
      }
      onBoundaryChange(layers[0].toGeoJSON().geometry);
    };

    map.on(L.Draw.Event.CREATED, (e) => {
      drawnItems.clearLayers();
      drawnItems.addLayer(e.layer);
      emitBoundary();
    });
    map.on(L.Draw.Event.EDITED, emitBoundary);
    map.on(L.Draw.Event.DELETED, emitBoundary);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onBoundaryChange]);

  /* ── Find My Location ───────────────────────────────────────────────── */
  const handleFindLocation = (e) => {
    e.preventDefault();
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        mapRef.current?.setView(
          [pos.coords.latitude, pos.coords.longitude],
          DEFAULT_ZOOM
        ),
      (err) => {
        if (err.code === 1) {
          alert(
            "Location access was denied. Please allow access in your browser settings."
          );
        } else {
          alert(
            "Unable to retrieve your location. Please ensure GPS is enabled."
          );
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  /* ── Search handlers ────────────────────────────────────────────────── */
  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setShowResults(true);
    try {
      const results = await nominatimSearch(q);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") {
      setShowResults(false);
      setSearchResults([]);
    }
  };

  const handleResultClick = useCallback((result) => {
    const map = mapRef.current;
    if (!map) return;
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    map.setView([lat, lon], 16);

    // Place a temporary marker
    if (searchMarkerRef.current) searchMarkerRef.current.remove();
    searchMarkerRef.current = L.marker([lat, lon])
      .addTo(map)
      .bindPopup(
        `<strong>${result.display_name.split(",")[0]}</strong><br/>${result.display_name}`
      )
      .openPopup();

    setShowResults(false);
    setSearchResults([]);
    setSearchQuery(result.display_name.split(",")[0]);
  }, []);

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div>
      {/* Toolbar hint */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={handleFindLocation}
          style={{
            padding: "0.4rem 0.8rem",
            fontSize: "0.85rem",
            cursor: "pointer",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "6px",
          }}
        >
          📍 Find My Location
        </button>
        <span
          style={{
            fontSize: "0.78rem",
            color: "#6e6757",
            background: "#f5f1e9",
            border: "1px solid #e2dac7",
            borderRadius: "6px",
            padding: "3px 8px",
          }}
        >
          ⬠ Click the <strong>pentagon icon</strong> to draw a polygon · ▭ or{" "}
          <strong>rectangle icon</strong> for a box · Click{" "}
          <strong>Finish</strong> to save
        </span>
      </div>

      {/* Map container with search bar overlay */}
      <div style={{ position: "relative" }}>
        {/* Search bar floating over map */}
        <div className="map-search-control">
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: "4px" }}>
              <input
                className="map-search-input"
                type="text"
                placeholder=""
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
              />
              <button
                className="map-search-btn"
                onClick={handleSearch}
                disabled={searching}
              >
                {searching ? "..." : "Search"}
              </button>
            </div>

            {/* Results dropdown */}
            {showResults && (
              <div className="map-search-results">
                {searching ? (
                  <div className="map-search-no-result">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="map-search-no-result">No results found</div>
                ) : (
                  searchResults.map((r) => (
                    <div
                      key={r.place_id}
                      className="map-search-result-item"
                      onClick={() => handleResultClick(r)}
                    >
                      <span style={{ marginRight: "6px" }}>
                        {r.type === "village" || r.type === "hamlet"
                          ? "🏘️"
                          : r.type === "city" || r.type === "town"
                          ? "🏙️"
                          : r.type === "administrative"
                          ? "🗺️"
                          : "📍"}
                      </span>
                      <strong>{r.display_name.split(",")[0]}</strong>
                      <span style={{ color: "#888", fontSize: "0.75rem" }}>
                        {" "}
                        — {r.display_name.split(",").slice(1, 3).join(",")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Leaflet map container */}
        <div
          ref={containerRef}
          style={{
            height: "480px",
            width: "100%",
            borderRadius: "10px",
            border: "1px solid var(--line)",
          }}
          onClick={() => setShowResults(false)}
        />
      </div>
    </div>
  );
}
