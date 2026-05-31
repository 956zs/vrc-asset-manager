"use client";

import { TagSelectionField } from "@/components/asset-form/tag-selection-field";
import { Badge } from "@/components/ui/badge";
import type { Tag } from "@/types";

type AssetDetailTagSectionProps = {
  tags: Tag[];
  assetTags: Tag[];
  isEditing: boolean;
  editedTagIds: number[];
  editedTagIdSet: Set<number>;
  onSelectAll: () => void;
  onClear: () => void;
  onToggle: (tagId: number) => void;
};

export function AssetDetailTagSection({
  tags,
  assetTags,
  isEditing,
  editedTagIds,
  editedTagIdSet,
  onSelectAll,
  onClear,
  onToggle,
}: AssetDetailTagSectionProps) {
  return (
    <div className="min-w-0">
      {isEditing ? (
        <TagSelectionField
          tags={tags}
          selectedTagIds={editedTagIds}
          selectedTagIdSet={editedTagIdSet}
          actionsLayout="grid"
          actionButtonClassName="h-8 w-full px-2 text-xs"
          labelClassName="text-sm font-medium text-muted-foreground"
          tagClassName="max-w-full cursor-pointer truncate transition-colors"
          onSelectAll={onSelectAll}
          onClear={onClear}
          onToggle={onToggle}
        />
      ) : (
        <>
          <label className="text-sm font-medium text-muted-foreground">
            標籤
          </label>
          <div className="mt-2 flex min-w-0 flex-wrap gap-2">
            {assetTags.length > 0 ? (
              assetTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="max-w-full truncate"
                  style={{ borderColor: tag.color, color: tag.color }}
                >
                  {tag.name}
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
