"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getVersion } from "@tauri-apps/api/app";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import {
  Download,
  GripVertical,
  Package,
  Plus,
  Search,
  Tag,
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
import { SidebarFilterSectionHeader } from "@/components/sidebar-filter-section-header";
import {
  SidebarFilterRow,
  type SidebarDropTarget,
} from "@/components/sidebar-filter-row";
import { Button } from "@/components/ui/button";
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

type DragState =
  | {
      type: "model";
      id: number;
    }
  | {
      type: "tag";
      id: number;
    };

const SIDEBAR_WIDTH_STORAGE_KEY = "vrc-asset-manager-sidebar-width";
const SIDEBAR_MODEL_FILTER_OPEN_STORAGE_KEY =
  "vrc-asset-manager-sidebar-model-filter-open";
const SIDEBAR_TAG_FILTER_OPEN_STORAGE_KEY =
  "vrc-asset-manager-sidebar-tag-filter-open";
const SIDEBAR_DEFAULT_WIDTH = 240;
const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 420;

const clampSidebarWidth = (width: number) =>
  Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));

const getInitialSidebarWidth = () => {
  if (typeof window === "undefined") {
    return SIDEBAR_DEFAULT_WIDTH;
  }

  const saved = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
  return Number.isFinite(saved)
    ? clampSidebarWidth(saved)
    : SIDEBAR_DEFAULT_WIDTH;
};

const getInitialSidebarSectionOpen = (key: string) => {
  if (typeof window === "undefined") {
    return true;
  }

  const saved = window.localStorage.getItem(key);
  return saved === null ? true : saved === "true";
};

const getReorderedIds = <T extends { id: number }>(
  items: T[],
  draggedId: number,
  targetId: number,
  placement: SidebarDropTarget["placement"],
) => {
  const draggedItem = items.find((item) => item.id === draggedId);
  const remainingItems = items.filter((item) => item.id !== draggedId);
  const targetIndex = remainingItems.findIndex((item) => item.id === targetId);

  if (!draggedItem || targetIndex < 0) {
    return null;
  }

  const insertIndex = placement === "after" ? targetIndex + 1 : targetIndex;
  const nextItems = [...remainingItems];
  nextItems.splice(insertIndex, 0, draggedItem);

  const currentIds = items.map((item) => item.id);
  const nextIds = nextItems.map((item) => item.id);

  return nextIds.every((id, index) => id === currentIds[index]) ? null : nextIds;
};

const getPointerDropTargetId = (
  type: DragState["type"],
  clientX: number,
  clientY: number,
): SidebarDropTarget | null => {
  const target = document.elementFromPoint(clientX, clientY);
  const attribute = type === "model" ? "data-model-id" : "data-tag-id";
  const row = target?.closest<HTMLElement>(`[${attribute}]`);
  const id = Number(row?.getAttribute(attribute));

  if (!row || !Number.isFinite(id)) {
    return null;
  }

  const rect = row.getBoundingClientRect();
  return {
    id,
    placement: clientY > rect.top + rect.height / 2 ? "after" : "before",
  };
};

