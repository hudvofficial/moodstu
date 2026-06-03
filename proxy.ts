import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // NOTE: every service-worker script the Workbox SW importScripts() must be
    // excluded here. If auth middleware intercepts one, it returns login HTML,
    // importScripts() parses HTML as JS and throws, and the new SW fails to
    // install — freezing installed PWAs on the old build. `push-sw.js` was the
    // missing entry that caused exactly that.
    "/((?!_next/static|_next/image|api/monitoring/web-vitals|monitoring|favicon.ico|manifest.json|sw.js|push-sw.js|workbox-.*\\.js|fallback-.*\\.js|swe-worker-.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
