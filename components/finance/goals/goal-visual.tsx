"use client";

import type { LucideIcon } from "lucide-react";
import { Camera, Car, GraduationCap, Home, Laptop, PiggyBank, Plane, Store } from "lucide-react";

export const GOAL_ICON_OPTIONS = [
  { value: "directions_car", label: "Ô tô", icon: Car },
  { value: "home", label: "Nhà", icon: Home },
  { value: "photo_camera", label: "Thiết bị", icon: Camera },
  { value: "computer", label: "Công nghệ", icon: Laptop },
  { value: "savings", label: "Tiết kiệm", icon: PiggyBank },
  { value: "flight", label: "Du lịch", icon: Plane },
  { value: "school", label: "Đào tạo", icon: GraduationCap },
  { value: "storefront", label: "Mở rộng", icon: Store },
] as const satisfies ReadonlyArray<{ value: string; label: string; icon: LucideIcon }>;

export const GOAL_COLOR_OPTIONS = [
  { value: "emerald", label: "Xanh lá", iconBg: "bg-success/10", iconColor: "text-success" },
  { value: "blue", label: "Xanh dương", iconBg: "bg-info/10", iconColor: "text-info" },
  { value: "violet", label: "Tím", iconBg: "bg-primary/10", iconColor: "text-primary" },
  { value: "amber", label: "Vàng", iconBg: "bg-warning/10", iconColor: "text-warning" },
  { value: "rose", label: "Hồng", iconBg: "bg-error/10", iconColor: "text-error" },
] as const satisfies ReadonlyArray<{ value: string; label: string; iconBg: string; iconColor: string }>;

export const GOAL_TEMPLATES = [
  {
    name: "Mua xe cho Studio",
    icon: "directions_car",
    color: "blue",
    suggestedAmount: 500_000_000,
    suggestedMonths: 24,
  },
  {
    name: "Thiết bị chụp ảnh",
    icon: "photo_camera",
    color: "violet",
    suggestedAmount: 50_000_000,
    suggestedMonths: 6,
  },
  {
    name: "Mở rộng Studio",
    icon: "storefront",
    color: "amber",
    suggestedAmount: 200_000_000,
    suggestedMonths: 18,
  },
  {
    name: "Quỹ dự phòng 6 tháng",
    icon: "savings",
    color: "emerald",
    suggestedAmount: 0,
    suggestedMonths: 12,
  },
  {
    name: "Du lịch team-building",
    icon: "flight",
    color: "rose",
    suggestedAmount: 30_000_000,
    suggestedMonths: 3,
  },
  {
    name: "Đào tạo nhân viên",
    icon: "school",
    color: "violet",
    suggestedAmount: 20_000_000,
    suggestedMonths: 4,
  },
] as const satisfies ReadonlyArray<{
  name: string;
  icon: string;
  color: string;
  suggestedAmount: number;
  suggestedMonths: number;
}>;

export function resolveGoalIcon(value?: string | null): LucideIcon {
  const found = GOAL_ICON_OPTIONS.find((item) => item.value === value);
  return found?.icon || PiggyBank;
}

export function resolveGoalColor(value?: string | null) {
  const found = GOAL_COLOR_OPTIONS.find((item) => item.value === value);
  return found || GOAL_COLOR_OPTIONS[0];
}

export function GoalIcon({
  value,
  className,
}: {
  value?: string | null;
  className?: string;
}) {
  switch (value) {
    case "directions_car":
      return <Car className={className} />;
    case "home":
      return <Home className={className} />;
    case "photo_camera":
      return <Camera className={className} />;
    case "computer":
      return <Laptop className={className} />;
    case "flight":
      return <Plane className={className} />;
    case "school":
      return <GraduationCap className={className} />;
    case "storefront":
      return <Store className={className} />;
    case "savings":
    default:
      return <PiggyBank className={className} />;
  }
}
