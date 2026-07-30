import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: "linear-gradient(135deg, #0e1015 0%, #161a2e 55%, #1c2140 100%)",
          color: "#f1f1f4",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "#8496ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 700,
              color: "#0e1015",
            }}
          >
            D
          </div>
          <span
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            Did <span style={{ color: "#8496ff" }}>AI </span> Write It?
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
            }}
          >
            Did <span style={{ color: "#8496ff" }}>AI </span> Write It?
          </div>
          <div style={{ fontSize: 30, color: "#a3a3af", maxWidth: 820 }}>
            Real, verified AI-detection, plagiarism, and fact-check scores for any draft.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
