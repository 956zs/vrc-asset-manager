import { Check, Pencil, Plus, type LucideIcon } from "lucide-react";
import { SidebarCountBadge } from "@/components/sidebar-option-row";
import { DisclosureChevron } from "@/components/ui/disclosure";
import { IconButton } from "@/components/ui/icon-button";
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

type SidebarSectionToggleButtonProps = Pick<
  SidebarFilterSectionHeaderProps,
  "icon" | "label" | "selectedCount" | "open" | "onToggleOpen"
>;

function SidebarSectionToggleButton({
  icon: Icon,
  label,
  selectedCount,
  open,
  onToggleOpen,
}: SidebarSectionToggleButtonProps) {
  return (
    <button
      type="button"
      className="flex min-h-9 w-full min-w-0 items-center gap-2 rounded-md px-1 text-left text-sm font-medium text-sidebar-foreground transition-colors outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring/45"
      aria-expanded={open}
      onClick={onToggleOpen}
    >
      <DisclosureChevron expanded={open} className="shrink-0" />
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
      {selectedCount > 0 && <SelectedCountBadge selectedCount={selectedCount} />}
    </button>
  );
}

function SelectedCountBadge({ selectedCount }: { selectedCount: number }) {
  return <SidebarCountBadge>已選 {selectedCount}</SidebarCountBadge>;
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
    <IconButton
      label={editButtonLabel}
      className={cn(
        "!size-7 text-muted-foreground hover:text-sidebar-foreground",
        editing && "bg-sidebar-accent text-sidebar-foreground",
      )}
      icon={<Icon className="h-3.5 w-3.5" />}
      onClick={onToggleEditing}
    />
  );
}

function AddFilterButton({
  addLabel,
  onAdd,
}: Pick<SidebarFilterSectionHeaderProps, "addLabel" | "onAdd">) {
  return (
    <IconButton
      label={addLabel}
      className="!size-7 text-muted-foreground hover:text-sidebar-foreground"
      icon={<Plus className="h-3 w-3" />}
      onClick={onAdd}
    />
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
      <SidebarSectionToggleButton {...props} />
      <HeaderActions {...props} />
    </div>
  );
}

export { SidebarSectionToggleButton };
