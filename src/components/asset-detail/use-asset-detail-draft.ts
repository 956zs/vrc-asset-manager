"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  addEmptyRelatedLink,
  createEmptyRelatedLink,
  normalizeRelatedLinks,
  removeRelatedLink,
  sameRelatedLinks,
  type RelatedLinkDraft,
  updateRelatedLink,
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

type AssetDetailDraftValues = {
  displayName: string;
  filePath: string;
  boothUrl: string;
  thumbnailUrl: string;
  note: string;
  modelIds: number[];
  tagIds: number[];
  relatedLinks: RelatedLinkDraft[];
};

type AssetDetailDraftSetters = {
  setDraftValues: (value: AssetDetailDraftValues) => void;
  setEditedDisplayName: (value: string) => void;
  setEditedFilePath: (value: string) => void;
  setEditedBoothUrl: (value: string) => void;
  setEditedThumbnailUrl: (value: string) => void;
  setEditedNote: (value: string) => void;
  setEditedModelIds: (value: number[] | ((current: number[]) => number[])) => void;
  setEditedTagIds: (value: number[] | ((current: number[]) => number[])) => void;
  setEditedRelatedLinks: (
    value: RelatedLinkDraft[] | ((current: RelatedLinkDraft[]) => RelatedLinkDraft[]),
  ) => void;
};

type AssetDetailDraftState = AssetDetailDraftValues & AssetDetailDraftSetters;

type DraftResetEffectsOptions = {
  asset: Asset | null;
  editingAssetRequestId: number | null;
  resetDraft: (asset?: Asset | null) => void;
  setIsEditingAsset: (editing: boolean) => void;
  clearAssetEditRequest: () => void;
};

type DraftChangeTrackingOptions = {
  asset: Asset | null;
  isEditingAsset: boolean;
  draftValues: AssetDetailDraftValues;
  originalDraftValues: AssetDetailDraftValues;
  setHasChanges: (hasChanges: boolean) => void;
};

type DraftShortcutOptions = {
  asset: Asset | null;
  hasChanges: boolean;
  isEditingAsset: boolean;
  resetDraft: (asset?: Asset | null) => void;
  saveDraft: () => Promise<void>;
  saving: boolean;
  setIsEditingAsset: (editing: boolean) => void;
};

type DraftEditingActionOptions = Pick<
  AssetDetailDraftSetters,
  "setEditedModelIds" | "setEditedTagIds" | "setEditedFilePath"
> & {
  resetDraft: (asset?: Asset | null) => void;
  setIsEditingAsset: (editing: boolean) => void;
};

type DraftSaveOptions = {
  asset: Asset | null;
  draftValues: AssetDetailDraftValues;
  updateAsset: (id: number, updates: UpdateAssetInput) => Promise<void>;
  setHasChanges: (hasChanges: boolean) => void;
  setIsEditingAsset: (editing: boolean) => void;
};

type AssetDraftDerivedState = {
  draftValues: AssetDetailDraftValues;
  editedModelIdSet: Set<number>;
  editedTagIdSet: Set<number>;
  originalDraftValues: AssetDetailDraftValues;
};

type AssetDraftLifecycleOptions = Pick<
  UseAssetDetailDraftInput,
  "asset" | "saving" | "editingAssetRequestId" | "updateAsset" | "clearAssetEditRequest"
> & {
  draft: AssetDetailDraftState;
  draftValues: AssetDetailDraftValues;
  hasChanges: boolean;
  isEditingAsset: boolean;
  originalDraftValues: AssetDetailDraftValues;
  setHasChanges: (hasChanges: boolean) => void;
  setIsEditingAsset: (editing: boolean) => void;
};

type AssetDraftResultOptions = {
  draft: AssetDetailDraftState;
  derived: AssetDraftDerivedState;
  editingActions: ReturnType<typeof createDraftEditingActions>;
  fetchThumbnail: () => Promise<void>;
  hasChanges: boolean;
  isEditingAsset: boolean;
  isFetchingThumbnail: boolean;
  relatedLinkActions: ReturnType<typeof createRelatedLinkActions>;
  saveDraft: () => Promise<void>;
};

const toRelatedLinkDrafts = (asset: Asset | null): RelatedLinkDraft[] =>
  (asset?.related_links ?? []).map((link) => ({
    label: link.label,
    url: link.url,
  }));

const emptyAssetDraftValues: AssetDetailDraftValues = {
  displayName: "",
  filePath: "",
  boothUrl: "",
  thumbnailUrl: "",
  note: "",
  modelIds: [],
  tagIds: [],
  relatedLinks: [],
};

