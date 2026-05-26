"use client";

import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { FileSearch, FolderSearch, Loader2 } from "lucide-react";
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
  const [isFetchingThumbnail, setIsFetchingThumbnail] = useState(false);

  const resetForm = () => {
    setDisplayName("");
    setFilePath("");
    setBoothUrl("");
    setThumbnailUrl("");
    setNote("");
    setSelectedModelIds([]);
    setSelectedTagIds([]);
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
    });

    resetForm();
  };

  return (
    <Dialog open={isAddAssetDialogOpen} onOpenChange={setAddAssetDialogOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
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
            <div className="flex gap-2">
              <Input
                value={boothUrl}
                onChange={(event) => setBoothUrl(event.target.value)}
                placeholder="https://booth.pm/ja/items/..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
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
              <p className="truncate text-xs text-muted-foreground">{thumbnailUrl}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">相容模型</label>
            <div className="max-h-32 space-y-2 overflow-y-auto rounded-md border p-3">
              {models.map((model) => (
                <label key={model.id} className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={selectedModelIds.includes(model.id)}
                    onCheckedChange={() => toggleModel(model.id)}
                  />
                  <span className="text-sm">{model.display_name || model.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">標籤</label>
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
