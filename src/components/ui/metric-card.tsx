import type { ReactNode } from "react";

import { IconTile } from "@/components/ui/icon-tile";
import { cn } from "@/lib/utils";

type MetricCardTone = "default" | "good" | "warn";
type MetricCardSize = "compact" | "default" | "large";

type MetricCardProps = {
  className?: string;
  icon?: ReactNode;
  iconPlacement?: "center" | "right";
  label: ReactNode;
  size?: MetricCardSize;
  tone?: MetricCardTone;
  value: ReactNode;
};

const sizeClassNames: Record<MetricCardSize, string> = {
  compact: "min-h-[76px] px-3 py-2",
  default: "min-h-[96px] px-4 py-4",
  large: "min-h-[132px] px-4 py-4",
};

function MetricCard({
  className,
  icon,
  iconPlacement = "right",
  label,
  size = "default",
  tone = "default",
  value,
}: MetricCardProps) {
  const iconNode = icon ? (
    <IconTile>{icon}</IconTile>
  ) : null;

  return (
    <div
      className={cn(
        "flex h-full flex-col justify-center rounded-lg border border-border bg-background text-card-foreground",
        sizeClassNames[size],
        tone === "good" && "border-primary/30 bg-primary/10",
        tone === "warn" && "border-destructive/30 bg-destructive/10",
        className,
      )}
    >
      {iconNode && iconPlacement === "center" ? (
        <>
          <div className="mx-auto">{iconNode}</div>
          <p className="mt-3 text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
        </>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p
              className={cn(
                "mt-1 font-semibold text-foreground",
                size === "default" ? "text-2xl" : "text-lg",
              )}
            >
              {value}
            </p>
          </div>
          {iconNode}
        </div>
      )}
    </div>
  );
}

export { MetricCard, type MetricCardTone };
