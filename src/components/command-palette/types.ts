import type { LucideIcon } from "lucide-react";

type CommandPaletteItemKind = "action" | "asset" | "model" | "tag";

export type CommandPaletteItem = {
  id: string;
  kind: CommandPaletteItemKind;
  group: string;
  title: string;
  subtitle?: string;
  badge?: string;
  icon: LucideIcon;
  thumbnailUrl?: string | null;
  sensitive?: boolean;
  accentColor?: string;
  keywords: string[];
  onSelect: () => void | Promise<void>;
};

export type CommandPaletteGroup = {
  title: string;
  items: CommandPaletteItem[];
};
