"use client";

import { useCallback, useReducer, useRef } from "react";
import { initialMoodieTurnState, reduceMoodieTurn } from "@/lib/moodie/turn-store";
import type { MoodieStreamEvent } from "@/types/moodie";

export function useMoodieTurn() {
  const [state, dispatch] = useReducer(reduceMoodieTurn, initialMoodieTurnState);
  const abortControllerRef = useRef<AbortController | null>(null);

  const start = useCallback(() => {
    abortControllerRef.current?.abort();
    dispatch({ type: "turn.reset" });
    const controller = new AbortController();
    abortControllerRef.current = controller;
    return controller.signal;
  }, []);

  const receive = useCallback((event: MoodieStreamEvent) => {
    dispatch(event);
    if (event.type === "turn.accepted") window.localStorage.setItem("moodie:active-turn:v1", event.turn_id);
    if (event.type === "turn.completed" || event.type === "turn.failed") {
      window.localStorage.removeItem("moodie:active-turn:v1");
    }
  }, []);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const release = useCallback(() => {
    abortControllerRef.current = null;
  }, []);

  return { state, start, receive, stop, release };
}
