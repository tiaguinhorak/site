import {
  Boxes,
  Bomb,
  Crosshair,
  Gamepad2,
  Mountain,
  ScanFace,
  Skull,
  Target,
  Users,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const WARMUP_ICON_MAP: Record<string, LucideIcon> = {
  Boxes,
  Skull,
  Gamepad2,
  Crosshair,
  Target,
  ScanFace,
  Bomb,
  Waves,
  Users,
  Mountain,
  Zap,
};

export function resolveWarmupIcon(key: string): LucideIcon {
  return WARMUP_ICON_MAP[key] ?? Crosshair;
}
