/**
 * 🛠️ Service Utilities — V2 Port
 *
 * Core utilities for the services module.
 * V1 ref: lib/format.ts (parseContentStructure)
 *
 * @see Lesson #60: V2 = V1 SUPERSET
 */

import type { ContentSection, ServiceRecord, ServiceStats } from "@/types/service";

// ─── calculateServiceStats ───────────────────────
// Pure function: calculate stats from service array

export function calculateServiceStats(services: ServiceRecord[]): ServiceStats {
  if (services.length === 0) {
    return { total: 0, avgPrice: 0, maxPrice: 0, minPrice: 0 };
  }

  const prices = services.map((s) => Number(s.selling_price) || 0);
  const total = services.length;
  const sum = prices.reduce((a, b) => a + b, 0);

  return {
    total,
    avgPrice: Math.round(sum / total),
    maxPrice: Math.max(...prices),
    minPrice: Math.min(...prices),
  };
}


// ─── parseContentStructure ───────────────────────
// Supports both JSON structure (Builder) and legacy text format.
// V1 port: 100% logic preserved, typed for V2.

export function parseContentStructure(
  text: string | null | undefined,
): ContentSection[] {
  if (!text) return [];

  // 1. Try JSON parse (modern Builder format)
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
      return parsed.map((section) => ({
        title: section.title || "",
        items: Array.isArray(section.items) ? section.items : [],
      }));
    }
  } catch {
    /* not JSON — fall through to text parsing */
  }

  // 2. Fallback: Parse raw text (auto-detect headers)
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  const sections: ContentSection[] = [];
  let currentSection: ContentSection = { title: "", items: [] };

  for (const line of lines) {
    const trimmed = line.trim();
    // Header detection: ends with period, or ALL CAPS and short
    const isHeader =
      trimmed.endsWith(".") ||
      (trimmed === trimmed.toUpperCase() && trimmed.length < 50 && !/^\d/.test(trimmed));

    if (isHeader) {
      if (currentSection.title || currentSection.items.length > 0) {
        sections.push({ ...currentSection });
      }
      currentSection = { title: trimmed.replace(/\.$/, ""), items: [] };
    } else {
      currentSection.items.push(trimmed);
    }
  }

  if (currentSection.title || currentSection.items.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

// ─── generateServiceCode ─────────────────────────
// Format: SV-YYYYMMDD-NNNN (random 4-digit suffix)

export function generateServiceCode(): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `SV-${date}-${suffix}`;
}

// ─── sanitizeSearch ──────────────────────────────
// Strip SQL wildcard characters for safe ilike queries

export function sanitizeSearch(query: string): string {
  return query.replace(/[%_]/g, "").trim();
}

// ─── sectionsToJson ──────────────────────────────
// Convert ContentSection[] to JSON string for DB storage

export function sectionsToJson(sections: ContentSection[]): string {
  const cleaned = sections
    .filter((s) => s.title || s.items.length > 0)
    .map((s) => ({
      title: s.title,
      items: s.items.filter((item) => item.trim() !== ""),
    }));
  return JSON.stringify(cleaned);
}
