"use client";

import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
import type { WorkingHours } from "@/types/settings";

/* ═══════════════════════════════════════════
   Studio Hours Section — Working hours JSONB fields
   Sub-component of StudioInfoForm
   ═══════════════════════════════════════════ */

interface StudioHoursSectionProps {
  workingHours: WorkingHours;
  setWorkingHours: (v: WorkingHours) => void;
}

export default function StudioHoursSection({
  workingHours,
  setWorkingHours,
}: StudioHoursSectionProps) {
  const updateField = (key: keyof WorkingHours, value: string) => {
    setWorkingHours({ ...workingHours, [key]: value });
  };

  return (
    <section className="card-base p-4 lg:p-6">
      <h3 className="section-heading mb-4">
        <Clock className="w-4 h-4 inline-block mr-1.5 align-middle" />
        Giờ làm việc
      </h3>

      <div className="form-grid-2col">
        <Input
          id="hours-weekday"
          label="Thứ 2 - Thứ 6"
          value={workingHours.monday_friday || ""}
          onChange={(e) => updateField("monday_friday", e.target.value)}
          placeholder="08:00 - 17:30"
        />
        <Input
          id="hours-weekend"
          label="Thứ 7 - CN"
          value={workingHours.saturday_sunday || ""}
          onChange={(e) => updateField("saturday_sunday", e.target.value)}
          placeholder="09:00 - 12:00"
        />
      </div>
    </section>
  );
}
