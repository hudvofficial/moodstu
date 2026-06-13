"use server";

import { getUpcomingEvents } from "@/lib/api/dashboard";

export async function getUpcomingEventsAction() {
  return getUpcomingEvents();
}