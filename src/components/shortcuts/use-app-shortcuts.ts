"use client";

import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAssetStore } from "@/stores/asset-store";

type UseAppShortcutsInput = {
  isAssetView: boolean;
  showAssets: () => void;
  showVcc: () => void;
  openCommandPalette: () => void;
  openHelp: () => void;
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

export function useAppShortcuts({
  isAssetView,
  showAssets,
  showVcc,
  openCommandPalette,
  openHelp,
}: UseAppShortcutsInput) {
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
  const getSelectedAsset = useAssetStore((state) => state.getSelectedAsset);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return;
      }

      const key = event.key.toLowerCase();
      const modifier = event.ctrlKey || event.metaKey;
      const editable = isEditableTarget(event.target);
      const dialogOpen = hasOpenDialog();

      if (modifier && key === "/") {
        event.preventDefault();
        openHelp();
        return;
      }

      if (modifier && key === "k") {
        if (!dialogOpen) {
          event.preventDefault();
          openCommandPalette();
        }
        return;
      }

      if (dialogOpen || editable) {
        return;
      }

      if (modifier && key === "1") {
        event.preventDefault();
        showAssets();
        return;
      }

      if (modifier && key === "2") {
        event.preventDefault();
        showVcc();
        return;
      }

      if (modifier && key === "f" && event.shiftKey) {
        event.preventDefault();
        if (isAssetView && selectedAssetId !== null) {
          openRelatedAssetSearch(selectedAssetId);
        }
        return;
      }

      if (modifier && key === "f") {
        event.preventDefault();
        showAssets();
        requestAnimationFrame(focusAssetSearch);
        return;
      }

      if (modifier && key === "n") {
        event.preventDefault();
        showAssets();
        setAddAssetDialogOpen(true);
        return;
      }

      if (modifier && event.shiftKey && key === "m") {
        event.preventDefault();
        setAddModelDialogOpen(true);
        return;
      }

      if (modifier && event.shiftKey && key === "t") {
        event.preventDefault();
        setAddTagDialogOpen(true);
        return;
      }

      if (modifier && key === "e") {
        event.preventDefault();
        if (isAssetView && selectedAssetId !== null) {
          requestAssetEdit(selectedAssetId);
        }
        return;
      }

      if (modifier && key === "o") {
        event.preventDefault();
        const asset = getSelectedAsset();
        if (isAssetView && asset?.file_path.trim()) {
          void invoke("open_file_location", { path: asset.file_path });
        }
        return;
      }

      if (event.key === "Escape" && isAssetView && selectedAssetId !== null) {
        if (isAssetDetailEditing()) {
          return;
        }
        event.preventDefault();
        selectAsset(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    getSelectedAsset,
    isAssetView,
    openCommandPalette,
    openHelp,
    openRelatedAssetSearch,
    requestAssetEdit,
    selectAsset,
    selectedAssetId,
    setAddAssetDialogOpen,
    setAddModelDialogOpen,
    setAddTagDialogOpen,
    showAssets,
    showVcc,
  ]);
}
