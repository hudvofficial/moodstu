"use client";

import { useState } from "react";
import { changelog, CHANGELOG_EMOJI } from "@/data/changelog";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";

/* ═══════════════════════════════════════════
   Changelog Section — V2 Gold Standard
   V1 logic 100% + SSOT tokens
   ═══════════════════════════════════════════ */

export default function ChangelogSection() {
  const [expanded, setExpanded] = useState(false);
  const displayedChangelog = expanded ? changelog : changelog.slice(0, 3);

  if (changelog.length === 0) return null;

  return (
    <section className="card-base p-4 lg:p-6">
      <h3 className="section-heading mb-3">
        <Sparkles className="w-4 h-4 inline-block mr-1.5 align-middle" />
        Nhật ký cập nhật
      </h3>

      <div className="space-y-3">
        {displayedChangelog.map((entry) => (
          <div key={entry.version} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="badge badge-primary text-tiny">
                v{entry.version}
              </span>
              <span className="text-xs text-text-muted">{entry.date}</span>
            </div>
            <ul className="space-y-0.5 pl-1">
              {entry.changes.map((change, i) => (
                <li
                  key={i}
                  className="text-xs text-text-secondary flex items-start gap-1.5"
                >
                  <span className="shrink-0">
                    {CHANGELOG_EMOJI[change.type] || "📝"}
                  </span>
                  <span>{change.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {changelog.length > 3 && (
        /* eslint-disable-next-line react/forbid-elements -- text toggle, not standard button behavior */
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
        >
          {expanded ? (
            <>
              Thu gọn <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Xem tất cả ({changelog.length} phiên bản){" "}
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </section>
  );
}
