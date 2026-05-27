"use client";

/**
 * Gallery Grid Wrapper - Switch between implementations
 *
 * USE_PINTEREST=true: Pinterest-style with pre-calculated positions (requires width/height in DB)
 * USE_PINTEREST=false: Original CSS Grid masonry (works without dimensions)
 */

import GalleryImageGridOriginal from "./gallery-image-grid";
import GalleryImageGridPinterest from "./gallery-image-grid-pinterest";

const USE_PINTEREST = false; // Using CSS Grid (better width calculation)

export default USE_PINTEREST ? GalleryImageGridPinterest : GalleryImageGridOriginal;
