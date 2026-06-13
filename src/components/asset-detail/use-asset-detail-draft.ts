"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addEmptyRelatedLink,
  createEmptyRelatedLink,
  normalizeRelatedLinks,
  removeRelatedLink,
  sameRelatedLinks,
  type RelatedLinkDraft,
  updateRelatedLink,
} from "@/lib/asset-links";
import {
  applyBoothProductInfo,
  fetchBoothProductInfo,
  mergeBoothTagOrigins,
  mergeIds,
  type SuggestedBoothTagOrigins,
  type SuggestedBoothModel,
} from "@/lib/booth-product-info";
import { sameIds, toggleId } from "@/lib/id-list";
import { suggestedTagColor } from "@/lib/sensitive-content";
import type { Asset, Model, Tag, UpdateAssetInput } from "@/types";

type UseAssetDetailDraftInput = {
  addModel: (name: string, displayName?: string) => Promise<Model>;
  addTag: (name: string, color: string) => Promise<Tag>;
  asset: Asset | null;
  models: Model[];
  saving: boolean;
  tags: Tag[];
  editingAssetRequestId: number | null;
  updateAsset: (id: number, updates: UpdateAssetInput) => Promise<void>;
  clearAssetEditRequest: () => void;
};

type AssetDetailDraftValues = {
  displayName: string;
  filePath: string;
  boothUrl: string;
  boothShopName: string;
  boothShopUrl: string;
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
  setEditedBoothShopName: (value: string) => void;
  setEditedBoothShopUrl: (value: string) => void;
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
  addSuggestedModel: (model: SuggestedBoothModel) => Promise<void>;
  addSuggestedTag: (tagName: string) => Promise<void>;
  draft: AssetDetailDraftState;
  derived: AssetDraftDerivedState;
  editingActions: ReturnType<typeof createDraftEditingActions>;
  fetchProductInfo: () => Promise<void>;
  hasChanges: boolean;
  isEditingAsset: boolean;
  isFetchingProductInfo: boolean;
  relatedLinkActions: ReturnType<typeof createRelatedLinkActions>;
  saveDraft: () => Promise<void>;
  suggestedModels: SuggestedBoothModel[];
  suggestedTags: string[];
  suggestedTagOrigins: SuggestedBoothTagOrigins;
};

type ProductInfoFetcherOptions = {
  addSuggestedModels: (models: SuggestedBoothModel[]) => void;
  addSuggestedTags: (tags: string[]) => void;
  addSuggestedTagOrigins: (origins: SuggestedBoothTagOrigins) => void;
  boothUrl: string;
  currentModels: Model[];
  currentTags: Tag[];
  setDisplayName: (name: string) => void;
  setBoothShopName: (name: string) => void;
  setBoothShopUrl: (url: string) => void;
  setIsFetchingProductInfo: (fetching: boolean) => void;
  setModelIds: AssetDetailDraftSetters["setEditedModelIds"];
  setTagIds: AssetDetailDraftSetters["setEditedTagIds"];
  setThumbnailUrl: (url: string) => void;
  shouldFillDisplayName: boolean;
};

type SuggestedModelActionOptions = {
  addModel: (name: string, displayName?: string) => Promise<Model>;
  removeSuggestedModel: (model: SuggestedBoothModel) => void;
  setModelIds: AssetDetailDraftSetters["setEditedModelIds"];
};

