"use client";

import { useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  createEmptyRelatedLink,
  normalizeRelatedLinks,
  type RelatedLinkDraft,
} from "@/lib/asset-links";
import { toggleId } from "@/lib/id-list";
import type { CreateAssetInput } from "@/types";

type UseAddAssetFormInput = {
  addAsset: (asset: CreateAssetInput) => Promise<void>;
};

export function useAddAssetForm({ addAsset }: UseAddAssetFormInput) {
  const [displayName, setDisplayName] = useState("");
  const [filePath, setFilePath] = useState("");
  const [boothUrl, setBoothUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [note, setNote] = useState("");
  const [selectedModelIds, setSelectedModelIds] = useState<number[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [relatedLinks, setRelatedLinks] = useState<RelatedLinkDraft[]>([]);
  const [isFetchingThumbnail, setIsFetchingThumbnail] = useState(false);

  const selectedModelIdSet = useMemo(
    () => new Set(selectedModelIds),
    [selectedModelIds],
  );
  const selectedTagIdSet = useMemo(
    () => new Set(selectedTagIds),
    [selectedTagIds],
  );
  const canSubmit = filePath.trim().length > 0;

  const reset = () => {
    setDisplayName("");
    setFilePath("");
    setBoothUrl("");
    setThumbnailUrl("");
    setNote("");
    setSelectedModelIds([]);
    setSelectedTagIds([]);
    setRelatedLinks([]);
  };

  const toggleModel = (modelId: number) => {
    setSelectedModelIds((current) => toggleId(current, modelId));
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((current) => toggleId(current, tagId));
  };

  const updateRelatedLink = (
    index: number,
    field: keyof RelatedLinkDraft,
    value: string,
  ) => {
    setRelatedLinks((current) =>
      current.map((link, currentIndex) =>
        currentIndex === index ? { ...link, [field]: value } : link,
      ),
    );
  };

  const addRelatedLink = () => {
    setRelatedLinks((current) => [...current, createEmptyRelatedLink()]);
  };

  const createFirstRelatedLink = () => {
    setRelatedLinks([createEmptyRelatedLink()]);
  };

  const removeRelatedLink = (index: number) => {
    setRelatedLinks((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const setSelectedPath = (selected: string | string[] | null) => {
    if (typeof selected === "string") {
      setFilePath(selected);
    }
  };

  const browseFile = async () => {
    const selected = await openDialog({
      title: "選擇素材檔案",
      multiple: false,
      directory: false,
      defaultPath: filePath.trim() || undefined,
    });
    setSelectedPath(selected);
  };

  const browseFolder = async () => {
    const selected = await openDialog({
      title: "選擇素材資料夾",
      multiple: false,
      directory: true,
      defaultPath: filePath.trim() || undefined,
    });
    setSelectedPath(selected);
  };

  const fetchThumbnail = async () => {
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

  const submit = async () => {
    if (!canSubmit) {
      return;
    }

    await addAsset({
      display_name: displayName.trim() || null,
      file_path: filePath.trim(),
      booth_url: boothUrl.trim() || null,
      thumbnail_url: thumbnailUrl.trim() || null,
      note: note.trim() || null,
      model_ids: selectedModelIds,
      tag_ids: selectedTagIds,
      related_links: normalizeRelatedLinks(relatedLinks),
    });

    reset();
  };

  return {
    displayName,
    filePath,
    boothUrl,
    thumbnailUrl,
    note,
    selectedModelIds,
    selectedTagIds,
    relatedLinks,
    selectedModelIdSet,
    selectedTagIdSet,
    isFetchingThumbnail,
    canSubmit,
    setDisplayName,
    setFilePath,
    setBoothUrl,
    setThumbnailUrl,
    setNote,
    setSelectedModelIds,
    setSelectedTagIds,
    reset,
    toggleModel,
    toggleTag,
    updateRelatedLink,
    addRelatedLink,
    createFirstRelatedLink,
    removeRelatedLink,
    browseFile,
    browseFolder,
    fetchThumbnail,
    submit,
  };
}
