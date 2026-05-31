"use client";

import { type PointerEvent as ReactPointerEvent } from "react";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type SidebarDropPlacement = "before" | "after";

export type SidebarDropTarget = {
  id: number;
  placement: SidebarDropPlacement;
};

type SidebarFilterRowKind = "model" | "tag";

type SidebarFilterRowProps = {
  kind: SidebarFilterRowKind;
  id: number;
  label: string;
  checked: boolean;
  editing: boolean;
  dragging: boolean;
  dropTarget: SidebarDropTarget | null;
  swatchColor?: string;
  editLabel: string;
  deleteLabel: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (
    event: ReactPointerEvent<HTMLButtonElement>,
    id: number,
  ) => void;
};

export function SidebarFilterRow({
  kind,
  id,
  label,
  checked,
  editing,
  dragging,
  dropTarget,
  swatchColor,
  editLabel,
  deleteLabel,
  onToggle,
  onEdit,
  onDelete,
  onDragStart,
}: SidebarFilterRowProps) {
  const dataAttributes =
    kind === "model" ? { "data-model-id": id } : { "data-tag-id": id };

  return (
    <div
      {...dataAttributes}
      className={cn(
        "relative grid cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
        swatchColor
          ? "grid-cols-[auto_auto_minmax(0,1fr)]"
          : "grid-cols-[auto_minmax(0,1fr)]",
        "hover:bg-sidebar-accent",
        checked && "bg-sidebar-accent",
        editing &&
          (swatchColor
            ? "grid-cols-[auto_auto_auto_minmax(0,1fr)_auto]"
            : "grid-cols-[auto_auto_minmax(0,1fr)_auto]"),
        dragging && "scale-[0.98] opacity-40",
        dropTarget?.id === id && !dragging && "bg-sidebar-accent/80",
        dropTarget?.id === id &&
          dropTarget.placement === "before" &&
          "before:absolute before:top-0 before:left-2 before:right-2 before:h-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary before:content-['']",
        dropTarget?.id === id &&
          dropTarget.placement === "after" &&
          "after:absolute after:right-2 after:bottom-0 after:left-2 after:h-0.5 after:translate-y-1/2 after:rounded-full after:bg-primary after:content-['']",
      )}
    >
      {editing && (
        <button
          type="button"
          className="flex !size-6 !cursor-grab items-center justify-center rounded text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground active:!cursor-grabbing"
          title="拖曳排序"
          aria-label="拖曳排序"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => onDragStart(event, id)}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      {swatchColor && (
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: swatchColor }}
        />
      )}
      <button
        type="button"
        className="min-w-0 flex-1 truncate text-left text-sm text-sidebar-foreground"
        onClick={onToggle}
      >
        {label}
      </button>
      {editing && (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="!size-7"
            title={editLabel}
            aria-label={editLabel}
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="!size-7"
            title={deleteLabel}
            aria-label={deleteLabel}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      )}
    </div>
  );
}
