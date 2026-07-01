import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  Archive,
  AlertTriangle,
  CheckCircle2,
  FolderOpen,
  Package,
  Sparkles,
  XCircle,
} from "lucide-react";
import { FileContentList } from "@/components/ui/file-content-list";
import {
  compactModelSelectionPreset,
  compactRelatedLinksPreset,
  compactTagSelectionPreset,
} from "@/components/asset-form/field-presets";
import { ModelSelectionField } from "@/components/asset-form/model-selection-field";
import { RelatedLinksEditor } from "@/components/asset-form/related-links-editor";
import { TagSelectionField } from "@/components/asset-form/tag-selection-field";
import {
  BoothModelSuggestionPanel,
  BoothTagSuggestionPanel,
} from "@/components/booth-suggestion-panel";
import { BoothShopFields } from "@/components/booth-shop-fields";
import { LibraryRootActions } from "@/components/library-root-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DisclosureButton,
  DisclosureChevron,
} from "@/components/ui/disclosure";
import { DisclosurePanel } from "@/components/ui/disclosure-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogActionBar } from "@/components/ui/dialog-action-bar";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { IconTile } from "@/components/ui/icon-tile";
import { Input } from "@/components/ui/input";
import { SegmentedField } from "@/components/ui/segmented-field";
import { Spinner } from "@/components/ui/spinner";
import { StatusMessage } from "@/components/ui/status-message";
import { SurfaceBox } from "@/components/ui/surface-box";
import { Textarea } from "@/components/ui/textarea";
import { ToneBadge } from "@/components/ui/tone-badge";
import {
  addEmptyRelatedLink,
  normalizeRelatedLinks,
  removeRelatedLink,
  updateRelatedLink,
} from "@/lib/asset-links";
import {
  applyBoothProductInfo,
  fetchBoothProductInfo,
  mergeBoothTagOrigins,
  mergeIds,
  type SuggestedBoothTagOrigins,
  type SuggestedBoothModel,
} from "@/lib/booth-product-info";
import { toggleId } from "@/lib/id-list";
import { suggestedTagColor } from "@/lib/sensitive-content";
import { invokeTauri } from "@/lib/tauri-runtime";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/stores/asset-store";
import type {
  ArchiveStrategy,
  AssetCategory,
  ConflictStrategy,
  ImportOperation,
  ImportSourceInfo,
  ImportSourceKind,
  ImportTargetPreview,
  ManagedImportBatchReport,
  ManagedImportItemInput,
  Model,
  AssetLinkInput,
  SourceContentList,
  Tag,
} from "@/types";

type BatchImportDraft = {
  id: string;
  sourcePath: string;
  sourceInfo?: ImportSourceInfo;
  category: AssetCategory;
  operation: ImportOperation;
  archiveStrategy: ArchiveStrategy;
  conflictStrategy: ConflictStrategy;
  displayName: string;
  boothUrl: string;
  boothShopName: string;
  boothShopUrl: string;
  thumbnailUrl: string;
  note: string;
  modelIds: number[];
  tagIds: number[];
  relatedLinks: AssetLinkInput[];
  suggestedModels: SuggestedBoothModel[];
  suggestedTags: string[];
  suggestedTagOrigins: SuggestedBoothTagOrigins;
  boothFetchStatus: "idle" | "loading" | "success" | "error";
  confirmed: boolean;
};

type BulkImportDraft = Pick<
  BatchImportDraft,
  "category" | "operation" | "archiveStrategy"
>;

type BatchImportDialogProps = {
  open: boolean;
  paths: string[];
  onOpenChange: (open: boolean) => void;
};

type StateSurfaceTone = "default" | "success" | "warning" | "danger";

const isZipPath = (path: string) => path.toLocaleLowerCase().endsWith(".zip");
const isUnityPackagePath = (path: string) =>
  path.toLocaleLowerCase().endsWith(".unitypackage");
