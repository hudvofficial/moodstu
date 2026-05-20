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

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#111111",
            backgroundImage: coverUrl ? `url(${coverUrl})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Gradient Overlay */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.6)",
              backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.3))",
              display: "flex",
            }}
          />

          {/* Content Box */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              padding: "40px",
              textAlign: "center",
              color: "#ffffff",
              width: "100%",
            }}
          >
            {/* Tiêu đề */}
            <h1
              style={{
                fontSize: "72px",
                fontFamily: "system-ui, sans-serif",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                margin: "0 0 20px 0",
                lineHeight: 1.1,
                maxWidth: "900px",
                textWrap: "balance",
              }}
            >
              {title}
            </h1>
            
            {/* Divider */}
            <div
              style={{
                width: "60px",
                height: "4px",
                backgroundColor: "#ffffff",
                opacity: 0.8,
                borderRadius: "2px",
                margin: "20px 0",
              }}
            />

            {/* Subtitle / Brand */}
            <div
              style={{
                fontSize: "32px",
                fontFamily: "system-ui, sans-serif",
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.8)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Mood Studio
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: unknown) {
    console.error("[OG API Error]", e);
    return new Response("Failed to generate image", { status: 500 });
  }
}
