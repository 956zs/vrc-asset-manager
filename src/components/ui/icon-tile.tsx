import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type IconTileTone = "muted" | "primary" | "success";
type IconTileSize = "sm" | "default" | "lg";
type IconTileProps = ComponentProps<"span"> & {
  children: ReactNode;
  size?: IconTileSize;
  tone?: IconTileTone;
};

const sizeClasses: Record<IconTileSize, string> = {
  sm: "size-7",
  default: "size-10",
  lg: "size-14",
};

const toneClasses: Record<IconTileTone, string> = {
  muted: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-400",
};

function IconTile({
  children,
  className,
  size = "default",
  tone = "muted",
  ...props
}: IconTileProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md",
        sizeClasses[size],
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export { IconTile };
