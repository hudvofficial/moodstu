"use client";

/**
 * 📋 DressDrawer — Quick preview from dress card click
 *
 * ⚡ 0ms Drawer — primary data from list query (no separate fetch)
 * Pattern: Cloned from ContractDrawer
 */

import { useState } from "react";
import { Pencil, QrCode } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { DRESS_STATUS_MAP } from "@/types/dress-constants";
import type { DressStatus } from "@/lib/validations/dress.schema";
import type { DressItem } from "@/types/dress";
import { DressDrawerContent } from "./dress-drawer-content";
import { DressQRModal } from "./dress-qr-modal";

// ─── TYPES ───────────────────────────────────────

interface DressDrawerProps {
  dress: DressItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (dress: DressItem) => void;
}

// ─── MAIN COMPONENT ─────────────────────────────

export function DressDrawer({ dress, isOpen, onClose, onEdit }: DressDrawerProps) {
  const [qrOpen, setQrOpen] = useState(false);

  if (!dress || !isOpen) return null;

  const statusConfig = DRESS_STATUS_MAP[(dress.status as DressStatus) || "available"];

  const titleBadge = (
    <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
  );

  const headerRight = (
    <>
      <button
        onClick={() => {
          if (onEdit) { onClose(); onEdit(dress); }
        }}
        className="p-1.5 rounded-md hover:bg-hover transition-colors"
        title="Sửa trang phục"
      >
        <Pencil className="w-4 h-4 text-text-secondary" />
      </button>
      <button
        onClick={() => setQrOpen(true)}
        className="p-1.5 rounded-md hover:bg-hover transition-colors"
        title="Mã QR"
      >
        <QrCode className="w-4 h-4 text-text-secondary" />
      </button>
    </>
  );

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} title={dress.name} titleBadge={titleBadge} headerRight={headerRight}>
        <DressDrawerContent dress={dress} />
      </Drawer>
      <DressQRModal dress={dress} isOpen={qrOpen} onClose={() => setQrOpen(false)} />
    </>
  );
}
