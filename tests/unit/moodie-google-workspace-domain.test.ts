import { describe, expect, it } from "@jest/globals";
import { dedupeMoodieCalendarEvents } from "@/lib/moodie/domain/calendar-context";
import { sanitizeMoodieGalleryThumbnail } from "@/lib/moodie/domain/gallery-context";
import type { UnifiedCalendarEvent } from "@/types/calendar.types";

describe("Moodie Google Workspace domain safety", () => {
  it("deduplicates a synced studio event and Google-only copy by google event id", () => {
    const base = {
      id: "studio-1", title: "Chụp cưới", start: "2026-07-11T08:00:00+07:00", end: "2026-07-11T10:00:00+07:00",
      allDay: false, source: "schedule", sourceId: "studio-1", googleEventId: "google-1",
    } as UnifiedCalendarEvent;
    const duplicate = { ...base, id: "google-1", source: "google", sourceId: "google-1" } as UnifiedCalendarEvent;
    expect(dedupeMoodieCalendarEvents([base, duplicate])).toHaveLength(1);
  });

  it("allows only redacted thumbnail transports", () => {
    expect(sanitizeMoodieGalleryThumbnail("/api/gallery/thumbnail?id=1")).toContain("/api/");
    expect(sanitizeMoodieGalleryThumbnail("https://drive.google.com/thumbnail?id=1")).toContain("thumbnail");
    expect(sanitizeMoodieGalleryThumbnail("https://drive.google.com/file/d/private/view")).toBeNull();
    expect(sanitizeMoodieGalleryThumbnail("https://example.com/original.jpg")).toBeNull();
  });
});
