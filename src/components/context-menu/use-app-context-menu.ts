import { useEffect, useMemo, useRef, useState } from "react";
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

export function useAppContextMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();

      const editable = isTextEditable(event.target);
      const editableSelection = getEditableSelection(editable);
      const selectedText = editable ? editableSelection : getSelectedText();
      const asset = editable ? null : getContextAsset(event.target);
      const linkUrl = editable ? null : getContextUrl(event.target, selectedText);
      const filePath =
        editable || linkUrl ? null : getContextFilePath(event.target, selectedText);
      const itemCount =
        (editable ? 4 : 0) +
        (!editable && selectedText.trim() ? 1 : 0) +
        (!editable && linkUrl ? 2 : 0) +
        (!editable && filePath ? 2 : 0) +
        (!editable && asset ? 3 : 0);
      const separatorCount =
        !editable && selectedText.trim() && (linkUrl || filePath) ? 1 : 0;
      const position = clampMenuPosition(
        event.clientX,
        event.clientY,
        Math.max(itemCount, 1),
        separatorCount,
      );

      setMenu({
        ...position,
        editable,
        editableSelection,
        selectedText,
        linkUrl,
        filePath,
        asset,
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(null);
      }
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
  }, []);

  const items = useMemo(() => (menu ? createContextMenuItems(menu) : []), [menu]);

  return {
    menu,
    items,
    menuRef,
    closeMenu: () => setMenu(null),
  };
}
