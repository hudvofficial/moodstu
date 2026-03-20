import useSWR from "swr";
import { getContractNotes } from "@/app/actions/note-actions";

/**
 * SWR hook for contract notes.
 * Supports initialNotes as fallbackData for instant drawer render.
 * - With initialNotes: renders instantly, revalidates in background
 * - Without initialNotes: shows loading → fetches → renders (legacy behavior)
 */

interface Note {
  id: string;
  content: string;
  created_by: string;
  created_at: string;
}

export function useContractNotes(
  contractId: string | null,
  initialNotes?: Note[]
) {
  const { data, error, isLoading, mutate } = useSWR(
    contractId ? ["contract-notes", contractId] : null,
    () => getContractNotes(contractId!),
    {
      revalidateOnFocus: false,
      // fallbackData: instant render from list query, SWR revalidates in background
      ...(initialNotes ? { fallbackData: { success: true, data: initialNotes } } : {}),
    }
  );

  return {
    notes: ((data?.success ? data.data : []) || []) as Note[],
    isLoading: initialNotes ? false : isLoading, // never show loading if we have initial data
    error,
    mutate,
  };
}
