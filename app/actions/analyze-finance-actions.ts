"use server";

import { withAuth } from "@/lib/auth_utils";

// ═══════════════════════════════════════════
// Analyze Finance — AI-powered insights
// V1 ref: analyzeFinance.ts
// V2: STUB — depends on lib/analytics/ (not yet ported)
// TODO: Port financeIntelligence, cashflowForecast, generateInsights
// ═══════════════════════════════════════════

export interface AIAnalysisResult {
  insights: Array<{ type: string; title: string; message: string; severity: "info" | "warning" | "critical" }>;
  aiSummary: string | null;
  generatedAt: string;
}

export async function analyzeFinance() {
  return withAuth(async () => {
    // TODO: Port from V1 when lib/analytics/ is available
    // V1 flow: getFinanceIntelligence() + getCashflowForecast()
    //        → generateRuleBasedInsights() → generateGeminiAnalysis()
    return {
      insights: [
        { type: "info" as const, title: "Chức năng đang phát triển", message: "Phân tích AI sẽ sẵn sàng trong bản cập nhật tiếp theo", severity: "info" as const },
      ],
      aiSummary: null,
      generatedAt: new Date().toISOString(),
    };
  });
}
