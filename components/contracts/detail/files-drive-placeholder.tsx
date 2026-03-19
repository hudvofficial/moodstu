import { FolderOpen } from "lucide-react";

// ═══════════════════════════════════════════
// FilesDrivePlaceholder — Empty state for Drive
// Phase 04e: documents table has no contract_id FK
// Will be replaced when Drive integration is done
// ═══════════════════════════════════════════

export default function FilesDrivePlaceholder() {
  return (
    <div className="card-base p-4 lg:p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <FolderOpen size={16} className="text-primary" />
        <h3 className="text-body-sm font-bold text-text-primary">
          File & Drive
        </h3>
      </div>

      {/* Empty state */}
      <div className="py-6 text-center">
        <FolderOpen size={28} className="text-text-muted/40 mx-auto mb-2" />
        <p className="text-caption text-text-muted mb-1">
          Chưa có file đính kèm
        </p>
        <p className="text-caption text-text-muted/60">
          Tính năng Drive sẽ sớm ra mắt
        </p>
      </div>
    </div>
  );
}
