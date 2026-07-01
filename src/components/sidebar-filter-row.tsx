import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

type SidebarDropPlacement = "before" | "after";

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

function getDataAttributes(kind: SidebarFilterRowKind, id: number) {
  return kind === "model" ? { "data-model-id": id } : { "data-tag-id": id };
}

function getRowClassName(props: SidebarFilterRowProps) {
  const isDropTarget = props.dropTarget?.id === props.id && !props.dragging;

  return cn(
    "relative grid min-h-9 w-full cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 transition-colors outline-none",
    props.swatchColor ? "grid-cols-[auto_auto_minmax(0,1fr)]" : "grid-cols-[auto_minmax(0,1fr)]",
    "hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring/45",
    props.checked && "bg-sidebar-accent",
    props.editing && getEditingGridClassName(Boolean(props.swatchColor)),
    props.dragging && "scale-[0.98] opacity-40",
    isDropTarget && "bg-sidebar-accent/80",
    isDropTarget && getDropIndicatorClassName(props.dropTarget?.placement),
  );
}

function getEditingGridClassName(hasSwatch: boolean) {
  return hasSwatch
    ? "grid-cols-[auto_auto_auto_minmax(0,1fr)_auto]"
    : "grid-cols-[auto_auto_minmax(0,1fr)_auto]";
}

function getDropIndicatorClassName(placement: SidebarDropPlacement | undefined) {
  if (placement === "before") {
    return "before:absolute before:top-0 before:left-2 before:right-2 before:h-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary before:content-['']";
  }
  if (placement === "after") {
    return "after:absolute after:right-2 after:bottom-0 after:left-2 after:h-0.5 after:translate-y-1/2 after:rounded-full after:bg-primary after:content-['']";
  }
  return null;
}

function DragHandle({
  id,
  onDragStart,
}: Pick<SidebarFilterRowProps, "id" | "onDragStart">) {
  return (
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
  );
}

function Swatch({ color }: { color?: string }) {
  if (!color) {
    return null;
  }

  return <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}

function FilterLabel({ label }: Pick<SidebarFilterRowProps, "label">) {
  return (
    <span className="min-w-0 truncate text-sm text-sidebar-foreground">
      {label}
    </span>
  );
}

function RowActionButton({
  label,
  destructive,
  children,
  onClick,
}: {
  label: string;
  destructive?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <IconButton
      label={label}
      size="icon-sm"
      className="!size-7"
      icon={<span className={destructive ? "text-destructive" : undefined}>{children}</span>}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    />
  );
}

function RowActions({
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
}: Pick<SidebarFilterRowProps, "editLabel" | "deleteLabel" | "onEdit" | "onDelete">) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <RowActionButton label={editLabel} onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" />
      </RowActionButton>
      <RowActionButton label={deleteLabel} destructive onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
      </RowActionButton>
    </div>
  );
}

export function SidebarFilterRow(props: SidebarFilterRowProps) {
  return (
    <div
      {...getDataAttributes(props.kind, props.id)}
      className={getRowClassName(props)}
      onClick={props.onToggle}
    >
      {props.editing && <DragHandle id={props.id} onDragStart={props.onDragStart} />}
      <Checkbox
        checked={props.checked}
        onClick={(event) => event.stopPropagation()}
        onCheckedChange={props.onToggle}
      />
      <Swatch color={props.swatchColor} />
      <FilterLabel label={props.label} />
      {props.editing && <RowActions {...props} />}
    </div>
  );
}
