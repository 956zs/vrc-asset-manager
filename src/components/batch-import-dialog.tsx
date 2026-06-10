"use client";

import { useEffect, useState } from "react";
import { Archive, CheckCircle2, FolderOpen, Loader2, XCircle } from "lucide-react";
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
  ZipContentList,
} from "@/types";

type BatchImportDraft = {
  id: string;
  sourcePath: string;
  category: AssetCategory;
  operation: ImportOperation;
  archiveStrategy: ArchiveStrategy;
  conflictStrategy: ConflictStrategy;
  confirmed: boolean;
};

type BatchImportDialogProps = {
  open: boolean;
  paths: string[];
  onOpenChange: (open: boolean) => void;
};

const isZipPath = (path: string) => path.toLocaleLowerCase().endsWith(".zip");
const sourceName = (path: string) => path.split(/[\\/]/).pop() || path;

function createDrafts(paths: string[]): BatchImportDraft[] {
  return paths.map((path, index) => ({
    id: `${index}-${path}`,
    sourcePath: path,
    category: "accessory",
    operation: "move",
    archiveStrategy: "keepArchive",
    conflictStrategy: "cancel",
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
    displayName: null,
    boothUrl: null,
    thumbnailUrl: null,
    note: null,
    modelIds: [],
    tagIds: [],
    relatedLinks: [],
  };
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
  const saving = useAssetStore((state) => state.saving);
  const librarySettings = useAssetStore((state) => state.librarySettings);
  const report = useAssetStore((state) => state.importReport);
  const clearImportReport = useAssetStore((state) => state.clearImportReport);
  const previewManagedImportTarget = useAssetStore((state) => state.previewManagedImportTarget);
  const listZipContents = useAssetStore((state) => state.listZipContents);
  const managedImportBatch = useAssetStore((state) => state.managedImportBatch);
  const [drafts, setDrafts] = useState<BatchImportDraft[]>([]);
  const [previews, setPreviews] = useState<Record<string, ImportTargetPreview>>({});
  const [zipContents, setZipContents] = useState<Record<string, ZipContentList>>({});
  const [loadingZipId, setLoadingZipId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDrafts(createDrafts(paths));
      setPreviews({});
      setZipContents({});
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
  const loadZip = async (draft: BatchImportDraft) => {
    setLoadingZipId(draft.id);
    try {
      const contents = await listZipContents(draft.sourcePath);
      setZipContents((current) => ({ ...current, [draft.id]: contents }));
    } finally {
      setLoadingZipId(null);
    }
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
                    options={[
                      { value: "avatar", label: "素體" },
                      { value: "accessory", label: "素體配件" },
                      { value: "world", label: "世界" },
                    ]}
                    onChange={(category) => updateDraft(draft.id, { category })}
                  />
                  <ImportOptionSelect
                    label="方式"
                    help="移動會把原檔搬進素材庫；複製會保留原檔，再複製一份到素材庫。"
                    value={draft.operation}
                    options={[
                      { value: "move", label: "移動" },
                      { value: "copy", label: "複製" },
                    ]}
                    onChange={(operation) => updateDraft(draft.id, { operation })}
                  />
                  <ImportOptionSelect
                    label="衝突"
                    help="目標位置已經有同名檔案或資料夾時，決定要取消、自動改名，還是覆蓋。"
                    value={draft.conflictStrategy}
                    options={[
                      { value: "cancel", label: "取消" },
                      { value: "rename", label: "改名" },
                      { value: "overwrite", label: "覆蓋" },
                    ]}
                    onChange={(conflictStrategy) => updateDraft(draft.id, { conflictStrategy })}
                  />
                  {isZipPath(draft.sourcePath) && (
                    <ImportOptionSelect
                      label="Zip"
                      help="保留壓縮檔會直接管理 .zip；解壓後管理會把內容解開成資料夾。"
                      value={draft.archiveStrategy}
                      options={[
                        { value: "keepArchive", label: "保留壓縮檔" },
                        { value: "extract", label: "解壓後管理" },
                      ]}
                      onChange={(archiveStrategy) => updateDraft(draft.id, { archiveStrategy })}
                    />
                  )}
                </div>
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
