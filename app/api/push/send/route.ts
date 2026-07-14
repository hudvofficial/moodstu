import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { fireAuditLog } from "@/lib/audit";
import { isAuthorizedInternalRequest } from "@/lib/internal-api-auth";
import webPush from "web-push";
import { z } from "zod";

const sendPushSchema = z.object({
  employeeId: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(500),
  url: z.string().trim().max(500).optional().refine(
    (value) => !value || (value.startsWith("/") && !value.startsWith("//")),
    "url must be an internal absolute path",
  ),
  tag: z.string().trim().min(1).max(100).optional(),
});

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

// Configure web-push with VAPID keys
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    "mailto:hello@moodwedding.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export async function POST(request: NextRequest) {
  try {
    const internalKey = process.env.INTERNAL_API_KEY;
    if (!internalKey) {
      return NextResponse.json({ error: "Internal API is not configured" }, { status: 503 });
    }
    if (!isAuthorizedInternalRequest(request.headers.get("authorization"), internalKey)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
    }

    const parsed = sendPushSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid push payload", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const { employeeId, title, body: messageBody, url, tag } = parsed.data;

    const supabase = await createAdminClient();

    // Get all subscriptions for this employee
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("employee_id", employeeId);

    if (error) {
      console.error("Failed to fetch subscriptions:", error);
      return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, message: "No subscriptions found" });
    }

    const payload = JSON.stringify({
      title,
      body: messageBody,
      url: url || "/",
      tag: tag || "mood-studio",
    });

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webPush.sendNotification(pushSubscription, payload);
          return { success: true, endpoint: sub.endpoint };
        } catch (err: unknown) {
          const error = err as { statusCode?: number };
          // If subscription is invalid, remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          }
          return { success: false, endpoint: sub.endpoint, error: String(err) };
        }
      })
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;

    void fireAuditLog({
      action: "CREATE",
      tableName: "push_notifications",
      recordId: employeeId,
      description: `Internal push sent to employee ${employeeId}`,
      newData: { sent, total: subscriptions.length, url: url || "/", tag: tag || "mood-studio" },
      source: "system",
    });

    return NextResponse.json({ sent, total: subscriptions.length });
  } catch (error) {
    console.error("Push send error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
