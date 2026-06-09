"use client";

import { useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  addEmptyRelatedLink,
  createEmptyRelatedLink,
  normalizeRelatedLinks,
  removeRelatedLink,
  type RelatedLinkDraft,
  updateRelatedLink,
} from "@/lib/asset-links";
import { toggleId } from "@/lib/id-list";
import type { CreateAssetInput } from "@/types";

type UseAddAssetFormInput = {
  addAsset: (asset: CreateAssetInput) => Promise<void>;
};

type AddAssetFormValues = {
  displayName: string;
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
  browseFile: () => Promise<void>;
  browseFolder: () => Promise<void>;
  derived: AddAssetDerivedState;
  draft: AddAssetFormState;
  fetchThumbnail: () => Promise<void>;
  isFetchingThumbnail: boolean;
  relatedLinkActions: ReturnType<typeof createRelatedLinkActions>;
  reset: () => void;
  selectionActions: ReturnType<typeof createSelectionActions>;
  submit: () => Promise<void>;
};

type SubmitActionOptions = {
  addAsset: (asset: CreateAssetInput) => Promise<void>;
  canSubmit: boolean;
  draft: AddAssetFormValues;
  reset: () => void;
};

const emptyAddAssetFormValues: AddAssetFormValues = {
  displayName: "",
  filePath: "",
  boothUrl: "",
  thumbnailUrl: "",
  note: "",
  selectedModelIds: [],
  selectedTagIds: [],
  relatedLinks: [],
};

function toCreateAssetInput(draft: AddAssetFormValues): CreateAssetInput {
  return {
    display_name: draft.displayName.trim() || null,
    file_path: draft.filePath.trim(),
    booth_url: draft.boothUrl.trim() || null,
    thumbnail_url: draft.thumbnailUrl.trim() || null,
    note: draft.note.trim() || null,
    model_ids: draft.selectedModelIds,
    tag_ids: draft.selectedTagIds,
    related_links: normalizeRelatedLinks(draft.relatedLinks),
  };
}

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

function createThumbnailFetcher(
  boothUrl: string,
  setThumbnailUrl: (url: string) => void,
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
      setThumbnailUrl(thumbnail ?? "");
    } finally {
      setIsFetchingThumbnail(false);
    }
  };
}

function createSubmitAction({
  addAsset,
  canSubmit,
  draft,
  reset,
}: SubmitActionOptions) {
  return async () => {
    if (!canSubmit) {
      return;
    }
    await addAsset(toCreateAssetInput(draft));
    reset();
  };
}

function createAddAssetFormResult({
  browseFile,
  browseFolder,
  derived,
  draft,
  fetchThumbnail,
  isFetchingThumbnail,
  relatedLinkActions,
  reset,
  selectionActions,
  submit,
}: AddAssetFormResultOptions) {
  return {
    displayName: draft.displayName,
    filePath: draft.filePath,
    boothUrl: draft.boothUrl,
    thumbnailUrl: draft.thumbnailUrl,
    note: draft.note,
    selectedModelIds: draft.selectedModelIds,
    selectedTagIds: draft.selectedTagIds,
    relatedLinks: draft.relatedLinks,
    selectedModelIdSet: derived.selectedModelIdSet,
    selectedTagIdSet: derived.selectedTagIdSet,
    isFetchingThumbnail,
    canSubmit: derived.canSubmit,
    setDisplayName: draft.setDisplayName,
    setFilePath: draft.setFilePath,
    setBoothUrl: draft.setBoothUrl,
    setThumbnailUrl: draft.setThumbnailUrl,
    setNote: draft.setNote,
    setSelectedModelIds: draft.setSelectedModelIds,
    setSelectedTagIds: draft.setSelectedTagIds,
    reset,
    browseFile,
    browseFolder,
    fetchThumbnail,
    submit,
    ...selectionActions,
    ...relatedLinkActions,
  };
}

export function useAddAssetForm({ addAsset }: UseAddAssetFormInput) {
  const [isFetchingThumbnail, setIsFetchingThumbnail] = useState(false);
  const draft = useAddAssetFormState();
  const derived = useAddAssetDerivedState(draft);
  const reset = () => draft.setDraftValues(emptyAddAssetFormValues);
  const selectionActions = createSelectionActions(draft);
  const relatedLinkActions = createRelatedLinkActions(draft.setRelatedLinks);
  const fetchThumbnail = createThumbnailFetcher(
    draft.boothUrl,
    draft.setThumbnailUrl,
    setIsFetchingThumbnail,
  );
  const browseFile = () => browseAssetPath(false, draft.filePath, draft.setFilePath);
  const browseFolder = () => browseAssetPath(true, draft.filePath, draft.setFilePath);
  const submit = createSubmitAction({
    addAsset,
    canSubmit: derived.canSubmit,
    draft,
    reset,
  });

  return createAddAssetFormResult({
    browseFile,
    browseFolder,
    derived,
    draft,
    fetchThumbnail,
    isFetchingThumbnail,
    relatedLinkActions,
    reset,
    selectionActions,
    submit,
  });
}
