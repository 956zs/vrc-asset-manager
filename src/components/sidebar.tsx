"use client";

import { useState } from "react";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import {
  Check,
  Download,
  Package,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/stores/asset-store";

type DeleteTarget =
  | {
      type: "model";
      id: number;
      label: string;
    }
  | {
      type: "tag";
      id: number;
      label: string;
    };

export function Sidebar() {
  const {
    models,
    tags,
    filters,
    setSearchFilter,
    toggleModelFilter,
    toggleTagFilter,
    clearFilters,
    setAddAssetDialogOpen,
    setAddModelDialogOpen,
    setAddTagDialogOpen,
    setEditingModel,
    setEditingTag,
    deleteModel,
    deleteTag,
    exportSave,
    importSave,
    getFilteredAssets,
    saving,
  } = useAssetStore();
  const [isModelEditMode, setIsModelEditMode] = useState(false);
  const [isTagEditMode, setIsTagEditMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [importPath, setImportPath] = useState<string | null>(null);

  const filteredCount = getFilteredAssets().length;
  const hasActiveFilters =
    filters.search || filters.modelIds.length > 0 || filters.tagIds.length > 0;
  const deleteDescription =
    deleteTarget?.type === "model"
      ? `此操作將刪除模型「${deleteTarget.label}」，並移除所有素材與此模型的關聯。實際素材檔案不會被刪除。`
      : deleteTarget
        ? `此操作將刪除標籤「${deleteTarget.label}」，並移除所有素材與此標籤的關聯。實際素材檔案不會被刪除。`
        : "";

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      if (deleteTarget.type === "model") {
        await deleteModel(deleteTarget.id);
      } else {
        await deleteTag(deleteTarget.id);
      }
      setDeleteTarget(null);
    } catch {
      // The store owns the visible error message.
    }
  };

  const handleEditModel = (model: (typeof models)[number]) => {
    setAddModelDialogOpen(false);
    setEditingTag(null);
    setEditingModel({ ...model });
  };

  const handleEditTag = (tag: (typeof tags)[number]) => {
    setAddTagDialogOpen(false);
    setEditingModel(null);
    setEditingTag({ ...tag });
  };

  const handleExportSave = async () => {
    const selected = await saveDialog({
      title: "匯出 VRC Asset Manager 存檔",
      defaultPath: "vrc-asset-manager-save.json",
      filters: [{ name: "JSON 存檔", extensions: ["json"] }],
    });

    if (typeof selected === "string") {
      try {
        await exportSave(selected);
      } catch {
        // The store owns the visible error message.
      }
    }
  };

  const handleSelectImportSave = async () => {
    const selected = await openDialog({
      title: "匯入 VRC Asset Manager 存檔",
      multiple: false,
      directory: false,
      filters: [{ name: "JSON 存檔", extensions: ["json"] }],
    });

    if (typeof selected === "string") {
      setImportPath(selected);
    }
  };

  const handleConfirmImportSave = async () => {
    if (!importPath) {
      return;
    }

    try {
      await importSave(importPath);
      setImportPath(null);
    } catch {
      // The store owns the visible error message.
    }
  };

  return (
    <aside className="flex h-full min-h-0 w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="border-b border-sidebar-border p-4">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-sidebar-foreground">
          <Package className="h-5 w-5" />
          VRC Asset Manager
        </h1>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜尋素材..."
            className="border-sidebar-border bg-sidebar-accent pl-8 text-sidebar-foreground placeholder:text-muted-foreground"
            value={filters.search}
            onChange={(event) => setSearchFilter(event.target.value)}
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center justify-between px-3 pb-2">
          <span className="text-xs text-muted-foreground">{filteredCount} 個結果</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-sidebar-foreground"
            onClick={clearFilters}
          >
            <X className="mr-1 h-3 w-3" />
            清除篩選
          </Button>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 p-3">
          <Button className="w-full justify-start" onClick={() => setAddAssetDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新增素材
          </Button>

          <div>
            <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <h3 className="flex min-w-0 items-center gap-2 text-sm font-medium text-sidebar-foreground">
                <User className="h-4 w-4 shrink-0" />
                <span className="truncate">依模型篩選</span>
              </h3>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "!size-7 text-muted-foreground hover:text-sidebar-foreground",
                    isModelEditMode && "bg-sidebar-accent text-sidebar-foreground",
                  )}
                  title={isModelEditMode ? "完成編輯模型" : "編輯模型清單"}
                  aria-label={isModelEditMode ? "完成編輯模型" : "編輯模型清單"}
                  onClick={() => setIsModelEditMode((current) => !current)}
                >
                  {isModelEditMode ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Pencil className="h-3.5 w-3.5" />
                  )}
                </Button>
                {isModelEditMode && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="!size-7 text-muted-foreground hover:text-sidebar-foreground"
                    title="新增模型"
                    aria-label="新增模型"
                    onClick={() => setAddModelDialogOpen(true)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1">
              {models.map((model) => (
                <div
                  key={model.id}
                  className={cn(
                    "grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
                    "hover:bg-sidebar-accent",
                    filters.modelIds.includes(model.id) && "bg-sidebar-accent",
                    isModelEditMode && "grid-cols-[auto_minmax(0,1fr)_auto]",
                  )}
                >
                  <Checkbox
                    checked={filters.modelIds.includes(model.id)}
                    onCheckedChange={() => toggleModelFilter(model.id)}
                  />
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-sm text-sidebar-foreground"
                    onClick={() => toggleModelFilter(model.id)}
                  >
                    {model.display_name || model.name}
                  </button>
                  {isModelEditMode && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="!size-7"
                        title="編輯模型"
                        aria-label="編輯模型"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditModel(model);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="!size-7"
                        title="刪除模型"
                        aria-label="刪除模型"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTarget({
                            type: "model",
                            id: model.id,
                            label: model.display_name || model.name,
                          });
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <h3 className="flex min-w-0 items-center gap-2 text-sm font-medium text-sidebar-foreground">
                <Tag className="h-4 w-4 shrink-0" />
                <span className="truncate">依標籤篩選</span>
              </h3>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "!size-7 text-muted-foreground hover:text-sidebar-foreground",
                    isTagEditMode && "bg-sidebar-accent text-sidebar-foreground",
                  )}
                  title={isTagEditMode ? "完成編輯標籤" : "編輯標籤清單"}
                  aria-label={isTagEditMode ? "完成編輯標籤" : "編輯標籤清單"}
                  onClick={() => setIsTagEditMode((current) => !current)}
                >
                  {isTagEditMode ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Pencil className="h-3.5 w-3.5" />
                  )}
                </Button>
                {isTagEditMode && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="!size-7 text-muted-foreground hover:text-sidebar-foreground"
                    title="新增標籤"
                    aria-label="新增標籤"
                    onClick={() => setAddTagDialogOpen(true)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className={cn(
                    "grid cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
                    "hover:bg-sidebar-accent",
                    filters.tagIds.includes(tag.id) && "bg-sidebar-accent",
                    isTagEditMode && "grid-cols-[auto_auto_minmax(0,1fr)_auto]",
                  )}
                >
                  <Checkbox
                    checked={filters.tagIds.includes(tag.id)}
                    onCheckedChange={() => toggleTagFilter(tag.id)}
                  />
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-sm text-sidebar-foreground"
                    onClick={() => toggleTagFilter(tag.id)}
                  >
                    {tag.name}
                  </button>
                  {isTagEditMode && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="!size-7"
                        title="編輯標籤"
                        aria-label="編輯標籤"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditTag(tag);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="!size-7"
                        title="刪除標籤"
                        aria-label="刪除標籤"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTarget({
                            type: "tag",
                            id: tag.id,
                            label: tag.name,
                          });
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="space-y-2 border-t border-sidebar-border p-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-start"
            disabled={saving}
            onClick={() => void handleExportSave()}
          >
            <Download className="h-4 w-4" />
            匯出
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-start"
            disabled={saving}
            onClick={() => void handleSelectImportSave()}
          >
            <Upload className="h-4 w-4" />
            匯入
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          VRC Asset Manager v1.0
        </p>
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              確定要刪除這個{deleteTarget?.type === "model" ? "模型" : "標籤"}嗎？
            </AlertDialogTitle>
            <AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmDelete();
              }}
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={importPath !== null}
        onOpenChange={(open) => {
          if (!open) {
            setImportPath(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要匯入這個存檔嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              匯入會以選取的存檔替換目前資料庫中的素材、模型、標籤與關聯。此操作不會刪除實際素材檔案。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmImportSave();
              }}
            >
              匯入
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
