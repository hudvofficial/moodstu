/**
 * Icon Map — Material Symbols string → Lucide React Component
 * Used by ComponentSelector and CategoryManagerModal to render dynamic icons from DB.
 * 
 * When a category has `icon: "camera"` stored in DB, this map resolves it
 * to the corresponding Lucide component for tree-shakeable SVG rendering.
 */
import {
  Camera,
  Palette,
  Shirt,
  Sparkles,
  Heart,
  Star,
  Music,
  Video,
  Image as ImageIcon,
  Gift,
  Gem,
  Flower2,
  Cake,
  Car,
  MapPin,
  Users,
  Scissors,
  Brush,
  Printer,
  Package,
  Layers,
  type LucideIcon,
} from "lucide-react";

/**
 * Maps Material Symbols icon names (stored in DB) to Lucide components.
 * Extend this map when new category icons are added via the Category Manager.
 */
export const ICON_MAP: Record<string, LucideIcon> = {
  // Photography & Visual
  camera: Camera,
  camera_alt: Camera,
  photo_camera: Camera,
  image: ImageIcon,
  wallpaper: ImageIcon,
  palette: Palette,
  brush: Brush,

  // Fashion & Beauty
  checkroom: Shirt,
  dry_cleaning: Shirt,
  content_cut: Scissors,

  // Events & Celebration
  favorite: Heart,
  heart: Heart,
  star: Star,
  auto_awesome: Sparkles,
  sparkles: Sparkles,
  celebration: Gift,
  cake: Cake,
  card_giftcard: Gift,
  redeem: Gift,

  // Media
  music_note: Music,
  videocam: Video,
  movie: Video,

  // Decor & Venue
  local_florist: Flower2,
  diamond: Gem,
  directions_car: Car,
  location_on: MapPin,
  place: MapPin,

  // People & Services
  groups: Users,
  people: Users,
  print: Printer,
  inventory_2: Package,
  category: Layers,
};

/** Default icon when no match is found */
export const DEFAULT_ICON: LucideIcon = Layers;

/**
 * Resolves a Material Symbols icon name string to a Lucide component.
 * @param iconName - The icon name stored in the database (e.g., "camera", "palette")
 * @returns The matching Lucide icon component, or DEFAULT_ICON if not found.
 */
export function resolveIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return DEFAULT_ICON;
  return ICON_MAP[iconName.toLowerCase().trim()] || DEFAULT_ICON;
}
