"use client";

import { invokeTauri } from "@/lib/tauri-runtime";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { AlertTriangle, Plus } from "lucide-react";
import { AssetDetailBoothSection } from "@/components/asset-detail/booth-section";
import { AssetDetailFooter } from "@/components/asset-detail/footer";
import { AssetDetailHeader } from "@/components/asset-detail/header";
import { AssetDetailLocationSection } from "@/components/asset-detail/location-section";
import { AssetDetailModelSection } from "@/components/asset-detail/model-section";
import { AssetDetailRelatedLinksSection } from "@/components/asset-detail/related-links-section";
import { AssetDetailTagSection } from "@/components/asset-detail/tag-section";
import { AssetDetailThumbnail } from "@/components/asset-detail/thumbnail";
import { useAssetDetailDraft } from "@/components/asset-detail/use-asset-detail-draft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { selectSelectedAsset, useAssetStore } from "@/stores/asset-store";
import type { Asset, Model, Tag as AssetTag } from "@/types";

type AssetDetailDraft = ReturnType<typeof useAssetDetailDraft>;

type AssetDetailController = {
  asset: Asset | null;
  draft: AssetDetailDraft;
  models: Model[];
  tags: AssetTag[];
  saving: boolean;
  displayName: string;
  thumbnailUrl: string;
  filePath: string;
  boothUrl: string;
  relatedLinks: Asset["related_links"];
  onClose: () => void;
  onDelete: () => Promise<void>;
  onOpenBooth: () => Promise<void>;
  onOpenRelatedLink: (url: string) => Promise<void>;
  onOpenFolder: () => Promise<void>;
  onBrowseFile: () => Promise<void>;
  onBrowseFolder: () => Promise<void>;
};

type AssetDetailLayoutProps = Omit<AssetDetailController, "asset"> & {
  asset: Asset;
};

type AssetDetailBodyProps = Pick<
  AssetDetailLayoutProps,
  | "asset"
  | "draft"
  | "models"
  | "tags"
  | "displayName"
  | "thumbnailUrl"
  | "filePath"
  | "boothUrl"
  | "relatedLinks"
  | "onOpenBooth"
  | "onOpenRelatedLink"
  | "onBrowseFile"
  | "onBrowseFolder"
>;

type AssetDetailFooterControllerProps = Pick<
  AssetDetailLayoutProps,
  "draft" | "saving" | "displayName" | "filePath" | "onDelete" | "onOpenFolder"
>;

type AssetDetailViewState = Pick<
  AssetDetailController,
  "displayName" | "thumbnailUrl" | "filePath" | "boothUrl" | "relatedLinks"
>;

function EmptyAssetDetail() {
  return (
    <div
      className="asset-detail-panel flex h-full min-h-0 shrink-0 items-center justify-center overflow-x-hidden border-l border-border bg-card"
      style={{ width: "clamp(18rem, 34vw, 25rem)" }}
    >
      <div className="space-y-2 p-6 text-center">
        <p className="text-muted-foreground">選擇一個素材以查看詳情</p>
      </div>
    </div>
  );
}

function MissingFileNotice({ editing }: { editing: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <div className="min-w-0 text-sm">
        <p className="font-medium">檔案遺失</p>
        <p className="text-xs opacity-80">
          {editing ? "請重新指定素材位置" : "請進入編輯模式重新指定素材位置"}
        </p>
      </div>
    </div>
  );
}

function AssetNameField({ asset }: { asset: Asset }) {
  return (
    <div className="min-w-0">
      <label className="text-sm font-medium text-muted-foreground">檔案名稱</label>
      <p className="mt-1 break-all text-sm text-foreground">{asset.name}</p>
    </div>
  );
}

function DisplayNameField({ asset, draft }: { asset: Asset; draft: AssetDetailDraft }) {
  return (
    <div className="min-w-0">
      <label className="text-sm font-medium text-muted-foreground">顯示名稱</label>
      {draft.isEditingAsset ? (
        <Input
          value={draft.editedDisplayName}
          onChange={(event) => draft.setEditedDisplayName(event.target.value)}
          placeholder="自訂顯示名稱"
          className="mt-1 min-w-0"
        />
      ) : (
        <p className="mt-1 break-all text-sm text-foreground">
          {asset.display_name || "未設定"}
        </p>
      )}
    </div>
  );
}

