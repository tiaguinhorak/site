import {
  Crosshair,
  Swords,
  PartyPopper,
  Footprints,
  Server,
  Trophy,
  Package,
  UserRound,
  Zap,
  Crown,
  Gamepad2,
  Shield,
  Target,
  Flame,
  Star,
  Bolt,
  Skull,
  Boxes,
  ScanFace,
  Bomb,
  Waves,
  Mountain,
  Users,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Crosshair,
  Swords,
  PartyPopper,
  Footprints,
  Server,
  Trophy,
  Package,
  UserRound,
  Zap,
  Crown,
  Gamepad2,
  Shield,
  Target,
  Flame,
  Star,
  Bolt,
  Skull,
  Boxes,
  ScanFace,
  Bomb,
  Waves,
  Mountain,
  Users,
};

export function resolveIcon(key: string): LucideIcon {
  return iconMap[key] ?? Crosshair;
}

export function getIconMap(): Record<string, LucideIcon> {
  return iconMap;
}
