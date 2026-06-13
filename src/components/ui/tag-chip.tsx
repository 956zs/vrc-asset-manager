import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TagChipVariant = "outline" | "soft" | "solid";
type TagChipProps = Omit<
  ComponentProps<typeof Badge>,
  "children" | "style" | "variant"
> & {
  color: string;
  label: string;
  variant?: TagChipVariant;
};

function tagChipStyle(color: string, variant: TagChipVariant) {
  if (variant === "solid") {
    return {
      backgroundColor: color,
      borderColor: color,
      color: "#fff",
    };
  }

  if (variant === "soft") {
    return {
      backgroundColor: `${color}20`,
      borderColor: `${color}40`,
      color,
    };
  }

  return {
    borderColor: color,
    color,
  };
}

function TagChip({
  className,
  color,
  label,
  variant = "outline",
  ...props
}: TagChipProps) {
  return (
    <Badge
      variant={variant === "solid" ? "default" : "outline"}
      className={cn("min-w-0 !max-w-full !shrink truncate", className)}
      style={tagChipStyle(color, variant)}
      {...props}
    >
      {label}
    </Badge>
  );
}

export { TagChip, type TagChipVariant };
