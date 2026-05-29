# Gallery Query Optimization Plan (Optional)

## Current: 269ms (4 parallel queries)

```typescript
// app/actions/gallery-admin-actions.ts
1. SELECT * FROM galleries WHERE contract_id = ?          // ~50ms
2. SELECT ... FROM gallery_images WHERE gallery_id IN ... // ~80ms  
3. SELECT ... FROM gallery_share_links WHERE ...          // ~70ms
4. SELECT ... FROM gallery_images (covers) ...            // ~69ms
```

**Total: 269ms** (already optimized, no N+1)

---

## Option: Create RPC (269ms → ~120ms)

### Migration:

```sql
CREATE OR REPLACE FUNCTION get_gallery_summaries_by_contract(p_contract_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', g.id,
        'title', g.title,
        'drive_folder_id', g.drive_folder_id,
        'contract_id', g.contract_id,
        'created_at', g.created_at,
        'updated_at', g.updated_at,
        -- Aggregated images count
        'image_count', COALESCE(images_agg.total, 0),
        'selected_count', COALESCE(images_agg.selected, 0),
        -- Share links
        'share_links', COALESCE(links_agg.links, '[]'::jsonb),
        -- Cover thumbnail
        'cover_thumbnail', covers_agg.thumbnail
      )
      ORDER BY g.created_at ASC
    ),
    '[]'::jsonb
  ) as galleries
  FROM galleries g
  
  -- Images aggregation
  LEFT JOIN LATERAL (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_selected = true) as selected
    FROM gallery_images gi
    WHERE gi.gallery_id = g.id
  ) images_agg ON true
  
  -- Share links aggregation
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', gsl.id,
        'slug', gsl.slug,
        'capability', gsl.capability,
        'status', gsl.status,
        'access_version', gsl.access_version,
        'created_at', gsl.created_at,
        'expires_at', gsl.expires_at
      )
    ) as links
    FROM gallery_share_links gsl
    WHERE gsl.gallery_id = g.id
      AND gsl.status = 'active'
  ) links_agg ON true
  
  -- Cover thumbnail (first image)
  LEFT JOIN LATERAL (
    SELECT thumbnail_url as thumbnail
    FROM gallery_images gi
    WHERE gi.gallery_id = g.id
    ORDER BY gi.sort_order ASC
    LIMIT 1
  ) covers_agg ON true
  
  WHERE g.contract_id = p_contract_id;
$$;
```

### Code update:

```typescript
// app/actions/gallery-admin-actions.ts
export async function getGallerySummariesByContract(contractId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { data, error } = await supabase
      .rpc('get_gallery_summaries_by_contract', { 
        p_contract_id: contractId 
      });

    if (error) throw new Error(error.message);
    
    return data || [];
  });
}
```

### Expected:
- **269ms → 120ms** (save ~150ms)
- Single RPC call
- Cleaner code

### Effort: 
- 3 hours (migration + code + test)

### ROI:
- **Low** (only -150ms, not critical path)
- Better focus on v3 deployment first

---

## Recommendation:

❌ **SKIP gallery optimization FOR NOW**

**Reasons:**
1. Already optimized (no N+1)
2. 269ms is acceptable 
3. v3 gave us -500ms (bigger win)
4. Gallery not in critical SSR path
5. Focus deployment > micro-optimization

**Do later IF:**
- User complains about gallery load time
- Contract detail < 300ms total, then optimize gallery
- Have spare time after v3 stable in production

---

## Priority Order:

1. ✅ **DONE:** RPC v3 (-500ms)
2. 🚀 **NOW:** Deploy v3 to staging/production  
3. 📊 **AFTER:** Measure real user impact
4. 🔮 **MAYBE:** Gallery RPC (if still slow)

