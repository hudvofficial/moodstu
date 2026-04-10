"use client";

import React, { useRef, useState } from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";

// ═══════════════════════════════════════════
// SwipeableCard — iOS-like Swipe Actions
// V2 Gold Standard - No CSS inline for styling
// ONLY inline exceptions: Framer Motion's auto-generated x/y transforms
// ═══════════════════════════════════════════

export interface SwipeAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  // expects utility classes like "bg-success text-inverse" or "bg-error text-inverse"
  className: string;
  onClick: () => void;
}

interface SwipeableCardProps {
  children: React.ReactNode;
  rightActions?: SwipeAction[];
  leftActions?: SwipeAction[];
  actionWidth?: number; // px width per action button
  onSwipeOpen?: () => void;
}

export function SwipeableCard({
  children,
  rightActions = [],
  leftActions = [],
  actionWidth = 72,
  onSwipeOpen,
}: SwipeableCardProps) {
  const controls = useAnimation();
  const [isOpen, setIsOpen] = useState(false);
  const swipeContainerRef = useRef<HTMLDivElement>(null);

  const leftMax = leftActions.length * actionWidth;
  const rightMax = rightActions.length * actionWidth;

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Trigger open if dragged past threshold or swiped fast
    if (offset < -50 || velocity < -500) {
      if (rightActions.length > 0) {
        controls.start({ x: -rightMax });
        setIsOpen(true);
        onSwipeOpen?.();
        return;
      }
    } else if (offset > 50 || velocity > 500) {
      if (leftActions.length > 0) {
        controls.start({ x: leftMax });
        setIsOpen(true);
        onSwipeOpen?.();
        return;
      }
    }

    // Default: Snap back
    controls.start({ x: 0 });
    setIsOpen(false);
  };

  const closeSwipe = () => {
    controls.start({ x: 0 });
    setIsOpen(false);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-bg-base" ref={swipeContainerRef}>
      {/* ── BACKGROUND ACTIONS LAYER ── */}
      <div className="absolute inset-0 flex justify-between">
        {/* Left Actions */}
        <div className="flex h-full">
          {leftActions.map((action) => (
            <div
              key={action.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                action.onClick();
                closeSwipe();
              }}
              style={{ width: actionWidth }}
              className={`flex flex-col items-center justify-center gap-1 ${action.className} cursor-pointer transition-opacity active:opacity-80`}
            >
              {action.icon}
              <span className="text-tiny font-medium leading-none">{action.label}</span>
            </div>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex h-full">
          {rightActions.map((action) => (
            <div
              key={action.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                action.onClick();
                closeSwipe();
              }}
              style={{ width: actionWidth }}
              className={`flex flex-col items-center justify-center gap-1 ${action.className} cursor-pointer transition-opacity active:opacity-80`}
            >
              {action.icon}
              <span className="text-tiny font-medium leading-none">{action.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOREGROUND PANE ── */}
      <motion.div
        drag="x"
        dragDirectionLock
        onDragEnd={handleDragEnd}
        animate={controls}
        // Strict boundary constraints
        dragConstraints={{
          left: rightActions.length > 0 ? -rightMax : 0,
          right: leftActions.length > 0 ? leftMax : 0,
        }}
        dragElastic={0.15}
        // HIG requirement: touch-pan-y prevents page scroll lock when dragging horizontal
        className="relative z-10 touch-pan-y w-full shadow-xs"
        // Tap to close if open
        onTap={() => isOpen && closeSwipe()}
      >
        {children}
      </motion.div>
    </div>
  );
}
