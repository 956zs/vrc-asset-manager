import { useId, useState, type ReactNode } from "react";

import { DisclosureChevron } from "@/components/ui/disclosure";
import { IconTile } from "@/components/ui/icon-tile";
import { MetaBadge } from "@/components/ui/meta-badge";
import { cn } from "@/lib/utils";

type DisclosurePanelSize = "default" | "compact";
type DisclosurePanelProps = {
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  defaultOpen?: boolean;
  description?: ReactNode;
  icon: ReactNode;
  open?: boolean;
  size?: DisclosurePanelSize;
  title: ReactNode;
  toggleLabel?: (open: boolean) => string;
  onOpenChange?: (open: boolean) => void;
};

const shellClasses = {
  closed: "border-primary/35 bg-primary/5 shadow-sm hover:border-primary/55 hover:bg-primary/8",
  open: "border-primary/55 bg-primary/8",
};

function DisclosurePanel({
  badge = "可選",
  children,
  className,
  contentClassName,
  defaultOpen = false,
  description,
  icon,
  open,
  size = "default",
  title,
  toggleLabel = (expanded) => (expanded ? "收合" : "展開"),
  onOpenChange,
}: DisclosurePanelProps) {
  const contentId = useId();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const expanded = open ?? internalOpen;
  const updateOpen = (nextOpen: boolean) => {
    if (open === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };
  const compact = size === "compact";

  return (
    <div
      className={cn(
        "rounded-md border transition-colors",
        expanded ? shellClasses.open : shellClasses.closed,
        className,
      )}
    >
      <button
        type="button"
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
          compact ? "px-3 py-2" : "px-4 py-3",
        )}
        aria-controls={contentId}
        aria-expanded={expanded}
        onClick={() => updateOpen(!expanded)}
      >
        <span className="flex min-w-0 items-start gap-3">
          <IconTile tone="primary" size={compact ? "sm" : "default"} className="mt-0.5">
            {icon}
          </IconTile>
          <span className="min-w-0">
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <span
                className={cn(
                  "font-semibold text-foreground/92",
                  compact ? "text-base" : "text-lg",
                )}
              >
                {title}
              </span>
              {badge && <MetaBadge>{badge}</MetaBadge>}
            </span>
            {description && (
              <span className="mt-1 block min-w-0 truncate text-xs text-muted-foreground">
                {description}
              </span>
            )}
          </span>
        </span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 px-1 text-xs font-semibold text-foreground/88 transition-colors hover:text-primary">
          <span>{toggleLabel(expanded)}</span>
          <DisclosureChevron expanded={expanded} collapsedClassName="-rotate-90" />
        </span>
      </button>
      {expanded && (
        <div
          id={contentId}
          className={cn(
            compact ? "px-3 pb-3 pt-1" : "space-y-4 border-t border-border/70 px-4 py-4",
            contentClassName,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export { DisclosurePanel };
