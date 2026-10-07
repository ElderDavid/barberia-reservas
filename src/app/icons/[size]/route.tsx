import { ImageResponse } from "next/og";

/** Icon file → pixel size and how much of it the scissors fill (maskable keeps a safe zone). */
const ICONS: Record<string, { size: number; scale: number }> = {
  "192": { size: 192, scale: 0.56 },
  "512": { size: 512, scale: 0.56 },
  maskable: { size: 512, scale: 0.42 },
};

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const icon = ICONS[(await params).size];
  if (!icon) return new Response("Not found", { status: 404 });
  const glyph = Math.round(icon.size * icon.scale);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0a08",
      }}
    >
      <svg
        width={glyph}
        height={glyph}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#f2f1ed"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <title>Tijeras</title>
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M8.1 7.6 20 18M8.1 16.4 20 6" />
      </svg>
    </div>,
    { width: icon.size, height: icon.size },
  );
}
