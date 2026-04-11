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
import { formatCurrency } from "@/lib/utils";
import { Phone, Ticket } from "lucide-react";

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

export default function PipelineBoard({ leads, onStatusChange }: PipelineBoardProps) {
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
    <div className="flex h-[calc(100vh-220px)] w-full gap-4 overflow-x-auto pb-4 custom-scrollbar">
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

function PipelineColumn({ id, title, leads }: { id: string; title: string; leads: CrmLead[] }) {
  return (
    <div className="flex w-[320px] shrink-0 flex-col rounded-xl bg-bg-sidebar shadow-xs">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold text-text-primary text-sm">{title}</h3>
        <Badge variant="neutral" className="text-xs">
          {leads.length}
        </Badge>
      </div>

      <div className="flex-1 p-2 overflow-y-auto custom-scrollbar">
        <SortableContext
          id={id}
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2 min-h-[100px]">
            {leads.map((lead) => (
              <SortablePipelineCard key={lead.id} lead={lead} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

// ─── CARD COMPONENT ──────────────────────────────────────

function SortablePipelineCard({ lead }: { lead: CrmLead }) {
  const {
    attributes,
    listeners,
    setNodeRef,
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
      {...attributes}
      {...listeners}
      className="touch-none" // Required to prevent scrolling while dragging on touch devices
    >
      <PipelineCard lead={lead} />
    </div>
  );
}

function PipelineCard({ lead, isOverlay }: { lead: CrmLead; isOverlay?: boolean }) {
  const potentialInfo = lead.potential ? POTENTIAL_MAP[lead.potential] : null;

  return (
    <div
      className={`relative flex flex-col gap-2 rounded-xl border border-border bg-bg-card p-3 
      ${isOverlay ? "shadow-lg scale-105 cursor-grabbing" : "shadow-xs cursor-grab hover:border-text-muted"}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-semibold text-text-primary truncate">{lead.contact_name}</p>
        {potentialInfo && (
          <Badge
            variant={
              lead.potential === "hot" ? "error" : lead.potential === "warm" ? "warning" : "neutral"
            }
            className="px-1.5 py-0 text-xs"
          >
            {potentialInfo.label}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-text-secondary mt-1">
        <div className="flex items-center gap-1.5 min-w-0">
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
