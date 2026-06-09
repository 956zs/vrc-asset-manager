"use client";

import {
  SelectionFieldHeader,
  type SelectionActionsLayout,
} from "@/components/asset-form/selection-field-header";
import { Checkbox } from "@/components/ui/checkbox";
import type { Model } from "@/types";

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

type ModelOptionRowProps = {
  model: Model;
  selected: boolean;
  onToggle: (modelId: number) => void;
};

function ModelOptionRow({ model, selected, onToggle }: ModelOptionRowProps) {
  const label = model.display_name || model.name;

  return (
    <label className="flex cursor-pointer items-center gap-2">
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggle(model.id)}
        aria-label={`切換 ${label}`}
      />
      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
    </label>
  );
}

function ModelOptionList({
  models,
  selectedModelIdSet,
  listClassName,
  onToggle,
}: Pick<
  ModelSelectionFieldProps,
  "models" | "selectedModelIdSet" | "listClassName" | "onToggle"
>) {
  return (
    <div className={listClassName}>
      {models.length > 0 ? (
        models.map((model) => (
          <ModelOptionRow
            key={model.id}
            model={model}
            selected={selectedModelIdSet.has(model.id)}
            onToggle={onToggle}
          />
        ))
      ) : (
        <p className="text-sm text-muted-foreground">尚無模型</p>
      )}
    </div>
  );
}

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
      <SelectionFieldHeader
        actionButtonClassName={actionButtonClassName}
        actionsLayout={actionsLayout}
        itemCount={models.length}
        label="相容模型"
        labelClassName={labelClassName}
        selectedCount={selectedModelIds.length}
        onClear={onClear}
        onSelectAll={onSelectAll}
      />
      <ModelOptionList
        models={models}
        selectedModelIdSet={selectedModelIdSet}
        listClassName={listClassName}
        onToggle={onToggle}
      />
    </div>
  );
}
