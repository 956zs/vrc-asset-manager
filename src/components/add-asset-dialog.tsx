"use client";

import { Archive, FileSearch, FolderSearch, Loader2, Plus } from "lucide-react";
import { useAddAssetForm } from "@/components/add-asset-dialog/use-add-asset-form";
import { ModelSelectionField } from "@/components/asset-form/model-selection-field";
import { RelatedLinksEditor } from "@/components/asset-form/related-links-editor";
import { TagSelectionField } from "@/components/asset-form/tag-selection-field";
import { ImportOptionSelect } from "@/components/import-option-select";
import { LibraryRootActions } from "@/components/library-root-actions";
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
    listZipContents,
    managedImportBatch,
    models,
    previewManagedImportTarget,
    tags,
    saving,
    isAddAssetDialogOpen,
    setAddAssetDialogOpen,
    addModel,
    addTag,
  } = useAssetStore();
  const form = useAddAssetForm({
    addModel,
    addTag,
    listZipContents,
    managedImportBatch,
    models,
    previewManagedImportTarget,
    tags,
  });
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

function FetchProductInfoButton({ form }: { form: AddAssetForm }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0"
      disabled={!form.boothUrl.trim() || form.isFetchingProductInfo}
      onClick={() => void form.fetchProductInfo()}
    >
      {form.isFetchingProductInfo ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        "抓取資訊"
      )}
    </Button>
  );
}

function ImportRulesField({ form }: { form: AddAssetForm }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ImportOptionSelect
        label="分類"
        help="決定素材會放進哪個主要資料夾。這不是標籤，只影響素材庫裡的存放位置。"
        value={form.category}
        options={[
          { value: "avatar", label: "素體" },
          { value: "accessory", label: "素體配件" },
          { value: "world", label: "世界" },
        ]}
        onChange={form.setCategory}
      />
      <ImportOptionSelect
        label="方式"
        help="移動會把原檔搬進素材庫；複製會保留原檔，再複製一份到素材庫。"
        value={form.operation}
        options={[
          { value: "move", label: "移動" },
          { value: "copy", label: "複製" },
        ]}
        onChange={form.setOperation}
      />
      {form.isZipPath && (
        <ImportOptionSelect
          label="Zip"
          help="保留壓縮檔會直接管理 .zip；解壓後管理會把內容解開成資料夾。"
          value={form.archiveStrategy}
          options={[
            { value: "keepArchive", label: "保留壓縮檔" },
            { value: "extract", label: "解壓後管理" },
          ]}
          onChange={form.setArchiveStrategy}
        />
      )}
      <ImportOptionSelect
        label="衝突"
        help="目標位置已經有同名檔案或資料夾時，決定要取消、自動改名，還是覆蓋。"
        value={form.conflictStrategy}
        options={[
          { value: "cancel", label: "取消" },
          { value: "rename", label: "改名" },
          { value: "overwrite", label: "覆蓋" },
        ]}
        onChange={form.setConflictStrategy}
      />
    </div>
  );
}

function TargetPreview({ form }: { form: AddAssetForm }) {
  const preview = form.targetPreview;
  if (!preview) return null;

  return (
    <div className="space-y-1 rounded-md border border-border bg-muted/30 p-3 text-xs">
      <p className="font-medium text-muted-foreground">目標路徑預覽</p>
      <p className="break-all text-foreground">{preview.targetPath ?? preview.message}</p>
      {preview.conflict && (
        <p className="font-medium text-destructive">目標已存在，請確認衝突處理方式。</p>
      )}
    </div>
  );
}

function ZipContentField({ form }: { form: AddAssetForm }) {
  if (!form.isZipPath) return null;

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Zip 內容</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={form.isLoadingZipContents}
          onClick={() => void form.loadZipContents()}
        >
          {form.isLoadingZipContents ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
          列出內容
        </Button>
      </div>
      {form.zipContents && (
        <div className="max-h-36 overflow-auto rounded-md bg-muted/30 p-2 text-xs">
          <p className="mb-2 text-muted-foreground">{form.zipContents.fileCount} 個檔案</p>
          {form.zipContents.paths.map((path) => (
            <p key={path} className="break-all">
              {path}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function BoothUrlField({ form }: { form: AddAssetForm }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Booth 連結</label>
      <div className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Input
          value={form.boothUrl}
          onChange={(event) => form.setBoothUrl(event.target.value)}
          placeholder="https://booth.pm/ja/items/..."
          className="min-w-0 flex-1"
        />
        <FetchProductInfoButton form={form} />
      </div>
    </div>
  );
}

function SuggestedBoothTags({ form }: { form: AddAssetForm }) {
  if (form.suggestedTags.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">BOOTH 建議標籤</p>
      <div className="flex min-w-0 max-w-full flex-wrap gap-2 overflow-hidden">
        {form.suggestedTags.map((tagName) => (
          <Button
            key={tagName}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 min-w-0 !max-w-full !shrink gap-1 px-2 text-xs"
            onClick={() => void form.addSuggestedTag(tagName)}
          >
            <Plus className="h-3 w-3 shrink-0" />
            <span className="min-w-0 truncate">{tagName}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

function SuggestedBoothModels({ form }: { form: AddAssetForm }) {
  if (form.suggestedModels.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">BOOTH 建議模型</p>
      <div className="flex min-w-0 max-w-full flex-wrap gap-2 overflow-hidden">
        {form.suggestedModels.map((model) => (
          <Button
            key={model.name}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 min-w-0 !max-w-full !shrink gap-1 px-2 text-xs"
            onClick={() => void form.addSuggestedModel(model)}
          >
            <Plus className="h-3 w-3 shrink-0" />
            <span className="min-w-0 truncate">{model.label}</span>
          </Button>
        ))}
      </div>
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
    <div className="space-y-3">
      <ModelSelectionField
        models={models}
        selectedModelIds={form.selectedModelIds}
        selectedModelIdSet={form.selectedModelIdSet}
        onSelectAll={() => form.setSelectedModelIds(models.map((model) => model.id))}
        onClear={() => form.setSelectedModelIds([])}
        onToggle={form.toggleModel}
      />
      <SuggestedBoothModels form={form} />
    </div>
  );
}

function AddAssetTagField({ form, tags }: { form: AddAssetForm; tags: Tag[] }) {
  return (
    <div className="space-y-3">
      <TagSelectionField
        tags={tags}
        selectedTagIds={form.selectedTagIds}
        selectedTagIdSet={form.selectedTagIdSet}
        onSelectAll={() => form.setSelectedTagIds(tags.map((tag) => tag.id))}
        onClear={() => form.setSelectedTagIds([])}
        onToggle={form.toggleTag}
      />
      <SuggestedBoothTags form={form} />
    </div>
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
}: Pick<
  AddAssetDialogLayoutProps,
  "form" | "models" | "tags"
>) {
  return (
    <div className="space-y-4 py-4">
      <LibraryRootActions compact />
      <DisplayNameField form={form} />
      <AssetPathField form={form} />
      <ImportRulesField form={form} />
      <TargetPreview form={form} />
      <ZipContentField form={form} />
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
      <DialogContent className="max-h-[90vh] min-w-0 overflow-x-hidden overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>新增素材</DialogTitle>
          <DialogDescription>
            選擇來源後匯入到 app 管理的素材庫
          </DialogDescription>
        </DialogHeader>
        <AddAssetFormFields
          form={props.form}
          models={props.models}
          tags={props.tags}
        />
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
