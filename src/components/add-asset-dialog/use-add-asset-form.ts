"use client";

import { useEffect, useMemo, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  addEmptyRelatedLink,
  createEmptyRelatedLink,
  normalizeRelatedLinks,
  removeRelatedLink,
  type RelatedLinkDraft,
  updateRelatedLink,
} from "@/lib/asset-links";
import {
  applyBoothProductInfo,
  fetchBoothProductInfo,
  mergeIds,
  type SuggestedBoothModel,
} from "@/lib/booth-product-info";
import { toggleId } from "@/lib/id-list";
import type {
  ArchiveStrategy,
  AssetCategory,
  ConflictStrategy,
  ImportOperation,
  ImportTargetPreview,
  ManagedImportBatchReport,
  ManagedImportItemInput,
  Model,
  Tag,
  ZipContentList,
} from "@/types";

type UseAddAssetFormInput = {
  addModel: (name: string, displayName?: string) => Promise<Model>;
  addTag: (name: string, color: string) => Promise<Tag>;
  listZipContents: (sourcePath: string) => Promise<ZipContentList>;
  managedImportBatch: (items: ManagedImportItemInput[]) => Promise<ManagedImportBatchReport>;
  models: Model[];
  previewManagedImportTarget: (
    sourcePath: string,
    category: AssetCategory,
    archiveStrategy?: ArchiveStrategy | null,
  ) => Promise<ImportTargetPreview>;
  tags: Tag[];
};

type AddAssetFormValues = {
  displayName: string;
  category: AssetCategory;
  operation: ImportOperation;
  archiveStrategy: ArchiveStrategy;
  conflictStrategy: ConflictStrategy;
  filePath: string;
  boothUrl: string;
  thumbnailUrl: string;
  note: string;
  selectedModelIds: number[];
  selectedTagIds: number[];
  relatedLinks: RelatedLinkDraft[];
};

type IdSetter = (value: number[] | ((current: number[]) => number[])) => void;
type LinkSetter = (
  value: RelatedLinkDraft[] | ((current: RelatedLinkDraft[]) => RelatedLinkDraft[]),
) => void;

type AddAssetFormSetters = {
  setDraftValues: (value: AddAssetFormValues) => void;
  setDisplayName: (value: string) => void;
  setCategory: (value: AssetCategory) => void;
  setOperation: (value: ImportOperation) => void;
  setArchiveStrategy: (value: ArchiveStrategy) => void;
  setConflictStrategy: (value: ConflictStrategy) => void;
  setFilePath: (value: string) => void;
  setBoothUrl: (value: string) => void;
  setThumbnailUrl: (value: string) => void;
  setNote: (value: string) => void;
  setSelectedModelIds: IdSetter;
  setSelectedTagIds: IdSetter;
  setRelatedLinks: LinkSetter;
};

type AddAssetFormState = AddAssetFormValues & AddAssetFormSetters;

type AddAssetDerivedState = {
  canSubmit: boolean;
  selectedModelIdSet: Set<number>;
  selectedTagIdSet: Set<number>;
};

type AddAssetFormResultOptions = {
  addSuggestedModel: (model: SuggestedBoothModel) => Promise<void>;
  addSuggestedTag: (tagName: string) => Promise<void>;
  browseFile: () => Promise<void>;
  browseFolder: () => Promise<void>;
  derived: AddAssetDerivedState;
  draft: AddAssetFormState;
  fetchProductInfo: () => Promise<void>;
  isFetchingProductInfo: boolean;
  isLoadingZipContents: boolean;
  loadZipContents: () => Promise<void>;
  targetPreview: ImportTargetPreview | null;
  zipContents: ZipContentList | null;
  relatedLinkActions: ReturnType<typeof createRelatedLinkActions>;
  reset: () => void;
  selectionActions: ReturnType<typeof createSelectionActions>;
  suggestedModels: SuggestedBoothModel[];
  suggestedTags: string[];
  submit: () => Promise<ManagedImportBatchReport | undefined>;
};

type SubmitActionOptions = {
  canSubmit: boolean;
  draft: AddAssetFormValues;
  managedImportBatch: UseAddAssetFormInput["managedImportBatch"];
  reset: () => void;
};

