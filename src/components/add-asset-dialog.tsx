import {
  AlertTriangle,
  Archive,
  FileSearch,
  FolderSearch,
  Sparkles,
} from "lucide-react";
import { FileContentList } from "@/components/ui/file-content-list";
import { useAddAssetForm } from "@/components/add-asset-dialog/use-add-asset-form";
import { ModelSelectionField } from "@/components/asset-form/model-selection-field";
import { RelatedLinksEditor } from "@/components/asset-form/related-links-editor";
import { TagSelectionField } from "@/components/asset-form/tag-selection-field";
import { BoothModelSuggestionPanel, BoothTagSuggestionPanel } from "@/components/booth-suggestion-panel";
import { BoothShopFields } from "@/components/booth-shop-fields";
import { LibraryRootActions } from "@/components/library-root-actions";
import { Button } from "@/components/ui/button";
import { DisclosurePanel } from "@/components/ui/disclosure-panel";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogActionBar } from "@/components/ui/dialog-action-bar";
import { Input } from "@/components/ui/input";
import { SegmentedField } from "@/components/ui/segmented-field";
import { Spinner } from "@/components/ui/spinner";
import { StatusMessage } from "@/components/ui/status-message";
import { SurfaceBox } from "@/components/ui/surface-box";
import { Textarea } from "@/components/ui/textarea";
import { ToneBadge } from "@/components/ui/tone-badge";
import { useAssetStore } from "@/stores/asset-store";
import type {
  ArchiveStrategy,
  AssetCategory,
  ConflictStrategy,
  ImportOperation,
  ImportTargetPreview,
  Model,
  Tag,
} from "@/types";

type AddAssetForm = ReturnType<typeof useAddAssetForm>;

type AddAssetDialogController = {
  form: AddAssetForm;
  libraryRootPath: string | null;
  models: Model[];
  open: boolean;
  saving: boolean;
  tags: Tag[];
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
};

type AddAssetDialogLayoutProps = AddAssetDialogController;

const categoryOptions: { value: AssetCategory; label: string }[] = [
  { value: "avatar", label: "素體" },
  { value: "accessory", label: "配件" },
  { value: "world", label: "世界" },
];
const operationOptions: { value: ImportOperation; label: string }[] = [
  { value: "move", label: "移動" },
  { value: "copy", label: "複製" },
];
const archiveOptions: { value: ArchiveStrategy; label: string }[] = [
  { value: "keepArchive", label: "保留壓縮檔" },
  { value: "extract", label: "解壓後管理" },
];
const conflictOptions: {
  value: ConflictStrategy;
  label: string;
  tone?: "danger";
}[] = [
  { value: "cancel", label: "取消" },
  { value: "rename", label: "改名" },
  { value: "overwrite", label: "覆蓋", tone: "danger" },
];

function optionLabel<TValue extends string>(
  options: { value: TValue; label: string }[],
  value: TValue,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function targetSummary(
  preview: ImportTargetPreview | null,
  rootPath: string | null,
) {
  if (!preview) return "目標：選擇素材後預覽";
  if (!preview.targetPath)
    return preview.message ? `目標：${preview.message}` : "目標：無法預覽";

  let targetPath = preview.targetPath;
  if (rootPath) {
    const normalizedRoot = rootPath.replace(/[\\/]+$/, "");
    for (const prefix of [`${normalizedRoot}\\`, `${normalizedRoot}/`]) {
      if (
        targetPath.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase())
      ) {
        targetPath = targetPath.slice(prefix.length);
        break;
      }
    }
  }

  return `目標：${targetPath}`;
}

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
    librarySettings,
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
    libraryRootPath: librarySettings?.rootPath ?? null,
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
      <label className="text-sm font-semibold text-foreground/90">
        顯示名稱
      </label>
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
      <label className="text-sm font-semibold text-foreground/90">
        素材位置 <span className="text-destructive">*</span>
      </label>
      <div className="flex gap-2">
        <Input
          value={form.filePath}
          onChange={(event) => form.setFilePath(event.target.value)}
          placeholder="D:/VRChat/Assets/..."
          className="flex-1"
        />
        <IconButton
          label="選擇素材檔案"
          variant="outline"
          icon={<FileSearch className="h-4 w-4" />}
          onClick={() => void form.browseFile()}
        />
        <IconButton
          label="選擇素材資料夾"
          variant="outline"
          icon={<FolderSearch className="h-4 w-4" />}
          onClick={() => void form.browseFolder()}
        />
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
        <Spinner />
      ) : (
        "抓取資訊"
      )}
    </Button>
  );
}

