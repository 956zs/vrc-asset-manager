"use client";

import { ModelSelectionField } from "@/components/asset-form/model-selection-field";
import { Badge } from "@/components/ui/badge";
import type { Model } from "@/types";

type AssetDetailModelSectionProps = {
  models: Model[];
  assetModels: Model[];
  isEditing: boolean;
  editedModelIds: number[];
  editedModelIdSet: Set<number>;
  onSelectAll: () => void;
  onClear: () => void;
  onToggle: (modelId: number) => void;
};

export function AssetDetailModelSection({
  models,
  assetModels,
  isEditing,
  editedModelIds,
  editedModelIdSet,
  onSelectAll,
  onClear,
  onToggle,
}: AssetDetailModelSectionProps) {
  return (
    <div className="min-w-0">
      {isEditing ? (
        <ModelSelectionField
          models={models}
          selectedModelIds={editedModelIds}
          selectedModelIdSet={editedModelIdSet}
          actionsLayout="grid"
          actionButtonClassName="h-8 w-full px-2 text-xs"
          labelClassName="text-sm font-medium text-muted-foreground"
          listClassName="min-w-0 space-y-1"
          onSelectAll={onSelectAll}
          onClear={onClear}
          onToggle={onToggle}
        />
      ) : (
        <>
          <label className="text-sm font-medium text-muted-foreground">
            相容模型
          </label>
          <div className="mt-2 flex min-w-0 flex-wrap gap-2">
            {assetModels.length > 0 ? (
              assetModels.map((model) => (
                <Badge
                  key={model.id}
                  variant="secondary"
                  className="min-w-0 !max-w-full !shrink truncate"
                >
                  {model.display_name || model.name}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">未指定</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
