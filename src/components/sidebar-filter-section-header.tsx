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

export function SidebarFilterSectionHeader({
  icon: Icon,
  label,
  selectedCount,
  open,
  editing,
  editLabel,
  doneLabel,
  addLabel,
  onToggleOpen,
  onToggleEditing,
  onAdd,
}: SidebarFilterSectionHeaderProps) {
  const editButtonLabel = editing ? doneLabel : editLabel;

  return (
    <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <button
        type="button"
        className="flex h-8 min-w-0 items-center gap-2 rounded-md px-1 text-left text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
        aria-expanded={open}
        onClick={onToggleOpen}
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            !open && "-rotate-90",
          )}
        />
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
        {selectedCount > 0 && (
          <span className="shrink-0 rounded-full bg-sidebar-accent px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
            已選 {selectedCount}
          </span>
        )}
      </button>

      <div className="flex shrink-0 items-center gap-1">
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
          {editing ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Pencil className="h-3.5 w-3.5" />
          )}
        </Button>
        {editing && (
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
        )}
      </div>
    </div>
  );
}