function ImportRulesField({ form }: { form: AddAssetForm }) {
  const hasConflict = Boolean(form.targetPreview?.conflict);

  return (
    <div className="space-y-3">
      <div
        className={`grid gap-3 ${form.isZipPath ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
      >
        <SegmentedField
          label="分類"
          value={form.category}
          options={categoryOptions}
          onChange={form.setCategory}
        />
        <SegmentedField
          label="方式"
          value={form.operation}
          options={operationOptions}
          onChange={form.setOperation}
        />
        {form.isZipPath && (
          <SegmentedField
            label="Zip"
            value={form.archiveStrategy}
            options={archiveOptions}
            onChange={form.setArchiveStrategy}
          />
        )}
      </div>
      {hasConflict && (
        <StatusMessage
          tone="warning"
          className="rounded-md px-3 py-2 text-xs"
          icon={<AlertTriangle className="h-4 w-4" />}
          title="目標位置已有同名項目"
          action={
            <SegmentedField
              label="處理方式"
              value={form.conflictStrategy}
              options={conflictOptions}
              onChange={form.setConflictStrategy}
            />
          }
        >
          這筆素材要怎麼處理？
        </StatusMessage>
      )}
    </div>
  );
}

function TargetPreview({
  form,
  libraryRootPath,
}: {
  form: AddAssetForm;
  libraryRootPath: string | null;
}) {
  const preview = form.targetPreview;

  return (
    <SurfaceBox className="border-border/70 bg-background/35 px-3 py-2 text-xs">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-foreground/55">目標位置</p>
          <p className="mt-0.5 min-w-0 truncate text-foreground/72">
            {targetSummary(preview, libraryRootPath).replace(/^目標：/, "")}
          </p>
        </div>
        {preview?.conflict && (
          <ToneBadge tone="warning" className="shrink-0">
            需要處理同名
          </ToneBadge>
        )}
      </div>
    </SurfaceBox>
  );
}

function ZipContentField({ form }: { form: AddAssetForm }) {
  if (!form.isZipPath) return null;
  const entries =
    form.zipContents?.entries ??
    form.zipContents?.paths.map((path) => ({
      path,
      isDirectory: path.endsWith("/") || path.endsWith("\\"),
      sizeBytes: null,
    })) ??
    [];

  return (
    <SurfaceBox className="space-y-2 border-border/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Zip 內容</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={form.isLoadingZipContents}
          onClick={() => void form.loadZipContents()}
        >
          {form.isLoadingZipContents ? (
            <Spinner />
          ) : (
            <Archive className="h-4 w-4" />
          )}
          列出內容
        </Button>
      </div>
      {form.zipContents && entries.length > 0 && (
        <FileContentList
          title="壓縮檔內容"
          totalCount={form.zipContents.fileCount}
          entries={entries}
          className="bg-background/35"
          scrollClassName="max-h-36"
        />
      )}
    </SurfaceBox>
  );
}

function BoothUrlField({ form }: { form: AddAssetForm }) {
  return (
    <div className="space-y-3">
      <FormField label="Booth 連結">
        <div className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] gap-2">
          <Input
            value={form.boothUrl}
            onChange={(event) => form.setBoothUrl(event.target.value)}
            placeholder="https://booth.pm/ja/items/..."
            className="min-w-0 flex-1"
          />
          <FetchProductInfoButton form={form} />
        </div>
      </FormField>
      <BoothShopFields
        shopName={form.boothShopName}
        shopUrl={form.boothShopUrl}
        onShopNameChange={form.setBoothShopName}
        onShopUrlChange={form.setBoothShopUrl}
      />
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
        onSelectAll={() =>
          form.setSelectedModelIds(models.map((model) => model.id))
        }
        onClear={() => form.setSelectedModelIds([])}
        onToggle={form.toggleModel}
      />
      <BoothModelSuggestionPanel
        models={form.suggestedModels}
        onAdd={(model) => void form.addSuggestedModel(model)}
      />
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
      <BoothTagSuggestionPanel
        origins={form.suggestedTagOrigins}
        tags={form.suggestedTags}
        onAdd={(tagName) => void form.addSuggestedTag(tagName)}
      />
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
    <FormField label="備註">
      <Textarea
        value={form.note}
        onChange={(event) => form.setNote(event.target.value)}
        placeholder="添加備註..."
        rows={3}
      />
    </FormField>
  );
}

function SourceImportPanel({
  form,
  libraryRootPath,
}: {
  form: AddAssetForm;
  libraryRootPath: string | null;
}) {
  return (
    <SurfaceBox className="space-y-4 bg-muted/8 p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground/92">
            來源與導入
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground/90">
            {form.filePath.trim()
              ? `${optionLabel(categoryOptions, form.category)} · ${
                  form.operation === "move" ? "移動來源" : "複製來源"
                }${form.isZipPath ? ` · ${optionLabel(archiveOptions, form.archiveStrategy)}` : ""}`
              : "先選擇檔案或資料夾"}
          </p>
        </div>
        {form.targetPreview?.conflict && (
          <ToneBadge tone="warning" className="shrink-0 gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            同名
          </ToneBadge>
        )}
      </div>
      <DisplayNameField form={form} />
      <AssetPathField form={form} />
      <ImportRulesField form={form} />
      <TargetPreview form={form} libraryRootPath={libraryRootPath} />
      <ZipContentField form={form} />
    </SurfaceBox>
  );
}

function SupplementalFields({
  form,
  models,
  tags,
}: Pick<AddAssetDialogLayoutProps, "form" | "models" | "tags">) {
  return (
    <DisclosurePanel
      title="補充資料"
      description="BOOTH、相容模型、標籤、連結與備註"
      icon={<Sparkles className="h-4 w-4" />}
    >
      <BoothUrlField form={form} />
      <AddAssetModelField form={form} models={models} />
      <AddAssetTagField form={form} tags={tags} />
      <RelatedLinksField form={form} />
      <NoteField form={form} />
    </DisclosurePanel>
  );
}

function AddAssetFormFields({
  form,
  libraryRootPath,
  models,
  tags,
}: Pick<
  AddAssetDialogLayoutProps,
  "form" | "libraryRootPath" | "models" | "tags"
>) {
  return (
    <div className="space-y-4 py-4">
      <LibraryRootActions compact />
      <SourceImportPanel form={form} libraryRootPath={libraryRootPath} />
      <SupplementalFields form={form} models={models} tags={tags} />
    </div>
  );
}

function AddAssetDialogFooter({
  form,
  saving,
  onClose,
}: Pick<AddAssetDialogLayoutProps, "form" | "saving" | "onClose">) {
  return (
    <DialogActionBar>
      <Button variant="outline" onClick={onClose}>
        取消
      </Button>
      <Button
        onClick={() => void form.submit()}
        disabled={!form.canSubmit || saving}
      >
        {saving ? "新增中" : "新增素材"}
      </Button>
    </DialogActionBar>
  );
}

function AddAssetDialogLayout(props: AddAssetDialogLayoutProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[90vh] min-w-0 flex-col overflow-hidden p-0 sm:max-w-[640px]">
        <div className="overflow-y-auto px-6 pt-6">
          <DialogHeader>
            <DialogTitle>新增素材</DialogTitle>
            <DialogDescription>
              選擇來源後匯入到 app 管理的素材庫
            </DialogDescription>
          </DialogHeader>
          <AddAssetFormFields
            form={props.form}
            libraryRootPath={props.libraryRootPath}
            models={props.models}
            tags={props.tags}
          />
        </div>
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
