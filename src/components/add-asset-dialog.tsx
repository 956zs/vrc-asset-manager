"use client";

import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { FileSearch, FolderSearch, Link2, Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAssetStore } from "@/stores/asset-store";
import type { AssetLinkInput } from "@/types";

type RelatedLinkDraft = AssetLinkInput;

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

export function AddAssetDialog() {
  const {
    models,
    tags,
    saving,
    isAddAssetDialogOpen,
    setAddAssetDialogOpen,
    addAsset,
  } = useAssetStore();

  const [displayName, setDisplayName] = useState("");
  const [filePath, setFilePath] = useState("");
  const [boothUrl, setBoothUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [note, setNote] = useState("");
  const [selectedModelIds, setSelectedModelIds] = useState<number[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [relatedLinks, setRelatedLinks] = useState<RelatedLinkDraft[]>([]);
  const [isFetchingThumbnail, setIsFetchingThumbnail] = useState(false);

  const resetForm = () => {
    setDisplayName("");
    setFilePath("");
    setBoothUrl("");
    setThumbnailUrl("");
    setNote("");
    setSelectedModelIds([]);
    setSelectedTagIds([]);
    setRelatedLinks([]);
  };

  const handleClose = () => {
    setAddAssetDialogOpen(false);
    resetForm();
  };

  const toggleModel = (modelId: number) => {
    setSelectedModelIds((current) =>
      current.includes(modelId)
        ? current.filter((id) => id !== modelId)
        : [...current, modelId],
    );
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((current) =>
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
    setRelatedLinks((current) =>
      current.map((link, currentIndex) =>
        currentIndex === index ? { ...link, [field]: value } : link,
      ),
    );
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

  const handleBrowseFile = async () => {
    const selected = await openDialog({
      title: "選擇素材檔案",
      multiple: false,
      directory: false,
      defaultPath: filePath.trim() || undefined,
    });
    setSelectedPath(selected);
  };

  const handleBrowseFolder = async () => {
    const selected = await openDialog({
      title: "選擇素材資料夾",
      multiple: false,
      directory: true,
      defaultPath: filePath.trim() || undefined,
    });
    setSelectedPath(selected);
  };

  const handleFetchThumbnail = async () => {
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

  const handleSubmit = async () => {
    if (!filePath.trim()) {
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
      related_links: cleanRelatedLinks(relatedLinks),
    });

    resetForm();
  };

  return (
    <Dialog
      open={isAddAssetDialogOpen}
      onOpenChange={(open) => {
        if (open) {
          setAddAssetDialogOpen(true);
        } else {
          handleClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] min-w-0 overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>新增素材</DialogTitle>
          <DialogDescription>填寫素材資訊並選擇相容的模型和標籤</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">顯示名稱</label>
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="例：可愛貓耳 v2"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              素材位置 <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                value={filePath}
                onChange={(event) => setFilePath(event.target.value)}
                placeholder="D:/VRChat/Assets/..."
                className="flex-1"
              />
              <Button type="button" variant="outline" size="icon" onClick={handleBrowseFile}>
                <FileSearch className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={handleBrowseFolder}>
                <FolderSearch className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Booth 連結</label>
            <div className="flex min-w-0 gap-2">
              <Input
                value={boothUrl}
                onChange={(event) => setBoothUrl(event.target.value)}
                placeholder="https://booth.pm/ja/items/..."
                className="min-w-0 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={!boothUrl.trim() || isFetchingThumbnail}
                onClick={handleFetchThumbnail}
              >
                {isFetchingThumbnail ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "抓取縮圖"
                )}
              </Button>
            </div>
            {thumbnailUrl && (
              <p className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground">
                {thumbnailUrl}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium">相容模型</label>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={models.length === 0}
                  onClick={() => setSelectedModelIds(models.map((model) => model.id))}
                >
                  全選
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={selectedModelIds.length === 0}
                  onClick={() => setSelectedModelIds([])}
                >
                  全不選
                </Button>
              </div>
            </div>
            <div className="max-h-32 space-y-2 overflow-y-auto rounded-md border p-3">
              {models.map((model) => (
                <label key={model.id} className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={selectedModelIds.includes(model.id)}
                    onCheckedChange={() => toggleModel(model.id)}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {model.display_name || model.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium">標籤</label>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={tags.length === 0}
                  onClick={() => setSelectedTagIds(tags.map((tag) => tag.id))}
                >
                  全選
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={selectedTagIds.length === 0}
                  onClick={() => setSelectedTagIds([])}
                >
                  全不選
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  style={
                    selectedTagIds.includes(tag.id)
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
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium">相關連結</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setRelatedLinks((current) => [...current, createEmptyLink()])}
              >
                <Plus className="h-3.5 w-3.5" />
                新增
              </Button>
            </div>
            {relatedLinks.length > 0 ? (
              <div className="space-y-2">
                {relatedLinks.map((link, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] gap-2"
                  >
                    <Input
                      value={link.label}
                      onChange={(event) =>
                        updateRelatedLink(index, "label", event.target.value)
                      }
                      placeholder="論壇討論"
                    />
                    <Input
                      value={link.url}
                      onChange={(event) =>
                        updateRelatedLink(index, "url", event.target.value)
                      }
                      placeholder="https://..."
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
                ))}
              </div>
            ) : (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                onClick={() => setRelatedLinks([createEmptyLink()])}
              >
                <Link2 className="h-4 w-4" />
                新增論壇、教學或輔助插件連結
              </button>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">備註</label>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="添加備註..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={!filePath.trim() || saving}>
            {saving ? "新增中" : "新增素材"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
