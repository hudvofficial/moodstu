"use client";

import { useState, memo } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * NotificationBell — Header notification icon
 * 
 * Phase 1: Placeholder (no Supabase realtime yet)
 * Phase 2: Copy V1 logic (realtime subscription, dropdown panel)
 * 
 * Uses .icon-btn from design-system.css (SSOT)
 */
function NotificationBell() {
  const [unreadCount] = useState(0);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="icon"
        className="relative"
        aria-label="Thông báo"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 size-2 rounded-full bg-error" />
        )}
      </Button>
    </div>
  );
}

export default memo(NotificationBell);
