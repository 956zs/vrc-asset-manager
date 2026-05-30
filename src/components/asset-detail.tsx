"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  AlertTriangle,
  ExternalLink,
  FileSearch,
  FolderOpen,
  FolderSearch,
  ImageDown,
  Image as ImageIcon,
  Link2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/stores/asset-store";
import type { Asset, AssetLinkInput } from "@/types";

type RelatedLinkDraft = AssetLinkInput;

const sortedIds = (values: number[]) => [...values].sort((a, b) => a - b);

const sameIds = (left: number[], right: number[]) =>
  JSON.stringify(sortedIds(left)) === JSON.stringify(sortedIds(right));

const createEmptyLink = (): RelatedLinkDraft => ({
  label: "",
  url: "",
});

const cleanRelatedLinks = (links: RelatedLinkDraft[]): AssetLinkInput[] =>
  links
    .map((link) => ({
      label: link.label.trim(),
      url: link.url.trim(),
    }))
    .filter((link) => link.url.length > 0)
    .map((link) => ({
      label: link.label || link.url,
      url: link.url,
    }));

const sameLinks = (left: RelatedLinkDraft[], right: RelatedLinkDraft[]) =>
  JSON.stringify(cleanRelatedLinks(left)) === JSON.stringify(cleanRelatedLinks(right));

