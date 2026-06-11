"use client";

import {
  SelectionFieldHeader,
  type SelectionActionsLayout,
} from "@/components/asset-form/selection-field-header";
import { Badge } from "@/components/ui/badge";
import type { Tag } from "@/types";

type TagSelectionFieldProps = {
  tags: Tag[];
  selectedTagIds: number[];
  selectedTagIdSet: Set<number>;
  actionsLayout?: SelectionActionsLayout;
  actionButtonClassName?: string;
  labelClassName?: string;
  listClassName?: string;
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
  tagClassName: string;
  onToggle: (tagId: number) => void;
};

function getTagBadgeStyle(tag: Tag, selected: boolean) {
  if (selected) {
    return {
      backgroundColor: tag.color,
      borderColor: tag.color,
      color: "#fff",
    };
  }

  return {
    borderColor: tag.color,
    color: tag.color,
  };
}

function TagBadgeOption({
  selected,
  tag,
  tagClassName,
  onToggle,
}: TagBadgeOptionProps) {
  return (
    <Badge
      variant={selected ? "default" : "outline"}
      className={tagClassName}
      style={getTagBadgeStyle(tag, selected)}
      onClick={() => onToggle(tag.id)}
    >
      {tag.name}
    </Badge>
  );
}

function TagBadgeList({
  tags,
  selectedTagIdSet,
  listClassName,
  tagClassName,
  onToggle,
}: TagBadgeListProps) {
  return (
    <div className={listClassName ?? "flex min-w-0 flex-wrap gap-2"}>
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
        <p className="text-sm text-muted-foreground">尚無標籤</p>
      )}
    </div>
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
  tagClassName = "min-w-0 !max-w-full !shrink cursor-pointer truncate transition-colors",
  onSelectAll,
  onClear,
  onToggle,
}: TagSelectionFieldProps) {
  return (
    <div className="space-y-2">
      <SelectionFieldHeader
        actionButtonClassName={actionButtonClassName}
        actionsLayout={actionsLayout}
        itemCount={tags.length}
        label="標籤"
        labelClassName={labelClassName}
        selectedCount={selectedTagIds.length}
        onClear={onClear}
        onSelectAll={onSelectAll}
      />
      <TagBadgeList
        tags={tags}
        selectedTagIdSet={selectedTagIdSet}
        listClassName={listClassName}
        tagClassName={tagClassName}
        onToggle={onToggle}
      />
    </div>
  );
}
