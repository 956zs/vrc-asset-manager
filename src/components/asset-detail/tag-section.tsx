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

function EditableTagSelection(props: Omit<AssetDetailTagSectionProps, "assetTags">) {
  return (
    <TagSelectionField
      tags={props.tags}
      selectedTagIds={props.editedTagIds}
      selectedTagIdSet={props.editedTagIdSet}
      actionsLayout="grid"
      actionButtonClassName="h-8 w-full px-2 text-xs"
      labelClassName="text-sm font-medium text-muted-foreground"
      tagClassName="max-w-full cursor-pointer truncate transition-colors"
      onSelectAll={props.onSelectAll}
      onClear={props.onClear}
      onToggle={props.onToggle}
    />
  );
}

function ReadonlyTagBadge({ tag }: { tag: Tag }) {
  return (
    <Badge
      variant="outline"
      className="max-w-full truncate"
      style={{ borderColor: tag.color, color: tag.color }}
    >
      {tag.name}
    </Badge>
  );
}

function ReadonlyTagList({ assetTags }: { assetTags: Tag[] }) {
  return (
    <>
      <label className="text-sm font-medium text-muted-foreground">標籤</label>
      <div className="mt-2 flex min-w-0 flex-wrap gap-2">
        {assetTags.length > 0 ? (
          assetTags.map((tag) => <ReadonlyTagBadge key={tag.id} tag={tag} />)
        ) : (
          <p className="text-sm text-muted-foreground">未指定</p>
        )}
      </div>
    </>
  );
}

export function AssetDetailTagSection(props: AssetDetailTagSectionProps) {
  return (
    <div className="min-w-0">
      {props.isEditing ? (
        <EditableTagSelection {...props} />
      ) : (
        <ReadonlyTagList assetTags={props.assetTags} />
      )}
    </div>
  );
}
