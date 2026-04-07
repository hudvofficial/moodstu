"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { FileText, Check, Loader2 } from "lucide-react";
import { updateEmployeeNotes } from "@/app/actions/employee-mutations";

// ═══════════════════════════════════════════
// EmployeeNotes — Auto-save notes textarea
// Debounce 1000ms, optimistic save indicator
// ═══════════════════════════════════════════

interface Props {
  employeeId: string;
  initialNotes: string | null;
}

type SaveState = "idle" | "saving" | "saved";

export default function EmployeeNotes({ employeeId, initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes || "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(initialNotes || "");

  const saveNotes = useCallback(async (text: string) => {
    setSaveState("saving");
    try {
      const result = await updateEmployeeNotes(employeeId, text || null);
      if (result.success) {
        setSaveState("saved");
        toast.success("Đã lưu ghi chú");
        setTimeout(() => setSaveState("idle"), 2000);
      } else {
        throw new Error(result.error || "Lỗi");
      }
    } catch {
      setSaveState("idle");
      toast.error("Lỗi lưu ghi chú");
    }
  }, [employeeId]);

  // Debounced auto-save
  useEffect(() => {
    // Skip if value hasn't changed from last saved (fixes React Strict Mode double-mount)
    if (notes === lastSavedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveNotes(notes);
      lastSavedRef.current = notes;
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notes, saveNotes]);

  return (
    <div className="card-base p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-text-muted" />
          <h3 className="section-heading">Ghi chú</h3>
        </div>
        {/* Save indicator */}
        {saveState === "saving" && (
          <span className="flex items-center gap-1 text-caption">
            <Loader2 className="w-3 h-3 animate-spin" /> Đang lưu...
          </span>
        )}
        {saveState === "saved" && (
          <span className="flex items-center gap-1 text-xs text-success">
            <Check className="w-3 h-3" /> Đã lưu
          </span>
        )}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Ghi chú về nhân viên..."
        className="input-base w-full min-h-30 resize-y"
      />
    </div>
  );
}
