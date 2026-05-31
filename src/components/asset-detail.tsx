"use client";

import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { AlertTriangle } from "lucide-react";
import { AssetDetailBoothSection } from "@/components/asset-detail/booth-section";
import { AssetDetailFooter } from "@/components/asset-detail/footer";
import { AssetDetailHeader } from "@/components/asset-detail/header";
import { AssetDetailLocationSection } from "@/components/asset-detail/location-section";
import { AssetDetailModelSection } from "@/components/asset-detail/model-section";
import { AssetDetailRelatedLinksSection } from "@/components/asset-detail/related-links-section";
import { AssetDetailTagSection } from "@/components/asset-detail/tag-section";
import { AssetDetailThumbnail } from "@/components/asset-detail/thumbnail";
import { AssetDetailThumbnailUrlSection } from "@/components/asset-detail/thumbnail-url-section";
import { useAssetDetailDraft } from "@/components/asset-detail/use-asset-detail-draft";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { selectSelectedAsset, useAssetStore } from "@/stores/asset-store";

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
  } = useAssetStore();

  const asset = useAssetStore(selectSelectedAsset);
  const draft = useAssetDetailDraft({
    asset,
    saving,
    editingAssetRequestId,
    updateAsset,
    clearAssetEditRequest,
  });

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
  const thumbnailUrl = draft.isEditingAsset
    ? draft.editedThumbnailUrl
    : asset.thumbnail_url || "";
  const filePath = draft.isEditingAsset ? draft.editedFilePath : asset.file_path;
  const boothUrl = draft.isEditingAsset
    ? draft.editedBoothUrl
    : asset.booth_url || "";
  const relatedLinks = asset.related_links ?? [];

  const handleBrowseFile = async () => {
    const selected = await openDialog({
      title: "重新指定素材檔案",
      multiple: false,
      directory: false,
      defaultPath: draft.editedFilePath.trim() || undefined,
    });
    draft.setSelectedPath(selected);
  };

  const handleBrowseFolder = async () => {
    const selected = await openDialog({
      title: "重新指定素材資料夾",
      multiple: false,
      directory: true,
      defaultPath: draft.editedFilePath.trim() || undefined,
    });
    draft.setSelectedPath(selected);
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

  return (
    <div
      className="flex h-full min-h-0 w-[25rem] shrink-0 flex-col overflow-hidden border-l border-border bg-card"
      data-asset-detail-editing={draft.isEditingAsset ? "true" : undefined}
    >
      <AssetDetailHeader
        isEditing={draft.isEditingAsset}
        onStartEditing={draft.startEditing}
        onClose={() => selectAsset(null)}
      />

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]">
        <div className="w-full max-w-full min-w-0 space-y-6 overflow-hidden px-5 py-5">
          <AssetDetailThumbnail
            thumbnailUrl={thumbnailUrl}
            displayName={displayName}
          />

          {!asset.file_exists && (
            <div className="flex min-w-0 items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div className="min-w-0 text-sm">
                <p className="font-medium">檔案遺失</p>
                <p className="text-xs opacity-80">
                  {draft.isEditingAsset
                    ? "請重新指定素材位置"
                    : "請進入編輯模式重新指定素材位置"}
                </p>
              </div>
            </div>
          )}

          <div className="min-w-0">
            <label className="text-sm font-medium text-muted-foreground">
              檔案名稱
            </label>
            <p className="mt-1 break-all text-sm text-foreground">
              {asset.name}
            </p>
          </div>

          <div className="min-w-0">
            <label className="text-sm font-medium text-muted-foreground">
              顯示名稱
            </label>
            {draft.isEditingAsset ? (
              <Input
                value={draft.editedDisplayName}
                onChange={(event) =>
                  draft.setEditedDisplayName(event.target.value)
                }
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

          <AssetDetailModelSection
            models={models}
            assetModels={asset.models}
            isEditing={draft.isEditingAsset}
            editedModelIds={draft.editedModelIds}
            editedModelIdSet={draft.editedModelIdSet}
            onSelectAll={() =>
              draft.setEditedModelIds(models.map((model) => model.id))
            }
            onClear={() => draft.setEditedModelIds([])}
            onToggle={draft.toggleModel}
          />

          <Separator />

          <AssetDetailTagSection
            tags={tags}
            assetTags={asset.tags}
            isEditing={draft.isEditingAsset}
            editedTagIds={draft.editedTagIds}
            editedTagIdSet={draft.editedTagIdSet}
            onSelectAll={() => draft.setEditedTagIds(tags.map((tag) => tag.id))}
            onClear={() => draft.setEditedTagIds([])}
            onToggle={draft.toggleTag}
          />

          <Separator />

          <AssetDetailBoothSection
            isEditing={draft.isEditingAsset}
            boothUrl={boothUrl}
            onBoothUrlChange={draft.setEditedBoothUrl}
            onOpenBooth={() => void handleOpenBooth()}
          />

          <Separator />

          <AssetDetailRelatedLinksSection
            isEditing={draft.isEditingAsset}
            relatedLinks={relatedLinks}
            editedRelatedLinks={draft.editedRelatedLinks}
            onAdd={draft.addRelatedLink}
            onCreateFirst={draft.createFirstRelatedLink}
            onUpdate={draft.updateRelatedLink}
            onRemove={draft.removeRelatedLink}
            onOpen={(url) => void handleOpenRelatedLink(url)}
          />

          <Separator />

          <div className="min-w-0">
            <label className="text-sm font-medium text-muted-foreground">
              備註
            </label>
            {draft.isEditingAsset ? (
              <Textarea
                value={draft.editedNote}
                onChange={(event) => draft.setEditedNote(event.target.value)}
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

          {draft.isEditingAsset && (
            <>
              <Separator />

              <AssetDetailThumbnailUrlSection
                thumbnailUrl={draft.editedThumbnailUrl}
                boothUrl={draft.editedBoothUrl}
                fetching={draft.isFetchingThumbnail}
                onThumbnailUrlChange={draft.setEditedThumbnailUrl}
                onFetchThumbnail={() => void draft.fetchThumbnail()}
              />
            </>
          )}

          <Separator />

          <AssetDetailLocationSection
            isEditing={draft.isEditingAsset}
            filePath={filePath}
            onFilePathChange={draft.setEditedFilePath}
            onBrowseFile={() => void handleBrowseFile()}
            onBrowseFolder={() => void handleBrowseFolder()}
          />
        </div>
      </div>

      <AssetDetailFooter
        isEditing={draft.isEditingAsset}
        saving={saving}
        hasChanges={draft.hasChanges}
        displayName={displayName}
        filePath={filePath}
        onCancelEditing={draft.cancelEditing}
        onSave={() => void draft.saveDraft()}
        onDelete={() => void handleDelete()}
        onStartEditing={draft.startEditing}
        onOpenFolder={() => void handleOpenFolder()}
      />
    </div>
  );
}
