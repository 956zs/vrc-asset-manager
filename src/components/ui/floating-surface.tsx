import * as React from "react";

import { cn } from "@/lib/utils";

type FloatingSurfacePadding = "none" | "menu" | "tooltip" | "panel";
type FloatingSurfaceShadow = "lg" | "xl";

type FloatingSurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  padding?: FloatingSurfacePadding;
  shadow?: FloatingSurfaceShadow;
};

const paddingClasses: Record<FloatingSurfacePadding, string> = {
  none: "",
  menu: "p-1",
  tooltip: "px-3 py-2",
  panel: "p-1.5",
};

const shadowClasses: Record<FloatingSurfaceShadow, string> = {
  lg: "shadow-lg",
  xl: "shadow-xl",
};

const FloatingSurface = React.forwardRef<HTMLDivElement, FloatingSurfaceProps>(
  (
    {
      className,
      padding = "none",
      shadow = "xl",
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        "rounded-md border border-border bg-popover text-popover-foreground outline-none",
        paddingClasses[padding],
        shadowClasses[shadow],
        className,
      )}
      {...props}
    />
  ),
);

FloatingSurface.displayName = "FloatingSurface";

export { FloatingSurface };
