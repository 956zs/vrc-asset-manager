"use client";

import { invokeTauri } from "@/lib/tauri-runtime";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { AlertTriangle } from "lucide-react";
import { AssetDetailBoothSection } from "@/components/asset-detail/booth-section";
import { DetailFieldLabel } from "@/components/asset-detail/detail-field-label";
import { DetailFieldValue } from "@/components/asset-detail/detail-field-value";
import { AssetDetailFooter } from "@/components/asset-detail/footer";
import { AssetDetailHeader } from "@/components/asset-detail/header";
import { AssetDetailLocationSection } from "@/components/asset-detail/location-section";
import { AssetDetailModelSection } from "@/components/asset-detail/model-section";
import { AssetDetailRelatedLinksSection } from "@/components/asset-detail/related-links-section";
import { AssetDetailShell } from "@/components/asset-detail/shell";
import { AssetDetailTagSection } from "@/components/asset-detail/tag-section";
import { AssetDetailThumbnail } from "@/components/asset-detail/thumbnail";
import { useAssetDetailDraft } from "@/components/asset-detail/use-asset-detail-draft";
import { BoothModelSuggestionPanel, BoothTagSuggestionPanel } from "@/components/booth-suggestion-panel";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { StatusMessage } from "@/components/ui/status-message";
import { Textarea } from "@/components/ui/textarea";
import { hasSensitiveTags } from "@/lib/sensitive-content";
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
  boothShopName: string;
  boothShopUrl: string;
  relatedLinks: Asset["related_links"];
  onClose: () => void;
  onDelete: () => Promise<void>;
  onOpenBooth: () => Promise<void>;
  onOpenBoothShop: () => Promise<void>;
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
  | "boothShopName"
  | "boothShopUrl"
  | "relatedLinks"
  | "onOpenBooth"
  | "onOpenBoothShop"
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
  | "boothShopName" | "boothShopUrl"
>;

function EmptyAssetDetail() {
  return (
    <AssetDetailShell className="items-center justify-center">
      <div className="space-y-2 p-6 text-center">
        <p className="text-muted-foreground">選擇一個素材以查看詳情</p>
      </div>
    </AssetDetailShell>
  );
}

function MissingFileNotice({ editing }: { editing: boolean }) {
  return (
    <StatusMessage
      tone="danger"
      className="p-3"
      icon={<AlertTriangle className="h-4 w-4" />}
      title="檔案遺失"
    >
      <p className="text-xs opacity-80">
        {editing ? "請重新指定素材位置" : "請進入編輯模式重新指定素材位置"}
      </p>
    </StatusMessage>
  );
}

function AssetNameField({ asset }: { asset: Asset }) {
  return (
    <div className="min-w-0">
      <DetailFieldLabel>檔案名稱</DetailFieldLabel>
      <DetailFieldValue>{asset.name}</DetailFieldValue>
    </div>
  );
}

function DisplayNameField({ asset, draft }: { asset: Asset; draft: AssetDetailDraft }) {
  return (
    <div className="min-w-0">
      <DetailFieldLabel>顯示名稱</DetailFieldLabel>
      {draft.isEditingAsset ? (
        <Input
          value={draft.editedDisplayName}
          onChange={(event) => draft.setEditedDisplayName(event.target.value)}
          placeholder="自訂顯示名稱"
          className="mt-1 min-w-0"
        />
      ) : (
        <DetailFieldValue>{asset.display_name || "未設定"}</DetailFieldValue>
      )}
    </div>
  );
}

function NoteSection({ asset, draft }: { asset: Asset; draft: AssetDetailDraft }) {
  return (
    <div className="min-w-0">
      <DetailFieldLabel>備註</DetailFieldLabel>
      {draft.isEditingAsset ? (
        <Textarea
          value={draft.editedNote}
          onChange={(event) => draft.setEditedNote(event.target.value)}
          placeholder="添加備註..."
          className="mt-1 resize-none"
          rows={3}
        />
      ) : (
        <DetailFieldValue wrap="pre-wrap">{asset.note || "無備註"}</DetailFieldValue>
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
      <BoothModelSuggestionPanel
        models={draft.isEditingAsset ? draft.suggestedModels : []}
        onAdd={(model) => void draft.addSuggestedModel(model)}
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
    </>
  );
}

function AssetDetailBody(props: AssetDetailBodyProps) {
  const { asset, draft } = props;
  const visibleTags = draft.isEditingAsset
    ? props.tags.filter((tag) => draft.editedTagIdSet.has(tag.id))
    : asset.tags;
  const sensitiveThumbnail = hasSensitiveTags(visibleTags);

  return (
    <div className="w-full min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]">
      <div className="w-full max-w-full min-w-0 space-y-6 overflow-x-hidden px-5 py-5">
        <AssetDetailThumbnail
          thumbnailUrl={props.thumbnailUrl}
          displayName={props.displayName}
          sensitive={sensitiveThumbnail}
        />
        {!asset.file_exists && <MissingFileNotice editing={draft.isEditingAsset} />}
        <AssetNameField asset={asset} />
        <DisplayNameField asset={asset} draft={draft} />
        <Separator />
        <ModelAndTagSections asset={asset} draft={draft} models={props.models} tags={props.tags} />
        <BoothTagSuggestionPanel
          origins={draft.suggestedTagOrigins}
          tags={draft.isEditingAsset ? draft.suggestedTags : []}
          onAdd={(tagName) => void draft.addSuggestedTag(tagName)}
        />
        <Separator />
        <AssetDetailBoothSection
          isEditing={draft.isEditingAsset}
          boothUrl={props.boothUrl}
          boothShopName={props.boothShopName}
          boothShopUrl={props.boothShopUrl}
          fetching={draft.isFetchingProductInfo}
          onBoothUrlChange={draft.setEditedBoothUrl}
          onBoothShopNameChange={draft.setEditedBoothShopName}
          onBoothShopUrlChange={draft.setEditedBoothShopUrl}
          onFetchProductInfo={() => void draft.fetchProductInfo()}
          onOpenBooth={() => void props.onOpenBooth()}
          onOpenBoothShop={() => void props.onOpenBoothShop()}
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
    <AssetDetailShell
      className="flex-col overflow-y-hidden"
      editing={props.draft.isEditingAsset}
    >
      <AssetDetailHeader
        isEditing={props.draft.isEditingAsset}
        onStartEditing={props.draft.startEditing}
        onClose={props.onClose}
      />
      <AssetDetailBody {...props} />
      <AssetDetailFooterController {...props} />
    </AssetDetailShell>
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
    boothShopName: draft.isEditingAsset
      ? draft.editedBoothShopName
      : asset?.booth_shop_name || "",
    boothShopUrl: draft.isEditingAsset
      ? draft.editedBoothShopUrl
      : asset?.booth_shop_url || "",
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
    onOpenBoothShop: () => openTrimmedUrl(viewState.boothShopUrl),
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
