"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Tag } from "@/types";

type SelectionActionsLayout = "inline" | "grid";

type TagSelectionFieldProps = {
  tags: Tag[];
  selectedTagIds: number[];
  selectedTagIdSet: Set<number>;
  actionsLayout?: SelectionActionsLayout;
  actionButtonClassName?: string;
  labelClassName?: string;
  tagClassName?: string;
  onSelectAll: () => void;
  onClear: () => void;
  onToggle: (tagId: number) => void;
};

export function TagSelectionField({
  tags,
  selectedTagIds,
  selectedTagIdSet,
  actionsLayout = "inline",
  actionButtonClassName = "h-7 px-2 text-xs",
  labelClassName = "text-sm font-medium",
  tagClassName = "cursor-pointer transition-colors",
  onSelectAll,
  onClear,
  onToggle,
}: TagSelectionFieldProps) {
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
        <label className={labelClassName}>標籤</label>
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
            disabled={tags.length === 0}
            onClick={onSelectAll}
          >
            全選
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={actionButtonClassName}
            disabled={selectedTagIds.length === 0}
            onClick={onClear}
          >
            全不選
          </Button>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap gap-2">
        {tags.length > 0 ? (
          tags.map((tag) => {
            const selected = selectedTagIdSet.has(tag.id);

            return (
              <Badge
                key={tag.id}
                variant={selected ? "default" : "outline"}
                className={tagClassName}
                style={
                  selected
                    ? {
                        backgroundColor: tag.color,
                        borderColor: tag.color,
                        color: "#fff",
                      }
                    : {
                        borderColor: tag.color,
                        color: tag.color,
                      }
                }
                onClick={() => onToggle(tag.id)}
              >
                {tag.name}
              </Badge>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">尚無標籤</p>
        )}
      </div>
    </div>
  );
}
