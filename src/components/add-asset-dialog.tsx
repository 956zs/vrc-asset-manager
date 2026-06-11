"use client";

import {
  AlertTriangle,
  Archive,
  ChevronDown,
  FileSearch,
  FileText,
  Folder,
  FolderSearch,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";
import { useAddAssetForm } from "@/components/add-asset-dialog/use-add-asset-form";
import { ModelSelectionField } from "@/components/asset-form/model-selection-field";
import { RelatedLinksEditor } from "@/components/asset-form/related-links-editor";
import { TagSelectionField } from "@/components/asset-form/tag-selection-field";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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

function formatFileSize(sizeBytes?: number | null) {
  if (sizeBytes == null) return "";
  if (sizeBytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(sizeBytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = sizeBytes / 1024 ** unitIndex;
  const digits = unitIndex === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

function SegmentedField<TValue extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: TValue;
  options: { value: TValue; label: string; tone?: "danger" }[];
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-foreground/70">{label}</p>
      <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-1 rounded-md border border-border/80 bg-background/35 p-1">
        {options.map((option) => {
          const selected = option.value === value;
          const dangerSelected = selected && option.tone === "danger";
          return (
            <button
              key={option.value}
              type="button"
              className={[
                "h-8 min-w-0 rounded-sm px-2 text-xs font-semibold leading-none transition-colors",
                selected
                  ? dangerSelected
                    ? "bg-amber-500/18 text-amber-200 ring-1 ring-amber-500/55"
                    : "bg-primary/18 text-foreground ring-1 ring-primary/45"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              ].join(" ")}
              onClick={() => onChange(option.value)}
            >
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
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
        <div className="rounded-md border border-amber-500/45 bg-amber-500/8 px-3 py-2">
          <div className="mb-2 flex items-start gap-2 text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium">目標位置已有同名項目</p>
              <p className="mt-0.5 text-amber-200/80">這筆素材要怎麼處理？</p>
            </div>
          </div>
          <SegmentedField
            label="處理方式"
            value={form.conflictStrategy}
            options={conflictOptions}
            onChange={form.setConflictStrategy}
          />
        </div>
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
    <div className="rounded-md border border-border/70 bg-background/35 px-3 py-2 text-xs">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-foreground/55">
            目標位置
          </p>
          <p className="mt-0.5 min-w-0 truncate text-foreground/72">
            {targetSummary(preview, libraryRootPath).replace(/^目標：/, "")}
          </p>
        </div>
        {preview?.conflict && (
          <span className="shrink-0 rounded-md border border-amber-500/45 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold leading-none text-amber-300">
            需要處理同名
          </span>
        )}
      </div>
    </div>
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
    <div className="space-y-2 rounded-md border border-border/70 bg-muted/10 p-3">
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
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
          列出內容
        </Button>
      </div>
      {form.zipContents && entries.length > 0 && (
        <div className="overflow-hidden rounded-md border border-border bg-background/35">
          <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
            <span className="text-xs font-semibold text-foreground/85">
              壓縮檔內容
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              共 {form.zipContents.fileCount} 個項目
            </span>
          </div>
          <ScrollArea className="max-h-36">
            <ul className="divide-y divide-border/60">
              {entries.map((entry) => {
                const sizeLabel = formatFileSize(entry.sizeBytes);
                return (
                  <li
                    key={entry.path}
                    className="flex min-w-0 items-center gap-2 px-3 py-1.5 text-xs leading-5"
                  >
                    {entry.isDirectory ? (
                      <Folder className="h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span
                      className="min-w-0 flex-1 truncate font-mono text-foreground/78"
                      title={entry.path}
                    >
                      {entry.path}
                    </span>
                    {sizeLabel && (
                      <span className="shrink-0 pl-2 font-mono text-[11px] leading-none text-muted-foreground">
                        {sizeLabel}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

function BoothUrlField({ form }: { form: AddAssetForm }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-foreground/90">
        Booth 連結
      </label>
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
      <p className="text-xs font-medium text-muted-foreground">
        BOOTH 建議標籤
      </p>
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
      <p className="text-xs font-medium text-muted-foreground">
        BOOTH 建議模型
      </p>
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
        onSelectAll={() =>
          form.setSelectedModelIds(models.map((model) => model.id))
        }
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
      <label className="text-sm font-semibold text-foreground/90">備註</label>
      <Textarea
        value={form.note}
        onChange={(event) => form.setNote(event.target.value)}
        placeholder="添加備註..."
        rows={3}
      />
    </div>
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
    <div className="space-y-4 rounded-md border border-border bg-muted/8 p-4">
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
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-500/55 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold leading-none text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5" />
            同名
          </span>
        )}
      </div>
      <DisplayNameField form={form} />
      <AssetPathField form={form} />
      <ImportRulesField form={form} />
      <TargetPreview form={form} libraryRootPath={libraryRootPath} />
      <ZipContentField form={form} />
    </div>
  );
}

function SupplementalFields({
  form,
  models,
  tags,
}: Pick<AddAssetDialogLayoutProps, "form" | "models" | "tags">) {
  return (
    <details className="group rounded-md border border-primary/35 bg-primary/5 shadow-sm transition-colors open:border-primary/55 open:bg-primary/8 hover:border-primary/55 hover:bg-primary/8">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-foreground/92">
                補充資料
              </p>
              <span className="rounded-md border border-border/70 px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground">
                可選
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              BOOTH、相容模型、標籤、連結與備註
            </p>
          </div>
        </div>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 px-1 text-xs font-medium text-foreground transition-colors group-hover:text-primary">
          <span className="group-open:hidden">展開</span>
          <span className="hidden group-open:inline">收合</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="space-y-4 border-t border-border/70 px-4 py-4">
        <BoothUrlField form={form} />
        <AddAssetModelField form={form} models={models} />
        <AddAssetTagField form={form} tags={tags} />
        <RelatedLinksField form={form} />
        <NoteField form={form} />
      </div>
    </details>
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
    <DialogFooter className="border-t border-border bg-background px-6 py-4 sm:items-center">
      <Button variant="outline" onClick={onClose}>
        取消
      </Button>
      <Button
        onClick={() => void form.submit()}
        disabled={!form.canSubmit || saving}
      >
        {saving ? "新增中" : "新增素材"}
      </Button>
    </DialogFooter>
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
