"use client";

import { ContextMenuPanel } from "@/components/context-menu/panel";
import { useAppContextMenu } from "@/components/context-menu/use-app-context-menu";

export function AppContextMenu() {
  const { menu, items, menuRef, closeMenu } = useAppContextMenu();

  if (!menu) {
    return null;
  }

  return (
    <ContextMenuPanel
      menu={menu}
      items={items}
      menuRef={menuRef}
      onClose={closeMenu}
    />
  );
}
