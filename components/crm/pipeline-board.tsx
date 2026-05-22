"use client";

import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CrmLead } from "@/types/crm";
import { PIPELINE_STAGES, LEAD_STATUS_MAP, POTENTIAL_MAP } from "@/types/crm";
import { Badge } from "@/components/ui/badge";
import { RiskFlagsBadge } from "./risk-flags-badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { GripVertical, Phone, Ticket } from "lucide-react";

// ═══════════════════════════════════════════
// PipelineBoard — Zero-Lag Kanban
// Phase 02: V2 Gold Standard
// - Dnd-kit with virtualized state (local optimistic)
// - DragOverlay strictly isolated
// - ONLY use `transform` inline for dragging coordinates
// ═══════════════════════════════════════════

interface PipelineBoardProps {
  leads: CrmLead[];
  onStatusChange: (leadId: string, newStatus: string) => Promise<void>;
  onOpenLead?: (leadId: string) => void;
}

// Helper to group leads by status
function groupLeadsByStatus(deals: CrmLead[]) {
  const grouped: Record<string, CrmLead[]> = {};
  PIPELINE_STAGES.forEach((stage) => {
    grouped[stage] = [];
  });
  // Also collect "huy" or other non-pipeline statuses if needed, but Pipeline usually only shows active stages.
  deals.forEach((deal) => {
    if (grouped[deal.status]) {
      grouped[deal.status].push(deal);
    }
  });
  return grouped;
}

