"use client";

import { DetailFieldLabel } from "@/components/asset-detail/detail-field-label";
import { assetDetailTagSelectionPreset } from "@/components/asset-form/field-presets";
import { TagSelectionField } from "@/components/asset-form/tag-selection-field";
import { TagChip } from "@/components/ui/tag-chip";
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
      {...assetDetailTagSelectionPreset}
      tags={props.tags}
      selectedTagIds={props.editedTagIds}
      selectedTagIdSet={props.editedTagIdSet}
      onSelectAll={props.onSelectAll}
      onClear={props.onClear}
      onToggle={props.onToggle}
    />
  );
}

function ReadonlyTagBadge({ tag }: { tag: Tag }) {
  return (
    <TagChip
      color={tag.color}
      label={tag.name}
      variant="outline"
      className="min-w-0 !max-w-full !shrink truncate"
    />
  );
}

function ReadonlyTagList({ assetTags }: { assetTags: Tag[] }) {
  return (
    <>
      <DetailFieldLabel>標籤</DetailFieldLabel>
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
