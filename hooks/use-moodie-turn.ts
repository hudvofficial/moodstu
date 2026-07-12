"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { initialMoodieTurnState, reduceMoodieTurn } from "@/lib/moodie/turn-store";
import type { MoodieStreamEvent } from "@/types/moodie";

export function useMoodieTurn() {
  const [state, dispatch] = useReducer(reduceMoodieTurn, initialMoodieTurnState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingDeltaRef = useRef<MoodieStreamEvent & { type: "text.delta" } | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const flushPendingDelta = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    const pending = pendingDeltaRef.current;
    pendingDeltaRef.current = null;
    if (pending) dispatch(pending);
  }, []);

  const start = useCallback(() => {
    flushPendingDelta();
    abortControllerRef.current?.abort();
    dispatch({ type: "turn.reset" });
    const controller = new AbortController();
    abortControllerRef.current = controller;
    return controller.signal;
  }, [flushPendingDelta]);

  const receive = useCallback((event: MoodieStreamEvent) => {
    if (event.type === "text.delta") {
      const pending = pendingDeltaRef.current;
      pendingDeltaRef.current = pending
        ? { ...event, delta: pending.delta + event.delta }
        : event;
      if (animationFrameRef.current === null) {
        animationFrameRef.current = window.requestAnimationFrame(() => {
          animationFrameRef.current = null;
          const next = pendingDeltaRef.current;
          pendingDeltaRef.current = null;
          if (next) dispatch(next);
        });
      }
      return;
    }
    flushPendingDelta();
    dispatch(event);
    if (event.type === "turn.accepted") window.localStorage.setItem("moodie:active-turn:v1", event.turn_id);
    if (event.type === "turn.completed" || event.type === "turn.failed" || event.type === "turn.cancelled") {
      window.localStorage.removeItem("moodie:active-turn:v1");
    }
  }, [flushPendingDelta]);

  const stop = useCallback(() => {
    flushPendingDelta();
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    window.localStorage.removeItem("moodie:active-turn:v1");
  }, [flushPendingDelta]);

  const release = useCallback(() => {
    flushPendingDelta();
    abortControllerRef.current = null;
  }, [flushPendingDelta]);

  useEffect(() => () => {
    if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
  }, []);

  return { state, start, receive, stop, release };
}