type ProductInfoFetcherOptions = {
  addSuggestedModels: (models: SuggestedBoothModel[]) => void;
  addSuggestedTags: (tags: string[]) => void;
  boothUrl: string;
  currentTags: Tag[];
  currentModels: Model[];
  setDisplayName: (name: string) => void;
  setIsFetchingProductInfo: (fetching: boolean) => void;
  setSelectedModelIds: AddAssetFormSetters["setSelectedModelIds"];
  setSelectedTagIds: AddAssetFormSetters["setSelectedTagIds"];
  setThumbnailUrl: (url: string) => void;
  shouldFillDisplayName: boolean;
};

type SuggestedModelActionOptions = {
  addModel: (name: string, displayName?: string) => Promise<Model>;
  removeSuggestedModel: (model: SuggestedBoothModel) => void;
  setSelectedModelIds: AddAssetFormSetters["setSelectedModelIds"];
};

type SuggestedTagActionOptions = {
  addTag: (name: string, color: string) => Promise<Tag>;
  removeSuggestedTag: (tagName: string) => void;
  setSelectedTagIds: AddAssetFormSetters["setSelectedTagIds"];
};

const defaultSuggestedTagColor = "#6B7280";

const emptyAddAssetFormValues: AddAssetFormValues = {
  displayName: "",
  category: "accessory",
  operation: "move",
  archiveStrategy: "keepArchive",
  conflictStrategy: "cancel",
  filePath: "",
  boothUrl: "",
  thumbnailUrl: "",
  note: "",
  selectedModelIds: [],
  selectedTagIds: [],
  relatedLinks: [],
};

function toManagedImportInput(draft: AddAssetFormValues): ManagedImportItemInput {
  return {
    sourcePath: draft.filePath.trim(),
    category: draft.category,
    operation: draft.operation,
    archiveStrategy: isZipPath(draft.filePath) ? draft.archiveStrategy : null,
    conflictStrategy: draft.conflictStrategy,
    displayName: draft.displayName.trim() || null,
    boothUrl: draft.boothUrl.trim() || null,
    thumbnailUrl: draft.thumbnailUrl.trim() || null,
    note: draft.note.trim() || null,
    modelIds: draft.selectedModelIds,
    tagIds: draft.selectedTagIds,
    relatedLinks: normalizeRelatedLinks(draft.relatedLinks),
  };
}

const isZipPath = (path: string) => path.trim().toLocaleLowerCase().endsWith(".zip");

function useAddAssetFormState(): AddAssetFormState {
  const [draft, setDraftValues] = useState<AddAssetFormValues>(
    emptyAddAssetFormValues,
  );
  const setField = <TKey extends keyof AddAssetFormValues>(
    key: TKey,
    value: AddAssetFormValues[TKey],
  ) => setDraftValues((current) => ({ ...current, [key]: value }));
  const setIds = (
    key: "selectedModelIds" | "selectedTagIds",
    value: number[] | ((current: number[]) => number[]),
  ) =>
    setDraftValues((current) => ({
      ...current,
      [key]: typeof value === "function" ? value(current[key]) : value,
    }));
  const setRelatedLinks: LinkSetter = (value) =>
    setDraftValues((current) => ({
      ...current,
      relatedLinks:
        typeof value === "function" ? value(current.relatedLinks) : value,
    }));

  return {
    ...draft,
    setDraftValues,
    setDisplayName: (value) => setField("displayName", value),
    setCategory: (value) => setField("category", value),
    setOperation: (value) => setField("operation", value),
    setArchiveStrategy: (value) => setField("archiveStrategy", value),
    setConflictStrategy: (value) => setField("conflictStrategy", value),
    setFilePath: (value) => setField("filePath", value),
    setBoothUrl: (value) => setField("boothUrl", value),
    setThumbnailUrl: (value) => setField("thumbnailUrl", value),
    setNote: (value) => setField("note", value),
    setSelectedModelIds: (value) => setIds("selectedModelIds", value),
    setSelectedTagIds: (value) => setIds("selectedTagIds", value),
    setRelatedLinks,
  };
}

function useAddAssetDerivedState(draft: AddAssetFormState): AddAssetDerivedState {
  const selectedModelIdSet = useMemo(
    () => new Set(draft.selectedModelIds),
    [draft.selectedModelIds],
  );
  const selectedTagIdSet = useMemo(
    () => new Set(draft.selectedTagIds),
    [draft.selectedTagIds],
  );

  return {
    canSubmit: draft.filePath.trim().length > 0,
    selectedModelIdSet,
    selectedTagIdSet,
  };
}

function createSelectionActions(draft: AddAssetFormState) {
  return {
    toggleModel: (modelId: number) =>
      draft.setSelectedModelIds((current) => toggleId(current, modelId)),
    toggleTag: (tagId: number) =>
      draft.setSelectedTagIds((current) => toggleId(current, tagId)),
  };
}

