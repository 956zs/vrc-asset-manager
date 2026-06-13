import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type StateSurfaceTone = "default" | "success" | "warning" | "danger";

type StateSurfaceProps = ComponentProps<"div"> & {
  tone?: StateSurfaceTone;
};

const toneClasses: Record<StateSurfaceTone, string> = {
  default: "border-border/90 bg-background",
  success: "border-emerald-500/35 bg-emerald-500/5",
  warning: "border-amber-500/45 bg-amber-500/5",
  danger: "border-destructive/45 bg-destructive/5",
};

function StateSurface({
  className,
  tone = "default",
  ...props
}: StateSurfaceProps) {
  return (
    <div
      className={cn(
        "rounded-md border transition-colors",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}

export { StateSurface, type StateSurfaceTone };
