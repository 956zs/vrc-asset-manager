import { invoke } from "@tauri-apps/api/core";
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
import type { ContextMenuItem, MenuState } from "./types";

export const createContextMenuItems = (menu: MenuState): ContextMenuItem[] => {
  const editable = menu.editable;
  const editableCanEdit = canEdit(editable);
  const editableHasSelection = menu.editableSelection.length > 0;
  const currentSelection = menu.selectedText;

  if (editable) {
    return [
      {
        type: "item",
        id: "cut",
        label: "剪下",
        shortcut: "Ctrl+X",
        icon: Scissors,
        disabled: !editableCanEdit || !editableHasSelection,
        onSelect: async () => {
          if (!editableCanEdit || !editableHasSelection) {
            return;
          }
          await writeClipboard(menu.editableSelection);
          replaceEditableSelection(editable, "");
        },
      },
      {
        type: "item",
        id: "copy",
        label: "複製",
        shortcut: "Ctrl+C",
        icon: Copy,
        disabled: !editableHasSelection,
        onSelect: () => writeClipboard(menu.editableSelection),
      },
      {
        type: "item",
        id: "paste",
        label: "貼上",
        shortcut: "Ctrl+V",
        icon: ClipboardPaste,
        disabled: !editableCanEdit,
        onSelect: async () => {
          if (!editableCanEdit) {
            return;
          }
          replaceEditableSelection(editable, await readClipboard());
        },
      },
      {
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
      },
    ];
  }

  return [
    ...(menu.asset
      ? [
          {
            type: "item" as const,
            id: "view-asset",
            label: "查看素材",
            icon: Eye,
            onSelect: () => {
              useAssetStore.getState().selectAsset(menu.asset?.id ?? null);
            },
          },
          {
            type: "item" as const,
            id: "edit-asset",
            label: "編輯素材",
            icon: Pencil,
            onSelect: () => {
              if (menu.asset) {
                useAssetStore.getState().requestAssetEdit(menu.asset.id);
              }
            },
          },
          {
            type: "item" as const,
            id: "find-related-assets",
            label: "尋找相關素材",
            icon: Search,
            onSelect: () => {
              if (menu.asset) {
                useAssetStore.getState().openRelatedAssetSearch(menu.asset.id);
              }
            },
          },
          ...(menu.asset.name
            ? [
                {
                  type: "item" as const,
                  id: "copy-asset-name",
                  label: "複製素材名稱",
                  icon: Copy,
                  onSelect: () => writeClipboard(menu.asset?.name ?? ""),
                },
              ]
            : []),
          { type: "separator" as const, id: "asset-target-separator" },
        ]
      : []),
    ...(menu.linkUrl
      ? [
          {
            type: "item" as const,
            id: "open-link",
            label: "開啟連結",
            icon: ExternalLink,
            onSelect: () => openUrl(menu.linkUrl ?? ""),
          },
          {
            type: "item" as const,
            id: "copy-link",
            label: "複製連結",
            icon: Copy,
            onSelect: () => writeClipboard(menu.linkUrl ?? ""),
          },
        ]
      : []),
    ...(menu.filePath
      ? [
          {
            type: "item" as const,
            id: "open-file-location",
            label: "開啟位置",
            icon: FolderOpen,
            onSelect: async () => {
              await invoke("open_file_location", { path: menu.filePath });
            },
          },
          {
            type: "item" as const,
            id: "copy-file-path",
            label: "複製路徑",
            icon: Copy,
            onSelect: () => writeClipboard(menu.filePath ?? ""),
          },
        ]
      : []),
    ...((menu.linkUrl || menu.filePath) && currentSelection.trim()
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
};
