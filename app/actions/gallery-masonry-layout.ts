"use server";

/**
 * Server-side masonry layout calculation
 * Pinterest-style approach: pre-calculate all positions for perfect virtual scrolling
 */

export interface MasonryItem {
  id: string;
  width: number;
  height: number;
  [key: string]: any;
}

export interface MasonryPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MasonryLayoutResult {
  positions: MasonryPosition[];
  totalHeight: number;
  columnCount: number;
}

/**
 * Calculate masonry layout positions
 * @param items - Array of items with width/height
 * @param containerWidth - Container width in pixels
 * @param columnCount - Number of columns (2-7)
 * @param gap - Gap between items in pixels
 * @returns Calculated positions for each item
 */
export async function calculateMasonryLayout(
  items: MasonryItem[],
  containerWidth: number,
  columnCount: number = 5,
  gap: number = 16
): Promise<MasonryLayoutResult> {
  // Validate inputs
  if (!items || items.length === 0) {
    return { positions: [], totalHeight: 0, columnCount };
  }

  // Calculate column width
  const totalGapWidth = gap * (columnCount - 1);
  const columnWidth = (containerWidth - totalGapWidth) / columnCount;

  // Initialize column heights
  const columnHeights = Array(columnCount).fill(0);
  const positions: MasonryPosition[] = [];

  // Place each item
  for (const item of items) {
    // Skip items without dimensions
    if (!item.width || !item.height) {
      console.warn(`Item ${item.id} missing dimensions, using default`);
      item.width = 3000;
      item.height = 2000;
    }

    // Find shortest column
    const targetColumn = columnHeights.indexOf(Math.min(...columnHeights));

    // Calculate item dimensions maintaining aspect ratio
    const aspectRatio = item.height / item.width;
    const itemHeight = columnWidth * aspectRatio;

    // Calculate position
    const x = targetColumn * (columnWidth + gap);
    const y = columnHeights[targetColumn];

    positions.push({
      id: item.id,
      x,
      y,
      width: columnWidth,
      height: itemHeight
    });

    // Update column height
    columnHeights[targetColumn] += itemHeight + gap;
  }

  // Get total height (tallest column)
  const totalHeight = Math.max(...columnHeights);

  return {
    positions,
    totalHeight,
    columnCount
  };
}

/**
 * Filter positions to only those in viewport window (Client-side helper)
 */
export async function filterVisiblePositions(
  positions: MasonryPosition[],
  scrollTop: number,
  viewportHeight: number,
  buffer: number = 1500
): Promise<MasonryPosition[]> {
  const windowTop = Math.max(0, scrollTop - buffer);
  const windowBottom = scrollTop + viewportHeight + buffer;

  return positions.filter(pos => {
    const itemBottom = pos.y + pos.height;
    return itemBottom >= windowTop && pos.y <= windowBottom;
  });
}

/**
 * Get responsive column count based on container width (Client-side helper)
 */
export async function getResponsiveColumnCount(containerWidth: number, maxColumns: number = 7): Promise<number> {
  if (containerWidth < 640) return 2;
  if (containerWidth < 768) return 3;
  if (containerWidth < 1024) return 4;
  if (containerWidth < 1280) return 5;
  return Math.min(maxColumns, 6);
}
