import { Check, ChevronDown, Pencil, Plus, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SidebarFilterSectionHeaderProps = {
  icon: LucideIcon;
  label: string;
  selectedCount: number;
  open: boolean;
  editing: boolean;
  editLabel: string;
  doneLabel: string;
  addLabel: string;
  onToggleOpen: () => void;
  onToggleEditing: () => void;
  onAdd: () => void;
};

function SectionToggleButton({
  icon: Icon,
  label,
  selectedCount,
  open,
  onToggleOpen,
}: Pick<
  SidebarFilterSectionHeaderProps,
  "icon" | "label" | "selectedCount" | "open" | "onToggleOpen"
>) {
  return (
    <button
      type="button"
      className="flex h-8 min-w-0 items-center gap-2 rounded-md px-1 text-left text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
      aria-expanded={open}
      onClick={onToggleOpen}
    >
      <ChevronDown
        className={cn("h-4 w-4 shrink-0 transition-transform", !open && "-rotate-90")}
      />
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
      {selectedCount > 0 && <SelectedCountBadge selectedCount={selectedCount} />}
    </button>
  );
}

function SelectedCountBadge({ selectedCount }: { selectedCount: number }) {
  return (
    <span className="shrink-0 rounded-full bg-sidebar-accent px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
      已選 {selectedCount}
    </span>
  );
}

function EditModeButton({
  editing,
  editButtonLabel,
  onToggleEditing,
}: {
  editing: boolean;
  editButtonLabel: string;
  onToggleEditing: () => void;
}) {
  const Icon = editing ? Check : Pencil;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "!size-7 text-muted-foreground hover:text-sidebar-foreground",
        editing && "bg-sidebar-accent text-sidebar-foreground",
      )}
      title={editButtonLabel}
      aria-label={editButtonLabel}
      onClick={onToggleEditing}
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
}

function AddFilterButton({
  addLabel,
  onAdd,
}: Pick<SidebarFilterSectionHeaderProps, "addLabel" | "onAdd">) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="!size-7 text-muted-foreground hover:text-sidebar-foreground"
      title={addLabel}
      aria-label={addLabel}
      onClick={onAdd}
    >
      <Plus className="h-3 w-3" />
    </Button>
  );
}

function HeaderActions({
  editing,
  editLabel,
  doneLabel,
  addLabel,
  onToggleEditing,
  onAdd,
}: Pick<
  SidebarFilterSectionHeaderProps,
  "editing" | "editLabel" | "doneLabel" | "addLabel" | "onToggleEditing" | "onAdd"
>) {
  const editButtonLabel = editing ? doneLabel : editLabel;

  return (
    <div className="flex shrink-0 items-center gap-1">
      <EditModeButton
        editing={editing}
        editButtonLabel={editButtonLabel}
        onToggleEditing={onToggleEditing}
      />
      {editing && <AddFilterButton addLabel={addLabel} onAdd={onAdd} />}
    </div>
  );
}

export function SidebarFilterSectionHeader(props: SidebarFilterSectionHeaderProps) {
  return (
    <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <SectionToggleButton {...props} />
      <HeaderActions {...props} />
    </div>
  );
}
