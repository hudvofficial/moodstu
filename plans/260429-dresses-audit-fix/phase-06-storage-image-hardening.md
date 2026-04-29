# Phase 06: Storage and Image Hardening
**Status:** Completed
**Priority:** P2
**Target score impact:** 9.6 -> 9.7

## Goal

Make dress image upload/delete posture explicit, role-gated, and safe.

## Work Items

1. Decide bucket strategy:
   - Option A: public-read catalog images, service-only writes.
   - Option B: private bucket with signed URLs.
2. If public-read remains intentional:
   - document why catalog images are public
   - verify anon can read objects only, not list/write/delete unless intended.
3. Harden upload validation:
   - accepted MIME types
   - extension allowlist
   - size cap
   - generated object names
   - canonical path: `dresses/{dressId}/{uuid}.{ext}`.
4. Make upload/delete authorization explicit:
   - catalog image write requires `admin` or `manager`
   - no generic login-only storage mutations.
5. Avoid data loss on image replacement:
   - upload new object first
   - update DB
   - delete old object only after DB success
   - report cleanup failures.
6. Add orphan image cleanup/report script if existing data needs it.

## Acceptance Criteria

- Storage upload/delete cannot be performed by a user without catalog write permission.
- Object paths do not trust user-provided names.
- Replacing an image cannot leave the dress with no image because old object was deleted first.
- Bucket posture is covered by `npm run verify:dresses`.
- Public-read behavior, if kept, is documented as a product decision.

## Verification

```powershell
npm run verify:dresses
npx tsc --noEmit --pretty false
npm run lint
rg -n "storage|upload|remove|dresses.*bucket|signedUrl|publicUrl" app lib scripts supabase
```

## Notes

- The audit found the `dresses` bucket is public. Public catalog images may be acceptable; public rental/customer data is not.
