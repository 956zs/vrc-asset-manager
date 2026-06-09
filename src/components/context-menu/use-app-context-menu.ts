import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createContextMenuItems } from "./items";
import {
  clampMenuPosition,
  getContextFilePath,
  getContextAsset,
  getContextUrl,
  getEditableSelection,
  getSelectedText,
  isTextEditable,
} from "./targets";
import type { MenuState } from "./types";

type MenuContent = Omit<MenuState, "x" | "y">;
type MenuMetrics = {
  itemCount: number;
  separatorCount: number;
};
type SetMenu = (menu: MenuState | null) => void;

function getMenuContent(event: MouseEvent): MenuContent {
  const editable = isTextEditable(event.target);
  const editableSelection = getEditableSelection(editable);
  const selectedText = editable ? editableSelection : getSelectedText();
  const asset = editable ? null : getContextAsset(event.target);
  const linkUrl = editable ? null : getContextUrl(event.target, selectedText);
  const filePath =
    editable || linkUrl ? null : getContextFilePath(event.target, selectedText);

  return {
    editable,
    editableSelection,
    selectedText,
    linkUrl,
    filePath,
    asset,
  };
}

function getMenuMetrics({
  editable,
  selectedText,
  linkUrl,
  filePath,
  asset,
}: MenuContent): MenuMetrics {
  return {
    itemCount:
      (editable ? 4 : 0) +
      (!editable && selectedText.trim() ? 1 : 0) +
      (!editable && linkUrl ? 2 : 0) +
      (!editable && filePath ? 2 : 0) +
      (!editable && asset ? 3 : 0),
    separatorCount: !editable && selectedText.trim() && (linkUrl || filePath) ? 1 : 0,
  };
}

function createMenuStateFromEvent(event: MouseEvent): MenuState {
  const content = getMenuContent(event);
  const metrics = getMenuMetrics(content);
  const position = clampMenuPosition({
    x: event.clientX,
    y: event.clientY,
    itemCount: Math.max(metrics.itemCount, 1),
    separatorCount: metrics.separatorCount,
  });

  return { ...position, ...content };
}

function useContextMenuWindowEvents(
  setMenu: SetMenu,
  menuRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      setMenu(createMenuStateFromEvent(event));
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(null);
    };
    const closeMenu = () => setMenu(null);

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [menuRef, setMenu]);
}

export function useAppContextMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const items = useMemo(() => (menu ? createContextMenuItems(menu) : []), [menu]);

  useContextMenuWindowEvents(setMenu, menuRef);

  return {
    menu,
    items,
    menuRef,
    closeMenu: () => setMenu(null),
  };
}