function createRelatedLinkActions(setRelatedLinks: LinkSetter) {
  return {
    updateRelatedLink: (index: number, field: keyof RelatedLinkDraft, value: string) =>
      setRelatedLinks((current) =>
        updateRelatedLink({ links: current, index, field, value }),
      ),
    addRelatedLink: () => setRelatedLinks(addEmptyRelatedLink),
    createFirstRelatedLink: () => setRelatedLinks([createEmptyRelatedLink()]),
    removeRelatedLink: (index: number) =>
      setRelatedLinks((current) => removeRelatedLink(current, index)),
  };
}

function setSelectedPath(
  selected: string | string[] | null,
  setFilePath: (path: string) => void,
) {
  if (typeof selected === "string") {
    setFilePath(selected);
  }
}

async function browseAssetPath(
  directory: boolean,
  filePath: string,
  setFilePath: (path: string) => void,
) {
  const selected = await openDialog({
    title: directory ? "選擇素材資料夾" : "選擇素材檔案",
    multiple: false,
    directory,
    defaultPath: filePath.trim() || undefined,
  });
  setSelectedPath(selected, setFilePath);
}

function createProductInfoFetcher({
  addSuggestedModels,
  addSuggestedTags,
  boothUrl,
  currentModels,
  currentTags,
  setDisplayName,
  setIsFetchingProductInfo,
  setSelectedModelIds,
  setSelectedTagIds,
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
      if (shouldFillDisplayName && info.title) {
        setDisplayName(info.title);
      }

      const applied = applyBoothProductInfo(info, currentModels, currentTags);
      setSelectedModelIds((current) => mergeIds(current, applied.matchedModelIds));
      setSelectedTagIds((current) => mergeIds(current, applied.matchedTagIds));
      addSuggestedModels(applied.suggestedModels);
      addSuggestedTags(applied.suggestedTags);
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
  setSelectedModelIds,
}: SuggestedModelActionOptions) {
  return async (model: SuggestedBoothModel) => {
    const created = await addModel(model.name, model.displayName ?? undefined);
    setSelectedModelIds((current) => mergeIds(current, [created.id]));
    removeSuggestedModel(model);
  };
}

function createSuggestedTagAction({
  addTag,
  removeSuggestedTag,
  setSelectedTagIds,
}: SuggestedTagActionOptions) {
  return async (tagName: string) => {
    const created = await addTag(tagName, defaultSuggestedTagColor);
    setSelectedTagIds((current) => mergeIds(current, [created.id]));
    removeSuggestedTag(tagName);
  };
}

function createSubmitAction({
  canSubmit,
  draft,
  managedImportBatch,
  reset,
}: SubmitActionOptions) {
  return async () => {
    if (!canSubmit) {
      return;
    }
    const report = await managedImportBatch([toManagedImportInput(draft)]);
    if (report.succeeded > 0) {
      reset();
    }
    return report;
  };
}

function createAddAssetFormResult({
  addSuggestedModel,
  addSuggestedTag,
  browseFile,
  browseFolder,
  derived,
  draft,
  fetchProductInfo,
  isFetchingProductInfo,
  isLoadingZipContents,
  loadZipContents,
  targetPreview,
  zipContents,
  relatedLinkActions,
  reset,
  selectionActions,
  suggestedModels,
  suggestedTags,
  submit,
}: AddAssetFormResultOptions) {
  return {
    displayName: draft.displayName,
    category: draft.category,
    operation: draft.operation,
    archiveStrategy: draft.archiveStrategy,
    conflictStrategy: draft.conflictStrategy,
    filePath: draft.filePath,
    boothUrl: draft.boothUrl,
    thumbnailUrl: draft.thumbnailUrl,
    note: draft.note,
    selectedModelIds: draft.selectedModelIds,
    selectedTagIds: draft.selectedTagIds,
    relatedLinks: draft.relatedLinks,
    selectedModelIdSet: derived.selectedModelIdSet,
    selectedTagIdSet: derived.selectedTagIdSet,
    isFetchingProductInfo,
    isLoadingZipContents,
    targetPreview,
    zipContents,
    canSubmit: derived.canSubmit,
    setDisplayName: draft.setDisplayName,
    setCategory: draft.setCategory,
    setOperation: draft.setOperation,
    setArchiveStrategy: draft.setArchiveStrategy,
    setConflictStrategy: draft.setConflictStrategy,
    setFilePath: draft.setFilePath,
    setBoothUrl: draft.setBoothUrl,
    setThumbnailUrl: draft.setThumbnailUrl,
    setNote: draft.setNote,
    setSelectedModelIds: draft.setSelectedModelIds,
    setSelectedTagIds: draft.setSelectedTagIds,
    reset,
    addSuggestedModel,
    addSuggestedTag,
    browseFile,
    browseFolder,
    fetchProductInfo,
    isZipPath: isZipPath(draft.filePath),
    loadZipContents,
    suggestedModels,
    suggestedTags,
    submit,
    ...selectionActions,
    ...relatedLinkActions,
  };
}