const sourceName = (path: string) => path.split(/[\\/]/).pop() || path;
const categoryOptions: { value: AssetCategory; label: string }[] = [
  { value: "avatar", label: "素體" },
  { value: "accessory", label: "配件" },
  { value: "world", label: "世界" },
];
const operationOptions: { value: ImportOperation; label: string }[] = [
  { value: "move", label: "移動" },
  { value: "copy", label: "複製" },
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
const archiveOptions: { value: ArchiveStrategy; label: string }[] = [
  { value: "keepArchive", label: "保留壓縮檔" },
  { value: "extract", label: "解壓後管理" },
];

const stateSurfaceToneClassNames: Record<StateSurfaceTone, string> = {
  default: "border-border/90 bg-background",
  success: "border-emerald-500/35 bg-emerald-500/5",
  warning: "border-amber-500/45 bg-amber-500/5",
  danger: "border-destructive/45 bg-destructive/5",
};

function StateSurface({
  className,
  tone = "default",
  ...props
}: ComponentProps<"div"> & { tone?: StateSurfaceTone }) {
  return (
    <div
      className={cn(
        "rounded-md border transition-colors",
        stateSurfaceToneClassNames[tone],
        className,
      )}
      {...props}
    />
  );
}

const defaultBulkDraft: BulkImportDraft = {
  category: "accessory",
  operation: "move",
  archiveStrategy: "keepArchive",
};

function createDrafts(paths: string[], startIndex = 0): BatchImportDraft[] {
  return paths.map((path, index) => ({
    id: `${startIndex + index}-${path}`,
    sourcePath: path,
    category: "accessory",
    operation: "move",
    archiveStrategy: "keepArchive",
    conflictStrategy: "cancel",
    displayName: "",
    boothUrl: "",
    boothShopName: "",
    boothShopUrl: "",
    thumbnailUrl: "",
    note: "",
    modelIds: [],
    tagIds: [],
    relatedLinks: [],
    suggestedModels: [],
    suggestedTags: [],
    suggestedTagOrigins: {},
    boothFetchStatus: "idle",
    confirmed: false,
  }));
}

function draftToInput(draft: BatchImportDraft): ManagedImportItemInput {
  return {
    sourcePath: draft.sourcePath,
    category: draft.category,
    operation: draft.operation,
    archiveStrategy: isZipPath(draft.sourcePath) ? draft.archiveStrategy : null,
    conflictStrategy: draft.conflictStrategy,
    displayName: draft.displayName.trim() || null,
    boothUrl: draft.boothUrl.trim() || null,
    boothShopName: draft.boothShopName.trim() || null,
    boothShopUrl: draft.boothShopUrl.trim() || null,
    thumbnailUrl: draft.thumbnailUrl.trim() || null,
    note: draft.note.trim() || null,
    modelIds: draft.modelIds,
    tagIds: draft.tagIds,
    relatedLinks: normalizeRelatedLinks(draft.relatedLinks),
  };
}

function mergeSuggestedModels(
  current: SuggestedBoothModel[],
  next: SuggestedBoothModel[],
) {
  const existing = new Set(
    current.map((model) => model.name.toLocaleLowerCase()),
  );
  const merged = [...current];
  for (const model of next) {
    const key = model.name.toLocaleLowerCase();
    if (!existing.has(key)) {
      existing.add(key);
      merged.push(model);
    }
  }
  return merged;
}

function mergeSuggestedTags(current: string[], next: string[]) {
  const existing = new Set(current.map((tag) => tag.toLocaleLowerCase()));
  const merged = [...current];
  for (const tag of next) {
    const key = tag.toLocaleLowerCase();
    if (!existing.has(key)) {
      existing.add(key);
      merged.push(tag);
    }
  }
  return merged;
}

const normalizedLookup = (value: string) => value.trim().toLocaleLowerCase();

function existingModelForSuggestion(
  models: readonly Model[],
  suggestion: SuggestedBoothModel,
) {
  const keys = [suggestion.name, suggestion.displayName ?? "", suggestion.label]
    .filter(Boolean)
    .map(normalizedLookup);

  return models.find((model) =>
    [model.name, model.display_name ?? ""]
      .filter(Boolean)
      .map(normalizedLookup)
      .some((key) => keys.includes(key)),
  );
}

function existingTagForSuggestion(tags: readonly Tag[], tagName: string) {
  const key = normalizedLookup(tagName);
  return tags.find((tag) => normalizedLookup(tag.name) === key);
}

function sourceKindForDraft(draft: BatchImportDraft): ImportSourceKind {
  if (draft.sourceInfo) return draft.sourceInfo.kind;
  if (isZipPath(draft.sourcePath)) return "zip";
  if (isUnityPackagePath(draft.sourcePath)) return "unityPackage";
  return "folder";
}

function optionLabel<TValue extends string>(
  options: { value: TValue; label: string }[],
  value: TValue,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function isDraftSupported(draft: BatchImportDraft) {
  return draft.sourceInfo?.supported ?? true;
}

function sourceKindLabel(kind: ImportSourceKind) {
  switch (kind) {
    case "folder":
      return "資料夾";
    case "zip":
      return "ZIP";
    case "unityPackage":
      return "UnityPackage";
    default:
      return "不支援";
  }
}

function SourceKindIcon({ kind }: { kind: ImportSourceKind }) {
  switch (kind) {
    case "folder":
      return <FolderOpen className="h-4 w-4" />;
    case "zip":
      return <Archive className="h-4 w-4" />;
    case "unityPackage":
      return <Package className="h-4 w-4" />;
    default:
      return <XCircle className="h-4 w-4" />;
  }
}

function StatusBadge({
  draft,
  preview,
}: {
  draft: BatchImportDraft;
  preview?: ImportTargetPreview;
}) {
  if (draft.sourceInfo && !draft.sourceInfo.supported) {
    return <ToneBadge tone="danger">無法導入</ToneBadge>;
  }
  if (preview?.conflict) {
    return <ToneBadge tone="warning">目標衝突</ToneBadge>;
  }
  return <ToneBadge tone="success">可導入</ToneBadge>;
}

function draftPlanSummary(draft: BatchImportDraft) {
  const values = [
    optionLabel(categoryOptions, draft.category),
    draft.operation === "move" ? "移動來源" : "複製來源",
    sourceKindForDraft(draft) === "zip"
      ? optionLabel(archiveOptions, draft.archiveStrategy)
      : null,
  ].filter(Boolean);

  return values.join(" · ");
}

function metadataSummaryText(draft: BatchImportDraft) {
  const values = [
    draft.boothUrl.trim() ? "BOOTH" : null,
    draft.boothShopName.trim() ? "Shop" : null,
    draft.modelIds.length > 0 ? `${draft.modelIds.length} 模型` : null,
    draft.tagIds.length > 0 ? `${draft.tagIds.length} 標籤` : null,
    draft.relatedLinks.length > 0 ? `${draft.relatedLinks.length} 連結` : null,
    draft.note.trim() ? "備註" : null,
    draft.suggestedModels.length + draft.suggestedTags.length > 0
      ? "有建議"
      : null,
  ].filter(Boolean);

  return values.join(" · ");
}

function targetSummary(
  preview?: ImportTargetPreview,
  rootPath?: string | null,
) {
  if (!preview) return "目標：計算中";
  if (!preview.targetPath)
    return preview.message ? `目標：${preview.message}` : "目標：無法預覽";

  let targetPath = preview.targetPath;
  if (rootPath) {
    const normalizedRoot = rootPath.replace(/[\\/]+$/, "");
    const rootPrefix = `${normalizedRoot}\\`;
    const altRootPrefix = `${normalizedRoot}/`;
    if (
      targetPath.toLocaleLowerCase().startsWith(rootPrefix.toLocaleLowerCase())
    ) {
      targetPath = targetPath.slice(rootPrefix.length);
    } else if (
      targetPath
        .toLocaleLowerCase()
        .startsWith(altRootPrefix.toLocaleLowerCase())
    ) {
      targetPath = targetPath.slice(altRootPrefix.length);
    }
  }

  return `目標：${targetPath}`;
}

function conflictSummary(strategy: ConflictStrategy) {
  switch (strategy) {
    case "rename":
      return "同名：自動改名";
    case "overwrite":
      return "同名：覆蓋";
    default:
      return "同名：取消這筆";
  }
}

function resultOperationLabel(operation: string) {
  switch (operation) {
    case "move":
      return "移動";
    case "copy":
      return "複製";
    case "extract":
      return "解壓";
    default:
      return operation || "未記錄";
  }
}

function resultFailureStageLabel(stage: string | null) {
  switch (stage) {
    case "preflight":
      return "預檢失敗";
    case "fileOperation":
      return "檔案處理失敗";
    case "dbRecord":
      return "DB 記錄失敗";
    default:
      return null;
  }
}

function contentTitle(kind: ImportSourceKind) {
  if (kind === "zip") return "壓縮檔內容";
  if (kind === "folder") return "資料夾內容";
  return "內容";
}

function draftSurfaceTone({
  confirmed,
  hasConflict,
  sourceSupported,
}: {
  confirmed: boolean;
  hasConflict: boolean;
  sourceSupported: boolean;
}): StateSurfaceTone {
  if (!sourceSupported) return "danger";
  if (hasConflict) return "warning";
  if (confirmed) return "success";
  return "default";
}

function importResultSurfaceTone(
  success: boolean,
  partialFailure: boolean,
): StateSurfaceTone {
  if (success) return "success";
  if (partialFailure) return "warning";
  return "danger";
}

function TargetPreviewLine({ preview }: { preview?: ImportTargetPreview }) {
  if (!preview) {
    return <p className="text-xs text-muted-foreground">正在產生目標路徑...</p>;
  }

  return (
    <div className="space-y-1 text-xs">
      <p className="break-all text-muted-foreground">
        {preview.targetPath ?? preview.message ?? "無法產生目標路徑"}
      </p>
      {preview.conflict && <ToneBadge tone="danger">目標衝突</ToneBadge>}
    </div>
  );
}

function PathDetails({
  draft,
  open,
  preview,
  sourceSupported,
  onToggle,
}: {
  draft: BatchImportDraft;
  open: boolean;
  preview?: ImportTargetPreview;
  sourceSupported: boolean;
  onToggle: () => void;
}) {
  if (!sourceSupported) {
    return (
      <StatusMessage
        tone="danger"
        className="rounded-md px-3 py-2 text-xs"
        icon={<AlertTriangle className="h-4 w-4" />}
      >
        {draft.sourceInfo?.message ?? "此來源目前無法導入"}
      </StatusMessage>
    );
  }

  return (
    <SurfaceBox className="border-border/70 px-3 py-2">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs text-muted-foreground/90">
          {preview?.conflict
            ? "目標位置已有同名項目"
            : "需要時可檢視來源與導入目標"}
        </p>
        <DisclosureButton
          expanded={open}
          chevronClassName="h-3.5 w-3.5"
          className="h-7 px-2 text-xs font-semibold"
          onClick={onToggle}
        >
          {open ? "隱藏路徑" : "檢視路徑"}
        </DisclosureButton>
      </div>
      {open && (
        <div className="mt-2 space-y-2 border-t border-border/70 pt-2 text-xs">
          <div>
            <p className="text-[11px] font-semibold text-foreground/55">來源</p>
            <p className="mt-1 break-all text-foreground/78">{draft.sourcePath}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-foreground/55">目標</p>
            <div className="mt-1">
              <TargetPreviewLine preview={preview} />
            </div>
          </div>
        </div>
      )}
    </SurfaceBox>
  );
}

function SourceContentsButton({
  draft,
  loading,
  onOpen,
}: {
  draft: BatchImportDraft;
  loading: boolean;
  onOpen: () => void;
}) {
  const kind = sourceKindForDraft(draft);

  if (kind === "unityPackage" || kind === "unsupported") return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="shrink-0 font-semibold"
      disabled={loading}
      onClick={onOpen}
    >
      {loading ? (
        <Spinner />
      ) : kind === "zip" ? (
        <Archive className="h-4 w-4" />
      ) : (
        <FolderOpen className="h-4 w-4" />
      )}
      檢視內容
    </Button>
  );
}

function SourceContentsDialog({
  draft,
  contents,
  loading,
  onOpenChange,
}: {
  draft: BatchImportDraft | null;
  contents?: SourceContentList;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const kind = draft ? sourceKindForDraft(draft) : "unsupported";
  const entries =
    contents?.entries ??
    contents?.paths.map((path) => ({
      path,
      isDirectory: path.endsWith("/") || path.endsWith("\\"),
      sizeBytes: null,
    })) ??
    [];
  const hiddenCount = contents
    ? Math.max(contents.fileCount - entries.length, 0)
    : 0;

  return (
    <Dialog open={Boolean(draft)} onOpenChange={onOpenChange}>
      {draft && (
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>檢視內容</DialogTitle>
            <DialogDescription>
              {sourceName(draft.sourcePath)}
            </DialogDescription>
          </DialogHeader>
          <FileContentList
            title={contentTitle(kind)}
            totalCount={contents?.fileCount ?? 0}
            entries={entries}
            hiddenCount={hiddenCount}
            loading={loading}
            truncated={Boolean(contents?.truncated)}
          />
          <DialogActionBar layout="inset">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void invokeTauri("open_file_location", {
                  path: draft.sourcePath,
                })
              }
            >
              <FolderOpen className="h-4 w-4" />
              在檔案總管中開啟
            </Button>
            <Button type="button" onClick={() => onOpenChange(false)}>
              關閉
            </Button>
          </DialogActionBar>
        </DialogContent>
      )}
    </Dialog>
  );
}

function MetadataDetails({
  draft,
  open,
  children,
  onToggle,
}: {
  draft: BatchImportDraft;
  open: boolean;
  children: ReactNode;
  onToggle: () => void;
}) {
  const summary = metadataSummaryText(draft);

  return (
    <DisclosurePanel
      title="補充資料"
      description={summary || "BOOTH、模型、標籤與備註"}
      icon={<Sparkles className="h-3.5 w-3.5" />}
      open={open}
      size="compact"
      toggleLabel={(expanded) => (expanded ? "收合" : summary ? "編輯" : "展開")}
      onOpenChange={onToggle}
    >
      {children}
    </DisclosurePanel>
  );
}

function ConflictResolution({
  value,
  onChange,
}: {
  value: ConflictStrategy;
  onChange: (value: ConflictStrategy) => void;
}) {
  return (
    <StatusMessage
      tone="warning"
      className="rounded-md px-3 py-2 text-xs"
      icon={<AlertTriangle className="h-4 w-4" />}
      title="目標位置已有同名項目"
      action={
        <SegmentedField
          label="處理方式"
          help="只有這筆素材發生同名衝突時才需要選。取消會讓這筆不導入；改名會自動加上不重複名稱；覆蓋會取代素材庫內同名項目。"
          value={value}
          options={conflictOptions}
          onChange={onChange}
        />
      }
    >
      這筆素材要怎麼處理？
    </StatusMessage>
  );
}

function BulkApplyControls({
  draft,
  hasZipItems,
  open,
  onChange,
  onApply,
  onOpenChange,
}: {
  draft: BulkImportDraft;
  hasZipItems: boolean;
  open: boolean;
  onChange: (patch: Partial<BulkImportDraft>) => void;
  onApply: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const summary = [
    optionLabel(categoryOptions, draft.category),
    optionLabel(operationOptions, draft.operation),
    hasZipItems ? optionLabel(archiveOptions, draft.archiveStrategy) : null,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <SurfaceBox>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
          onClick={() => onOpenChange(!open)}
        >
          <DisclosureChevron
            expanded={open}
            className="shrink-0 text-muted-foreground"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium">批量套用</span>
            <p className="truncate text-xs text-muted-foreground">
              {summary
                ? `批量套用：${summary}`
                : "把常用導入規則一次套到所有項目"}
            </p>
          </span>
        </button>
        {open && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mr-2"
            onClick={onApply}
          >
            套用到全部
          </Button>
        )}
      </div>
      {open && (
        <div
          className={`grid gap-2 border-t border-border px-3 pb-3 pt-2 ${hasZipItems ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
        >
          <SegmentedField
            label="分類"
            help="決定素材會放進哪個主要資料夾。配件包含衣服、頭髮、飾品、道具等非素體素材。"
            value={draft.category}
            options={categoryOptions}
            onChange={(category) => onChange({ category })}
          />
          <SegmentedField
            label="方式"
            help="移動會把原檔搬進素材庫；複製會保留原檔，再複製一份到素材庫。"
            value={draft.operation}
            options={operationOptions}
            onChange={(operation) => onChange({ operation })}
          />
          {hasZipItems && (
            <SegmentedField
              label="Zip"
              help="只影響 .zip，對資料夾與 .unitypackage 無效。保留壓縮檔會直接管理 .zip；解壓後管理會把內容解開成資料夾。"
              value={draft.archiveStrategy}
              options={archiveOptions}
              onChange={(archiveStrategy) => onChange({ archiveStrategy })}
            />
          )}
        </div>
      )}
    </SurfaceBox>
  );
}

function ItemMetadataFields({
  draft,
  models,
  tags,
  onAddSuggestedModel,
  onAddSuggestedTag,
  onFetchBooth,
  onUpdate,
}: {
  draft: BatchImportDraft;
  models: Model[];
  tags: Tag[];
  onAddSuggestedModel: (model: SuggestedBoothModel) => void;
  onAddSuggestedTag: (tagName: string) => void;
  onFetchBooth: () => void;
  onUpdate: (patch: Partial<BatchImportDraft>) => void;
}) {
  const selectedModelIdSet = new Set(draft.modelIds);
  const selectedTagIdSet = new Set(draft.tagIds);
  const loadingBooth = draft.boothFetchStatus === "loading";
  const addRelatedLink = () =>
    onUpdate({ relatedLinks: addEmptyRelatedLink(draft.relatedLinks) });
  const updateDraftRelatedLink = (
    index: number,
    field: keyof AssetLinkInput,
    value: string,
  ) =>
    onUpdate({
      relatedLinks: updateRelatedLink({
        links: draft.relatedLinks,
        index,
        field,
        value,
      }),
    });
  const removeDraftRelatedLink = (index: number) =>
    onUpdate({
      relatedLinks: removeRelatedLink(draft.relatedLinks, index),
    });
  const boothStatusText =
    draft.boothFetchStatus === "loading"
      ? "抓取中"
      : draft.boothFetchStatus === "success"
        ? "已套用建議"
        : draft.boothFetchStatus === "error"
          ? "抓取失敗，可重試"
          : null;

  return (
    <SurfaceBox className="space-y-3 border-transparent bg-muted/15 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="顯示名稱" variant="compact">
          <Input
            value={draft.displayName}
            onChange={(event) => onUpdate({ displayName: event.target.value })}
            placeholder={sourceName(draft.sourcePath)}
          />
        </FormField>
        <FormField label="BOOTH 連結" variant="compact">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Input
              value={draft.boothUrl}
              onChange={(event) =>
                onUpdate({
                  boothUrl: event.target.value,
                  boothFetchStatus: "idle",
                })
              }
              placeholder="https://booth.pm/ja/items/..."
            />
            <IconButton
              label="抓取 BOOTH 資訊"
              variant="outline"
              icon={loadingBooth ? <Spinner /> : <Sparkles className="h-4 w-4" />}
              disabled={!draft.boothUrl.trim() || loadingBooth}
              onClick={onFetchBooth}
            />
          </div>
          {boothStatusText && (
            <p
              className={cn(
                "text-xs",
                draft.boothFetchStatus === "error"
                  ? "text-destructive"
                  : draft.boothFetchStatus === "success"
                    ? "text-emerald-300"
                    : "text-muted-foreground",
              )}
            >
              {boothStatusText}
            </p>
          )}
        </FormField>
      </div>
      <BoothShopFields
        shopName={draft.boothShopName}
        shopUrl={draft.boothShopUrl}
        variant="compact"
        onShopNameChange={(boothShopName) => onUpdate({ boothShopName })}
        onShopUrlChange={(boothShopUrl) => onUpdate({ boothShopUrl })}
      />
      <FormField label="備註" variant="compact">
        <Textarea
          value={draft.note}
          onChange={(event) => onUpdate({ note: event.target.value })}
          rows={2}
          placeholder="添加備註..."
        />
      </FormField>
      <div className="grid gap-3 lg:grid-cols-2">
        <ModelSelectionField
          {...compactModelSelectionPreset}
          models={models}
          selectedModelIds={draft.modelIds}
          selectedModelIdSet={selectedModelIdSet}
          onSelectAll={() =>
            onUpdate({ modelIds: models.map((model) => model.id) })
          }
          onClear={() => onUpdate({ modelIds: [] })}
          onToggle={(modelId) =>
            onUpdate({ modelIds: toggleId(draft.modelIds, modelId) })
          }
        />
        <TagSelectionField
          {...compactTagSelectionPreset}
          tags={tags}
          selectedTagIds={draft.tagIds}
          selectedTagIdSet={selectedTagIdSet}
          onSelectAll={() => onUpdate({ tagIds: tags.map((tag) => tag.id) })}
          onClear={() => onUpdate({ tagIds: [] })}
          onToggle={(tagId) =>
            onUpdate({ tagIds: toggleId(draft.tagIds, tagId) })
          }
        />
      </div>
      <RelatedLinksEditor
        {...compactRelatedLinksPreset}
        links={draft.relatedLinks}
        onAdd={addRelatedLink}
        onCreateFirst={addRelatedLink}
        onUpdate={updateDraftRelatedLink}
        onRemove={removeDraftRelatedLink}
      />
      <BoothModelSuggestionPanel
        models={draft.suggestedModels}
        onAdd={onAddSuggestedModel}
      />
      <BoothTagSuggestionPanel
        origins={draft.suggestedTagOrigins}
        tags={draft.suggestedTags}
        onAdd={onAddSuggestedTag}
      />
    </SurfaceBox>
  );
}

function BatchImportReport({
  report,
  onClose,
}: {
  report: ManagedImportBatchReport;
  onClose: () => void;
}) {
  return (
    <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[760px]">
      <DialogHeader>
        <DialogTitle>導入結果</DialogTitle>
        <DialogDescription>
          {report.succeeded} 成功，{report.failed} 失敗
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        {report.results.map((result) => {
          const partialFailure =
            !result.success &&
            result.failureStage === "dbRecord" &&
            Boolean(result.finalPath);
          const StatusIcon = result.success
            ? CheckCircle2
            : partialFailure
              ? AlertTriangle
              : XCircle;
          const failureStageLabel = resultFailureStageLabel(result.failureStage);

          return (
            <StateSurface
              key={result.sourcePath}
              className="p-3"
              tone={importResultSurfaceTone(result.success, partialFailure)}
            >
              <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <StatusIcon
                      className={cn(
                        "h-4 w-4",
                        result.success
                          ? "text-emerald-500"
                          : partialFailure
                            ? "text-amber-500"
                            : "text-destructive",
                      )}
                    />
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">
                      {sourceName(result.sourcePath)}
                    </p>
                    <ToneBadge
                      tone={
                        result.success
                          ? "success"
                          : partialFailure
                            ? "warning"
                            : "danger"
                      }
                    >
                      {result.success
                        ? "成功"
                        : partialFailure
                          ? "檔案已處理"
                          : "失敗"}
                    </ToneBadge>
                    <ToneBadge>
                      {resultOperationLabel(result.operation)}
                    </ToneBadge>
                    {failureStageLabel && (
                      <ToneBadge tone={partialFailure ? "warning" : "danger"}>
                        {failureStageLabel}
                      </ToneBadge>
                    )}
                  </div>
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      result.success
                        ? "text-emerald-300"
                        : partialFailure
                          ? "text-amber-300"
                          : "text-destructive",
                    )}
                  >
                    {result.message}
                  </p>
                  {partialFailure && (
                    <p className="mt-1 text-xs text-amber-200">
                      檔案已經移入素材庫位置，但沒有建立素材資料。可先開啟目標位置手動確認檔案，再重新建立素材記錄。
                    </p>
                  )}
                </div>
                {result.finalPath && (
                  <IconButton
                    label="開啟目標資料夾"
                    variant="ghost"
                    className="justify-self-end"
                    icon={<FolderOpen className="h-4 w-4" />}
                    onClick={() =>
                      void invokeTauri("open_file_location", {
                        path: result.finalPath,
                      })
                    }
                  />
                )}
              </div>
              <div className="mt-3 grid gap-2 text-xs">
                <div>
                  <p className="font-medium text-muted-foreground">來源</p>
                  <p className="mt-0.5 break-all text-foreground/85">
                    {result.sourcePath}
                  </p>
                </div>
                {result.finalPath && (
                  <div>
                    <p className="font-medium text-muted-foreground">最終路徑</p>
                    <p className="mt-0.5 break-all text-foreground/85">
                      {result.finalPath}
                    </p>
                  </div>
                )}
                {failureStageLabel && (
                  <div>
                    <p className="font-medium text-muted-foreground">失敗階段</p>
                    <p className="mt-0.5 text-foreground/85">
                      {failureStageLabel}
                    </p>
                  </div>
                )}
              </div>
            </StateSurface>
          );
        })}
      </div>
      <DialogActionBar className="px-0 pb-0">
        <Button onClick={onClose}>完成</Button>
      </DialogActionBar>
    </DialogContent>
  );
}

export function BatchImportDialog({
  open,
  paths,
  onOpenChange,
}: BatchImportDialogProps) {
  const models = useAssetStore((state) => state.models);
  const tags = useAssetStore((state) => state.tags);
  const saving = useAssetStore((state) => state.saving);
  const librarySettings = useAssetStore((state) => state.librarySettings);
  const report = useAssetStore((state) => state.importReport);
  const clearImportReport = useAssetStore((state) => state.clearImportReport);
  const addModel = useAssetStore((state) => state.addModel);
  const addTag = useAssetStore((state) => state.addTag);
  const previewManagedImportTarget = useAssetStore(
    (state) => state.previewManagedImportTarget,
  );
  const inspectImportSources = useAssetStore(
    (state) => state.inspectImportSources,
  );
  const listImportSourceContents = useAssetStore(
    (state) => state.listImportSourceContents,
  );
  const managedImportBatch = useAssetStore((state) => state.managedImportBatch);
  const [bulkDraft, setBulkDraft] = useState<BulkImportDraft>(defaultBulkDraft);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [drafts, setDrafts] = useState<BatchImportDraft[]>([]);
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [pathDetailsOpenId, setPathDetailsOpenId] = useState<string | null>(
    null,
  );
  const [metadataOpenId, setMetadataOpenId] = useState<string | null>(null);
  const [sourceContentsDialogId, setSourceContentsDialogId] = useState<
    string | null
  >(null);
  const [previews, setPreviews] = useState<Record<string, ImportTargetPreview>>(
    {},
  );
  const [sourceContents, setSourceContents] = useState<
    Record<string, SourceContentList>
  >({});
  const [loadingContentId, setLoadingContentId] = useState<string | null>(null);
  const [confirmAttentionIds, setConfirmAttentionIds] = useState<string[]>([]);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const confirmAttentionTimeoutRef = useRef<number | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      if (confirmAttentionTimeoutRef.current !== null) {
        window.clearTimeout(confirmAttentionTimeoutRef.current);
        confirmAttentionTimeoutRef.current = null;
      }
      setBulkDraft(defaultBulkDraft);
      setBulkOpen(false);
      setDrafts(createDrafts(paths));
      setExpandedDraftId(null);
      setPathDetailsOpenId(null);
      setMetadataOpenId(null);
      setSourceContentsDialogId(null);
      setPreviews({});
      setSourceContents({});
      setLoadingContentId(null);
      setConfirmAttentionIds([]);
      setCloseConfirmOpen(false);
      clearImportReport();
    } else if (open) {
      setDrafts((current) => {
        const existingPaths = new Set(
          current.map((draft) => draft.sourcePath.toLocaleLowerCase()),
        );
        const nextPaths = paths.filter(
          (path) => !existingPaths.has(path.toLocaleLowerCase()),
        );
        if (nextPaths.length === 0) {
          return current;
        }
        return [...current, ...createDrafts(nextPaths, current.length)];
      });
    }
    wasOpenRef.current = open;
  }, [open, paths, clearImportReport]);

  useEffect(() => {
    return () => {
      if (confirmAttentionTimeoutRef.current !== null) {
        window.clearTimeout(confirmAttentionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open || paths.length === 0) return;
    let active = true;

    void inspectImportSources(paths).then((infos) => {
      if (!active) return;
      const infoByPath = new Map(infos.map((info) => [info.sourcePath, info]));
      setDrafts((current) =>
        current.map((draft) => {
          const sourceInfo = infoByPath.get(draft.sourcePath);
          return sourceInfo
            ? {
                ...draft,
                sourceInfo,
                confirmed: sourceInfo.supported ? draft.confirmed : false,
              }
            : draft;
        }),
      );
    });

    return () => {
      active = false;
    };
  }, [open, paths, inspectImportSources]);

  useEffect(() => {
    let active = true;
    for (const draft of drafts) {
      if (!isDraftSupported(draft)) continue;
      void previewManagedImportTarget(
        draft.sourcePath,
        draft.category,
        sourceKindForDraft(draft) === "zip" ? draft.archiveStrategy : null,
      ).then((preview) => {
        if (active)
          setPreviews((current) => ({ ...current, [draft.id]: preview }));
      });
    }
    return () => {
      active = false;
    };
  }, [drafts, librarySettings?.rootPath, previewManagedImportTarget]);

  const hasLibraryRoot = Boolean(librarySettings?.rootPath);
  const showBulkApply = drafts.length > 1;
  const hasZipItems = drafts.some(
    (draft) => sourceKindForDraft(draft) === "zip",
  );
  const unsupportedCount = drafts.filter(
    (draft) => !isDraftSupported(draft),
  ).length;
  const confirmableDrafts = drafts.filter(isDraftSupported);
  const confirmedCount = confirmableDrafts.filter(
    (draft) => draft.confirmed,
  ).length;
  const remainingConfirmCount = confirmableDrafts.length - confirmedCount;
  const allConfirmed =
    confirmableDrafts.length > 0 &&
    unsupportedCount === 0 &&
    confirmableDrafts.every((draft) => draft.confirmed);
  const canRequestImport =
    hasLibraryRoot && drafts.length > 0 && unsupportedCount === 0 && !saving;
  const overwriteDrafts = drafts.filter(
    (draft) =>
      previews[draft.id]?.conflict && draft.conflictStrategy === "overwrite",
  );
  const hasOverwrite = overwriteDrafts.length > 0;
  const footerMessage = !hasLibraryRoot
    ? "請先設定素材庫根目錄"
    : drafts.length === 0
      ? "尚未選取素材"
      : unsupportedCount > 0
        ? `有 ${unsupportedCount} 個素材無法導入`
        : remainingConfirmCount > 0
          ? `還有 ${remainingConfirmCount} 個素材尚未確認`
          : `已確認 ${confirmedCount} / ${confirmableDrafts.length}`;
  const updateDraft = (id: string, patch: Partial<BatchImportDraft>) =>
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === id ? { ...draft, ...patch } : draft,
      ),
    );
  const clearConfirmAttentionFor = (id: string) =>
    setConfirmAttentionIds((current) =>
      current.filter((attentionId) => attentionId !== id),
    );
  const updateBulkDraft = (patch: Partial<BulkImportDraft>) =>
    setBulkDraft((current) => ({ ...current, ...patch }));
  const applyBulkDraft = () =>
    setDrafts((current) =>
      current.map((draft) => ({
        ...draft,
        category: bulkDraft.category,
        operation: bulkDraft.operation,
        archiveStrategy:
          sourceKindForDraft(draft) === "zip"
            ? bulkDraft.archiveStrategy
            : draft.archiveStrategy,
      })),
    );
  const loadSourceContents = async (draft: BatchImportDraft) => {
    setLoadingContentId(draft.id);
    try {
      const contents = await listImportSourceContents(draft.sourcePath);
      setSourceContents((current) => ({ ...current, [draft.id]: contents }));
    } finally {
      setLoadingContentId(null);
    }
  };
  const openSourceContents = (draft: BatchImportDraft) => {
    setSourceContentsDialogId(draft.id);
    if (!sourceContents[draft.id]) {
      void loadSourceContents(draft);
    }
  };
  const fetchBoothForDraft = async (draft: BatchImportDraft) => {
    const boothUrl = draft.boothUrl.trim();
    if (!boothUrl) return;

    updateDraft(draft.id, { boothFetchStatus: "loading" });
    try {
      const info = await fetchBoothProductInfo(boothUrl);
      if (!info) {
        updateDraft(draft.id, { boothFetchStatus: "error" });
        return;
      }
      const applied = applyBoothProductInfo(info, models, tags);

      setDrafts((current) =>
        current.map((item) => {
          if (item.id !== draft.id) return item;

          return {
            ...item,
            displayName: item.displayName.trim()
              ? item.displayName
              : (info.title ?? item.displayName),
            thumbnailUrl: info.thumbnailUrl ?? item.thumbnailUrl,
            boothShopName: info.shopName ?? item.boothShopName,
            boothShopUrl: info.shopUrl ?? item.boothShopUrl,
            modelIds: mergeIds(item.modelIds, applied.matchedModelIds),
            tagIds: mergeIds(item.tagIds, applied.matchedTagIds),
            suggestedModels: mergeSuggestedModels(
              item.suggestedModels,
              applied.suggestedModels,
            ),
            suggestedTags: mergeSuggestedTags(
              item.suggestedTags,
              applied.suggestedTags,
            ),
            suggestedTagOrigins: mergeBoothTagOrigins(
              item.suggestedTagOrigins,
              applied.suggestedTagOrigins,
            ),
            boothFetchStatus: "success",
          };
        }),
      );
    } catch {
      updateDraft(draft.id, { boothFetchStatus: "error" });
    }
  };
  const addSuggestedModel = async (
    draft: BatchImportDraft,
    model: SuggestedBoothModel,
  ) => {
    const existingModel = existingModelForSuggestion(models, model);
    const modelId = existingModel?.id;
    const created = modelId
      ? null
      : await addModel(model.name, model.displayName ?? undefined);
    const selectedModelId = modelId ?? created?.id;
    if (!selectedModelId) return;

    setDrafts((current) =>
      current.map((item) =>
        item.id === draft.id
          ? {
              ...item,
              modelIds: mergeIds(item.modelIds, [selectedModelId]),
              suggestedModels: item.suggestedModels.filter(
                (suggested) =>
                  suggested.name.toLocaleLowerCase() !==
                  model.name.toLocaleLowerCase(),
              ),
            }
          : item,
      ),
    );
  };
  const addSuggestedTag = async (draft: BatchImportDraft, tagName: string) => {
    const existingTag = existingTagForSuggestion(tags, tagName);
    const tagId = existingTag?.id;
    const created = tagId
      ? null
      : await addTag(tagName, suggestedTagColor(tagName));
    const selectedTagId = tagId ?? created?.id;
    if (!selectedTagId) return;

    setDrafts((current) =>
      current.map((item) =>
        item.id === draft.id
          ? {
              ...item,
              tagIds: mergeIds(item.tagIds, [selectedTagId]),
              suggestedTags: item.suggestedTags.filter(
                (tag) =>
                  tag.toLocaleLowerCase() !== tagName.toLocaleLowerCase(),
              ),
              suggestedTagOrigins: Object.fromEntries(
                Object.entries(item.suggestedTagOrigins).filter(
                  ([tag]) =>
                    tag.toLocaleLowerCase() !== tagName.toLocaleLowerCase(),
                ),
              ),
            }
          : item,
      ),
    );
  };
  const submit = async () => {
    if (!allConfirmed) {
      const unconfirmedIds = confirmableDrafts
        .filter((draft) => !draft.confirmed)
        .map((draft) => draft.id);
      setConfirmAttentionIds(unconfirmedIds);

      if (confirmAttentionTimeoutRef.current !== null) {
        window.clearTimeout(confirmAttentionTimeoutRef.current);
      }
      confirmAttentionTimeoutRef.current = window.setTimeout(() => {
        setConfirmAttentionIds([]);
        confirmAttentionTimeoutRef.current = null;
      }, 1800);
      return;
    }

    if (hasOverwrite) {
      const names = overwriteDrafts
        .slice(0, 5)
        .map(
          (draft) =>
            `- ${draft.sourceInfo?.name ?? sourceName(draft.sourcePath)}`,
        )
        .join("\n");
      const extraCount =
        overwriteDrafts.length > 5
          ? `\n...另有 ${overwriteDrafts.length - 5} 筆`
          : "";
      const confirmed = window.confirm(
        `有 ${overwriteDrafts.length} 筆素材會覆蓋素材庫內同名項目。\n\n${names}${extraCount}\n\n確定要繼續導入嗎？`,
      );
      if (!confirmed) return;
    }

    await managedImportBatch(drafts.map(draftToInput));
  };
  const close = () => {
    onOpenChange(false);
    clearImportReport();
    setCloseConfirmOpen(false);
  };
  const requestClose = () => {
    if (report) {
      close();
      return;
    }

    if (drafts.length > 0) {
      setCloseConfirmOpen(true);
      return;
    }

    onOpenChange(false);
  };
  const discardAndClose = () => {
    setCloseConfirmOpen(false);
    onOpenChange(false);
  };
  const sourceContentsDraft =
    drafts.find((draft) => draft.id === sourceContentsDialogId) ?? null;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            onOpenChange(true);
          } else {
            requestClose();
          }
        }}
      >
        {report ? (
          <BatchImportReport report={report} onClose={close} />
        ) : (
          <DialogContent
            className="flex max-h-[88vh] flex-col overflow-hidden p-0 sm:max-w-[900px]"
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              requestClose();
            }}
            onInteractOutside={(event) => {
              event.preventDefault();
              requestClose();
            }}
          >
            <div className="space-y-4 overflow-y-auto px-6 pb-4 pt-6">
              <DialogHeader>
                <DialogTitle>批次導入素材</DialogTitle>
                <DialogDescription>
                  每個頂層拖入項目會作為一筆素材。逐項確認後才會開始導入。
                </DialogDescription>
              </DialogHeader>
              {!hasLibraryRoot && <LibraryRootActions compact />}
              {showBulkApply && (
                <BulkApplyControls
                  draft={bulkDraft}
                  hasZipItems={hasZipItems}
                  open={bulkOpen}
                  onApply={applyBulkDraft}
                  onChange={updateBulkDraft}
                  onOpenChange={setBulkOpen}
                />
              )}
              <div className="space-y-2">
                {drafts.length === 0 ? (
                  <SurfaceBox variant="dashed" className="px-4 py-8 text-center">
                    <p className="text-sm font-medium">尚未選取素材</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      請拖曳資料夾、.zip 或 .unitypackage 到視窗中
                    </p>
                  </SurfaceBox>
                ) : (
                  drafts.map((draft, index) => {
                    const sourceKind = sourceKindForDraft(draft);
                    const sourceSupported = isDraftSupported(draft);
                    const expanded = expandedDraftId === draft.id;
                    const preview = previews[draft.id];
                    const hasConflict = Boolean(preview?.conflict);
                    const metadataSummary = metadataSummaryText(draft);
                    const needsConfirmationAttention =
                      confirmAttentionIds.includes(draft.id) &&
                      sourceSupported &&
                      !draft.confirmed;

                    return (
                      <StateSurface
                        key={draft.id}
                        className="space-y-3 p-3"
                        tone={draftSurfaceTone({
                          confirmed: draft.confirmed,
                          hasConflict,
                          sourceSupported,
                        })}
                      >
                        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                          <div className="min-w-0 space-y-2">
                            <div className="flex min-w-0 items-start gap-2">
                              <IconTile
                                size="sm"
                                className="mt-0.5 bg-muted/35"
                              >
                                <SourceKindIcon kind={sourceKind} />
                              </IconTile>
                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                  <p className="min-w-0 max-w-full truncate text-[15px] font-semibold leading-5 text-foreground/92">
                                    {draft.sourceInfo?.name ??
                                      sourceName(draft.sourcePath)}
                                  </p>
                                  <ToneBadge>
                                    {sourceKindLabel(sourceKind)}
                                  </ToneBadge>
                                  <StatusBadge
                                    draft={draft}
                                    preview={preview}
                                  />
                                </div>
                                <p className="mt-1 truncate text-xs text-foreground/70">
                                  {sourceSupported
                                    ? draftPlanSummary(draft)
                                    : (draft.sourceInfo?.message ??
                                      "此來源目前無法導入")}
                                </p>
                                {sourceSupported && (
                                  <p className="mt-1 truncate text-xs text-muted-foreground/88">
                                    <span className="font-semibold text-foreground/45">
                                      目標位置
                                    </span>
                                    <span className="mx-1 text-foreground/28">
                                      /
                                    </span>
                                    {targetSummary(
                                      preview,
                                      librarySettings?.rootPath,
                                    ).replace(/^目標：/, "")}
                                  </p>
                                )}
                                {hasConflict && (
                                  <p className="mt-1 truncate text-xs text-amber-300">
                                    {conflictSummary(draft.conflictStrategy)}
                                  </p>
                                )}
                                {metadataSummary && (
                                  <p className="mt-1 truncate text-xs text-muted-foreground/72">
                                    {metadataSummary}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant={draft.confirmed ? "outline" : "default"}
                              size="sm"
                              className={cn(
                                "min-w-24 font-semibold transition-shadow",
                                needsConfirmationAttention
                                  && "bg-amber-500/25 text-amber-100 ring-2 ring-amber-300/80 ring-offset-2 ring-offset-background motion-safe:animate-pulse",
                              )}
                              disabled={!sourceSupported}
                              onClick={() => {
                                clearConfirmAttentionFor(draft.id);
                                updateDraft(draft.id, {
                                  confirmed: !draft.confirmed,
                                });
                              }}
                              aria-label={`${draft.confirmed ? "取消確認" : "確認"}第 ${index + 1} 項`}
                            >
                              {draft.confirmed && (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                              {!sourceSupported
                                ? "無法確認"
                                : draft.confirmed
                                  ? "已確認"
                                  : "確認此素材"}
                            </Button>
                            <SourceContentsButton
                              draft={draft}
                              loading={loadingContentId === draft.id}
                              onOpen={() => openSourceContents(draft)}
                            />
                            <DisclosureButton
                              expanded={expanded}
                              className="shrink-0 font-semibold"
                              onClick={() =>
                                setExpandedDraftId(expanded ? null : draft.id)
                              }
                            >
                              {expanded ? "收合" : "調整"}
                            </DisclosureButton>
                          </div>
                        </div>

                        {expanded && (
                          <div className="space-y-3 border-t border-border pt-3">
                            <div
                              className={`grid gap-2 ${sourceKind === "zip" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
                            >
                              <SegmentedField
                                label="分類"
                                help="決定素材會放進哪個主要資料夾。配件包含衣服、頭髮、飾品、道具等非素體素材。"
                                value={draft.category}
                                options={categoryOptions}
                                onChange={(category) =>
                                  updateDraft(draft.id, { category })
                                }
                              />
                              <SegmentedField
                                label="方式"
                                help="移動會把原檔搬進素材庫；複製會保留原檔，再複製一份到素材庫。"
                                value={draft.operation}
                                options={operationOptions}
                                onChange={(operation) =>
                                  updateDraft(draft.id, { operation })
                                }
                              />
                              {sourceKind === "zip" && (
                                <SegmentedField
                                  label="Zip"
                                  help="只影響 .zip。保留壓縮檔會直接管理 .zip；解壓後管理會把內容解開成資料夾。"
                                  value={draft.archiveStrategy}
                                  options={archiveOptions}
                                  onChange={(archiveStrategy) =>
                                    updateDraft(draft.id, { archiveStrategy })
                                  }
                                />
                              )}
                            </div>
                            {hasConflict && (
                              <ConflictResolution
                                value={draft.conflictStrategy}
                                onChange={(conflictStrategy) =>
                                  updateDraft(draft.id, { conflictStrategy })
                                }
                              />
                            )}
                            <PathDetails
                              draft={draft}
                              open={pathDetailsOpenId === draft.id}
                              preview={preview}
                              sourceSupported={sourceSupported}
                              onToggle={() =>
                                setPathDetailsOpenId((current) =>
                                  current === draft.id ? null : draft.id,
                                )
                              }
                            />
                            <MetadataDetails
                              draft={draft}
                              open={metadataOpenId === draft.id}
                              onToggle={() =>
                                setMetadataOpenId((current) =>
                                  current === draft.id ? null : draft.id,
                                )
                              }
                            >
                              <ItemMetadataFields
                                draft={draft}
                                models={models}
                                tags={tags}
                                onAddSuggestedModel={(model) =>
                                  void addSuggestedModel(draft, model)
                                }
                                onAddSuggestedTag={(tagName) =>
                                  void addSuggestedTag(draft, tagName)
                                }
                                onFetchBooth={() =>
                                  void fetchBoothForDraft(draft)
                                }
                                onUpdate={(patch) =>
                                  updateDraft(draft.id, patch)
                                }
                              />
                            </MetadataDetails>
                          </div>
                        )}
                      </StateSurface>
                    );
                  })
                )}
              </div>
            </div>
            <DialogActionBar justify="between">
              <div className="min-w-0 text-left">
                <p className="text-sm text-muted-foreground">{footerMessage}</p>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  點擊視窗外或按 Esc 會先確認，避免遺失尚未導入的編輯內容。
                </p>
                {hasOverwrite && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    覆蓋會取代素材庫內同名項目，開始前請再確認。
                  </p>
                )}
                {confirmAttentionIds.length > 0 && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    請先確認高亮的素材。
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={requestClose}>
                  取消
                </Button>
                <Button
                  disabled={!canRequestImport}
                  onClick={() => void submit()}
                >
                  {saving ? "導入中" : "開始導入"}
                </Button>
              </div>
            </DialogActionBar>
          </DialogContent>
        )}
      </Dialog>
      <SourceContentsDialog
        draft={sourceContentsDraft}
        contents={
          sourceContentsDraft
            ? sourceContents[sourceContentsDraft.id]
            : undefined
        }
        loading={
          sourceContentsDraft
            ? loadingContentId === sourceContentsDraft.id
            : false
        }
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSourceContentsDialogId(null);
        }}
      />
      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>批次導入的變更尚未儲存</AlertDialogTitle>
            <AlertDialogDescription>
              關閉後目前編輯的素材資料會消失，尚未導入的項目需要重新設定。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>繼續編輯</AlertDialogCancel>
            <AlertDialogAction onClick={discardAndClose}>
              放棄並關閉
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
