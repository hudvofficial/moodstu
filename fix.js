const fs = require('fs'); 
const file = 'c:\\Users\\Admin\\Desktop\\Ai\\mood saas\\mood-studio\\app\\actions\\gallery-actions.ts'; 
// Remove trailing null bytes / utf-16 artifacts
let content = fs.readFileSync(file);
// Let's just find the marker and truncate
let contentStr = content.toString('utf8');
const marker = 'return { success: true as const };\n  });\n}';
const idx = contentStr.lastIndexOf(marker);
if (idx !== -1) { 
  let finalStr = contentStr.substring(0, idx + marker.length) + '\n\nexport async function getPublicGalleryStats(galleryId: string) {\n  try {\n    const supabase = await createAdminClient();\n    const [selectedCount, imageCount] = await Promise.all([\n      fetchGalleryImageCount(supabase, galleryId, { selectedOnly: true }),\n      fetchGalleryImageCount(supabase, galleryId)\n    ]);\n    return { selectedCount, imageCount };\n  } catch (err) {\n    console.error("[getPublicGalleryStats] Error:", err);\n    return { selectedCount: 0, imageCount: 0 };\n  }\n}\n';
  fs.writeFileSync(file, finalStr);
  console.log('Fixed'); 
} else { 
  console.log('Marker not found'); 
}
