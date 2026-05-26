import { ImageResponse } from "next/og";
import { getGalleryPreviewMetadata } from "@/app/actions/gallery-actions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const metadata = await getGalleryPreviewMetadata(slug);

    if (!metadata) {
      return new Response("Gallery not found", { status: 404 });
    }

    const title = metadata.title || "Album Ảnh";
    const coverUrl = metadata.coverImageUrl;
    const highResCoverUrl = coverUrl ? coverUrl.replace(/=s\d+/, "=s1200") : undefined;

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            backgroundColor: "#ffffff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background Image (using img instead of backgroundImage to fix Satori edge artifacts) */}
          {highResCoverUrl && (
            <img
              src={highResCoverUrl}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center 25%",
              }}
            />
          )}

          {/* Bottom Gradient Overlay for text readability (only bottom 60%) */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0) 60%)",
              display: "flex",
            }}
          />

          {/* Content Box */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              zIndex: 10,
              padding: "60px 80px",
              width: "100%",
            }}
          >
            {/* Brand / Kicker */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div style={{ width: "32px", height: "3px", backgroundColor: "#D4A373", marginRight: "16px", borderRadius: "2px" }} />
              <div
                style={{
                  fontSize: "24px",
                  fontFamily: "system-ui, sans-serif",
                  fontWeight: 600,
                  color: "#D4A373",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                MOOD STUDIO
              </div>
            </div>

            {/* Tiêu đề */}
            <h1
              style={{
                fontSize: "76px",
                fontFamily: "system-ui, sans-serif",
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.03em",
                margin: 0,
                lineHeight: 1.1,
                maxWidth: "1000px",
              }}
            >
              {title}
            </h1>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
        },
      }
    );
  } catch (e: unknown) {
    console.error("[OG API Error]", e);
    return new Response("Failed to generate image", { status: 500 });
  }
}
