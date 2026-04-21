"use client";

import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { WorkingHours } from "@/types/settings";

interface StudioHoursSectionProps {
  workingHours: WorkingHours;
  setWorkingHours: (value: WorkingHours) => void;
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
          onChange={(event) => updateField("monday_friday", event.target.value)}
          placeholder="08:00 - 17:30"
        />
        <Input
          id="hours-weekend"
          label="Thứ 7 - Chủ nhật"
          value={workingHours.saturday_sunday || ""}
          onChange={(event) => updateField("saturday_sunday", event.target.value)}
          placeholder="09:00 - 12:00"
        />
      </div>
    </section>
  );
}
