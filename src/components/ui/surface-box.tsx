import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type SurfaceBoxVariant = "default" | "dashed";

type SurfaceBoxProps = ComponentProps<"div"> & {
  variant?: SurfaceBoxVariant;
};

const variantClasses: Record<SurfaceBoxVariant, string> = {
  default: "border-solid",
  dashed: "border-dashed bg-muted/30",
};

function SurfaceBox({
  className,
  variant = "default",
  ...props
}: SurfaceBoxProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-muted/10",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export { SurfaceBox };