function NoteSection({ asset, draft }: { asset: Asset; draft: AssetDetailDraft }) {
  return (
    <div className="min-w-0">
      <label className="text-sm font-medium text-muted-foreground">備註</label>
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
  );
}

function ModelAndTagSections({
  asset,
  draft,
  models,
  tags,
}: Pick<AssetDetailBodyProps, "asset" | "draft" | "models" | "tags">) {
  return (
    <>
      <AssetDetailModelSection
        models={models}
        assetModels={asset.models}
        isEditing={draft.isEditingAsset}
        editedModelIds={draft.editedModelIds}
        editedModelIdSet={draft.editedModelIdSet}
        onSelectAll={() => draft.setEditedModelIds(models.map((model) => model.id))}
        onClear={() => draft.setEditedModelIds([])}
        onToggle={draft.toggleModel}
      />
      <SuggestedBoothModels draft={draft} />
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
    </>
  );
}

function SuggestedBoothModels({ draft }: { draft: AssetDetailDraft }) {
  if (!draft.isEditingAsset || draft.suggestedModels.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">BOOTH 建議模型</p>
      <div className="flex min-w-0 max-w-full flex-wrap gap-2 overflow-hidden">
        {draft.suggestedModels.map((model) => (
          <Button
            key={model.name}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 min-w-0 !max-w-full !shrink gap-1 px-2 text-xs"
            onClick={() => void draft.addSuggestedModel(model)}
          >
            <Plus className="h-3 w-3 shrink-0" />
            <span className="min-w-0 truncate">{model.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

function SuggestedBoothTags({ draft }: { draft: AssetDetailDraft }) {
  if (!draft.isEditingAsset || draft.suggestedTags.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">BOOTH 建議標籤</p>
      <div className="flex min-w-0 max-w-full flex-wrap gap-2 overflow-hidden">
        {draft.suggestedTags.map((tagName) => (
          <Button
            key={tagName}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 min-w-0 !max-w-full !shrink gap-1 px-2 text-xs"
            onClick={() => void draft.addSuggestedTag(tagName)}
          >
            <Plus className="h-3 w-3 shrink-0" />
            <span className="min-w-0 truncate">{tagName}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

function AssetDetailBody(props: AssetDetailBodyProps) {
  const { asset, draft } = props;

  return (
    <div className="w-full min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]">
      <div className="w-full max-w-full min-w-0 space-y-6 overflow-x-hidden px-5 py-5">
        <AssetDetailThumbnail thumbnailUrl={props.thumbnailUrl} displayName={props.displayName} />
        {!asset.file_exists && <MissingFileNotice editing={draft.isEditingAsset} />}
        <AssetNameField asset={asset} />
        <DisplayNameField asset={asset} draft={draft} />
        <Separator />
        <ModelAndTagSections asset={asset} draft={draft} models={props.models} tags={props.tags} />
        <SuggestedBoothTags draft={draft} />
        <Separator />
        <AssetDetailBoothSection
          isEditing={draft.isEditingAsset}
          boothUrl={props.boothUrl}
          fetching={draft.isFetchingProductInfo}
          onBoothUrlChange={draft.setEditedBoothUrl}
          onFetchProductInfo={() => void draft.fetchProductInfo()}
          onOpenBooth={() => void props.onOpenBooth()}
        />
        <Separator />
        <AssetDetailRelatedLinksSection
          isEditing={draft.isEditingAsset}
          relatedLinks={props.relatedLinks}
          editedRelatedLinks={draft.editedRelatedLinks}
          onAdd={draft.addRelatedLink}
          onCreateFirst={draft.createFirstRelatedLink}
          onUpdate={draft.updateRelatedLink}
          onRemove={draft.removeRelatedLink}
          onOpen={(url) => void props.onOpenRelatedLink(url)}
        />
        <Separator />
        <NoteSection asset={asset} draft={draft} />
        <Separator />
        <AssetDetailLocationSection
          isEditing={draft.isEditingAsset}
          filePath={props.filePath}
          onFilePathChange={draft.setEditedFilePath}
          onBrowseFile={() => void props.onBrowseFile()}
          onBrowseFolder={() => void props.onBrowseFolder()}
        />
      </div>
    </div>
  );
}

function AssetDetailFooterController({
  draft,
  saving,
  displayName,
  filePath,
  onDelete,
  onOpenFolder,
}: AssetDetailFooterControllerProps) {
  return (
    <AssetDetailFooter
      isEditing={draft.isEditingAsset}
      saving={saving}
      hasChanges={draft.hasChanges}
      displayName={displayName}
      filePath={filePath}
      onCancelEditing={draft.cancelEditing}
      onSave={() => void draft.saveDraft()}
      onDelete={() => void onDelete()}
      onStartEditing={draft.startEditing}
      onOpenFolder={() => void onOpenFolder()}
    />
  );
}

function AssetDetailLayout(props: AssetDetailLayoutProps) {
  return (
    <div
      className="asset-detail-panel flex h-full min-h-0 shrink-0 flex-col overflow-x-hidden overflow-y-hidden border-l border-border bg-card"
      data-asset-detail-editing={props.draft.isEditingAsset ? "true" : undefined}
      style={{ width: "clamp(18rem, 34vw, 25rem)" }}
    >
      <AssetDetailHeader
        isEditing={props.draft.isEditingAsset}
        onStartEditing={props.draft.startEditing}
        onClose={props.onClose}
      />
      <AssetDetailBody {...props} />
      <AssetDetailFooterController {...props} />
    </div>
  );
}

async function openTrimmedUrl(url: string) {
  if (url.trim()) {
    await openUrl(url.trim());
  }
}

async function openAssetLocation(filePath: string) {
  if (filePath.trim()) {
    await invokeTauri("open_file_location", { path: filePath });
  }
}

function getAssetDetailViewState(
  asset: Asset | null,
  draft: AssetDetailDraft,
): AssetDetailViewState {
  return {
    displayName: asset?.display_name || asset?.name || "",
    thumbnailUrl: draft.isEditingAsset
      ? draft.editedThumbnailUrl
      : asset?.thumbnail_url || "",
    filePath: draft.isEditingAsset ? draft.editedFilePath : asset?.file_path || "",
    boothUrl: draft.isEditingAsset ? draft.editedBoothUrl : asset?.booth_url || "",
    relatedLinks: asset?.related_links ?? [],
  };
}

function useAssetDetailController(): AssetDetailController {
  const store = useAssetStore();
  const asset = useAssetStore(selectSelectedAsset);
  const draft = useAssetDetailDraft({
    addModel: store.addModel,
    addTag: store.addTag,
    asset,
    models: store.models,
    saving: store.saving,
    tags: store.tags,
    editingAssetRequestId: store.editingAssetRequestId,
    updateAsset: store.updateAsset,
    clearAssetEditRequest: store.clearAssetEditRequest,
  });
  const viewState = getAssetDetailViewState(asset, draft);
  const deleteSelectedAsset = async () => {
    if (asset) {
      await store.deleteAsset(asset.id);
    }
  };

  return {
    asset,
    draft,
    models: store.models,
    tags: store.tags,
    saving: store.saving,
    ...viewState,
    onClose: () => store.selectAsset(null),
    onDelete: deleteSelectedAsset,
    onOpenBooth: () => openTrimmedUrl(viewState.boothUrl),
    onOpenRelatedLink: openTrimmedUrl,
    onOpenFolder: () => openAssetLocation(viewState.filePath),
    onBrowseFile: () => browseAssetPath(false, draft),
    onBrowseFolder: () => browseAssetPath(true, draft),
  };
}

async function browseAssetPath(directory: boolean, draft: AssetDetailDraft) {
  const selected = await openDialog({
    title: directory ? "重新指定素材資料夾" : "重新指定素材檔案",
    multiple: false,
    directory,
    defaultPath: draft.editedFilePath.trim() || undefined,
  });
  draft.setSelectedPath(selected);
}

export function AssetDetail() {
  const controller = useAssetDetailController();

  if (!controller.asset) {
    return <EmptyAssetDetail />;
  }

  return <AssetDetailLayout {...controller} asset={controller.asset} />;
}
