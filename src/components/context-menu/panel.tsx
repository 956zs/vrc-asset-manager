import type { MouseEvent, RefObject } from "react";
import {
  FloatingMenuEmpty,
  FloatingMenuItem,
  FloatingMenuSeparator,
} from "@/components/ui/floating-menu";
import { FloatingSurface } from "@/components/ui/floating-surface";
import type { ContextMenuItem, MenuState } from "./types";

type ContextMenuPanelProps = {
  menu: MenuState;
  items: ContextMenuItem[];
  menuRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
};

function ContextMenuSeparator({ id }: { id: string }) {
  return <FloatingMenuSeparator key={id} />;
}

function ContextMenuAction({
  item,
  onClose,
}: {
  item: Extract<ContextMenuItem, { type: "item" }>;
  onClose: () => void;
}) {
  const Icon = item.icon;

  return (
    <FloatingMenuItem
      key={item.id}
      role="menuitem"
      disabled={item.disabled}
      leading={<Icon className="h-4 w-4 text-muted-foreground" />}
      trailing={
        item.shortcut ? (
          <span className="text-[11px] text-muted-foreground">{item.shortcut}</span>
        ) : null
      }
      onClick={() => {
        onClose();
        void Promise.resolve(item.onSelect()).catch(console.warn);
      }}
    >
      {item.label}
    </FloatingMenuItem>
  );
}

function ContextMenuRow({
  item,
  onClose,
}: {
  item: ContextMenuItem;
  onClose: () => void;
}) {
  if (item.type === "separator") {
    return <ContextMenuSeparator id={item.id} />;
  }

  return <ContextMenuAction item={item} onClose={onClose} />;
}

function EmptyContextMenu() {
  return <FloatingMenuEmpty>沒有可用動作</FloatingMenuEmpty>;
}

function stopNestedContextMenu(event: MouseEvent<HTMLDivElement>) {
  event.preventDefault();
  event.stopPropagation();
}

export function ContextMenuPanel({
  menu,
  items,
  menuRef,
  onClose,
}: ContextMenuPanelProps) {
  const hasActions = items.some((item) => item.type === "item");

  return (
    <FloatingSurface
      ref={menuRef}
      padding="panel"
      className="fixed z-[1000] w-56"
      style={{ left: menu.x, top: menu.y }}
      role="menu"
      onContextMenu={stopNestedContextMenu}
    >
      {hasActions ? (
        items.map((item) => (
          <ContextMenuRow key={item.id} item={item} onClose={onClose} />
        ))
      ) : (
        <EmptyContextMenu />
      )}
    </FloatingSurface>
  );
}