function toAssetDraftValues(asset: Asset): AssetDetailDraftValues {
  return {
    displayName: asset.display_name || "",
    filePath: asset.file_path,
    boothUrl: asset.booth_url || "",
    thumbnailUrl: asset.thumbnail_url || "",
    note: asset.note || "",
    modelIds: asset.models.map((model) => model.id),
    tagIds: asset.tags.map((tag) => tag.id),
    relatedLinks: toRelatedLinkDrafts(asset),
  };
}

function hasAssetDraftChanges(
  draft: AssetDetailDraftValues,
  original: AssetDetailDraftValues,
) {
  return (
    draft.displayName !== original.displayName ||
    draft.filePath !== original.filePath ||
    draft.boothUrl !== original.boothUrl ||
    draft.thumbnailUrl !== original.thumbnailUrl ||
    draft.note !== original.note ||
    !sameIds(draft.modelIds, original.modelIds) ||
    !sameIds(draft.tagIds, original.tagIds) ||
    !sameRelatedLinks(draft.relatedLinks, original.relatedLinks)
  );
}

function toAssetUpdateInput(draft: AssetDetailDraftValues): UpdateAssetInput {
  return {
    display_name: draft.displayName || null,
    file_path: draft.filePath,
    booth_url: draft.boothUrl || null,
    thumbnail_url: draft.thumbnailUrl || null,
    note: draft.note || null,
    model_ids: draft.modelIds,
    tag_ids: draft.tagIds,
    related_links: normalizeRelatedLinks(draft.relatedLinks),
  };
}

function dialogBlocksAssetDetailShortcut() {
  return Boolean(
    document.querySelector(
      "[data-slot='dialog-content'], [data-slot='alert-dialog-content']",
    ),
  );
}

function useAssetDraftState(): AssetDetailDraftState {
  const [draft, setDraftValues] = useState<AssetDetailDraftValues>(
    emptyAssetDraftValues,
  );
  const setField = <TKey extends keyof AssetDetailDraftValues>(
    key: TKey,
    value: AssetDetailDraftValues[TKey],
  ) => setDraftValues((current) => ({ ...current, [key]: value }));
  const updateIds = (
    key: "modelIds" | "tagIds",
    value: number[] | ((current: number[]) => number[]),
  ) =>
    setDraftValues((current) => ({
      ...current,
      [key]: typeof value === "function" ? value(current[key]) : value,
    }));
  const updateRelatedLinks = (
    value: RelatedLinkDraft[] | ((current: RelatedLinkDraft[]) => RelatedLinkDraft[]),
  ) =>
    setDraftValues((current) => ({
      ...current,
      relatedLinks:
        typeof value === "function" ? value(current.relatedLinks) : value,
    }));

  return {
    ...draft,
    setDraftValues,
    setEditedDisplayName: (value) => setField("displayName", value),
    setEditedFilePath: (value) => setField("filePath", value),
    setEditedBoothUrl: (value) => setField("boothUrl", value),
    setEditedThumbnailUrl: (value) => setField("thumbnailUrl", value),
    setEditedNote: (value) => setField("note", value),
    setEditedModelIds: (value) => updateIds("modelIds", value),
    setEditedTagIds: (value) => updateIds("tagIds", value),
    setEditedRelatedLinks: updateRelatedLinks,
  };
}

function useDraftResetEffects({
  asset,
  editingAssetRequestId,
  resetDraft,
  setIsEditingAsset,
  clearAssetEditRequest,
}: DraftResetEffectsOptions) {
  useEffect(() => {
    resetDraft(asset);
    setIsEditingAsset(false);
  }, [asset, resetDraft, setIsEditingAsset]);

  useEffect(() => {
    if (!asset || editingAssetRequestId !== asset.id) {
      return;
    }

    resetDraft(asset);
    setIsEditingAsset(true);
    clearAssetEditRequest();
  }, [asset, editingAssetRequestId, clearAssetEditRequest, resetDraft, setIsEditingAsset]);
}

function useDraftChangeTracking({
  asset,
  isEditingAsset,
  draftValues,
  originalDraftValues,
  setHasChanges,
}: DraftChangeTrackingOptions) {
  useEffect(() => {
    setHasChanges(
      Boolean(
        asset &&
          isEditingAsset &&
          hasAssetDraftChanges(draftValues, originalDraftValues),
      ),
    );
  }, [asset, isEditingAsset, draftValues, originalDraftValues, setHasChanges]);
}

