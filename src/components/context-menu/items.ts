import { invokeTauri } from "@/lib/tauri-runtime";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  ClipboardPaste,
  Copy,
  ExternalLink,
  Eye,
  FolderOpen,
  MousePointerClick,
  Pencil,
  Search,
  Scissors,
} from "lucide-react";
import { useAssetStore } from "@/stores/asset-store";
import { readClipboard, writeClipboard } from "./clipboard";
import { canEdit, replaceEditableSelection } from "./targets";
import type { ContextMenuItem, EditableElement, MenuState } from "./types";

type ContextMenuAction = Extract<ContextMenuItem, { type: "item" }>;
type CutItemOptions = {
  editable: EditableElement;
  editableCanEdit: boolean;
  editableHasSelection: boolean;
  menu: MenuState;
};

function createEditableItems(menu: MenuState, editable: EditableElement) {
  const editableCanEdit = canEdit(editable);
  const editableHasSelection = menu.editableSelection.length > 0;

  return [
    createCutItem({ menu, editable, editableCanEdit, editableHasSelection }),
    createCopyEditableItem(menu, editableHasSelection),
    createPasteItem(editable, editableCanEdit),
    createSelectAllItem(editable),
  ];
}

function createCutItem({
  menu,
  editable,
  editableCanEdit,
  editableHasSelection,
}: CutItemOptions): ContextMenuAction {
  return {
    type: "item",
    id: "cut",
    label: "剪下",
    shortcut: "Ctrl+X",
    icon: Scissors,
    disabled: !editableCanEdit || !editableHasSelection,
    onSelect: async () => {
      if (!editableCanEdit || !editableHasSelection) return;
      await writeClipboard(menu.editableSelection);
      replaceEditableSelection(editable, "");
    },
  };
}

function createCopyEditableItem(
  menu: MenuState,
  editableHasSelection: boolean,
): ContextMenuAction {
  return {
    type: "item",
    id: "copy",
    label: "複製",
    shortcut: "Ctrl+C",
    icon: Copy,
    disabled: !editableHasSelection,
    onSelect: () => writeClipboard(menu.editableSelection),
  };
}

function createPasteItem(
  editable: EditableElement,
  editableCanEdit: boolean,
): ContextMenuAction {
  return {
    type: "item",
    id: "paste",
    label: "貼上",
    shortcut: "Ctrl+V",
    icon: ClipboardPaste,
    disabled: !editableCanEdit,
    onSelect: async () => {
      if (!editableCanEdit) return;
      replaceEditableSelection(editable, await readClipboard());
    },
  };
}

function createSelectAllItem(editable: EditableElement): ContextMenuAction {
  return {
    type: "item",
    id: "select-all",
    label: "全選",
    shortcut: "Ctrl+A",
    icon: MousePointerClick,
    disabled: editable.value.length === 0,
    onSelect: () => {
      editable.focus();
      editable.select();
    },
  };
}

function createAssetItems(menu: MenuState): ContextMenuItem[] {
  if (!menu.asset) {
    return [];
  }

  return [
    {
      type: "item",
      id: "view-asset",
      label: "查看素材",
      icon: Eye,
      onSelect: () => useAssetStore.getState().selectAsset(menu.asset?.id ?? null),
    },
    {
      type: "item",
      id: "edit-asset",
      label: "編輯素材",
      icon: Pencil,
      onSelect: () => {
        if (menu.asset) useAssetStore.getState().requestAssetEdit(menu.asset.id);
      },
    },
    {
      type: "item",
      id: "find-related-assets",
      label: "尋找相關素材",
      icon: Search,
      onSelect: () => {
        if (menu.asset) useAssetStore.getState().openRelatedAssetSearch(menu.asset.id);
      },
    },
    ...createCopyAssetNameItems(menu),
    { type: "separator", id: "asset-target-separator" },
  ];
}

function createCopyAssetNameItems(menu: MenuState): ContextMenuItem[] {
  if (!menu.asset?.name) {
    return [];
  }

  return [
    {
      type: "item",
      id: "copy-asset-name",
      label: "複製素材名稱",
      icon: Copy,
      onSelect: () => writeClipboard(menu.asset?.name ?? ""),
    },
  ];
}

function createLinkItems(menu: MenuState): ContextMenuItem[] {
  if (!menu.linkUrl) {
    return [];
  }

  return [
    {
      type: "item",
      id: "open-link",
      label: "開啟連結",
      icon: ExternalLink,
      onSelect: () => openUrl(menu.linkUrl ?? ""),
    },
    {
      type: "item",
      id: "copy-link",
      label: "複製連結",
      icon: Copy,
      onSelect: () => writeClipboard(menu.linkUrl ?? ""),
    },
  ];
}

function createFileItems(menu: MenuState): ContextMenuItem[] {
  if (!menu.filePath) {
    return [];
  }

  return [
    {
      type: "item",
      id: "open-file-location",
      label: "開啟位置",
      icon: FolderOpen,
      onSelect: async () => {
        await invokeTauri("open_file_location", { path: menu.filePath });
      },
    },
    {
      type: "item",
      id: "copy-file-path",
      label: "複製路徑",
      icon: Copy,
      onSelect: () => writeClipboard(menu.filePath ?? ""),
    },
  ];
}

function createSelectionItems(menu: MenuState): ContextMenuItem[] {
  const currentSelection = menu.selectedText;
  const hasTarget = Boolean(menu.linkUrl || menu.filePath);

  return [
    ...(hasTarget && currentSelection.trim()
      ? [{ type: "separator" as const, id: "target-selection-separator" }]
      : []),
    ...(currentSelection.trim()
      ? [
          {
            type: "item" as const,
            id: "copy-selection",
            label: "複製選取文字",
            shortcut: "Ctrl+C",
            icon: Copy,
            onSelect: () => writeClipboard(currentSelection),
          },
        ]
      : []),
  ];
}

export const createContextMenuItems = (menu: MenuState): ContextMenuItem[] => {
  if (menu.editable) {
    return createEditableItems(menu, menu.editable);
  }

  return [
    ...createAssetItems(menu),
    ...createLinkItems(menu),
    ...createFileItems(menu),
    ...createSelectionItems(menu),
  ];
};
