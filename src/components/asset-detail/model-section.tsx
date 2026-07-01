import { DetailFieldLabel } from "@/components/asset-detail/detail-field-label";
import { assetDetailModelSelectionPreset } from "@/components/asset-form/field-presets";
import { ModelSelectionField } from "@/components/asset-form/model-selection-field";
import { MetaBadge } from "@/components/ui/meta-badge";
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
          {...assetDetailModelSelectionPreset}
          models={models}
          selectedModelIds={editedModelIds}
          selectedModelIdSet={editedModelIdSet}
          onSelectAll={onSelectAll}
          onClear={onClear}
          onToggle={onToggle}
        />
      ) : (
        <>
          <DetailFieldLabel>相容模型</DetailFieldLabel>
          <div className="mt-2 flex min-w-0 flex-wrap gap-2">
            {assetModels.length > 0 ? (
              assetModels.map((model) => (
                <MetaBadge
                  key={model.id}
                  variant="secondary"
                  className="min-w-0 !max-w-full !shrink truncate"
                >
                  {model.display_name || model.name}
                </MetaBadge>
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
