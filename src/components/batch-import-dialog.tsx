"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  Archive,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  Package,
  Plus,
  Sparkles,
  XCircle,
} from "lucide-react";
import { ModelSelectionField } from "@/components/asset-form/model-selection-field";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  applyBoothProductInfo,
  fetchBoothProductInfo,
  mergeIds,
  type SuggestedBoothModel,
} from "@/lib/booth-product-info";
import { toggleId } from "@/lib/id-list";
import { invokeTauri } from "@/lib/tauri-runtime";
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
  thumbnailUrl: string;
  note: string;
  modelIds: number[];
  tagIds: number[];
  suggestedModels: SuggestedBoothModel[];
  suggestedTags: string[];
  boothFetchStatus: "idle" | "loading" | "success" | "error";
  confirmed: boolean;
};

type TooltipPosition = {
  left: number;
  top: number;
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

const isZipPath = (path: string) => path.toLocaleLowerCase().endsWith(".zip");
const isUnityPackagePath = (path: string) =>
  path.toLocaleLowerCase().endsWith(".unitypackage");
const sourceName = (path: string) => path.split(/[\\/]/).pop() || path;
const defaultSuggestedTagColor = "#6B7280";
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function HelpTooltip({
  children,
  position,
}: {
  children: string;
  position: TooltipPosition | null;
}) {
  if (!position || typeof document === "undefined") return null;

  return createPortal(
    <span
      className="pointer-events-none fixed z-[1000] w-64 -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-2 text-xs font-normal leading-relaxed text-popover-foreground shadow-xl"
      style={{ left: position.left, top: position.top }}
    >
      {children}
    </span>,
    document.body,
  );
}

function HelpIcon({ label, help }: { label: string; help: string }) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [tooltipPosition, setTooltipPosition] =
    useState<TooltipPosition | null>(null);

  const showTooltip = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const tooltipWidth = 256;
    const edgePadding = 12;
    const center = rect.left + rect.width / 2;
    setTooltipPosition({
      left: clamp(
        center,
        edgePadding + tooltipWidth / 2,
        window.innerWidth - edgePadding - tooltipWidth / 2,
      ),
      top: rect.bottom + 8,
    });
  }, []);

  return (
    <span className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${label}說明`}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
        onBlur={() => setTooltipPosition(null)}
        onFocus={showTooltip}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setTooltipPosition(null)}
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>
      <HelpTooltip position={tooltipPosition}>{help}</HelpTooltip>
    </span>
  );
}
const defaultBulkDraft: BulkImportDraft = {
  category: "accessory",
  operation: "move",
  archiveStrategy: "keepArchive",
};

function createDrafts(paths: string[]): BatchImportDraft[] {
  return paths.map((path, index) => ({
    id: `${index}-${path}`,
    sourcePath: path,
    category: "accessory",
    operation: "move",
    archiveStrategy: "keepArchive",
    conflictStrategy: "cancel",
    displayName: "",
    boothUrl: "",
    thumbnailUrl: "",
    note: "",
    modelIds: [],
    tagIds: [],
    suggestedModels: [],
    suggestedTags: [],
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
    thumbnailUrl: draft.thumbnailUrl.trim() || null,
    note: draft.note.trim() || null,
    modelIds: draft.modelIds,
    tagIds: draft.tagIds,
    relatedLinks: [],
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
    return <Badge variant="destructive">無法導入</Badge>;
  }
  if (preview?.conflict) {
    return (
      <Badge
        className="border-amber-500/70 bg-amber-500/10 text-amber-300"
        variant="outline"
      >
        目標衝突
      </Badge>
    );
  }
  return (
    <Badge
      className="border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
      variant="outline"
    >
      可導入
    </Badge>
  );
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
    draft.modelIds.length > 0 ? `${draft.modelIds.length} 模型` : null,
    draft.tagIds.length > 0 ? `${draft.tagIds.length} 標籤` : null,
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

function isDirectoryEntry(path: string) {
  return path.endsWith("/") || path.endsWith("\\");
}

function contentTitle(kind: ImportSourceKind) {
  if (kind === "zip") return "壓縮檔內容";
  if (kind === "folder") return "資料夾內容";
  return "內容";
}

function formatFileSize(sizeBytes?: number | null) {
  if (sizeBytes == null) return "";
  if (sizeBytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(Math.floor(Math.log(sizeBytes) / Math.log(1024)), units.length - 1);
  const value = sizeBytes / 1024 ** unitIndex;
  const digits = unitIndex === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

function SegmentedField<TValue extends string>({
  label,
  help,
  value,
  options,
  onChange,
}: {
  label: string;
  help?: string;
  value: TValue;
  options: { value: TValue; label: string; tone?: "danger" }[];
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {help && <HelpIcon label={label} help={help} />}
      </div>
      <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-1 rounded-md border border-border bg-background/45 p-1">
        {options.map((option) => {
          const selected = option.value === value;
          const dangerSelected = selected && option.tone === "danger";
          return (
            <button
              key={option.value}
              type="button"
              className={[
                "h-8 min-w-0 rounded-sm px-2 text-xs font-medium transition-colors",
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

function TargetPreviewLine({ preview }: { preview?: ImportTargetPreview }) {
  if (!preview) {
    return <p className="text-xs text-muted-foreground">正在產生目標路徑...</p>;
  }

  return (
    <div className="space-y-1 text-xs">
      <p className="break-all text-muted-foreground">
        {preview.targetPath ?? preview.message ?? "無法產生目標路徑"}
      </p>
      {preview.conflict && <Badge variant="destructive">目標衝突</Badge>}
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
      <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <p>{draft.sourceInfo?.message ?? "此來源目前無法導入"}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border/70 bg-muted/10 px-3 py-2">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {preview?.conflict
            ? "目標位置已有同名項目"
            : "需要時可檢視來源與導入目標"}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onToggle}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`}
          />
          {open ? "隱藏路徑" : "檢視路徑"}
        </Button>
      </div>
      {open && (
        <div className="mt-2 space-y-2 border-t border-border/70 pt-2 text-xs">
          <div>
            <p className="font-medium text-muted-foreground">來源</p>
            <p className="mt-1 break-all">{draft.sourcePath}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">目標</p>
            <div className="mt-1">
              <TargetPreviewLine preview={preview} />
            </div>
          </div>
        </div>
      )}
    </div>
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
      className="shrink-0"
      disabled={loading}
      onClick={onOpen}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
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
      isDirectory: isDirectoryEntry(path),
      sizeBytes: null,
    })) ??
    [];
  const hiddenCount = contents ? Math.max(contents.fileCount - entries.length, 0) : 0;

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
          {loading ? (
            <div className="flex h-36 items-center justify-center rounded-md border border-border/70 bg-muted/15 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="ml-2 text-sm">正在讀取內容...</span>
            </div>
          ) : contents && entries.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-border bg-muted/15">
              <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-foreground">
                  <span className="truncate">{contentTitle(kind)}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  共 {contents.fileCount} 個項目
                </span>
              </div>
              <ScrollArea className="max-h-72">
                <ul className="divide-y divide-border/60">
                  {entries.map((entry) => {
                    const directory = entry.isDirectory || isDirectoryEntry(entry.path);
                    const sizeLabel = formatFileSize(entry.sizeBytes);
                    return (
                      <li
                        key={entry.path}
                        className="flex min-w-0 items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground"
                      >
                        {directory ? (
                          <Folder className="h-3.5 w-3.5 shrink-0 text-primary" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span
                          className="min-w-0 flex-1 truncate font-mono text-foreground/90"
                          title={entry.path}
                        >
                          {entry.path}
                        </span>
                        {sizeLabel && (
                          <span className="shrink-0 pl-2 font-mono text-[11px] text-muted-foreground">
                            {sizeLabel}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
              {contents.truncated && (
                <div className="border-t border-border px-3 py-1.5 text-center text-[11px] text-muted-foreground">
                  只列出前 {entries.length} 個，其餘 {hiddenCount} 個項目未顯示
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-8 text-center text-xs text-muted-foreground">
              沒有可顯示的內容
            </div>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => onOpenChange(false)}>
              關閉
            </Button>
          </DialogFooter>
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
    <div className="rounded-md border border-border/70 bg-muted/10 px-3 py-2">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {summary ? `補充資料：${summary}` : "可選填 BOOTH、模型、標籤與備註"}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onToggle}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`}
          />
          {open ? "隱藏資料" : "補充資料"}
        </Button>
      </div>
      {open && <div className="mt-3">{children}</div>}
    </div>
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
        help="只有這筆素材發生同名衝突時才需要選。取消會讓這筆不導入；改名會自動加上不重複名稱；覆蓋會取代素材庫內同名項目。"
        value={value}
        options={conflictOptions}
        onChange={onChange}
      />
    </div>
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
    <div className="rounded-md border border-border bg-muted/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
          onClick={() => onOpenChange(!open)}
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
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
    </div>
  );
}

function SuggestedMetadataActions({
  draft,
  onAddModel,
  onAddTag,
}: {
  draft: BatchImportDraft;
  onAddModel: (model: SuggestedBoothModel) => void;
  onAddTag: (tagName: string) => void;
}) {
  if (draft.suggestedModels.length === 0 && draft.suggestedTags.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border bg-muted/25 p-2">
      {draft.suggestedModels.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            BOOTH 建議模型
          </p>
          <div className="flex min-w-0 flex-wrap gap-2">
            {draft.suggestedModels.map((model) => (
              <Button
                key={model.name}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 min-w-0 !max-w-full !shrink px-2 text-xs"
                onClick={() => onAddModel(model)}
              >
                <Plus className="h-3 w-3 shrink-0" />
                <span className="min-w-0 truncate">{model.label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
      {draft.suggestedTags.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            BOOTH 建議標籤
          </p>
          <div className="flex min-w-0 flex-wrap gap-2">
            {draft.suggestedTags.map((tagName) => (
              <Button
                key={tagName}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 min-w-0 !max-w-full !shrink px-2 text-xs"
                onClick={() => onAddTag(tagName)}
              >
                <Plus className="h-3 w-3 shrink-0" />
                <span className="min-w-0 truncate">{tagName}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
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
  const boothStatusText =
    draft.boothFetchStatus === "loading"
      ? "抓取中"
      : draft.boothFetchStatus === "success"
        ? "已套用建議"
        : draft.boothFetchStatus === "error"
          ? "抓取失敗，可重試"
          : null;

  return (
    <div className="space-y-3 rounded-md bg-muted/15 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            顯示名稱
          </label>
          <Input
            value={draft.displayName}
            onChange={(event) => onUpdate({ displayName: event.target.value })}
            placeholder={sourceName(draft.sourcePath)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            BOOTH 連結
          </label>
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
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="抓取 BOOTH 資訊"
              aria-label="抓取 BOOTH 資訊"
              disabled={!draft.boothUrl.trim() || loadingBooth}
              onClick={onFetchBooth}
            >
              {loadingBooth ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
          </div>
          {boothStatusText && (
            <p
              className={[
                "text-xs",
                draft.boothFetchStatus === "error"
                  ? "text-destructive"
                  : draft.boothFetchStatus === "success"
                    ? "text-emerald-300"
                    : "text-muted-foreground",
              ].join(" ")}
            >
              {boothStatusText}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          備註
        </label>
        <Textarea
          value={draft.note}
          onChange={(event) => onUpdate({ note: event.target.value })}
          rows={2}
          placeholder="添加備註..."
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <ModelSelectionField
          models={models}
          selectedModelIds={draft.modelIds}
          selectedModelIdSet={selectedModelIdSet}
          actionsLayout="compact"
          actionButtonClassName="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          labelClassName="text-xs font-medium text-muted-foreground"
          listClassName="max-h-28 space-y-1.5 overflow-y-auto rounded-md border border-border/70 bg-background/40 p-2"
          onSelectAll={() =>
            onUpdate({ modelIds: models.map((model) => model.id) })
          }
          onClear={() => onUpdate({ modelIds: [] })}
          onToggle={(modelId) =>
            onUpdate({ modelIds: toggleId(draft.modelIds, modelId) })
          }
        />
        <TagSelectionField
          tags={tags}
          selectedTagIds={draft.tagIds}
          selectedTagIdSet={selectedTagIdSet}
          actionsLayout="compact"
          actionButtonClassName="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          labelClassName="text-xs font-medium text-muted-foreground"
          listClassName="flex max-h-36 min-h-14 min-w-0 flex-wrap content-start gap-2 overflow-y-auto rounded-md border border-border/70 bg-background/35 p-3"
          tagClassName="min-w-0 !max-w-full !shrink cursor-pointer truncate rounded-md px-2.5 py-1 text-xs leading-none transition-colors hover:brightness-110"
          onSelectAll={() => onUpdate({ tagIds: tags.map((tag) => tag.id) })}
          onClear={() => onUpdate({ tagIds: [] })}
          onToggle={(tagId) =>
            onUpdate({ tagIds: toggleId(draft.tagIds, tagId) })
          }
        />
      </div>
      <SuggestedMetadataActions
        draft={draft}
        onAddModel={onAddSuggestedModel}
        onAddTag={onAddSuggestedTag}
      />
    </div>
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
        {report.results.map((result) => (
          <div
            key={result.sourcePath}
            className="rounded-md border border-border p-3"
          >
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <p className="min-w-0 flex-1 truncate text-sm font-medium">
                {sourceName(result.sourcePath)}
              </p>
              {result.finalPath && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="開啟目標資料夾"
                  aria-label="開啟目標資料夾"
                  onClick={() =>
                    void invokeTauri("open_file_location", {
                      path: result.finalPath,
                    })
                  }
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {result.message}
            </p>
            {result.finalPath && (
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {result.finalPath}
              </p>
            )}
          </div>
        ))}
      </div>
      <DialogFooter>
        <Button onClick={onClose}>完成</Button>
      </DialogFooter>
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

  useEffect(() => {
    if (open) {
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
      clearImportReport();
    }
  }, [open, paths, clearImportReport]);

  useEffect(() => {
    if (!open || paths.length === 0) return;
    let active = true;

    void inspectImportSources(paths).then((infos) => {
      if (!active) return;
      const infoByPath = new Map(infos.map((info) => [info.sourcePath, info]));
      setDrafts((current) =>
        current.map((draft) => {
          const sourceInfo = infoByPath.get(draft.sourcePath);
          if (!sourceInfo) return draft;
          return {
            ...draft,
            sourceInfo,
            confirmed: sourceInfo.supported ? draft.confirmed : false,
          };
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
  const hasOverwrite = drafts.some(
    (draft) =>
      previews[draft.id]?.conflict && draft.conflictStrategy === "overwrite",
  );
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
    const created = await addModel(model.name, model.displayName ?? undefined);
    setDrafts((current) =>
      current.map((item) =>
        item.id === draft.id
          ? {
              ...item,
              modelIds: mergeIds(item.modelIds, [created.id]),
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
    const created = await addTag(tagName, defaultSuggestedTagColor);
    setDrafts((current) =>
      current.map((item) =>
        item.id === draft.id
          ? {
              ...item,
              tagIds: mergeIds(item.tagIds, [created.id]),
              suggestedTags: item.suggestedTags.filter(
                (tag) =>
                  tag.toLocaleLowerCase() !== tagName.toLocaleLowerCase(),
              ),
            }
          : item,
      ),
    );
  };
  const submit = async () => {
    await managedImportBatch(drafts.map(draftToInput));
  };
  const close = () => {
    onOpenChange(false);
    clearImportReport();
  };
  const sourceContentsDraft =
    drafts.find((draft) => draft.id === sourceContentsDialogId) ?? null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {report ? (
          <BatchImportReport report={report} onClose={close} />
        ) : (
          <DialogContent className="flex max-h-[88vh] flex-col overflow-hidden p-0 sm:max-w-[900px]">
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
                  <div className="rounded-md border border-dashed border-border bg-muted/10 px-4 py-8 text-center">
                    <p className="text-sm font-medium">尚未選取素材</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      請拖曳資料夾、.zip 或 .unitypackage 到視窗中
                    </p>
                  </div>
                ) : (
                  drafts.map((draft, index) => {
                    const sourceKind = sourceKindForDraft(draft);
                    const sourceSupported = isDraftSupported(draft);
                    const expanded = expandedDraftId === draft.id;
                    const preview = previews[draft.id];
                    const hasConflict = Boolean(preview?.conflict);
                    const metadataSummary = metadataSummaryText(draft);

                    return (
                      <div
                        key={draft.id}
                        className={[
                          "space-y-3 rounded-md border p-3 transition-colors",
                          !sourceSupported
                            ? "border-destructive/60 bg-destructive/5"
                            : hasConflict
                              ? "border-amber-500/50 bg-amber-500/5"
                              : draft.confirmed
                                ? "border-emerald-500/45 bg-emerald-500/5"
                                : "border-border bg-background",
                        ].join(" ")}
                      >
                        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                          <div className="min-w-0 space-y-2">
                            <div className="flex min-w-0 items-start gap-2">
                              <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
                                <SourceKindIcon kind={sourceKind} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                  <p className="min-w-0 max-w-full truncate text-sm font-medium">
                                    {draft.sourceInfo?.name ??
                                      sourceName(draft.sourcePath)}
                                  </p>
                                  <Badge variant="outline">
                                    {sourceKindLabel(sourceKind)}
                                  </Badge>
                                  <StatusBadge
                                    draft={draft}
                                    preview={preview}
                                  />
                                </div>
                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                  {sourceSupported
                                    ? draftPlanSummary(draft)
                                    : (draft.sourceInfo?.message ??
                                      "此來源目前無法導入")}
                                </p>
                                {sourceSupported && (
                                  <p className="mt-1 truncate text-xs text-muted-foreground/85">
                                    {targetSummary(
                                      preview,
                                      librarySettings?.rootPath,
                                    )}
                                  </p>
                                )}
                                {hasConflict && (
                                  <p className="mt-1 truncate text-xs text-amber-300">
                                    {conflictSummary(draft.conflictStrategy)}
                                  </p>
                                )}
                                {metadataSummary && (
                                  <p className="mt-1 truncate text-xs text-muted-foreground/80">
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
                              className="min-w-24"
                              disabled={!sourceSupported}
                              onClick={() =>
                                updateDraft(draft.id, {
                                  confirmed: !draft.confirmed,
                                })
                              }
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
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="shrink-0"
                              onClick={() =>
                                setExpandedDraftId(expanded ? null : draft.id)
                              }
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${expanded ? "" : "-rotate-90"}`}
                              />
                              {expanded ? "收合" : "調整"}
                            </Button>
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
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <DialogFooter className="border-t border-border bg-background px-6 py-4 sm:items-center sm:justify-between">
              <div className="min-w-0 text-left">
                <p className="text-sm text-muted-foreground">{footerMessage}</p>
                {hasOverwrite && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    覆蓋會取代素材庫內同名項目，開始前請再確認。
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                <Button
                  disabled={!hasLibraryRoot || !allConfirmed || saving}
                  onClick={() => void submit()}
                >
                  {saving ? "導入中" : "開始導入"}
                </Button>
              </div>
            </DialogFooter>
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
    </>
  );
}
