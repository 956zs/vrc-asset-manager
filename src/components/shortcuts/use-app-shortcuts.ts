"use client";

import { useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { selectSelectedAsset, useAssetStore } from "@/stores/asset-store";
import type { Asset } from "@/types";

type UseAppShortcutsInput = {
  isAssetView: boolean;
  showAssets: () => void;
  showVcc: () => void;
  openCommandPalette: () => void;
  openHelp: () => void;
};

type AppShortcutActions = UseAppShortcutsInput & {
  selectedAsset: Asset | null;
  selectedAssetId: number | null;
  selectAsset: (assetId: number | null) => void;
  setAddAssetDialogOpen: (open: boolean) => void;
  setAddModelDialogOpen: (open: boolean) => void;
  setAddTagDialogOpen: (open: boolean) => void;
  requestAssetEdit: (assetId: number) => void;
  openRelatedAssetSearch: (assetId: number) => void;
};

type ShortcutContext = {
  dialogOpen: boolean;
  editable: boolean;
  key: string;
  modifier: boolean;
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
};

const hasOpenDialog = () =>
  Boolean(
    document.querySelector(
      "[data-slot='dialog-content'], [data-slot='alert-dialog-content']",
    ),
  );

const focusAssetSearch = () => {
  const input = document.querySelector<HTMLInputElement>(
    "[data-shortcut='asset-search']",
  );
  input?.focus();
  input?.select();
};

const isAssetDetailEditing = () =>
  Boolean(document.querySelector("[data-asset-detail-editing='true']"));

function useShortcutActions({
  isAssetView,
  showAssets,
  showVcc,
  openCommandPalette,
  openHelp,
}: UseAppShortcutsInput): AppShortcutActions {
  const selectedAssetId = useAssetStore((state) => state.selectedAssetId);
  const setAddAssetDialogOpen = useAssetStore(
    (state) => state.setAddAssetDialogOpen,
  );
  const setAddModelDialogOpen = useAssetStore(
    (state) => state.setAddModelDialogOpen,
  );
  const setAddTagDialogOpen = useAssetStore((state) => state.setAddTagDialogOpen);
  const selectAsset = useAssetStore((state) => state.selectAsset);
  const requestAssetEdit = useAssetStore((state) => state.requestAssetEdit);
  const openRelatedAssetSearch = useAssetStore(
    (state) => state.openRelatedAssetSearch,
  );
  const selectedAsset = useAssetStore(selectSelectedAsset);

  return useMemo(
    () => ({
      isAssetView, showAssets, showVcc, openCommandPalette, openHelp,
      selectedAsset, selectedAssetId, selectAsset, setAddAssetDialogOpen,
      setAddModelDialogOpen, setAddTagDialogOpen, requestAssetEdit,
      openRelatedAssetSearch,
    }),
    [
      isAssetView, showAssets, showVcc, openCommandPalette, openHelp,
      selectedAsset, selectedAssetId, selectAsset, setAddAssetDialogOpen,
      setAddModelDialogOpen, setAddTagDialogOpen, requestAssetEdit,
      openRelatedAssetSearch,
    ],
  );
}

function getShortcutContext(event: KeyboardEvent): ShortcutContext {
  return {
    dialogOpen: hasOpenDialog(),
    editable: isEditableTarget(event.target),
    key: event.key.toLowerCase(),
    modifier: event.ctrlKey || event.metaKey,
  };
}

function handleAlwaysAvailableShortcuts(
  event: KeyboardEvent,
  context: ShortcutContext,
  actions: AppShortcutActions,
) {
  if (context.modifier && context.key === "/") {
    event.preventDefault();
    actions.openHelp();
    return true;
  }
  if (context.modifier && context.key === "k") {
    if (!context.dialogOpen) {
      event.preventDefault();
      actions.openCommandPalette();
    }
    return true;
  }
  return false;
}

function handleViewShortcuts(
  event: KeyboardEvent,
  context: ShortcutContext,
  actions: AppShortcutActions,
) {
  if (context.modifier && context.key === "1") {
    event.preventDefault();
    actions.showAssets();
    return true;
  }
  if (context.modifier && context.key === "2") {
    event.preventDefault();
    actions.showVcc();
    return true;
  }
  return false;
}

function handleAssetSearchShortcuts(
  event: KeyboardEvent,
  context: ShortcutContext,
  actions: AppShortcutActions,
) {
  if (context.modifier && context.key === "f" && event.shiftKey) {
    event.preventDefault();
    if (actions.isAssetView && actions.selectedAssetId !== null) {
      actions.openRelatedAssetSearch(actions.selectedAssetId);
    }
    return true;
  }
  if (context.modifier && context.key === "f") {
    event.preventDefault();
    actions.showAssets();
    requestAnimationFrame(focusAssetSearch);
    return true;
  }
  return false;
}

function handleCreateShortcuts(
  event: KeyboardEvent,
  context: ShortcutContext,
  actions: AppShortcutActions,
) {
  if (context.modifier && context.key === "n") {
    event.preventDefault();
    actions.showAssets();
    actions.setAddAssetDialogOpen(true);
    return true;
  }
  if (context.modifier && event.shiftKey && context.key === "m") {
    event.preventDefault();
    actions.setAddModelDialogOpen(true);
    return true;
  }
  if (context.modifier && event.shiftKey && context.key === "t") {
    event.preventDefault();
    actions.setAddTagDialogOpen(true);
    return true;
  }
  return false;
}

function handleSelectedAssetShortcuts(
  event: KeyboardEvent,
  context: ShortcutContext,
  actions: AppShortcutActions,
) {
  if (context.modifier && context.key === "e") {
    event.preventDefault();
    if (actions.isAssetView && actions.selectedAssetId !== null) {
      actions.requestAssetEdit(actions.selectedAssetId);
    }
    return true;
  }
  if (context.modifier && context.key === "o") {
    event.preventDefault();
    if (actions.isAssetView && actions.selectedAsset?.file_path.trim()) {
      void invoke("open_file_location", { path: actions.selectedAsset.file_path });
    }
    return true;
  }
  return false;
}

function handleEscapeShortcut(event: KeyboardEvent, actions: AppShortcutActions) {
  if (event.key !== "Escape" || !actions.isAssetView || actions.selectedAssetId === null) {
    return false;
  }
  if (isAssetDetailEditing()) {
    return true;
  }
  event.preventDefault();
  actions.selectAsset(null);
  return true;
}

function handleAppShortcut(event: KeyboardEvent, actions: AppShortcutActions) {
  if (event.defaultPrevented || event.repeat) {
    return;
  }

  const context = getShortcutContext(event);
  if (handleAlwaysAvailableShortcuts(event, context, actions)) return;
  if (context.dialogOpen || context.editable) return;
  if (handleViewShortcuts(event, context, actions)) return;
  if (handleAssetSearchShortcuts(event, context, actions)) return;
  if (handleCreateShortcuts(event, context, actions)) return;
  if (handleSelectedAssetShortcuts(event, context, actions)) return;
  handleEscapeShortcut(event, actions);
}

export function useAppShortcuts(input: UseAppShortcutsInput) {
  const actions = useShortcutActions(input);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => handleAppShortcut(event, actions);

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions]);
}