export default function PipelineBoard({
  leads,
  onStatusChange,
  onOpenLead,
}: PipelineBoardProps) {
  // Local state for optimistic UI updates during drag
  const [columns, setColumns] = useState<Record<string, CrmLead[]>>(() => groupLeadsByStatus(leads));
  const [prevLeads, setPrevLeads] = useState(leads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeLead, setActiveLead] = useState<CrmLead | null>(null);

  if (leads !== prevLeads && !activeId) {
    setPrevLeads(leads);
    setColumns(groupLeadsByStatus(leads));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px tolerance before drag starts (Apple HIG touch pattern)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const { id } = active;
    setActiveId(id as string);
    // Find active lead
    for (const stage of PIPELINE_STAGES) {
      const match = columns[stage].find((l) => l.id === id);
      if (match) {
        setActiveLead(match);
        break;
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeContainer = active.data.current?.sortable?.containerId || active.data.current?.containerId;
    const overContainer = over.data.current?.sortable?.containerId || over.id;

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setColumns((prev) => {
      const activeItems = prev[activeContainer] || [];
      const overItems = prev[overContainer] || [];
      const activeIndex = activeItems.findIndex((item) => item.id === activeId);
      const overIndex = overItems.findIndex((item) => item.id === overId);
      if (activeIndex < 0) return prev;

      const newIndex = overIndex >= 0 ? overIndex : overItems.length;

      return {
        ...prev,
        [activeContainer]: [
          ...activeItems.slice(0, activeIndex),
          ...activeItems.slice(activeIndex + 1),
        ],
        [overContainer]: [
          ...overItems.slice(0, newIndex),
          activeItems[activeIndex],
          ...overItems.slice(newIndex),
        ],
      };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveLead(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = active.data.current?.sortable?.containerId || active.data.current?.containerId;
    const overContainer = over.data.current?.sortable?.containerId || over.id;

    if (!activeContainer || !overContainer) return;

    if (activeContainer === overContainer) {
      // Reordered in same column
      const items = columns[activeContainer];
      const activeIndex = items.findIndex((i) => i.id === activeId);
      const overIndex = items.findIndex((i) => i.id === overId);
      if (activeIndex !== overIndex) {
        setColumns((prev) => ({
          ...prev,
          [activeContainer]: arrayMove(items, activeIndex, overIndex),
        }));
        // Optional: Save new order integer to DB here if supported
      }
    } else {
      // Moved to different column -> Update DB Status
      if (activeContainer !== overContainer) {
        // Trigger mutate
        await onStatusChange(activeId, overContainer as string);
      }
    }
  };

  const dropAnimation = useMemo(
    () => ({
      sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } }),
    }),
    [],
  );

  return (
    <div className="grid w-full min-w-0 grid-cols-1 items-start gap-4 pb-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {PIPELINE_STAGES.map((stage) => (
          <PipelineColumn
            key={stage}
            id={stage}
            title={LEAD_STATUS_MAP[stage].label}
            leads={columns[stage] || []}
            onOpenLead={onOpenLead}
          />
        ))}

        {/* Overlay is PORTALLED to avoid layout shift */}
        <DragOverlay dropAnimation={dropAnimation}>
          {activeLead ? <PipelineCard lead={activeLead} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// ─── COLUMN COMPONENT ────────────────────────────────────

function PipelineColumn({
  id,
  title,
  leads,
  onOpenLead,
}: {
  id: string;
  title: string;
  leads: CrmLead[];
  onOpenLead?: (leadId: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-bg-sidebar shadow-xs lg:max-h-[calc(100vh-220px)]">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold text-text-primary text-sm">{title}</h3>
        <Badge variant="neutral" className="text-xs">
          {leads.length}
        </Badge>
      </div>

      <div className="flex-1 p-2 lg:overflow-y-auto lg:custom-scrollbar">
        <SortableContext
          id={id}
          items={leads.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2 min-h-[100px]">
            {leads.map((lead) => (
              <SortablePipelineCard
                key={lead.id}
                lead={lead}
                onOpenLead={onOpenLead}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

// ─── CARD COMPONENT ──────────────────────────────────────

function SortablePipelineCard({
  lead,
  onOpenLead,
}: {
  lead: CrmLead;
  onOpenLead?: (leadId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: {
      type: "Lead",
      lead,
    },
  });

  // THE ONLY INLINE STYLE EXCEPTION: DND-Kit transforms
  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-[100px] w-full rounded-xl border-2 border-dashed border-primary bg-primary/10 opacity-50"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="min-w-0"
    >
      <PipelineCard
        lead={lead}
        onClick={onOpenLead ? () => onOpenLead(lead.id) : undefined}
        dragHandle={
          <Button
            ref={setActivatorNodeRef}
            unstyled
            type="button"
            {...attributes}
            {...listeners}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex h-7 w-7 touch-none items-center justify-center rounded-md border border-border/60 text-text-muted transition-colors hover:bg-bg-input hover:text-text-primary active:cursor-grabbing"
            aria-label={`Kéo lead ${lead.contact_name}`}
            title="Kéo để đổi giai đoạn"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </Button>
        }
      />
    </div>
  );
}

function PipelineCard({
  lead,
  isOverlay,
  onClick,
  dragHandle,
}: {
  lead: CrmLead;
  isOverlay?: boolean;
  onClick?: () => void;
  dragHandle?: React.ReactNode;
}) {
  const potentialInfo = lead.potential ? POTENTIAL_MAP[lead.potential] : null;
  const interactiveProps = onClick
    ? {
        role: "button" as const,
        tabIndex: 0,
        onClick,
        onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        },
      }
    : {};

  return (
    <div
      {...interactiveProps}
      className={`relative flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-bg-card p-3 
      ${
        isOverlay
          ? "scale-105 cursor-grabbing shadow-lg"
          : onClick
            ? "cursor-pointer shadow-xs hover:border-text-muted"
            : "shadow-xs"
      }`}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="min-w-0 truncate text-sm font-semibold text-text-primary">
            {lead.contact_name}
          </p>
          <RiskFlagsBadge lead={lead} />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {potentialInfo && (
            <Badge
              variant={
                lead.potential === "hot"
                  ? "error"
                  : lead.potential === "warm"
                    ? "warning"
                    : "neutral"
              }
              className="shrink-0 px-1.5 py-0 text-xs"
            >
              {potentialInfo.label}
            </Badge>
          )}
          {!isOverlay ? dragHandle : null}
        </div>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{lead.phone || "---"}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 font-medium">
          <Ticket className="w-3.5 h-3.5" />
          <span>{lead.deal_value > 0 ? formatCurrency(lead.deal_value) : "---"}</span>
        </div>
      </div>
    </div>
  );
}