export function AssetDetail() {
  const {
    models,
    tags,
    saving,
    editingAssetRequestId,
    selectAsset,
    updateAsset,
    deleteAsset,
    clearAssetEditRequest,
    getSelectedAsset,
  } = useAssetStore();

  const asset = getSelectedAsset();
  const [isEditingAsset, setIsEditingAsset] = useState(false);
  const [editedDisplayName, setEditedDisplayName] = useState("");
  const [editedFilePath, setEditedFilePath] = useState("");
  const [editedBoothUrl, setEditedBoothUrl] = useState("");
  const [editedThumbnailUrl, setEditedThumbnailUrl] = useState("");
  const [editedNote, setEditedNote] = useState("");
  const [editedModelIds, setEditedModelIds] = useState<number[]>([]);
  const [editedTagIds, setEditedTagIds] = useState<number[]>([]);
  const [editedRelatedLinks, setEditedRelatedLinks] = useState<RelatedLinkDraft[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isFetchingThumbnail, setIsFetchingThumbnail] = useState(false);

  const originalModelIds = useMemo(
    () => asset?.models.map((model) => model.id) ?? [],
    [asset],
  );
  const originalTagIds = useMemo(
    () => asset?.tags.map((tag) => tag.id) ?? [],
    [asset],
  );
  const originalRelatedLinks = useMemo(
    () =>
      (asset?.related_links ?? []).map((link) => ({
        label: link.label,
        url: link.url,
      })),
    [asset],
  );

  const resetDraft = (current: Asset | null = asset) => {
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
    setEditedRelatedLinks(
      (current.related_links ?? []).map((link) => ({
        label: link.label,
        url: link.url,
      })),
    );
    setHasChanges(false);
  };

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
      related_links: cleanRelatedLinks(editedRelatedLinks),
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
  }, [asset]);

  useEffect(() => {
    if (!asset || editingAssetRequestId !== asset.id) {
      return;
    }

    resetDraft(asset);
    setIsEditingAsset(true);
    clearAssetEditRequest();
  }, [asset, editingAssetRequestId, clearAssetEditRequest]);

  useEffect(() => {
    if (!asset || !isEditingAsset) {
      setHasChanges(false);
      return;
    }

    const displayNameChanged = editedDisplayName !== (asset.display_name || "");
    const filePathChanged = editedFilePath !== asset.file_path;
    const boothUrlChanged = editedBoothUrl !== (asset.booth_url || "");
    const thumbnailUrlChanged = editedThumbnailUrl !== (asset.thumbnail_url || "");
    const noteChanged = editedNote !== (asset.note || "");
    const modelsChanged = !sameIds(editedModelIds, originalModelIds);
    const tagsChanged = !sameIds(editedTagIds, originalTagIds);
    const linksChanged = !sameLinks(editedRelatedLinks, originalRelatedLinks);

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
  }, [
    asset,
    hasChanges,
    isEditingAsset,
    saveDraft,
    saving,
  ]);

  if (!asset) {
    return (
      <div className="flex w-[25rem] items-center justify-center border-l border-border bg-card">
        <div className="space-y-2 p-6 text-center">
          <p className="text-muted-foreground">選擇一個素材以查看詳情</p>
        </div>
      </div>
    );
  }

  const displayName = asset.display_name || asset.name;
  const thumbnailUrl = isEditingAsset ? editedThumbnailUrl : asset.thumbnail_url || "";
  const filePath = isEditingAsset ? editedFilePath : asset.file_path;
  const boothUrl = isEditingAsset ? editedBoothUrl : asset.booth_url || "";
  const relatedLinks = asset.related_links ?? [];

  const startEditing = () => {
    resetDraft();
    setIsEditingAsset(true);
  };

  const cancelEditing = () => {
    resetDraft();
    setIsEditingAsset(false);
  };

  const toggleModel = (modelId: number) => {
    setEditedModelIds((current) =>
      current.includes(modelId)
        ? current.filter((id) => id !== modelId)
        : [...current, modelId],
    );
  };

  const toggleTag = (tagId: number) => {
    setEditedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId],
    );
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

  const handleBrowseFile = async () => {
    const selected = await openDialog({
      title: "重新指定素材檔案",
      multiple: false,
      directory: false,
      defaultPath: editedFilePath.trim() || undefined,
    });
    setSelectedPath(selected);
  };

  const handleBrowseFolder = async () => {
    const selected = await openDialog({
      title: "重新指定素材資料夾",
      multiple: false,
      directory: true,
      defaultPath: editedFilePath.trim() || undefined,
    });
    setSelectedPath(selected);
  };

  const handleDelete = async () => {
    await deleteAsset(asset.id);
  };

  const handleOpenBooth = async () => {
    if (boothUrl.trim()) {
      await openUrl(boothUrl.trim());
    }
  };

  const handleOpenRelatedLink = async (url: string) => {
    if (url.trim()) {
      await openUrl(url.trim());
    }
  };

  const handleOpenFolder = async () => {
    if (filePath.trim()) {
      await invoke("open_file_location", { path: filePath });
    }
  };

  const handleFetchThumbnail = async () => {
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

  return (
    <div
      className="flex h-full min-h-0 w-[25rem] shrink-0 flex-col overflow-hidden border-l border-border bg-card"
      data-asset-detail-editing={isEditingAsset ? "true" : undefined}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-foreground">管理素材</h2>
          <p className="text-xs text-muted-foreground">
            {isEditingAsset ? "編輯中" : "檢視模式"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!isEditingAsset && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="編輯素材"
              aria-label="編輯素材"
              onClick={startEditing}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="關閉詳情"
            aria-label="關閉詳情"
            onClick={() => selectAsset(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]">
        <div className="w-full max-w-full min-w-0 space-y-6 overflow-hidden px-5 py-5">
          <div className="relative aspect-video min-w-0 overflow-hidden rounded-lg bg-muted">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={displayName}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  event.currentTarget.nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center",
                thumbnailUrl && "hidden",
              )}
            >
              <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
            </div>
          </div>

          {!asset.file_exists && (
            <div className="flex min-w-0 items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div className="min-w-0 text-sm">
                <p className="font-medium">檔案遺失</p>
                <p className="text-xs opacity-80">
                  {isEditingAsset ? "請重新指定素材位置" : "請進入編輯模式重新指定素材位置"}
                </p>
              </div>
            </div>
          )}

          <div className="min-w-0">
            <label className="text-sm font-medium text-muted-foreground">檔案名稱</label>
            <p className="mt-1 break-all text-sm text-foreground">{asset.name}</p>
          </div>

          <div className="min-w-0">
            <label className="text-sm font-medium text-muted-foreground">顯示名稱</label>
            {isEditingAsset ? (
              <Input
                value={editedDisplayName}
                onChange={(event) => setEditedDisplayName(event.target.value)}
                placeholder="自訂顯示名稱"
                className="mt-1 min-w-0"
              />
            ) : (
              <p className="mt-1 break-all text-sm text-foreground">
                {asset.display_name || "未設定"}
              </p>
            )}
          </div>

          <Separator />

          <div className="min-w-0">
            <div
              className={cn(
                "flex gap-2",
                isEditingAsset
                  ? "flex-col items-start"
                  : "items-center justify-between",
              )}
            >
              <label className="text-sm font-medium text-muted-foreground">相容模型</label>
              {isEditingAsset && (
                <div className="grid w-full min-w-0 grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full px-2 text-xs"
                    disabled={models.length === 0}
                    onClick={() => setEditedModelIds(models.map((model) => model.id))}
                  >
                    全選
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full px-2 text-xs"
                    disabled={editedModelIds.length === 0}
                    onClick={() => setEditedModelIds([])}
                  >
                    全不選
                  </Button>
                </div>
              )}
            </div>
            {isEditingAsset ? (
              <div className="mt-2 min-w-0 space-y-1">
                {models.length > 0 ? (
                  models.map((model) => (
                    <div
                      key={model.id}
                      className="flex min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-md py-1"
                    >
                      <Checkbox
                        checked={editedModelIds.includes(model.id)}
                        onCheckedChange={() => toggleModel(model.id)}
                        aria-label={`切換 ${model.display_name || model.name}`}
                      />
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left text-sm text-foreground"
                        onClick={() => toggleModel(model.id)}
                      >
                        {model.display_name || model.name}
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">尚無模型</p>
                )}
              </div>
            ) : (
              <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                {asset.models.length > 0 ? (
                  asset.models.map((model) => (
                    <Badge key={model.id} variant="secondary" className="max-w-full truncate">
                      {model.display_name || model.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">未指定</p>
                )}
              </div>
            )}
          </div>

          <Separator />

          <div className="min-w-0">
            <div
              className={cn(
                "flex gap-2",
                isEditingAsset
                  ? "flex-col items-start"
                  : "items-center justify-between",
              )}
            >
              <label className="text-sm font-medium text-muted-foreground">標籤</label>
              {isEditingAsset && (
                <div className="grid w-full min-w-0 grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full px-2 text-xs"
                    disabled={tags.length === 0}
                    onClick={() => setEditedTagIds(tags.map((tag) => tag.id))}
                  >
                    全選
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full px-2 text-xs"
                    disabled={editedTagIds.length === 0}
                    onClick={() => setEditedTagIds([])}
                  >
                    全不選
                  </Button>
                </div>
              )}
            </div>
            {isEditingAsset ? (
              <div className="mt-2 flex min-w-0 max-w-full flex-wrap gap-2">
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={editedTagIds.includes(tag.id) ? "default" : "outline"}
                      className="max-w-full cursor-pointer truncate transition-colors"
                      style={
                        editedTagIds.includes(tag.id)
                          ? {
                              backgroundColor: tag.color,
                              borderColor: tag.color,
                              color: "#fff",
                            }
                          : {
                              borderColor: tag.color,
                              color: tag.color,
                            }
                      }
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">尚無標籤</p>
                )}
              </div>
            ) : (
              <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                {asset.tags.length > 0 ? (
                  asset.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="max-w-full truncate"
                      style={{ borderColor: tag.color, color: tag.color }}
                    >
                      {tag.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">未指定</p>
                )}
              </div>
            )}
          </div>

          <Separator />

          <div className="min-w-0">
            <label className="text-sm font-medium text-muted-foreground">Booth 連結</label>
            {isEditingAsset ? (
              <div className="mt-1 grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_2.25rem] gap-2">
                <Input
                  value={editedBoothUrl}
                  onChange={(event) => setEditedBoothUrl(event.target.value)}
                  placeholder="https://booth.pm/ja/items/..."
                  className="min-w-0"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  data-context-url={editedBoothUrl.trim() || undefined}
                  onClick={handleOpenBooth}
                  disabled={!editedBoothUrl.trim()}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="mt-1 flex min-w-0 items-start gap-2">
                <p className="min-w-0 flex-1 break-all text-sm text-foreground">
                  {asset.booth_url || "未設定"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  data-context-url={asset.booth_url || undefined}
                  onClick={handleOpenBooth}
                  disabled={!asset.booth_url}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <Separator />

          <div className="min-w-0">
            <div
              className={cn(
                "flex gap-2",
                isEditingAsset
                  ? "flex-col items-start"
                  : "items-center justify-between",
              )}
            >
              <label className="text-sm font-medium text-muted-foreground">相關連結</label>
              {isEditingAsset && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full px-2 text-xs"
                  onClick={() =>
                    setEditedRelatedLinks((current) => [
                      ...current,
                      createEmptyLink(),
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  新增
                </Button>
              )}
            </div>
            {isEditingAsset ? (
              <div className="mt-2 min-w-0 space-y-2">
                {editedRelatedLinks.length > 0 ? (
                  editedRelatedLinks.map((link, index) => (
                    <div
                      key={index}
                      className="min-w-0 space-y-2 rounded-md border border-border p-2"
                    >
                      <div className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_2.25rem] gap-2">
                        <Input
                          value={link.label}
                          onChange={(event) =>
                            updateRelatedLink(index, "label", event.target.value)
                          }
                          placeholder="論壇討論"
                          className="min-w-0"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="!size-9"
                          title="移除連結"
                          aria-label="移除連結"
                          onClick={() => removeRelatedLink(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <Input
                        value={link.url}
                        onChange={(event) =>
                          updateRelatedLink(index, "url", event.target.value)
                        }
                        placeholder="https://..."
                        className="min-w-0"
                      />
                    </div>
                  ))
                ) : (
                  <button
                    type="button"
                    className="flex w-full min-w-0 items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                    onClick={() => setEditedRelatedLinks([createEmptyLink()])}
                  >
                    <Link2 className="h-4 w-4" />
                    <span className="min-w-0 truncate">新增論壇、教學或輔助插件連結</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-2 min-w-0 space-y-2">
                {relatedLinks.length > 0 ? (
                  relatedLinks.map((link) => (
                    <div key={link.id} className="flex min-w-0 items-start gap-2">
                      <div className="min-w-0 flex-1" data-context-url={link.url}>
                        <p className="truncate text-sm font-medium text-foreground">
                          {link.label}
                        </p>
                        <p className="break-all text-xs text-muted-foreground">
                          {link.url}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="開啟連結"
                        aria-label="開啟連結"
                        data-context-url={link.url}
                        onClick={() => void handleOpenRelatedLink(link.url)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">未設定</p>
                )}
              </div>
            )}
          </div>

          <Separator />

          <div className="min-w-0">
            <label className="text-sm font-medium text-muted-foreground">備註</label>
            {isEditingAsset ? (
              <Textarea
                value={editedNote}
                onChange={(event) => setEditedNote(event.target.value)}
                placeholder="添加備註..."
                className="mt-1 resize-none"
                rows={3}
              />
            ) : (
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                {asset.note || "無備註"}
              </p>
            )}
          </div>

          {isEditingAsset && (
            <>
              <Separator />

              <div className="min-w-0">
                <label className="text-sm font-medium text-muted-foreground">縮圖 URL</label>
                <div className="mt-1 grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_2.25rem] gap-2">
                  <Input
                    value={editedThumbnailUrl}
                    onChange={(event) => setEditedThumbnailUrl(event.target.value)}
                    placeholder="https://..."
                    className="min-w-0"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleFetchThumbnail}
                    disabled={!editedBoothUrl.trim() || isFetchingThumbnail}
                  >
                    {isFetchingThumbnail ? (
                      <ImageDown className="h-4 w-4 animate-pulse" />
                    ) : (
                      <ImageDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="min-w-0">
            <label className="text-sm font-medium text-muted-foreground">素材位置</label>
            {isEditingAsset ? (
              <>
                <Input
                  value={editedFilePath}
                  onChange={(event) => setEditedFilePath(event.target.value)}
                  className="mt-1 min-w-0 font-mono text-xs"
                />
                <div className="mt-2 grid min-w-0 max-w-full grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-w-0"
                    onClick={handleBrowseFile}
                  >
                    <FileSearch className="h-4 w-4" />
                    選檔案
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-w-0"
                    onClick={handleBrowseFolder}
                  >
                    <FolderSearch className="h-4 w-4" />
                    選資料夾
                  </Button>
                </div>
              </>
            ) : (
              <p
                className="mt-1 break-all font-mono text-xs text-foreground"
                data-context-path={asset.file_path}
              >
                {asset.file_path}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-t border-border px-5 py-4">
        {isEditingAsset ? (
          <>
            <div className="grid min-w-0 grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-w-0"
                disabled={saving}
                onClick={cancelEditing}
              >
                取消
              </Button>
              <Button
                type="button"
                className="min-w-0"
                disabled={!hasChanges || saving}
                onClick={() => void saveDraft()}
              >
                <Save className="h-4 w-4" />
                {saving ? "儲存中" : "儲存"}
              </Button>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full min-w-0"
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4" />
                  刪除素材
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>確定要刪除這個素材嗎？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作將從資料庫中移除「{displayName}」的記錄。實際檔案不會被刪除。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleDelete()}>
                    刪除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <>
            <Button type="button" className="w-full min-w-0" onClick={startEditing}>
              <Pencil className="h-4 w-4" />
              編輯素材
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full min-w-0 justify-start"
              onClick={handleOpenFolder}
              disabled={!filePath.trim()}
              data-context-path={filePath.trim() || undefined}
            >
              <FolderOpen className="h-4 w-4" />
              開啟素材資料夾
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