export function useAddAssetForm({
  addModel,
  addTag,
  listZipContents,
  managedImportBatch,
  models,
  previewManagedImportTarget,
  tags,
}: UseAddAssetFormInput) {
  const [isFetchingProductInfo, setIsFetchingProductInfo] = useState(false);
  const [isLoadingZipContents, setIsLoadingZipContents] = useState(false);
  const [targetPreview, setTargetPreview] = useState<ImportTargetPreview | null>(null);
  const [zipContents, setZipContents] = useState<ZipContentList | null>(null);
  const [suggestedModels, setSuggestedModels] = useState<SuggestedBoothModel[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const draft = useAddAssetFormState();
  const derived = useAddAssetDerivedState(draft);
  const reset = () => {
    draft.setDraftValues(emptyAddAssetFormValues);
    setSuggestedModels([]);
    setSuggestedTags([]);
    setTargetPreview(null);
    setZipContents(null);
  };
  useEffect(() => {
    let active = true;
    if (!draft.filePath.trim()) {
      setTargetPreview(null);
      return;
    }

    void previewManagedImportTarget(
      draft.filePath,
      draft.category,
      isZipPath(draft.filePath) ? draft.archiveStrategy : null,
    )
      .then((preview) => {
        if (active) setTargetPreview(preview);
      })
      .catch((error) => {
        if (!active) return;
        setTargetPreview({
          sourcePath: draft.filePath,
          targetPath: null,
          conflict: false,
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      active = false;
    };
  }, [draft.filePath, draft.category, draft.archiveStrategy, previewManagedImportTarget]);
  const loadZipContentList = async () => {
    if (!isZipPath(draft.filePath)) {
      return;
    }
    setIsLoadingZipContents(true);
    try {
      setZipContents(await listZipContents(draft.filePath));
    } finally {
      setIsLoadingZipContents(false);
    }
  };
  const selectionActions = createSelectionActions(draft);
  const relatedLinkActions = createRelatedLinkActions(draft.setRelatedLinks);
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
  const removeSuggestedTag = (tagName: string) =>
    setSuggestedTags((current) =>
      current.filter((tag) => tag.toLocaleLowerCase() !== tagName.toLocaleLowerCase()),
    );
  const fetchProductInfo = createProductInfoFetcher({
    addSuggestedModels,
    addSuggestedTags,
    boothUrl: draft.boothUrl,
    currentModels: models,
    currentTags: tags,
    setDisplayName: draft.setDisplayName,
    setIsFetchingProductInfo,
    setSelectedModelIds: draft.setSelectedModelIds,
    setSelectedTagIds: draft.setSelectedTagIds,
    setThumbnailUrl: draft.setThumbnailUrl,
    shouldFillDisplayName: draft.displayName.trim().length === 0,
  });
  const addSuggestedModel = createSuggestedModelAction({
    addModel,
    removeSuggestedModel,
    setSelectedModelIds: draft.setSelectedModelIds,
  });
  const addSuggestedTag = createSuggestedTagAction({
    addTag,
    removeSuggestedTag,
    setSelectedTagIds: draft.setSelectedTagIds,
  });
  const browseFile = () => browseAssetPath(false, draft.filePath, draft.setFilePath);
  const browseFolder = () => browseAssetPath(true, draft.filePath, draft.setFilePath);
  const submit = createSubmitAction({
    canSubmit: derived.canSubmit,
    draft,
    managedImportBatch,
    reset,
  });

  return createAddAssetFormResult({
    addSuggestedModel,
    addSuggestedTag,
    browseFile,
    browseFolder,
    derived,
    draft,
    fetchProductInfo,
    isFetchingProductInfo,
    isLoadingZipContents,
    loadZipContents: loadZipContentList,
    targetPreview,
    zipContents,
    relatedLinkActions,
    reset,
    selectionActions,
    suggestedModels,
    suggestedTags,
    submit,
  });
}
