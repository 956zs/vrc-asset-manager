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
import type { Model, Tag } from "@/types";

type AddAssetForm = ReturnType<typeof useAddAssetForm>;

type AddAssetDialogController = {
  form: AddAssetForm;
  models: Model[];
  open: boolean;
  saving: boolean;
  tags: Tag[];
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
};

type AddAssetDialogLayoutProps = AddAssetDialogController;

function useAddAssetDialogController(): AddAssetDialogController {
  const {
    models,
    tags,
    saving,
    isAddAssetDialogOpen,
    setAddAssetDialogOpen,
    addAsset,
  } = useAssetStore();
  const form = useAddAssetForm({ addAsset });
  const onClose = () => {
    setAddAssetDialogOpen(false);
    form.reset();
  };

  return {
    form,
    models,
    tags,
    saving,
    open: isAddAssetDialogOpen,
    onClose,
    onOpenChange: (open) => (open ? setAddAssetDialogOpen(true) : onClose()),
  };
}

function DisplayNameField({ form }: { form: AddAssetForm }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">顯示名稱</label>
      <Input
        value={form.displayName}
        onChange={(event) => form.setDisplayName(event.target.value)}
        placeholder="例：lilToon shaders"
      />
    </div>
  );
}

function AssetPathField({ form }: { form: AddAssetForm }) {
  return (
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
          title="選擇素材檔案"
          aria-label="選擇素材檔案"
          onClick={() => void form.browseFile()}
        >
          <FileSearch className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="選擇素材資料夾"
          aria-label="選擇素材資料夾"
          onClick={() => void form.browseFolder()}
        >
          <FolderSearch className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function FetchThumbnailButton({ form }: { form: AddAssetForm }) {
  return (
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
  );
}

function ThumbnailUrlPreview({ thumbnailUrl }: { thumbnailUrl: string }) {
  if (!thumbnailUrl) {
    return null;
  }

  return (
    <p className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground">
      {thumbnailUrl}
    </p>
  );
}

function BoothUrlField({ form }: { form: AddAssetForm }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Booth 連結</label>
      <div className="flex min-w-0 gap-2">
        <Input
          value={form.boothUrl}
          onChange={(event) => form.setBoothUrl(event.target.value)}
          placeholder="https://booth.pm/ja/items/..."
          className="min-w-0 flex-1"
        />
        <FetchThumbnailButton form={form} />
      </div>
      <ThumbnailUrlPreview thumbnailUrl={form.thumbnailUrl} />
    </div>
  );
}

function AddAssetModelField({
  form,
  models,
}: {
  form: AddAssetForm;
  models: Model[];
}) {
  return (
    <ModelSelectionField
      models={models}
      selectedModelIds={form.selectedModelIds}
      selectedModelIdSet={form.selectedModelIdSet}
      onSelectAll={() => form.setSelectedModelIds(models.map((model) => model.id))}
      onClear={() => form.setSelectedModelIds([])}
      onToggle={form.toggleModel}
    />
  );
}

function AddAssetTagField({ form, tags }: { form: AddAssetForm; tags: Tag[] }) {
  return (
    <TagSelectionField
      tags={tags}
      selectedTagIds={form.selectedTagIds}
      selectedTagIdSet={form.selectedTagIdSet}
      onSelectAll={() => form.setSelectedTagIds(tags.map((tag) => tag.id))}
      onClear={() => form.setSelectedTagIds([])}
      onToggle={form.toggleTag}
    />
  );
}

function RelatedLinksField({ form }: { form: AddAssetForm }) {
  return (
    <RelatedLinksEditor
      links={form.relatedLinks}
      onAdd={form.addRelatedLink}
      onCreateFirst={form.createFirstRelatedLink}
      onUpdate={form.updateRelatedLink}
      onRemove={form.removeRelatedLink}
    />
  );
}

function NoteField({ form }: { form: AddAssetForm }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">備註</label>
      <Textarea
        value={form.note}
        onChange={(event) => form.setNote(event.target.value)}
        placeholder="添加備註..."
        rows={3}
      />
    </div>
  );
}

function AddAssetFormFields({
  form,
  models,
  tags,
}: Pick<AddAssetDialogLayoutProps, "form" | "models" | "tags">) {
  return (
    <div className="space-y-4 py-4">
      <DisplayNameField form={form} />
      <AssetPathField form={form} />
      <BoothUrlField form={form} />
      <AddAssetModelField form={form} models={models} />
      <AddAssetTagField form={form} tags={tags} />
      <RelatedLinksField form={form} />
      <NoteField form={form} />
    </div>
  );
}

function AddAssetDialogFooter({
  form,
  saving,
  onClose,
}: Pick<AddAssetDialogLayoutProps, "form" | "saving" | "onClose">) {
  return (
    <DialogFooter>
      <Button variant="outline" onClick={onClose}>
        取消
      </Button>
      <Button onClick={() => void form.submit()} disabled={!form.canSubmit || saving}>
        {saving ? "新增中" : "新增素材"}
      </Button>
    </DialogFooter>
  );
}

function AddAssetDialogLayout(props: AddAssetDialogLayoutProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] min-w-0 overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>新增素材</DialogTitle>
          <DialogDescription>
            填寫素材資訊並選擇相容的模型和標籤
          </DialogDescription>
        </DialogHeader>
        <AddAssetFormFields form={props.form} models={props.models} tags={props.tags} />
        <AddAssetDialogFooter
          form={props.form}
          saving={props.saving}
          onClose={props.onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

export function AddAssetDialog() {
  return <AddAssetDialogLayout {...useAddAssetDialogController()} />;
}
