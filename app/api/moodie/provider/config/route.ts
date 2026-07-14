import { NextResponse } from "next/server";
import {
  probeMoodieProviderModels,
  saveMoodieProviderConfig,
} from "@/app/actions/moodie-provider-actions";

export const dynamic = "force-dynamic";

type ProviderConfigRequest = {
  operation?: "probe" | "save";
  payload?: unknown;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as ProviderConfigRequest | null;
  if (!body?.operation) {
    return NextResponse.json({ success: false, error: "Thiếu thao tác provider" }, { status: 400 });
  }

  const result = body.operation === "probe"
    ? await probeMoodieProviderModels(body.payload)
    : await saveMoodieProviderConfig(body.payload);

  return NextResponse.json(result, {
    status: result.success ? 200 : 400,
    headers: { "Cache-Control": "no-store" },
  });
}
