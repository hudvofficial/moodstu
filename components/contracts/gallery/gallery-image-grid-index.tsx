"use client";

/**
 * Gallery Grid Wrapper
 *
 * Chỉ còn một bản: CSS Grid masonry (./gallery-image-grid).
 * Bản Pinterest (positions tính sẵn, cần width/height trong DB) đã gỡ 2026-08-27
 * (T-20260723-gallery-dead-code-cleanup): cờ USE_PINTEREST để false nên nó chưa từng chạy,
 * nhưng câu import vẫn kéo nó vào bundle client (đo được ở chunk 7260-*.js trước khi gỡ).
 */

import GalleryImageGridOriginal from "./gallery-image-grid";

export default GalleryImageGridOriginal;
