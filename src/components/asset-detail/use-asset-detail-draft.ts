"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  createEmptyRelatedLink,
  normalizeRelatedLinks,
  sameRelatedLinks,
  type RelatedLinkDraft,
} from "@/lib/asset-links";
import { sameIds, toggleId } from "@/lib/id-list";
import type { Asset, UpdateAssetInput } from "@/types";

type UseAssetDetailDraftInput = {
  asset: Asset | null;
  saving: boolean;
  editingAssetRequestId: number | null;
  updateAsset: (id: number, updates: UpdateAssetInput) => Promise<void>;
  clearAssetEditRequest: () => void;
};

const toRelatedLinkDrafts = (asset: Asset | null): RelatedLinkDraft[] =>
  (asset?.related_links ?? []).map((link) => ({
    label: link.label,
    url: link.url,
  }));

export function useAssetDetailDraft({
  asset,
  saving,
  editingAssetRequestId,
  updateAsset,
  clearAssetEditRequest,
}: UseAssetDetailDraftInput) {
  const [isEditingAsset, setIsEditingAsset] = useState(false);
  const [editedDisplayName, setEditedDisplayName] = useState("");
  const [editedFilePath, setEditedFilePath] = useState("");
  const [editedBoothUrl, setEditedBoothUrl] = useState("");
  const [editedThumbnailUrl, setEditedThumbnailUrl] = useState("");
  const [editedNote, setEditedNote] = useState("");
  const [editedModelIds, setEditedModelIds] = useState<number[]>([]);
  const [editedTagIds, setEditedTagIds] = useState<number[]>([]);
  const [editedRelatedLinks, setEditedRelatedLinks] = useState<
    RelatedLinkDraft[]
  >([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isFetchingThumbnail, setIsFetchingThumbnail] = useState(false);

  const editedModelIdSet = useMemo(
    () => new Set(editedModelIds),
    [editedModelIds],
  );
  const editedTagIdSet = useMemo(() => new Set(editedTagIds), [editedTagIds]);

  const originalModelIds = useMemo(
    () => asset?.models.map((model) => model.id) ?? [],
    [asset],
  );
  const originalTagIds = useMemo(
    () => asset?.tags.map((tag) => tag.id) ?? [],
    [asset],
  );
  const originalRelatedLinks = useMemo(() => toRelatedLinkDrafts(asset), [asset]);

  const resetDraft = useCallback(
    (current: Asset | null = asset) => {
      if (!current) {
        return;
      }

      setEditedDisplayName(current.display_name || "");
      setEditedFilePath(current.file_path);
      setEditedBoothUrl(current.booth_url || "");
      setEditedThumbnailUrl(current.thumbnail_url || "");
      setEditedNote(current.note || "");
      setEditedModelIds(current.models.map((model) => model.id));
      setEditedTagIds(current.tags.map((tag) => tag.id));
      setEditedRelatedLinks(toRelatedLinkDrafts(current));
      setHasChanges(false);
    },
    [asset],
  );

  const saveDraft = useCallback(async () => {
    if (!asset) {
      return;
    }

    await updateAsset(asset.id, {
      display_name: editedDisplayName || null,
      file_path: editedFilePath,
      booth_url: editedBoothUrl || null,
      thumbnail_url: editedThumbnailUrl || null,
      note: editedNote || null,
      model_ids: editedModelIds,
      tag_ids: editedTagIds,
      related_links: normalizeRelatedLinks(editedRelatedLinks),
    });
    setHasChanges(false);
    setIsEditingAsset(false);
  }, [
    asset,
    editedBoothUrl,
    editedDisplayName,
    editedFilePath,
    editedModelIds,
    editedNote,
    editedRelatedLinks,
    editedTagIds,
    editedThumbnailUrl,
    updateAsset,
  ]);

  useEffect(() => {
    resetDraft(asset);
    setIsEditingAsset(false);
  }, [asset, resetDraft]);

  useEffect(() => {
    if (!asset || editingAssetRequestId !== asset.id) {
      return;
    }

    resetDraft(asset);
    setIsEditingAsset(true);
    clearAssetEditRequest();
  }, [asset, editingAssetRequestId, clearAssetEditRequest, resetDraft]);

  useEffect(() => {
    if (!asset || !isEditingAsset) {
      setHasChanges(false);
      return;
    }

    const displayNameChanged = editedDisplayName !== (asset.display_name || "");
    const filePathChanged = editedFilePath !== asset.file_path;
    const boothUrlChanged = editedBoothUrl !== (asset.booth_url || "");
    const thumbnailUrlChanged =
      editedThumbnailUrl !== (asset.thumbnail_url || "");
    const noteChanged = editedNote !== (asset.note || "");
    const modelsChanged = !sameIds(editedModelIds, originalModelIds);
    const tagsChanged = !sameIds(editedTagIds, originalTagIds);
    const linksChanged = !sameRelatedLinks(
      editedRelatedLinks,
      originalRelatedLinks,
    );

    setHasChanges(
      displayNameChanged ||
        filePathChanged ||
        boothUrlChanged ||
        thumbnailUrlChanged ||
        noteChanged ||
        modelsChanged ||
        tagsChanged ||
        linksChanged,
    );
  }, [
    asset,
    isEditingAsset,
    editedDisplayName,
    editedFilePath,
    editedBoothUrl,
    editedThumbnailUrl,
    editedNote,
    editedModelIds,
    editedTagIds,
    editedRelatedLinks,
    originalModelIds,
    originalTagIds,
    originalRelatedLinks,
  ]);

  useEffect(() => {
    if (!asset || !isEditingAsset) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }

      const dialogOpen = Boolean(
        document.querySelector(
          "[data-slot='dialog-content'], [data-slot='alert-dialog-content']",
        ),
      );
      if (dialogOpen) {
        return;
      }

      const key = event.key.toLowerCase();
      const modifier = event.ctrlKey || event.metaKey;

      if (modifier && key === "s") {
        event.preventDefault();
        if (!hasChanges || saving) {
          return;
        }

        void saveDraft().catch(console.warn);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        resetDraft(asset);
        setIsEditingAsset(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [asset, hasChanges, isEditingAsset, resetDraft, saveDraft, saving]);

  const startEditing = () => {
    resetDraft();
    setIsEditingAsset(true);
  };

  const cancelEditing = () => {
    resetDraft();
    setIsEditingAsset(false);
  };

  const toggleModel = (modelId: number) => {
    setEditedModelIds((current) => toggleId(current, modelId));
  };

  const toggleTag = (tagId: number) => {
    setEditedTagIds((current) => toggleId(current, tagId));
  };

  const updateRelatedLink = (
    index: number,
    field: keyof RelatedLinkDraft,
    value: string,
  ) => {
    setEditedRelatedLinks((current) =>
      current.map((link, currentIndex) =>
        currentIndex === index ? { ...link, [field]: value } : link,
      ),
    );
  };

  const addRelatedLink = () => {
    setEditedRelatedLinks((current) => [...current, createEmptyRelatedLink()]);
  };

  const createFirstRelatedLink = () => {
    setEditedRelatedLinks([createEmptyRelatedLink()]);
  };

  const removeRelatedLink = (index: number) => {
    setEditedRelatedLinks((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const setSelectedPath = (selected: string | string[] | null) => {
    if (typeof selected === "string") {
      setEditedFilePath(selected);
    }
  };

  const fetchThumbnail = async () => {
    if (!editedBoothUrl.trim()) {
      return;
    }

    setIsFetchingThumbnail(true);
    try {
      const thumbnail = await invoke<string | null>("fetch_booth_thumbnail", {
        url: editedBoothUrl.trim(),
      });
      setEditedThumbnailUrl(thumbnail ?? "");
    } finally {
      setIsFetchingThumbnail(false);
    }
  };

  return {
    isEditingAsset,
    editedDisplayName,
    editedFilePath,
    editedBoothUrl,
    editedThumbnailUrl,
    editedNote,
    editedModelIds,
    editedTagIds,
    editedRelatedLinks,
    editedModelIdSet,
    editedTagIdSet,
    hasChanges,
    isFetchingThumbnail,
    setEditedDisplayName,
    setEditedFilePath,
    setEditedBoothUrl,
    setEditedThumbnailUrl,
    setEditedNote,
    setEditedModelIds,
    setEditedTagIds,
    startEditing,
    cancelEditing,
    saveDraft,
    toggleModel,
    toggleTag,
    updateRelatedLink,
    addRelatedLink,
    createFirstRelatedLink,
    removeRelatedLink,
    setSelectedPath,
    fetchThumbnail,
  };
}
