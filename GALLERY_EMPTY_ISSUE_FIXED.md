# Gallery "Chưa có ảnh nào" Issue - FIXED ✅

## Problem
Gallery ID `a50f0b0d-52df-49b5-af9e-952972ba4585` (GD Tiger) showed:
- Header stats: **103 images**
- Gallery view: **"Chưa có ảnh nào"** (No images)

## Root Cause
The `get_gallery_data_v2` RPC function had **critical schema errors**:

### 1. Missing `image_url` field ❌
```sql
-- OLD: Missing image_url
jsonb_build_object(
  'id', gi.id,
  'gallery_id', gi.gallery_id,
  'file_name', gi.file_name,
  'file_path', gi.file_path,  -- ❌ Column doesn't exist
  'thumbnail_url', gi.thumbnail_url
  -- ❌ image_url was MISSING
)
```

Without `image_url`, the frontend couldn't render images even though they existed in the database.

### 2. Referenced non-existent columns ❌
- `file_path` - doesn't exist in `gallery_images` table
- `name` - doesn't exist in `gallery_albums` table (should be `title`)

## Solution Applied
Created migration [20260528000005_fix_gallery_data_v2_rpc.sql](supabase/migrations/20260528000005_fix_gallery_data_v2_rpc.sql) that:

### Fixed Image Fields
```sql
-- NEW: All required fields present
jsonb_build_object(
  'id', gi.id,
  'gallery_id', gi.gallery_id,
  'file_name', gi.file_name,
  'file_group', gi.file_group,
  'image_url', gi.image_url,              -- ✅ ADDED
  'thumbnail_url', gi.thumbnail_url,
  'drive_file_id', gi.drive_file_id,
  'width', gi.width,
  'height', gi.height,
  'is_selected', gi.is_selected,
  'is_starred', gi.is_starred,
  'starred_at', gi.starred_at,
  'selected_at', gi.selected_at,
  'client_note', gi.client_note,
  'album_id', gi.album_id,
  'sort_order', gi.sort_order,
  'created_at', gi.created_at
)
```

### Fixed Album Fields
```sql
-- OLD
'name', ga.name  -- ❌ Column doesn't exist

-- NEW
'title', ga.title,              -- ✅ FIXED
'description', ga.description,
'cover_image_id', ga.cover_image_id
```

## Verification Results
✅ **RPC now returns all 103 images** with complete data:
```
Images returned: 103
Total count: 103
Has more: false

First image from RPC:
  - id: ✅
  - file_name: ✅
  - image_url: ✅ EXISTS
  - thumbnail_url: ✅ EXISTS
  - drive_file_id: ✅
```

## Impact
- **All galleries** using `get_gallery_data_v2` will now display correctly
- Performance benefit: Single RPC call instead of 3 sequential calls
- No frontend changes needed - fix was entirely in the database layer

## Testing
Run diagnostic script:
```bash
node scripts/debug-gallery.mjs
```

## Files Changed
1. ✅ `supabase/migrations/20260528000005_fix_gallery_data_v2_rpc.sql` - Fixed RPC
2. ✅ `scripts/debug-gallery.mjs` - Diagnostic tool for gallery debugging

---
**Status**: ✅ Fixed and deployed
**Date**: 2026-05-27
**Affected Gallery**: a50f0b0d-52df-49b5-af9e-952972ba4585 (GD Tiger)
