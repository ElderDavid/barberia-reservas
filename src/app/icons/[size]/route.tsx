import { ImageResponse } from "next/og";

const SIZES = new Set([192, 512]);

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0e0e10",
        color: "#d4a24c",
        fontSize: size * 0.6,
        fontWeight: 700,
      }}
    >
      B
    </div>,
    { width: size, height: size },
  );
}
