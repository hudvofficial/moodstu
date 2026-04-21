"use client";

import Image from "next/image";
import { Shirt, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DressItem } from "@/types/dress";
import { DRESS_STATUS_MAP } from "@/types/dress-constants";
import type { DressStatus } from "@/lib/validations/dress.schema";

// ═══════════════════════════════════════════
// DressCard — Card view for dress catalog
// Layout: 3:4 image + info + status badge
// ═══════════════════════════════════════════

interface Props {
  dress: DressItem;
  onEdit: () => void;
  onClick?: () => void;
}

export default function DressCard({ dress, onEdit, onClick }: Props) {
  const statusConfig = DRESS_STATUS_MAP[(dress.status as DressStatus) || "available"];

  return (
    <div
      className="card-interactive overflow-hidden group cursor-pointer stagger-item"
      onClick={onClick || onEdit}
    >
      {/* Image */}
      <div className="aspect-3/4 bg-bg-hover relative overflow-hidden">
        {dress.image_url ? (
          <Image
            src={dress.image_url}
            alt={dress.name}
            fill
            loading="lazy"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-text-muted/30">
            <Shirt size={32} />
            <p className="text-caption mt-1">Chưa có ảnh</p>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <Badge variant={statusConfig.variant} solid>
            {statusConfig.label}
          </Badge>
        </div>

        {/* Edit button — hover */}
        <Button unstyled
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-bg-card/90 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
        >
          <Pencil size={12} />
        </Button>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-caption font-bold uppercase tracking-widest text-text-muted truncate">{dress.category}</p>
            <h3 className="text-sm font-bold text-primary uppercase tracking-tight truncate" title={dress.name}>{dress.name}</h3>
          </div>
          {dress.item_code && (
            <span className="tag-badge shrink-0">
              {dress.item_code}
            </span>
          )}
        </div>

        {/* Size + Color — V1 2-column layout with V2 tokens */}
        <div className="flex items-center gap-2 mt-2 py-2 border-t border-dashed border-border">
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-caption uppercase text-text-muted">Size</span>
            <span className="text-sm font-bold text-text-primary truncate">{dress.size || "—"}</span>
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="flex flex-col min-w-0 flex-1 pl-2">
            <span className="text-caption uppercase text-text-muted">Màu</span>
            <span className="text-sm font-bold text-text-primary truncate">{dress.color || "—"}</span>
          </div>
        </div>

        {/* Price */}
        {dress.rental_price ? (
          <div className="mt-2 pt-2 border-t border-border text-center">
            <p className="text-sm font-bold text-primary">
              {new Intl.NumberFormat("vi-VN").format(dress.rental_price)}đ
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
