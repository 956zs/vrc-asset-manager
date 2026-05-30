import type { RefObject } from "react";
import { cn } from "@/lib/utils";
import type { ContextMenuItem, MenuState } from "./types";

type ContextMenuPanelProps = {
  menu: MenuState;
  items: ContextMenuItem[];
  menuRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
};

export function ContextMenuPanel({
  menu,
  items,
  menuRef,
  onClose,
}: ContextMenuPanelProps) {
  const hasActions = items.some((item) => item.type === "item");

  return (
    <div
      ref={menuRef}
      className="fixed z-[1000] w-56 rounded-md border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
      style={{ left: menu.x, top: menu.y }}
      role="menu"
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {hasActions ? (
        items.map((item) => {
          if (item.type === "separator") {
            return <div key={item.id} className="my-1 h-px bg-border" role="separator" />;
          }

          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={cn(
                "flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-sm outline-none transition-colors",
                "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
                "disabled:pointer-events-none disabled:opacity-45",
              )}
              onClick={() => {
                onClose();
                void Promise.resolve(item.onSelect()).catch(console.warn);
              }}
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.shortcut && (
                <span className="text-[11px] text-muted-foreground">
                  {item.shortcut}
                </span>
              )}
            </button>
          );
        })
      ) : (
        <div className="px-2 py-1.5 text-sm text-muted-foreground">沒有可用動作</div>
      )}
    </div>
  );
}
