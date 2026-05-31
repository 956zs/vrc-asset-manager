"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Model } from "@/types";

type SelectionActionsLayout = "inline" | "grid";

type ModelSelectionFieldProps = {
  models: Model[];
  selectedModelIds: number[];
  selectedModelIdSet: Set<number>;
  actionsLayout?: SelectionActionsLayout;
  actionButtonClassName?: string;
  labelClassName?: string;
  listClassName?: string;
  onSelectAll: () => void;
  onClear: () => void;
  onToggle: (modelId: number) => void;
};

export function ModelSelectionField({
  models,
  selectedModelIds,
  selectedModelIdSet,
  actionsLayout = "inline",
  actionButtonClassName = "h-7 px-2 text-xs",
  labelClassName = "text-sm font-medium",
  listClassName = "max-h-32 space-y-2 overflow-y-auto rounded-md border p-3",
  onSelectAll,
  onClear,
  onToggle,
}: ModelSelectionFieldProps) {
  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex gap-2",
          actionsLayout === "grid"
            ? "flex-col items-start"
            : "items-center justify-between",
        )}
      >
        <label className={labelClassName}>相容模型</label>
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
            disabled={models.length === 0}
            onClick={onSelectAll}
          >
            全選
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={actionButtonClassName}
            disabled={selectedModelIds.length === 0}
            onClick={onClear}
          >
            全不選
          </Button>
        </div>
      </div>

      <div className={listClassName}>
        {models.length > 0 ? (
          models.map((model) => (
            <label
              key={model.id}
              className="flex cursor-pointer items-center gap-2"
            >
              <Checkbox
                checked={selectedModelIdSet.has(model.id)}
                onCheckedChange={() => onToggle(model.id)}
                aria-label={`切換 ${model.display_name || model.name}`}
              />
              <span className="min-w-0 flex-1 truncate text-sm">
                {model.display_name || model.name}
              </span>
            </label>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">尚無模型</p>
        )}
      </div>
    </div>
  );
}