export function Sidebar() {
  const {
    assets,
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
    reorderModels,
    reorderTags,
    exportSave,
    importSave,
    saving,
  } = useAssetStore();
  const sidebarRef = useRef<HTMLElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState(getInitialSidebarWidth);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isModelFilterOpen, setIsModelFilterOpen] = useState(() =>
    getInitialSidebarSectionOpen(SIDEBAR_MODEL_FILTER_OPEN_STORAGE_KEY),
  );
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(() =>
    getInitialSidebarSectionOpen(SIDEBAR_TAG_FILTER_OPEN_STORAGE_KEY),
  );
  const [isModelEditMode, setIsModelEditMode] = useState(false);
  const [isTagEditMode, setIsTagEditMode] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPreviewPosition, setDragPreviewPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [modelDropTarget, setModelDropTarget] =
    useState<SidebarDropTarget | null>(null);
  const [tagDropTarget, setTagDropTarget] =
    useState<SidebarDropTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [importPath, setImportPath] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  const selectedModelCount = filters.modelIds.length;
  const selectedTagCount = filters.tagIds.length;
  const hasActiveFilters = Boolean(
    filters.search || selectedModelCount > 0 || selectedTagCount > 0,
  );
  const filteredCount = hasActiveFilters ? assets.length : 0;
  const selectedModelIds = useMemo(
    () => new Set(filters.modelIds),
    [filters.modelIds],
  );
  const selectedTagIds = useMemo(
    () => new Set(filters.tagIds),
    [filters.tagIds],
  );
  const modelById = useMemo(
    () => new Map(models.map((model) => [model.id, model])),
    [models],
  );
  const tagById = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag])),
    [tags],
  );
  const deleteDescription =
    deleteTarget?.type === "model"
      ? `此操作將刪除模型「${deleteTarget.label}」，並移除所有素材與此模型的關聯。實際素材檔案不會被刪除。`
      : deleteTarget
        ? `此操作將刪除標籤「${deleteTarget.label}」，並移除所有素材與此標籤的關聯。實際素材檔案不會被刪除。`
        : "";
  const draggedModelId = dragState?.type === "model" ? dragState.id : null;
  const draggedTagId = dragState?.type === "tag" ? dragState.id : null;
  const dragPreviewLabel = useMemo(() => {
    if (!dragState) {
      return null;
    }

    if (dragState.type === "model") {
      const model = modelById.get(dragState.id);
      return model?.display_name || model?.name || null;
    }

    return tagById.get(dragState.id)?.name ?? null;
  }, [dragState, modelById, tagById]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      SIDEBAR_WIDTH_STORAGE_KEY,
      String(sidebarWidth),
    );
  }, [sidebarWidth]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      SIDEBAR_MODEL_FILTER_OPEN_STORAGE_KEY,
      String(isModelFilterOpen),
    );
  }, [isModelFilterOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      SIDEBAR_TAG_FILTER_OPEN_STORAGE_KEY,
      String(isTagFilterOpen),
    );
  }, [isTagFilterOpen]);

  useEffect(() => {
    void getVersion()
      .then(setAppVersion)
      .catch(() => setAppVersion(null));
  }, []);

  useEffect(() => {
    if (isModelEditMode) {
      setIsModelFilterOpen(true);
    }
  }, [isModelEditMode]);

  useEffect(() => {
    if (isTagEditMode) {
      setIsTagFilterOpen(true);
    }
  }, [isTagEditMode]);

  useEffect(() => {
    if (!isResizingSidebar) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      setSidebarWidth(clampSidebarWidth(event.clientX - sidebarLeft));
    };
    const handlePointerUp = () => setIsResizingSidebar(false);
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isResizingSidebar]);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const clearDragState = () => {
      setDragState(null);
      setDragPreviewPosition(null);
      setModelDropTarget(null);
      setTagDropTarget(null);
    };

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      setDragPreviewPosition({ x: event.clientX, y: event.clientY });
      const target = getPointerDropTargetId(
        dragState.type,
        event.clientX,
        event.clientY,
      );
      const nextTarget = target?.id !== dragState.id ? target : null;

      if (dragState.type === "model") {
        setModelDropTarget(nextTarget);
      } else {
        setTagDropTarget(nextTarget);
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      const target = getPointerDropTargetId(
        dragState.type,
        event.clientX,
        event.clientY,
      );

      if (target !== null && target.id !== dragState.id) {
        if (dragState.type === "model") {
          const nextIds = getReorderedIds(
            models,
            dragState.id,
            target.id,
            target.placement,
          );
          if (nextIds) {
            void reorderModels(nextIds).catch(() => {
              // The store owns the visible error message.
            });
          }
        } else {
          const nextIds = getReorderedIds(
            tags,
            dragState.id,
            target.id,
            target.placement,
          );
          if (nextIds) {
            void reorderTags(nextIds).catch(() => {
              // The store owns the visible error message.
            });
          }
        }
      }

      clearDragState();
    };

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", clearDragState);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", clearDragState);
    };
  }, [dragState, models, reorderModels, reorderTags, tags]);

  const handleSidebarResizeStart = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    setIsResizingSidebar(true);
  };

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

  const handleModelDragStart = (
    event: ReactPointerEvent<HTMLButtonElement>,
    modelId: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isModelEditMode) {
      return;
    }

    setDragState({ type: "model", id: modelId });
    setDragPreviewPosition({ x: event.clientX, y: event.clientY });
    setModelDropTarget(null);
  };

  const handleTagDragStart = (
    event: ReactPointerEvent<HTMLButtonElement>,
    tagId: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isTagEditMode) {
      return;
    }

    setDragState({ type: "tag", id: tagId });
    setDragPreviewPosition({ x: event.clientX, y: event.clientY });
    setTagDropTarget(null);
  };

  return (
    <aside
      ref={sidebarRef}
      className="relative flex h-full min-h-0 shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
      style={{
        width: sidebarWidth,
        minWidth: SIDEBAR_MIN_WIDTH,
        maxWidth: SIDEBAR_MAX_WIDTH,
      }}
    >
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4">
        <h1 className="flex min-w-0 items-center gap-2 text-lg font-semibold text-sidebar-foreground">
          <Package className="h-5 w-5 shrink-0" />
          <span className="truncate">VRC Asset Manager</span>
        </h1>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            data-shortcut="asset-search"
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
            <SidebarFilterSectionHeader
              icon={User}
              label="依模型篩選"
              selectedCount={selectedModelCount}
              open={isModelFilterOpen}
              editing={isModelEditMode}
              editLabel="編輯模型清單"
              doneLabel="完成編輯模型"
              addLabel="新增模型"
              onToggleOpen={() => setIsModelFilterOpen((current) => !current)}
              onToggleEditing={() => {
                const nextEditMode = !isModelEditMode;
                setIsModelEditMode(nextEditMode);
                if (nextEditMode) {
                  setIsModelFilterOpen(true);
                }
              }}
              onAdd={() => {
                setIsModelFilterOpen(true);
                setAddModelDialogOpen(true);
              }}
            />
            {isModelFilterOpen && (
              <div className="space-y-1">
                {models.map((model) => (
                  <SidebarFilterRow
                    key={model.id}
                    kind="model"
                    id={model.id}
                    label={model.display_name || model.name}
                    checked={selectedModelIds.has(model.id)}
                    editing={isModelEditMode}
                    dragging={draggedModelId === model.id}
                    dropTarget={modelDropTarget}
                    editLabel="編輯模型"
                    deleteLabel="刪除模型"
                    onToggle={() => toggleModelFilter(model.id)}
                    onEdit={() => handleEditModel(model)}
                    onDelete={() =>
                      setDeleteTarget({
                        type: "model",
                        id: model.id,
                        label: model.display_name || model.name,
                      })
                    }
                    onDragStart={handleModelDragStart}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <SidebarFilterSectionHeader
              icon={Tag}
              label="依標籤篩選"
              selectedCount={selectedTagCount}
              open={isTagFilterOpen}
              editing={isTagEditMode}
              editLabel="編輯標籤清單"
              doneLabel="完成編輯標籤"
              addLabel="新增標籤"
              onToggleOpen={() => setIsTagFilterOpen((current) => !current)}
              onToggleEditing={() => {
                const nextEditMode = !isTagEditMode;
                setIsTagEditMode(nextEditMode);
                if (nextEditMode) {
                  setIsTagFilterOpen(true);
                }
              }}
              onAdd={() => {
                setIsTagFilterOpen(true);
                setAddTagDialogOpen(true);
              }}
            />
            {isTagFilterOpen && (
              <div className="space-y-1">
                {tags.map((tag) => (
                  <SidebarFilterRow
                    key={tag.id}
                    kind="tag"
                    id={tag.id}
                    label={tag.name}
                    checked={selectedTagIds.has(tag.id)}
                    editing={isTagEditMode}
                    dragging={draggedTagId === tag.id}
                    dropTarget={tagDropTarget}
                    swatchColor={tag.color}
                    editLabel="編輯標籤"
                    deleteLabel="刪除標籤"
                    onToggle={() => toggleTagFilter(tag.id)}
                    onEdit={() => handleEditTag(tag)}
                    onDelete={() =>
                      setDeleteTarget({
                        type: "tag",
                        id: tag.id,
                        label: tag.name,
                      })
                    }
                    onDragStart={handleTagDragStart}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="space-y-2 border-t border-sidebar-border p-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-center"
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
            className="justify-center"
            disabled={saving}
            onClick={() => void handleSelectImportSave()}
          >
            <Upload className="h-4 w-4" />
            匯入
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          VRC Asset Manager{appVersion ? ` v${appVersion}` : ""}
        </p>
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="調整側邊欄寬度"
        className={cn(
          "absolute top-0 right-0 z-20 h-full w-1.5 cursor-col-resize touch-none bg-transparent transition-colors hover:bg-primary/50",
          isResizingSidebar && "bg-primary/50",
        )}
        onPointerDown={handleSidebarResizeStart}
      />

      {dragState && dragPreviewPosition && dragPreviewLabel && (
        <div
          className="pointer-events-none fixed z-[60] max-w-80 -translate-y-1/2 rounded-md border border-border bg-popover px-3 py-2 text-sm font-medium text-popover-foreground shadow-lg"
          style={{
            left: dragPreviewPosition.x + 14,
            top: dragPreviewPosition.y,
          }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{dragPreviewLabel}</span>
          </div>
        </div>
      )}

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
              匯入會以選取的存檔替換目前資料庫中的素材、模型、標籤、VCC 專案與套件來源。此操作不會刪除實際素材檔案，也不會覆寫 VCC 本身的設定。
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
