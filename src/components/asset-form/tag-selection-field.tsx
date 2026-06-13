"use client";

import {
  SelectionFieldEmpty,
  SelectionFieldFrame,
  SelectionFieldList,
  type SelectionActionsLayout,
  type SelectionFieldListSurface,
} from "@/components/asset-form/selection-field-header";
import { TagChip } from "@/components/ui/tag-chip";
import type { Tag } from "@/types";

type TagSelectionFieldProps = {
  tags: Tag[];
  selectedTagIds: number[];
  selectedTagIdSet: Set<number>;
  actionsLayout?: SelectionActionsLayout;
  actionButtonClassName?: string;
  labelClassName?: string;
  listClassName?: string;
  listSurface?: SelectionFieldListSurface;
  tagClassName?: string;
  onSelectAll: () => void;
  onClear: () => void;
  onToggle: (tagId: number) => void;
};

type TagBadgeOptionProps = {
  selected: boolean;
  tag: Tag;
  tagClassName: string;
  onToggle: (tagId: number) => void;
};

type TagBadgeListProps = {
  tags: Tag[];
  selectedTagIdSet: Set<number>;
  listClassName?: string;
  listSurface: SelectionFieldListSurface;
  tagClassName: string;
  onToggle: (tagId: number) => void;
};

function TagBadgeOption({
  selected,
  tag,
  tagClassName,
  onToggle,
}: TagBadgeOptionProps) {
  return (
    <TagChip
      color={tag.color}
      label={tag.name}
      variant={selected ? "solid" : "outline"}
      className={tagClassName}
      onClick={() => onToggle(tag.id)}
    />
  );
}

function TagBadgeList({
  tags,
  selectedTagIdSet,
  listClassName,
  listSurface,
  tagClassName,
  onToggle,
}: TagBadgeListProps) {
  return (
    <SelectionFieldList
      flow="wrap"
      surface={listSurface}
      className={listClassName ?? "min-w-0"}
    >
      {tags.length > 0 ? (
        tags.map((tag) => (
          <TagBadgeOption
            key={tag.id}
            selected={selectedTagIdSet.has(tag.id)}
            tag={tag}
            tagClassName={tagClassName}
            onToggle={onToggle}
          />
        ))
      ) : (
        <SelectionFieldEmpty>尚無標籤</SelectionFieldEmpty>
      )}
    </SelectionFieldList>
  );
}

export function TagSelectionField({
  tags,
  selectedTagIds,
  selectedTagIdSet,
  actionsLayout = "inline",
  actionButtonClassName = "h-7 px-2 text-xs",
  labelClassName = "text-sm font-medium",
  listClassName,
  listSurface = "plain",
  tagClassName = "min-w-0 !max-w-full !shrink cursor-pointer truncate transition-colors",
  onSelectAll,
  onClear,
  onToggle,
}: TagSelectionFieldProps) {
  return (
    <SelectionFieldFrame
      actionButtonClassName={actionButtonClassName}
      actionsLayout={actionsLayout}
      itemCount={tags.length}
      label="標籤"
      labelClassName={labelClassName}
      selectedCount={selectedTagIds.length}
      onClear={onClear}
      onSelectAll={onSelectAll}
    >
      <TagBadgeList
        tags={tags}
        selectedTagIdSet={selectedTagIdSet}
        listClassName={listClassName}
        listSurface={listSurface}
        tagClassName={tagClassName}
        onToggle={onToggle}
      />
    </SelectionFieldFrame>
  );
}
