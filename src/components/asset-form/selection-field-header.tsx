"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SelectionActionsLayout = "inline" | "grid" | "compact";

type SelectionFieldHeaderProps = {
  actionButtonClassName: string;
  actionsLayout: SelectionActionsLayout;
  itemCount: number;
  label: string;
  labelClassName: string;
  selectedCount: number;
  onClear: () => void;
  onSelectAll: () => void;
};

export function SelectionFieldHeader({
  actionButtonClassName,
  actionsLayout,
  itemCount,
  label,
  labelClassName,
  selectedCount,
  onClear,
  onSelectAll,
}: SelectionFieldHeaderProps) {
  return (
    <div
      className={cn(
        "flex gap-2",
        actionsLayout === "grid" ? "flex-col items-start" : "items-center justify-between",
      )}
    >
      <label className={labelClassName}>
        {label}
        {actionsLayout === "compact" && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {selectedCount}/{itemCount}
          </span>
        )}
      </label>
      <div
        className={cn(
          actionsLayout === "grid"
            ? "grid w-full min-w-0 grid-cols-2 gap-2"
            : "flex shrink-0 items-center gap-1",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={actionButtonClassName}
          disabled={itemCount === 0}
          onClick={onSelectAll}
        >
          全選
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={actionButtonClassName}
          disabled={selectedCount === 0}
          onClick={onClear}
        >
          全不選
        </Button>
      </div>
    </div>
  );
}
