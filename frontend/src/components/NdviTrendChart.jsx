import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function NdviTrendChart({ series }) {
  const data = series
    .filter((s) => s.ndvi_mean !== null && s.ndvi_mean !== undefined)
    .map((s) => ({ date: s.date, ndvi: Number(s.ndvi_mean.toFixed(3)) }));

  if (data.length === 0) {
    return (
      <p style={{ fontSize: "0.85rem", color: "#6b6455" }}>
        No usable Sentinel-2 scenes in this date range yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ddd3bd" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b6455" }} />
        <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "#6b6455" }} />
        <Tooltip
          contentStyle={{ background: "#fffdf8", border: "1px solid #ddd3bd", fontSize: "0.85rem" }}
        />
        <Line
          type="monotone"
          dataKey="ndvi"
          stroke="#35502f"
          strokeWidth={2}
          dot={{ r: 3, fill: "#35502f" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
