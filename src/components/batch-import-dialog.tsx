"use client";

import { useEffect, useState } from "react";
import { Archive, CheckCircle2, FolderOpen, Loader2, Plus, Sparkles, XCircle } from "lucide-react";
import { ModelSelectionField } from "@/components/asset-form/model-selection-field";
import { TagSelectionField } from "@/components/asset-form/tag-selection-field";
import { ImportOptionSelect } from "@/components/import-option-select";
import { LibraryRootActions } from "@/components/library-root-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  ImportTargetPreview,
  ManagedImportBatchReport,
  ManagedImportItemInput,
  Model,
  Tag,
  ZipContentList,
} from "@/types";

type BatchImportDraft = {
  id: string;
  sourcePath: string;
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
  confirmed: boolean;
};

type BulkImportDraft = Pick<
  BatchImportDraft,
  "category" | "operation" | "archiveStrategy" | "conflictStrategy"
>;

type BatchImportDialogProps = {
  open: boolean;
  paths: string[];
  onOpenChange: (open: boolean) => void;
};

const isZipPath = (path: string) => path.toLocaleLowerCase().endsWith(".zip");
const sourceName = (path: string) => path.split(/[\\/]/).pop() || path;
const defaultSuggestedTagColor = "#6B7280";
const categoryOptions: { value: AssetCategory; label: string }[] = [
  { value: "avatar", label: "素體" },
  { value: "accessory", label: "素體配件" },
  { value: "world", label: "世界" },
];
const operationOptions: { value: ImportOperation; label: string }[] = [
  { value: "move", label: "移動" },
  { value: "copy", label: "複製" },
];
const conflictOptions: { value: ConflictStrategy; label: string }[] = [
  { value: "cancel", label: "取消" },
  { value: "rename", label: "改名" },
  { value: "overwrite", label: "覆蓋" },
];
const archiveOptions: { value: ArchiveStrategy; label: string }[] = [
  { value: "keepArchive", label: "保留壓縮檔" },
  { value: "extract", label: "解壓後管理" },
];
const defaultBulkDraft: BulkImportDraft = {
  category: "accessory",
  operation: "move",
  archiveStrategy: "keepArchive",
  conflictStrategy: "cancel",
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
  const existing = new Set(current.map((model) => model.name.toLocaleLowerCase()));
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

function ZipContents({
  draft,
  contents,
  loading,
  onLoad,
}: {
  draft: BatchImportDraft;
  contents?: ZipContentList;
  loading: boolean;
  onLoad: () => void;
}) {
  if (!isZipPath(draft.sourcePath)) return null;

  return (
    <div className="space-y-2 rounded-md bg-muted/25 p-2">
      <Button type="button" variant="outline" size="sm" disabled={loading} onClick={onLoad}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
        列出 zip 內容
      </Button>
      {contents && (
        <div className="max-h-28 overflow-auto text-xs">
          <p className="mb-1 text-muted-foreground">{contents.fileCount} 個檔案</p>
          {contents.paths.map((path) => (
            <p key={path} className="break-all">
              {path}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function BulkApplyControls({
  draft,
  onChange,
  onApply,
}: {
  draft: BulkImportDraft;
  onChange: (patch: Partial<BulkImportDraft>) => void;
  onApply: () => void;
}) {
  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">批量套用</p>
          <p className="text-xs text-muted-foreground">把常用導入規則一次套到所有項目。</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onApply}>
          套用到全部
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <ImportOptionSelect
          label="分類"
          help="決定素材會放進哪個主要資料夾。這不是標籤，只影響素材庫裡的存放位置。"
          value={draft.category}
          options={categoryOptions}
          onChange={(category) => onChange({ category })}
        />
        <ImportOptionSelect
          label="方式"
          help="移動會把原檔搬進素材庫；複製會保留原檔，再複製一份到素材庫。"
          value={draft.operation}
          options={operationOptions}
          onChange={(operation) => onChange({ operation })}
        />
        <ImportOptionSelect
          label="衝突"
          help="目標位置已經有同名檔案或資料夾時，決定要取消、自動改名，還是覆蓋。"
          value={draft.conflictStrategy}
          options={conflictOptions}
          onChange={(conflictStrategy) => onChange({ conflictStrategy })}
        />
        <ImportOptionSelect
          label="Zip"
          help="只會影響 .zip 項目。保留壓縮檔會直接管理 .zip；解壓後管理會把內容解開成資料夾。"
          value={draft.archiveStrategy}
          options={archiveOptions}
          onChange={(archiveStrategy) => onChange({ archiveStrategy })}
        />
      </div>
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
          <p className="text-xs font-medium text-muted-foreground">BOOTH 建議模型</p>
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
          <p className="text-xs font-medium text-muted-foreground">BOOTH 建議標籤</p>
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
  loadingBooth,
  models,
  tags,
  onAddSuggestedModel,
  onAddSuggestedTag,
  onFetchBooth,
  onUpdate,
}: {
  draft: BatchImportDraft;
  loadingBooth: boolean;
  models: Model[];
  tags: Tag[];
  onAddSuggestedModel: (model: SuggestedBoothModel) => void;
  onAddSuggestedTag: (tagName: string) => void;
  onFetchBooth: () => void;
  onUpdate: (patch: Partial<BatchImportDraft>) => void;
}) {
  const selectedModelIdSet = new Set(draft.modelIds);
  const selectedTagIdSet = new Set(draft.tagIds);

  return (
    <div className="space-y-3 rounded-md bg-muted/15 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">顯示名稱</label>
          <Input
            value={draft.displayName}
            onChange={(event) => onUpdate({ displayName: event.target.value })}
            placeholder={sourceName(draft.sourcePath)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">BOOTH 連結</label>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Input
              value={draft.boothUrl}
              onChange={(event) => onUpdate({ boothUrl: event.target.value })}
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
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">備註</label>
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
          actionsLayout="grid"
          actionButtonClassName="h-7 px-2 text-xs"
          labelClassName="text-xs font-medium text-muted-foreground"
          listClassName="max-h-28 space-y-2 overflow-y-auto rounded-md border border-border bg-background/60 p-2"
          onSelectAll={() => onUpdate({ modelIds: models.map((model) => model.id) })}
          onClear={() => onUpdate({ modelIds: [] })}
          onToggle={(modelId) => onUpdate({ modelIds: toggleId(draft.modelIds, modelId) })}
        />
        <TagSelectionField
          tags={tags}
          selectedTagIds={draft.tagIds}
          selectedTagIdSet={selectedTagIdSet}
          actionsLayout="grid"
          actionButtonClassName="h-7 px-2 text-xs"
          labelClassName="text-xs font-medium text-muted-foreground"
          tagClassName="min-w-0 !max-w-full !shrink cursor-pointer truncate transition-colors"
          onSelectAll={() => onUpdate({ tagIds: tags.map((tag) => tag.id) })}
          onClear={() => onUpdate({ tagIds: [] })}
          onToggle={(tagId) => onUpdate({ tagIds: toggleId(draft.tagIds, tagId) })}
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
          <div key={result.sourcePath} className="rounded-md border border-border p-3">
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
                  onClick={() => void invokeTauri("open_file_location", { path: result.finalPath })}
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{result.message}</p>
            {result.finalPath && (
              <p className="mt-1 break-all text-xs text-muted-foreground">{result.finalPath}</p>
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

export function BatchImportDialog({ open, paths, onOpenChange }: BatchImportDialogProps) {
  const models = useAssetStore((state) => state.models);
  const tags = useAssetStore((state) => state.tags);
  const saving = useAssetStore((state) => state.saving);
  const librarySettings = useAssetStore((state) => state.librarySettings);
  const report = useAssetStore((state) => state.importReport);
  const clearImportReport = useAssetStore((state) => state.clearImportReport);
  const addModel = useAssetStore((state) => state.addModel);
  const addTag = useAssetStore((state) => state.addTag);
  const previewManagedImportTarget = useAssetStore((state) => state.previewManagedImportTarget);
  const listZipContents = useAssetStore((state) => state.listZipContents);
  const managedImportBatch = useAssetStore((state) => state.managedImportBatch);
  const [bulkDraft, setBulkDraft] = useState<BulkImportDraft>(defaultBulkDraft);
  const [drafts, setDrafts] = useState<BatchImportDraft[]>([]);
  const [previews, setPreviews] = useState<Record<string, ImportTargetPreview>>({});
  const [zipContents, setZipContents] = useState<Record<string, ZipContentList>>({});
  const [loadingZipId, setLoadingZipId] = useState<string | null>(null);
  const [loadingBoothId, setLoadingBoothId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setBulkDraft(defaultBulkDraft);
      setDrafts(createDrafts(paths));
      setPreviews({});
      setZipContents({});
      setLoadingBoothId(null);
      clearImportReport();
    }
  }, [open, paths, clearImportReport]);

  useEffect(() => {
    let active = true;
    for (const draft of drafts) {
      void previewManagedImportTarget(
        draft.sourcePath,
        draft.category,
        isZipPath(draft.sourcePath) ? draft.archiveStrategy : null,
      ).then((preview) => {
        if (active) setPreviews((current) => ({ ...current, [draft.id]: preview }));
      });
    }
    return () => {
      active = false;
    };
  }, [drafts, librarySettings?.rootPath, previewManagedImportTarget]);

  const allConfirmed = drafts.length > 0 && drafts.every((draft) => draft.confirmed);
  const hasLibraryRoot = Boolean(librarySettings?.rootPath);
  const updateDraft = (id: string, patch: Partial<BatchImportDraft>) =>
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)),
    );
  const updateBulkDraft = (patch: Partial<BulkImportDraft>) =>
    setBulkDraft((current) => ({ ...current, ...patch }));
  const applyBulkDraft = () =>
    setDrafts((current) =>
      current.map((draft) => ({
        ...draft,
        category: bulkDraft.category,
        operation: bulkDraft.operation,
        conflictStrategy: bulkDraft.conflictStrategy,
        archiveStrategy: isZipPath(draft.sourcePath) ? bulkDraft.archiveStrategy : draft.archiveStrategy,
      })),
    );
  const loadZip = async (draft: BatchImportDraft) => {
    setLoadingZipId(draft.id);
    try {
      const contents = await listZipContents(draft.sourcePath);
      setZipContents((current) => ({ ...current, [draft.id]: contents }));
    } finally {
      setLoadingZipId(null);
    }
  };
  const fetchBoothForDraft = async (draft: BatchImportDraft) => {
    const boothUrl = draft.boothUrl.trim();
    if (!boothUrl) return;

    setLoadingBoothId(draft.id);
    try {
      const info = await fetchBoothProductInfo(boothUrl);
      if (!info) return;
      const applied = applyBoothProductInfo(info, models, tags);

      setDrafts((current) =>
        current.map((item) => {
          if (item.id !== draft.id) return item;

          return {
            ...item,
            displayName: item.displayName.trim() ? item.displayName : info.title ?? item.displayName,
            thumbnailUrl: info.thumbnailUrl ?? item.thumbnailUrl,
            modelIds: mergeIds(item.modelIds, applied.matchedModelIds),
            tagIds: mergeIds(item.tagIds, applied.matchedTagIds),
            suggestedModels: mergeSuggestedModels(item.suggestedModels, applied.suggestedModels),
            suggestedTags: mergeSuggestedTags(item.suggestedTags, applied.suggestedTags),
          };
        }),
      );
    } finally {
      setLoadingBoothId(null);
    }
  };
  const addSuggestedModel = async (draft: BatchImportDraft, model: SuggestedBoothModel) => {
    const created = await addModel(model.name, model.displayName ?? undefined);
    setDrafts((current) =>
      current.map((item) =>
        item.id === draft.id
          ? {
              ...item,
              modelIds: mergeIds(item.modelIds, [created.id]),
              suggestedModels: item.suggestedModels.filter(
                (suggested) =>
                  suggested.name.toLocaleLowerCase() !== model.name.toLocaleLowerCase(),
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
                (tag) => tag.toLocaleLowerCase() !== tagName.toLocaleLowerCase(),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {report ? (
        <BatchImportReport report={report} onClose={close} />
      ) : (
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[860px]">
          <DialogHeader>
            <DialogTitle>批次導入素材</DialogTitle>
            <DialogDescription>
              每個頂層拖入項目會作為一筆素材。請選取素材本身，不要拖入父資料夾讓 app 自動拆分。
            </DialogDescription>
          </DialogHeader>
          {!hasLibraryRoot && (
            <LibraryRootActions compact />
          )}
          <BulkApplyControls
            draft={bulkDraft}
            onApply={applyBulkDraft}
            onChange={updateBulkDraft}
          />
          <div className="space-y-3">
            {drafts.map((draft, index) => (
              <div key={draft.id} className="space-y-3 rounded-md border border-border p-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    className="size-5 rounded-md border-primary/80 bg-primary/5 hover:bg-primary/15 hover:ring-primary/40 focus:ring-primary/50"
                    checked={draft.confirmed}
                    onCheckedChange={(checked) =>
                      updateDraft(draft.id, { confirmed: checked === true })
                    }
                    aria-label={`確認第 ${index + 1} 項`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{sourceName(draft.sourcePath)}</p>
                    <p className="break-all text-xs text-muted-foreground">{draft.sourcePath}</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-4">
                  <ImportOptionSelect
                    label="分類"
                    help="決定素材會放進哪個主要資料夾。這不是標籤，只影響素材庫裡的存放位置。"
                    value={draft.category}
                    options={categoryOptions}
                    onChange={(category) => updateDraft(draft.id, { category })}
                  />
                  <ImportOptionSelect
                    label="方式"
                    help="移動會把原檔搬進素材庫；複製會保留原檔，再複製一份到素材庫。"
                    value={draft.operation}
                    options={operationOptions}
                    onChange={(operation) => updateDraft(draft.id, { operation })}
                  />
                  <ImportOptionSelect
                    label="衝突"
                    help="目標位置已經有同名檔案或資料夾時，決定要取消、自動改名，還是覆蓋。"
                    value={draft.conflictStrategy}
                    options={conflictOptions}
                    onChange={(conflictStrategy) => updateDraft(draft.id, { conflictStrategy })}
                  />
                  {isZipPath(draft.sourcePath) && (
                    <ImportOptionSelect
                      label="Zip"
                      help="保留壓縮檔會直接管理 .zip；解壓後管理會把內容解開成資料夾。"
                      value={draft.archiveStrategy}
                      options={archiveOptions}
                      onChange={(archiveStrategy) => updateDraft(draft.id, { archiveStrategy })}
                    />
                  )}
                </div>
                <ItemMetadataFields
                  draft={draft}
                  loadingBooth={loadingBoothId === draft.id}
                  models={models}
                  tags={tags}
                  onAddSuggestedModel={(model) => void addSuggestedModel(draft, model)}
                  onAddSuggestedTag={(tagName) => void addSuggestedTag(draft, tagName)}
                  onFetchBooth={() => void fetchBoothForDraft(draft)}
                  onUpdate={(patch) => updateDraft(draft.id, patch)}
                />
                <TargetPreviewLine preview={previews[draft.id]} />
                <ZipContents
                  draft={draft}
                  contents={zipContents[draft.id]}
                  loading={loadingZipId === draft.id}
                  onLoad={() => void loadZip(draft)}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button disabled={!hasLibraryRoot || !allConfirmed || saving} onClick={() => void submit()}>
              {saving ? "導入中" : "開始導入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
