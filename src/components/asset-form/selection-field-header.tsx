import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SelectionActionsLayout = "inline" | "grid" | "compact";
export type SelectionFieldListFlow = "stack" | "wrap";
export type SelectionFieldListSurface = "panel" | "plain";

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

type SelectionFieldFrameProps = SelectionFieldHeaderProps & {
  children: ReactNode;
};

type SelectionFieldEmptyProps = {
  children: ReactNode;
};

type SelectionFieldListProps = {
  children: ReactNode;
  className?: string;
  flow?: SelectionFieldListFlow;
  surface?: SelectionFieldListSurface;
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

export function SelectionFieldFrame({
  children,
  ...headerProps
}: SelectionFieldFrameProps) {
  return (
    <div className="space-y-2">
      <SelectionFieldHeader {...headerProps} />
      {children}
    </div>
  );
}

export function SelectionFieldEmpty({ children }: SelectionFieldEmptyProps) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function SelectionFieldList({
  children,
  className,
  flow = "stack",
  surface = "panel",
}: SelectionFieldListProps) {
  return (
    <div
      className={cn(
        surface === "panel" &&
          "overflow-y-auto rounded-md border border-border/70 bg-background/35",
        flow === "stack"
          ? "space-y-2"
          : "flex min-w-0 flex-wrap content-start gap-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
