# Phase 01: Public Gallery Access Security
**Status:** Completed
**Priority:** P0
**Target score impact:** 7.6 -> 8.5

## Goal

Prevent public visitors from mutating arbitrary `gallery_images` rows and remove plaintext gallery password storage.

## Work Items

1. Add a gallery security migration:
   - Add `galleries.password_hash`.
   - Add `galleries.access_version` or `galleries.password_updated_at` for token invalidation.
   - Backfill existing plaintext `galleries.password` into `password_hash` with `pgcrypto.crypt(...)` where possible.
   - Stop selecting or returning raw password values.
   - Drop, null, or deprecate the old plaintext column after a safe compatibility window.
2. Add server-side access proof helpers, for example `lib/gallery-access.ts`:
   - Sign gallery access proof with HMAC.
   - Include `galleryId`, `accessUrl`, `accessVersion`, `expiresAt`, and access scope.
   - Verify with constant-time comparison.
   - Use a short TTL.
3. Update public gallery read flow:
   - `getPublicGallery(accessUrl)` returns public gallery data without password/hash.
   - If no password is required, issue a scoped read/mutation proof for that gallery.
   - If a password is required, return only `requiresPassword`.
4. Update password verification:
   - `verifyGalleryPassword(galleryId, password)` verifies against the hash.
   - On success, issue a signed proof or set an HttpOnly cookie scoped to that gallery.
   - Do not persist raw passwords in `localStorage`.
5. Update public mutations:
   - Change `toggleImageSelection(imageId, selected)` to require `accessUrl` plus signed proof.
   - Change `updateClientNote(imageId, note)` to require `accessUrl` plus signed proof.
   - Validate gallery is shared/active, not expired past deadline where selection should be closed, and password access is satisfied.
   - Validate `gallery_images.id` belongs to the verified `galleries.id`.
   - Limit note length and sanitize/normalize input.
6. Update `components/gallery/public-gallery-client.tsx`:
   - Pass the verified `accessUrl`/proof context to mutation actions.
   - Remove raw password local persistence.
   - Keep optimistic UI rollback on mutation failure.
7. Extend `scripts/verify-contracts.mjs`:
   - Attempt to mutate a known image without proof and expect denial.
   - Attempt to mutate an image from another gallery with a valid different-gallery proof and expect denial.
   - Verify raw password fields are not returned by public read actions.

## Acceptance Criteria

- A guessed/leaked `gallery_images.id` cannot be selected or annotated without verified access to its gallery.
- A valid proof for gallery A cannot mutate an image in gallery B.
- Gallery passwords are not stored or compared as plaintext in active code paths.
- Public gallery password success does not persist raw password client-side.
- Expired/closed gallery selection cannot be changed if business rules require the deadline to be enforced.
- Existing shared-gallery UX still works after password entry.

## Verification

```powershell
npx supabase db push --dry-run
npx supabase db push
npm run verify:contracts
npx tsc --noEmit --pretty false
npx eslint app/actions/gallery-actions.ts components/gallery/public-gallery-client.tsx
```

## Notes

- If the project cannot safely hash existing plaintext passwords in SQL, document a forced password reset path for existing galleries and clear the plaintext values.
- Favor a stateless signed proof unless product requirements need session revocation lists.