function handleAssetDraftShortcut(
  event: KeyboardEvent,
  options: Omit<DraftShortcutOptions, "isEditingAsset">,
) {
  if (event.repeat || dialogBlocksAssetDetailShortcut()) {
    return;
  }

  const key = event.key.toLowerCase();
  const modifier = event.ctrlKey || event.metaKey;

  if (modifier && key === "s") {
    event.preventDefault();
    if (options.hasChanges && !options.saving) {
      void options.saveDraft().catch(console.warn);
    }
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    options.resetDraft(options.asset);
    options.setIsEditingAsset(false);
  }
}

function useAssetDetailDraftShortcuts({
  asset,
  hasChanges,
  isEditingAsset,
  resetDraft,
  saveDraft,
  saving,
  setIsEditingAsset,
}: DraftShortcutOptions) {
  useEffect(() => {
    if (!asset || !isEditingAsset) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      handleAssetDraftShortcut(event, {
        asset,
        hasChanges,
        resetDraft,
        saveDraft,
        saving,
        setIsEditingAsset,
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [asset, hasChanges, isEditingAsset, resetDraft, saveDraft, saving, setIsEditingAsset]);
}

function useAssetDraftReset(
  asset: Asset | null,
  setDraftValues: (value: AssetDetailDraftValues) => void,
  setHasChanges: (hasChanges: boolean) => void,
) {
  return useCallback(
    (current: Asset | null = asset) => {
      if (!current) {
        return;
      }
      setDraftValues(toAssetDraftValues(current));
      setHasChanges(false);
    },
    [asset, setDraftValues, setHasChanges],
  );
}

function useSaveAssetDraft({
  asset,
  draftValues,
  updateAsset,
  setHasChanges,
  setIsEditingAsset,
}: DraftSaveOptions) {
  return useCallback(async () => {
    if (!asset) {
      return;
    }
    await updateAsset(asset.id, toAssetUpdateInput(draftValues));
    setHasChanges(false);
    setIsEditingAsset(false);
  }, [asset, draftValues, updateAsset, setHasChanges, setIsEditingAsset]);
}

function createDraftEditingActions({
  resetDraft,
  setIsEditingAsset,
  setEditedModelIds,
  setEditedTagIds,
  setEditedFilePath,
}: DraftEditingActionOptions) {
  return {
    startEditing: () => {
      resetDraft();
      setIsEditingAsset(true);
    },
    cancelEditing: () => {
      resetDraft();
      setIsEditingAsset(false);
    },
    toggleModel: (modelId: number) =>
      setEditedModelIds((current) => toggleId(current, modelId)),
    toggleTag: (tagId: number) =>
      setEditedTagIds((current) => toggleId(current, tagId)),
    setSelectedPath: (selected: string | string[] | null) => {
      if (typeof selected === "string") setEditedFilePath(selected);
    },
  };
}

function createRelatedLinkActions(
  setEditedRelatedLinks: AssetDetailDraftSetters["setEditedRelatedLinks"],
) {
  return {
    updateRelatedLink: (index: number, field: keyof RelatedLinkDraft, value: string) =>
      setEditedRelatedLinks((current) =>
        updateRelatedLink({ links: current, index, field, value }),
      ),
    addRelatedLink: () => setEditedRelatedLinks(addEmptyRelatedLink),
    createFirstRelatedLink: () => setEditedRelatedLinks([createEmptyRelatedLink()]),
    removeRelatedLink: (index: number) =>
      setEditedRelatedLinks((current) => removeRelatedLink(current, index)),
  };
}

function createThumbnailFetcher(
  boothUrl: string,
  setEditedThumbnailUrl: (url: string) => void,
  setIsFetchingThumbnail: (fetching: boolean) => void,
) {
  return async () => {
    if (!boothUrl.trim()) {
      return;
    }
    setIsFetchingThumbnail(true);
    try {
      const thumbnail = await invoke<string | null>("fetch_booth_thumbnail", {
        url: boothUrl.trim(),
      });
      setEditedThumbnailUrl(thumbnail ?? "");
    } finally {
      setIsFetchingThumbnail(false);
    }
  };
}

function useAssetDraftDerivedState(
  asset: Asset | null,
  draft: AssetDetailDraftState,
): AssetDraftDerivedState {
  const editedModelIdSet = useMemo(() => new Set(draft.modelIds), [draft.modelIds]);
  const editedTagIdSet = useMemo(() => new Set(draft.tagIds), [draft.tagIds]);
  const originalDraftValues = useMemo(
    () => (asset ? toAssetDraftValues(asset) : emptyAssetDraftValues),
    [asset],
  );
  const draftValues = useMemo(
    () => ({
      displayName: draft.displayName,
      filePath: draft.filePath,
      boothUrl: draft.boothUrl,
      thumbnailUrl: draft.thumbnailUrl,
      note: draft.note,
      modelIds: draft.modelIds,
      tagIds: draft.tagIds,
      relatedLinks: draft.relatedLinks,
    }),
    [
      draft.displayName,
      draft.filePath,
      draft.boothUrl,
      draft.thumbnailUrl,
      draft.note,
      draft.modelIds,
      draft.tagIds,
      draft.relatedLinks,
    ],
  );

  return { draftValues, editedModelIdSet, editedTagIdSet, originalDraftValues };
}

function useAssetDraftLifecycle({
  asset,
  saving,
  editingAssetRequestId,
  updateAsset,
  clearAssetEditRequest,
  draft,
  draftValues,
  hasChanges,
  isEditingAsset,
  originalDraftValues,
  setHasChanges,
  setIsEditingAsset,
}: AssetDraftLifecycleOptions) {
  const resetDraft = useAssetDraftReset(asset, draft.setDraftValues, setHasChanges);
  const saveDraft = useSaveAssetDraft({
    asset,
    draftValues,
    updateAsset,
    setHasChanges,
    setIsEditingAsset,
  });

  useDraftResetEffects({
    asset,
    editingAssetRequestId,
    resetDraft,
    setIsEditingAsset,
    clearAssetEditRequest,
  });
  useDraftChangeTracking({
    asset,
    isEditingAsset,
    draftValues,
    originalDraftValues,
    setHasChanges,
  });
  useAssetDetailDraftShortcuts({
    asset,
    hasChanges,
    isEditingAsset,
    resetDraft,
    saveDraft,
    saving,
    setIsEditingAsset,
  });

  return { resetDraft, saveDraft };
}

function createAssetDetailDraftResult({
  draft,
  derived,
  editingActions,
  fetchThumbnail,
  hasChanges,
  isEditingAsset,
  isFetchingThumbnail,
  relatedLinkActions,
  saveDraft,
}: AssetDraftResultOptions) {
  return {
    isEditingAsset,
    editedDisplayName: draft.displayName,
    editedFilePath: draft.filePath,
    editedBoothUrl: draft.boothUrl,
    editedThumbnailUrl: draft.thumbnailUrl,
    editedNote: draft.note,
    editedModelIds: draft.modelIds,
    editedTagIds: draft.tagIds,
    editedRelatedLinks: draft.relatedLinks,
    editedModelIdSet: derived.editedModelIdSet,
    editedTagIdSet: derived.editedTagIdSet,
    hasChanges,
    isFetchingThumbnail,
    setEditedDisplayName: draft.setEditedDisplayName,
    setEditedFilePath: draft.setEditedFilePath,
    setEditedBoothUrl: draft.setEditedBoothUrl,
    setEditedThumbnailUrl: draft.setEditedThumbnailUrl,
    setEditedNote: draft.setEditedNote,
    setEditedModelIds: draft.setEditedModelIds,
    setEditedTagIds: draft.setEditedTagIds,
    saveDraft,
    fetchThumbnail,
    ...editingActions,
    ...relatedLinkActions,
  };
}

export function useAssetDetailDraft({
  asset, saving, editingAssetRequestId, updateAsset, clearAssetEditRequest,
}: UseAssetDetailDraftInput) {
  const [isEditingAsset, setIsEditingAsset] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isFetchingThumbnail, setIsFetchingThumbnail] = useState(false);
  const draft = useAssetDraftState();
  const derived = useAssetDraftDerivedState(asset, draft);
  const { resetDraft, saveDraft } = useAssetDraftLifecycle({
    asset,
    saving,
    editingAssetRequestId,
    updateAsset,
    clearAssetEditRequest,
    draft,
    draftValues: derived.draftValues,
    hasChanges,
    isEditingAsset,
    originalDraftValues: derived.originalDraftValues,
    setHasChanges,
    setIsEditingAsset,
  });
  const editingActions = createDraftEditingActions({
    resetDraft,
    setIsEditingAsset,
    setEditedModelIds: draft.setEditedModelIds,
    setEditedTagIds: draft.setEditedTagIds,
    setEditedFilePath: draft.setEditedFilePath,
  });
  const relatedLinkActions = createRelatedLinkActions(draft.setEditedRelatedLinks);
  const fetchThumbnail = createThumbnailFetcher(
    draft.boothUrl,
    draft.setEditedThumbnailUrl,
    setIsFetchingThumbnail,
  );

  return createAssetDetailDraftResult({
    draft,
    derived,
    editingActions,
    fetchThumbnail,
    hasChanges,
    isEditingAsset,
    isFetchingThumbnail,
    saveDraft,
    relatedLinkActions,
  });
}
