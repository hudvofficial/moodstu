"use client";

import React, { useRef, useState } from "react";

export interface SwipeAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  className: string;
  onClick: () => void;
}

interface SwipeableCardProps {
  children: React.ReactNode;
  rightActions?: SwipeAction[];
  leftActions?: SwipeAction[];
  actionWidth?: number;
  onSwipeOpen?: () => void;
}

const OPEN_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 0.5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function SwipeableCard({
  children,
  rightActions = [],
  leftActions = [],
  actionWidth = 72,
  onSwipeOpen,
}: SwipeableCardProps) {
  const [x, setX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startOffsetRef = useRef(0);
  const startTimeRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  const leftMax = leftActions.length * actionWidth;
  const rightMax = rightActions.length * actionWidth;
  const minX = rightActions.length > 0 ? -rightMax : 0;
  const maxX = leftActions.length > 0 ? leftMax : 0;
  const isOpen = x !== 0;

  const closeSwipe = () => setX(0);

  const openLeft = () => {
    setX(leftMax);
    onSwipeOpen?.();
  };

  const openRight = () => {
    setX(-rightMax);
    onSwipeOpen?.();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    startOffsetRef.current = x;
    startTimeRef.current = performance.now();
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== event.pointerId) return;

    const delta = event.clientX - startXRef.current;
    setX(clamp(startOffsetRef.current + delta, minX, maxX));
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== event.pointerId) return;

    const delta = event.clientX - startXRef.current;
    const elapsed = Math.max(performance.now() - startTimeRef.current, 1);
    const velocity = delta / elapsed;

    setIsDragging(false);
    pointerIdRef.current = null;

    if ((delta < -OPEN_THRESHOLD || velocity < -VELOCITY_THRESHOLD) && rightActions.length > 0) {
      openRight();
      return;
    }

    if ((delta > OPEN_THRESHOLD || velocity > VELOCITY_THRESHOLD) && leftActions.length > 0) {
      openLeft();
      return;
    }

    closeSwipe();
  };

  const handlePointerCancel = () => {
    setIsDragging(false);
    pointerIdRef.current = null;
    closeSwipe();
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-bg-base">
      <div className="absolute inset-0 flex justify-between">
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
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
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
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
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

      <div
        role="presentation"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerCancel}
        onClick={() => {
          if (isOpen && !isDragging) closeSwipe();
        }}
        className="relative z-10 touch-pan-y w-full shadow-xs will-change-transform"
        style={{
          transform: `translate3d(${x}px, 0, 0)`,
          transition: isDragging ? "none" : "transform 180ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