type SuggestedTagActionOptions = {
  addTag: (name: string, color: string) => Promise<Tag>;
  removeSuggestedTag: (tagName: string) => void;
  setTagIds: AssetDetailDraftSetters["setEditedTagIds"];
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
  boothShopName: "",
  boothShopUrl: "",
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
    boothShopName: asset.booth_shop_name || "",
    boothShopUrl: asset.booth_shop_url || "",
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
    draft.boothShopName !== original.boothShopName ||
    draft.boothShopUrl !== original.boothShopUrl ||
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
    booth_shop_name: draft.boothShopName || null,
    booth_shop_url: draft.boothShopUrl || null,
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
    setEditedBoothShopName: (value) => setField("boothShopName", value),
    setEditedBoothShopUrl: (value) => setField("boothShopUrl", value),
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

function createProductInfoFetcher({
  addSuggestedModels,
  addSuggestedTags,
  addSuggestedTagOrigins,
  boothUrl,
  currentModels,
  currentTags,
  setDisplayName,
  setBoothShopName,
  setBoothShopUrl,
  setIsFetchingProductInfo,
  setModelIds,
  setTagIds,
  setThumbnailUrl,
  shouldFillDisplayName,
}: ProductInfoFetcherOptions) {
  return async () => {
    if (!boothUrl.trim()) {
      return;
    }
    setIsFetchingProductInfo(true);
    try {
      const info = await fetchBoothProductInfo(boothUrl);

      if (!info) {
        return;
      }

      if (info.thumbnailUrl) {
        setThumbnailUrl(info.thumbnailUrl);
      }
      if (info.shopName) {
        setBoothShopName(info.shopName);
      }
      if (info.shopUrl) {
        setBoothShopUrl(info.shopUrl);
      }
      if (shouldFillDisplayName && info.title) {
        setDisplayName(info.title);
      }

      const applied = applyBoothProductInfo(info, currentModels, currentTags);
      setModelIds((current) => mergeIds(current, applied.matchedModelIds));
      setTagIds((current) => mergeIds(current, applied.matchedTagIds));
      addSuggestedModels(applied.suggestedModels);
      addSuggestedTags(applied.suggestedTags);
      addSuggestedTagOrigins(applied.suggestedTagOrigins);
    } catch (error) {
      console.warn("Failed to fetch BOOTH product info", error);
    } finally {
      setIsFetchingProductInfo(false);
    }
  };
}

function createSuggestedModelAction({
  addModel,
  removeSuggestedModel,
  setModelIds,
}: SuggestedModelActionOptions) {
  return async (model: SuggestedBoothModel) => {
    const created = await addModel(model.name, model.displayName ?? undefined);
    setModelIds((current) => mergeIds(current, [created.id]));
    removeSuggestedModel(model);
  };
}

function createSuggestedTagAction({
  addTag,
  removeSuggestedTag,
  setTagIds,
}: SuggestedTagActionOptions) {
  return async (tagName: string) => {
    const created = await addTag(tagName, suggestedTagColor(tagName));
    setTagIds((current) => mergeIds(current, [created.id]));
    removeSuggestedTag(tagName);
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
      boothShopName: draft.boothShopName,
      boothShopUrl: draft.boothShopUrl,
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
      draft.boothShopName,
      draft.boothShopUrl,
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
  addSuggestedModel,
  addSuggestedTag,
  draft,
  derived,
  editingActions,
  fetchProductInfo,
  hasChanges,
  isEditingAsset,
  isFetchingProductInfo,
  relatedLinkActions,
  saveDraft,
  suggestedModels,
  suggestedTags,
  suggestedTagOrigins,
}: AssetDraftResultOptions) {
  return {
    isEditingAsset,
    editedDisplayName: draft.displayName,
    editedFilePath: draft.filePath,
    editedBoothUrl: draft.boothUrl,
    editedBoothShopName: draft.boothShopName,
    editedBoothShopUrl: draft.boothShopUrl,
    editedThumbnailUrl: draft.thumbnailUrl,
    editedNote: draft.note,
    editedModelIds: draft.modelIds,
    editedTagIds: draft.tagIds,
    editedRelatedLinks: draft.relatedLinks,
    editedModelIdSet: derived.editedModelIdSet,
    editedTagIdSet: derived.editedTagIdSet,
    hasChanges,
    isFetchingProductInfo,
    setEditedDisplayName: draft.setEditedDisplayName,
    setEditedFilePath: draft.setEditedFilePath,
    setEditedBoothUrl: draft.setEditedBoothUrl,
    setEditedBoothShopName: draft.setEditedBoothShopName,
    setEditedBoothShopUrl: draft.setEditedBoothShopUrl,
    setEditedThumbnailUrl: draft.setEditedThumbnailUrl,
    setEditedNote: draft.setEditedNote,
    setEditedModelIds: draft.setEditedModelIds,
    setEditedTagIds: draft.setEditedTagIds,
    saveDraft,
    addSuggestedModel,
    addSuggestedTag,
    fetchProductInfo,
    suggestedModels,
    suggestedTags,
    suggestedTagOrigins,
    ...editingActions,
    ...relatedLinkActions,
  };
}

export function useAssetDetailDraft({
  addModel,
  addTag,
  asset,
  models,
  saving,
  tags,
  editingAssetRequestId,
  updateAsset,
  clearAssetEditRequest,
}: UseAssetDetailDraftInput) {
  const [isEditingAsset, setIsEditingAsset] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isFetchingProductInfo, setIsFetchingProductInfo] = useState(false);
  const [suggestedModels, setSuggestedModels] = useState<SuggestedBoothModel[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [suggestedTagOrigins, setSuggestedTagOrigins] =
    useState<SuggestedBoothTagOrigins>({});
  const draft = useAssetDraftState();
  const derived = useAssetDraftDerivedState(asset, draft);

  useEffect(() => {
    setSuggestedModels([]);
    setSuggestedTags([]);
    setSuggestedTagOrigins({});
  }, [asset?.id]);

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
  const addSuggestedModels = (nextModels: SuggestedBoothModel[]) =>
    setSuggestedModels((current) => {
      const existing = new Set(
        current.map((model) => model.name.toLocaleLowerCase()),
      );
      const merged = [...current];
      for (const model of nextModels) {
        const key = model.name.toLocaleLowerCase();
        if (!existing.has(key)) {
          existing.add(key);
          merged.push(model);
        }
      }
      return merged;
    });
  const removeSuggestedModel = (model: SuggestedBoothModel) =>
    setSuggestedModels((current) =>
      current.filter(
        (suggested) =>
          suggested.name.toLocaleLowerCase() !== model.name.toLocaleLowerCase(),
      ),
    );
  const addSuggestedTags = (nextTags: string[]) =>
    setSuggestedTags((current) => {
      const existing = new Set(current.map((tag) => tag.toLocaleLowerCase()));
      const merged = [...current];
      for (const tag of nextTags) {
        const key = tag.toLocaleLowerCase();
        if (!existing.has(key)) {
          existing.add(key);
          merged.push(tag);
        }
      }
      return merged;
    });
  const addSuggestedTagOrigins = (nextOrigins: SuggestedBoothTagOrigins) =>
    setSuggestedTagOrigins((current) =>
      mergeBoothTagOrigins(current, nextOrigins),
    );
  const removeSuggestedTag = (tagName: string) =>
    {
      setSuggestedTags((current) =>
        current.filter(
          (tag) => tag.toLocaleLowerCase() !== tagName.toLocaleLowerCase(),
        ),
      );
      setSuggestedTagOrigins((current) => {
        const next = { ...current };
        delete next[tagName];
        return next;
      });
    };
  const fetchProductInfo = createProductInfoFetcher({
    addSuggestedModels,
    addSuggestedTags,
    addSuggestedTagOrigins,
    boothUrl: draft.boothUrl,
    currentModels: models,
    currentTags: tags,
    setDisplayName: draft.setEditedDisplayName,
    setBoothShopName: draft.setEditedBoothShopName,
    setBoothShopUrl: draft.setEditedBoothShopUrl,
    setIsFetchingProductInfo,
    setModelIds: draft.setEditedModelIds,
    setTagIds: draft.setEditedTagIds,
    setThumbnailUrl: draft.setEditedThumbnailUrl,
    shouldFillDisplayName: draft.displayName.trim().length === 0,
  });
  const addSuggestedModel = createSuggestedModelAction({
    addModel,
    removeSuggestedModel,
    setModelIds: draft.setEditedModelIds,
  });
  const addSuggestedTag = createSuggestedTagAction({
    addTag,
    removeSuggestedTag,
    setTagIds: draft.setEditedTagIds,
  });

  return createAssetDetailDraftResult({
    addSuggestedModel,
    addSuggestedTag,
    draft,
    derived,
    editingActions,
    fetchProductInfo,
    hasChanges,
    isEditingAsset,
    isFetchingProductInfo,
    saveDraft,
    relatedLinkActions,
    suggestedModels,
    suggestedTags,
    suggestedTagOrigins,
  });
}
