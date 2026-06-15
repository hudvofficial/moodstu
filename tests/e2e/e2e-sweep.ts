/**
 * e2e-sweep.ts
 * ---
 * Self-healing cleanup for E2E seed data.
 *
 * Why this exists: every E2E spec seeds into the SHARED Supabase project (there
 * is no separate test DB) by creating an auth user — the on_auth_user_created
 * trigger then provisions an `employees` row, which the spec flips to
 * status='active', department='E2E'. Cleanup relies on `test.afterAll`, which
 * Playwright does NOT guarantee to run (Ctrl-C, worker crash, timeout kill,
 * afterAll throwing). When it doesn't run, an active E2E employee leaks into
 * getActiveEmployees() and shows up in every personnel picker app-wide
 * (e.g. the "Nhân sự nội bộ" dropdown).
 *
 * This sweep runs in each spec's beforeAll and removes E2E leftovers from PRIOR
 * runs. It is TIME-BOUNDED (only rows older than STALE_MS) so a spec running
 * concurrently in another worker — whose fresh seed is seconds old — is never
 * touched. The longest single test run is ~3 min (test.setTimeout), far under
 * STALE_MS, so the bound is safe.
 *
 * Scope: employees + auth users only — the rows that pollute personnel pickers.
 * Orphan E2E contracts/customers (named `E2E Customer ${marker}`) are a separate
 * leak handled by each spec's own cleanupSeed and are intentionally NOT swept here.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const STALE_MS = 30 * 60 * 1000; // 30 minutes — well above the ~3 min max test run

/** E2E seed emails are always e2e-*@test.local or e2e-*@moodwedding.com. */
function isE2EEmail(email: string) {
  return /^e2e-.*@test\.local$/i.test(email) || /^e2e-.*@moodwedding\.com$/i.test(email);
}

/**
 * Delete stale E2E employee rows (department='E2E') and their matching auth
 * users from previous, un-cleaned runs. Best-effort: never throws, so a sweep
 * failure can't block the test that called it.
 */
export async function sweepStaleE2EOrphans(admin: SupabaseClient) {
  const cutoffIso = new Date(Date.now() - STALE_MS).toISOString();
  const staleAuthIds = new Set<string>();

  try {
    // 1) Stale E2E employee rows — all specs tag seeds with department='E2E'.
    const { data: staleEmps } = await admin
      .from("employees")
      .select("id, auth_user_id, created_at")
      .eq("department", "E2E")
      .lt("created_at", cutoffIso);

    if (staleEmps?.length) {
      await admin
        .from("employees")
        .delete()
        .in(
          "id",
          staleEmps.map((e) => e.id as string),
        );
      for (const e of staleEmps) {
        if (e.auth_user_id) staleAuthIds.add(e.auth_user_id as string);
      }
    }

    // 2) Stale E2E auth users (covers users whose employee row was already
    //    cleaned but the deleteUser half never ran — partial-cleanup orphans).
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const cutoffMs = Date.now() - STALE_MS;
    for (const u of list?.users ?? []) {
      if (!isE2EEmail(u.email ?? "")) continue;
      const created = u.created_at ? Date.parse(u.created_at) : 0;
      if (created && created > cutoffMs) continue; // skip fresh — concurrent run
      staleAuthIds.add(u.id);
    }

    for (const id of staleAuthIds) {
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
  } catch {
    // Best-effort: a sweep failure must not fail the suite that depends on it.
  }
}
