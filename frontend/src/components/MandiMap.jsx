import { useEffect, useRef } from "react";
import L from "leaflet";

export default function MandiMap({ mandis }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const layerGroupRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup || !mandis?.length) return;

    layerGroup.clearLayers();
    const bounds = [];

    mandis.forEach((m) => {
      if (m.lat == null || m.lon == null) return;
      bounds.push([m.lat, m.lon]);
      const marker = L.circleMarker([m.lat, m.lon], {
        radius: 9,
        color: "#35502f",
        weight: 2,
        fillColor: "#4d7042",
        fillOpacity: 0.85,
      }).addTo(layerGroup);
      marker.bindTooltip(`${m.name} \u2014 \u20b9${m.price_per_qtl}/qtl`, { permanent: false });
    });

    if (bounds.length) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 9 });
  }, [mandis]);

  return <div ref={containerRef} style={{ height: 320, borderRadius: 12, overflow: "hidden" }} />;
}
