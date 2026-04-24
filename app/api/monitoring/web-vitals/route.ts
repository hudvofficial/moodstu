import { NextResponse } from "next/server";

const ALLOWED_METRICS = new Set(["CLS", "FCP", "FID", "INP", "LCP", "TTFB"]);
const SLOW_THRESHOLDS: Record<string, number> = {
  CLS: 0.05,
  FCP: 1800,
  INP: 150,
  LCP: 2500,
  TTFB: 800,
};

type WebVitalsPayload = {
  id?: unknown;
  name?: unknown;
  label?: unknown;
  value?: unknown;
  rating?: unknown;
  route?: unknown;
  navigationType?: unknown;
  connection?: unknown;
  saveData?: unknown;
  timestamp?: unknown;
};

function cleanText(value: unknown, maxLength = 160) {
  if (typeof value !== "string") return undefined;
  return value.slice(0, maxLength);
}

export async function POST(request: Request) {
  let payload: WebVitalsPayload;

  try {
    payload = (await request.json()) as WebVitalsPayload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const name = cleanText(payload.name, 12);
  const value = typeof payload.value === "number" ? payload.value : Number(payload.value);

  if (!name || !ALLOWED_METRICS.has(name) || !Number.isFinite(value)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const metric = {
    id: cleanText(payload.id, 80),
    name,
    label: cleanText(payload.label, 40),
    value,
    rating: cleanText(payload.rating, 20),
    route: cleanText(payload.route, 180) || "unknown",
    navigationType: cleanText(payload.navigationType, 40),
    connection: cleanText(payload.connection, 20),
    saveData: payload.saveData === true,
    timestamp: typeof payload.timestamp === "number" ? payload.timestamp : Date.now(),
  };

  const threshold = SLOW_THRESHOLDS[name];
  const shouldLog =
    process.env.WEB_VITALS_LOG === "1" ||
    (typeof threshold === "number" && value > threshold);

  if (shouldLog) {
    console.warn("[web-vitals]", metric);
  }

  return NextResponse.json({ ok: true });
}

