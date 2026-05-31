"use client";

import { FileSearch, FolderSearch, Loader2 } from "lucide-react";
import { useAddAssetForm } from "@/components/add-asset-dialog/use-add-asset-form";
import { ModelSelectionField } from "@/components/asset-form/model-selection-field";
import { RelatedLinksEditor } from "@/components/asset-form/related-links-editor";
import { TagSelectionField } from "@/components/asset-form/tag-selection-field";
import { Button } from "@/components/ui/button";
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
  const form = useAddAssetForm({ addAsset });

  const handleClose = () => {
    setAddAssetDialogOpen(false);
    form.reset();
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
          <DialogDescription>
            填寫素材資訊並選擇相容的模型和標籤
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">顯示名稱</label>
            <Input
              value={form.displayName}
              onChange={(event) => form.setDisplayName(event.target.value)}
              placeholder="例：lilToon shaders"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              素材位置 <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                value={form.filePath}
                onChange={(event) => form.setFilePath(event.target.value)}
                placeholder="D:/VRChat/Assets/..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void form.browseFile()}
              >
                <FileSearch className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void form.browseFolder()}
              >
                <FolderSearch className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Booth 連結</label>
            <div className="flex min-w-0 gap-2">
              <Input
                value={form.boothUrl}
                onChange={(event) => form.setBoothUrl(event.target.value)}
                placeholder="https://booth.pm/ja/items/..."
                className="min-w-0 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={!form.boothUrl.trim() || form.isFetchingThumbnail}
                onClick={() => void form.fetchThumbnail()}
              >
                {form.isFetchingThumbnail ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "抓取縮圖"
                )}
              </Button>
            </div>
            {form.thumbnailUrl && (
              <p className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground">
                {form.thumbnailUrl}
              </p>
            )}
          </div>

          <ModelSelectionField
            models={models}
            selectedModelIds={form.selectedModelIds}
            selectedModelIdSet={form.selectedModelIdSet}
            onSelectAll={() =>
              form.setSelectedModelIds(models.map((model) => model.id))
            }
            onClear={() => form.setSelectedModelIds([])}
            onToggle={form.toggleModel}
          />

          <TagSelectionField
            tags={tags}
            selectedTagIds={form.selectedTagIds}
            selectedTagIdSet={form.selectedTagIdSet}
            onSelectAll={() =>
              form.setSelectedTagIds(tags.map((tag) => tag.id))
            }
            onClear={() => form.setSelectedTagIds([])}
            onToggle={form.toggleTag}
          />

          <RelatedLinksEditor
            links={form.relatedLinks}
            onAdd={form.addRelatedLink}
            onCreateFirst={form.createFirstRelatedLink}
            onUpdate={form.updateRelatedLink}
            onRemove={form.removeRelatedLink}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium">備註</label>
            <Textarea
              value={form.note}
              onChange={(event) => form.setNote(event.target.value)}
              placeholder="添加備註..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button
            onClick={() => void form.submit()}
            disabled={!form.canSubmit || saving}
          >
            {saving ? "新增中" : "新增素材"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
