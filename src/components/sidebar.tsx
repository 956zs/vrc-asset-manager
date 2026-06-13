"use client";

import {
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type ReactNode,
  type SetStateAction,
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
  Upload,
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
import {
  ActiveFilterSummary,
  SidebarFilterPanel,
  SidebarSearch,
  type ModelFilterSectionProps,
  type ShopFilterSectionProps,
  type TagFilterSectionProps,
} from "@/components/sidebar-filter-panel";
import {
  useSidebarDragController,
  type DragPreviewPosition,
} from "@/components/sidebar-drag";
import { Button } from "@/components/ui/button";
import { FloatingSurface } from "@/components/ui/floating-surface";
import { isTauriRuntime } from "@/lib/tauri-runtime";
import { cn } from "@/lib/utils";
import { type AssetStore, useAssetStore } from "@/stores/asset-store";
import type {
  AssetCategory,
  AssetFilters,
  AssetStatusFilter,
  Model,
  Tag as AssetTag,
} from "@/types";

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

type SidebarBooleanSetter = Dispatch<SetStateAction<boolean>>;
type SidebarDialogOpenSetter = (open: boolean) => void;
type SidebarDeleteAction = (id: number) => Promise<void>;
type SidebarSaveAction = (path: string) => Promise<void>;
type SidebarModelSetter = (model: Model | null) => void;
type SidebarTagSetter = (tag: AssetTag | null) => void;
type SidebarStoreState = AssetStore;

type SidebarResizeOptions = {
  sidebarRef: RefObject<HTMLElement | null>;
  setSidebarWidth: Dispatch<SetStateAction<number>>;
};

type SidebarResizeHandlers = {
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: () => void;
};

type ModelFilterSectionOptions = Pick<
  ModelFilterSectionProps,
  | "selectedCount"
  | "open"
  | "editing"
  | "models"
  | "selectedIds"
  | "draggedId"
  | "dropTarget"
  | "onToggle"
  | "onEdit"
  | "onDragStart"
> & {
  setOpen: SidebarBooleanSetter;
  setEditing: SidebarBooleanSetter;
  setAddDialogOpen: SidebarDialogOpenSetter;
  setDeleteTarget: Dispatch<SetStateAction<DeleteTarget | null>>;
};

type TagFilterSectionOptions = Pick<
  TagFilterSectionProps,
  | "selectedCount"
  | "open"
  | "editing"
  | "tags"
  | "selectedIds"
  | "draggedId"
  | "dropTarget"
  | "onToggle"
  | "onEdit"
  | "onDragStart"
> & {
  setOpen: SidebarBooleanSetter;
  setEditing: SidebarBooleanSetter;
  setAddDialogOpen: SidebarDialogOpenSetter;
  setDeleteTarget: Dispatch<SetStateAction<DeleteTarget | null>>;
};

type SidebarEditHandlerOptions = {
  setAddModelDialogOpen: SidebarDialogOpenSetter;
  setAddTagDialogOpen: SidebarDialogOpenSetter;
  setEditingModel: SidebarModelSetter;
  setEditingTag: SidebarTagSetter;
};

type SidebarDeleteHandlerOptions = {
  deleteTarget: DeleteTarget | null;
  setDeleteTarget: Dispatch<SetStateAction<DeleteTarget | null>>;
  deleteModel: SidebarDeleteAction;
  deleteTag: SidebarDeleteAction;
};

type SidebarSaveHandlerOptions = {
  importPath: string | null;
  setImportPath: Dispatch<SetStateAction<string | null>>;
  exportSave: SidebarSaveAction;
  importSave: SidebarSaveAction;
};

type SidebarSectionState = {
  isModelFilterOpen: boolean;
  setIsModelFilterOpen: SidebarBooleanSetter;
  isTagFilterOpen: boolean;
  setIsTagFilterOpen: SidebarBooleanSetter;
  isShopFilterOpen: boolean;
  setIsShopFilterOpen: SidebarBooleanSetter;
  isModelEditMode: boolean;
  setIsModelEditMode: SidebarBooleanSetter;
  isTagEditMode: boolean;
  setIsTagEditMode: SidebarBooleanSetter;
};

type SidebarFilterState = {
  selectedModelCount: number;
  selectedTagCount: number;
  selectedShopCount: number;
  selectedStatusCount: number;
  hasActiveFilters: boolean;
  filteredCount: number;
  selectedModelIds: ReadonlySet<number>;
  selectedTagIds: ReadonlySet<number>;
  selectedShopKeys: ReadonlySet<string>;
  selectedStatusFilters: ReadonlySet<AssetStatusFilter>;
};

type SidebarShellProps = {
  sidebarRef: RefObject<HTMLElement | null>;
  sidebarWidth: number;
  children: ReactNode;
};

type SidebarOverlayLayerProps = {
  isResizingSidebar: boolean;
  dragPreviewPosition: DragPreviewPosition | null;
  dragPreviewLabel: string | null;
  deleteTarget: DeleteTarget | null;
  deleteDescription: string;
  importPath: string | null;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  onCloseImport: () => void;
  onConfirmImport: () => void;
};

type SidebarLayoutProps = Omit<SidebarShellProps, "children"> &
  SidebarOverlayLayerProps & {
    search: string;
  filterState: SidebarFilterState;
  modelFilter: ModelFilterSectionProps;
  tagFilter: TagFilterSectionProps;
  shopFilter: ShopFilterSectionProps;
  category: AssetCategory | null;
  statusFilters: readonly AssetStatusFilter[];
  saving: boolean;
    appVersion: string | null;
    onSearchChange: (value: string) => void;
    onClearFilters: () => void;
    onCategoryChange: (category: AssetCategory | null) => void;
    onStatusToggle: (status: AssetStatusFilter) => void;
    onAddAsset: () => void;
    onExport: () => void;
    onImport: () => void;
  };

type SidebarDialogController = ReturnType<typeof useSidebarDialogController>;
type SidebarDragController = ReturnType<typeof useSidebarDragController>;

type SidebarFilterPanelControllerOptions = {
  store: SidebarStoreState;
  sections: SidebarSectionState;
  filterState: SidebarFilterState;
  drag: SidebarDragController;
  dialogs: SidebarDialogController;
};

type SidebarSaveActionsProps = {
  saving: boolean;
  appVersion: string | null;
  onExport: () => void;
  onImport: () => void;
};

type SidebarResizeHandleProps = {
  resizing: boolean;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

type SidebarDragPreviewProps = {
  position: DragPreviewPosition | null;
  label: string | null;
};

type SidebarDeleteDialogProps = {
  target: DeleteTarget | null;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
};

type SidebarImportDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const SIDEBAR_WIDTH_STORAGE_KEY = "vrc-asset-manager-sidebar-width";
const SIDEBAR_MODEL_FILTER_OPEN_STORAGE_KEY =
  "vrc-asset-manager-sidebar-model-filter-open";
const SIDEBAR_TAG_FILTER_OPEN_STORAGE_KEY =
  "vrc-asset-manager-sidebar-tag-filter-open";
const SIDEBAR_SHOP_FILTER_OPEN_STORAGE_KEY =
  "vrc-asset-manager-sidebar-shop-filter-open";
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

const getInitialSidebarSectionOpen = (key: string, defaultOpen = true) => {
  if (typeof window === "undefined") {
    return defaultOpen;
  }

  const saved = window.localStorage.getItem(key);
  return saved === null ? defaultOpen : saved === "true";
};

function useStoredSidebarWidth() {
  const [sidebarWidth, setSidebarWidth] = useState(getInitialSidebarWidth);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      SIDEBAR_WIDTH_STORAGE_KEY,
      String(sidebarWidth),
    );
  }, [sidebarWidth]);

  return [sidebarWidth, setSidebarWidth] as const;
}

function usePersistentSidebarSection(storageKey: string, defaultOpen = true) {
  const [open, setOpen] = useState(() =>
    getInitialSidebarSectionOpen(storageKey, defaultOpen),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, String(open));
  }, [open, storageKey]);

  return [open, setOpen] as const;
}

function attachSidebarResizeListeners({
  onPointerMove,
  onPointerUp,
}: SidebarResizeHandlers) {
  const previousCursor = document.body.style.cursor;
  const previousUserSelect = document.body.style.userSelect;

  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);

  return () => {
    document.body.style.cursor = previousCursor;
    document.body.style.userSelect = previousUserSelect;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };
}

function useSidebarResize({
  sidebarRef,
  setSidebarWidth,
}: SidebarResizeOptions) {
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  useEffect(() => {
    if (!isResizingSidebar) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      setSidebarWidth(clampSidebarWidth(event.clientX - sidebarLeft));
    };
    const handlePointerUp = () => setIsResizingSidebar(false);

    return attachSidebarResizeListeners({
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    });
  }, [isResizingSidebar, setSidebarWidth, sidebarRef]);

  const handleSidebarResizeStart = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    setIsResizingSidebar(true);
  };

  return { isResizingSidebar, handleSidebarResizeStart };
}

function useSidebarWidth() {
  const sidebarRef = useRef<HTMLElement>(null);
  const [sidebarWidth, setSidebarWidth] = useStoredSidebarWidth();
  const { isResizingSidebar, handleSidebarResizeStart } = useSidebarResize({
    sidebarRef,
    setSidebarWidth,
  });

  return {
    sidebarRef,
    sidebarWidth,
    isResizingSidebar,
    handleSidebarResizeStart,
  };
}

function useAppVersion() {
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauriRuntime()) {
      setAppVersion(null);
      return;
    }

    void getVersion()
      .then(setAppVersion)
      .catch(() => setAppVersion(null));
  }, []);

  return appVersion;
}

function useSidebarFilterState(
  assetCount: number,
  filters: AssetFilters,
): SidebarFilterState {
  const selectedModelCount = filters.modelIds.length;
  const selectedTagCount = filters.tagIds.length;
  const selectedShopCount = filters.shopFilters.length;
  const selectedStatusCount = filters.statusFilters.length;
  const selectedModelIds = useMemo(
    () => new Set(filters.modelIds),
    [filters.modelIds],
  );
  const selectedTagIds = useMemo(
    () => new Set(filters.tagIds),
    [filters.tagIds],
  );
  const selectedStatusFilters = useMemo(
    () => new Set(filters.statusFilters),
    [filters.statusFilters],
  );
  const selectedShopKeys = useMemo(
    () =>
      new Set(
        filters.shopFilters.map(
          (shop) => `${shop.name.trim()}|${shop.url?.trim() ?? ""}`,
        ),
      ),
    [filters.shopFilters],
  );
  const hasActiveFilters = Boolean(
    filters.search ||
      filters.category ||
      selectedModelCount > 0 ||
      selectedTagCount > 0 ||
      selectedShopCount > 0 ||
      selectedStatusCount > 0,
  );

  return {
    selectedModelCount,
    selectedTagCount,
    selectedShopCount,
    selectedStatusCount,
    hasActiveFilters,
    filteredCount: hasActiveFilters ? assetCount : 0,
    selectedModelIds,
    selectedTagIds,
    selectedShopKeys,
    selectedStatusFilters,
  };
}

function useOpenSidebarSectionOnEditMode(
  editing: boolean,
  setOpen: Dispatch<SetStateAction<boolean>>,
) {
  useEffect(() => {
    if (editing) {
      setOpen(true);
    }
  }, [editing, setOpen]);
}

function useSidebarSections(): SidebarSectionState {
  const [isModelFilterOpen, setIsModelFilterOpen] =
    usePersistentSidebarSection(SIDEBAR_MODEL_FILTER_OPEN_STORAGE_KEY);
  const [isTagFilterOpen, setIsTagFilterOpen] = usePersistentSidebarSection(
    SIDEBAR_TAG_FILTER_OPEN_STORAGE_KEY,
  );
  const [isShopFilterOpen, setIsShopFilterOpen] = usePersistentSidebarSection(
    SIDEBAR_SHOP_FILTER_OPEN_STORAGE_KEY,
    false,
  );
  const [isModelEditMode, setIsModelEditMode] = useState(false);
  const [isTagEditMode, setIsTagEditMode] = useState(false);

  useOpenSidebarSectionOnEditMode(isModelEditMode, setIsModelFilterOpen);
  useOpenSidebarSectionOnEditMode(isTagEditMode, setIsTagFilterOpen);

  return {
    isModelFilterOpen,
    setIsModelFilterOpen,
    isTagFilterOpen,
    setIsTagFilterOpen,
    isShopFilterOpen,
    setIsShopFilterOpen,
    isModelEditMode,
    setIsModelEditMode,
    isTagEditMode,
    setIsTagEditMode,
  };
}

function createModelFilterProps(
  options: ModelFilterSectionOptions,
): ModelFilterSectionProps {
  return {
    selectedCount: options.selectedCount,
    open: options.open,
    editing: options.editing,
    models: options.models,
    selectedIds: options.selectedIds,
    draggedId: options.draggedId,
    dropTarget: options.dropTarget,
    onToggleOpen: () => options.setOpen((current) => !current),
    onToggleEditing: () => {
      const nextEditMode = !options.editing;
      options.setEditing(nextEditMode);
      if (nextEditMode) {
        options.setOpen(true);
      }
    },
    onAdd: () => {
      options.setOpen(true);
      options.setAddDialogOpen(true);
    },
    onToggle: options.onToggle,
    onEdit: options.onEdit,
    onDelete: (model, label) =>
      options.setDeleteTarget({ type: "model", id: model.id, label }),
    onDragStart: options.onDragStart,
  };
}

function createTagFilterProps(
  options: TagFilterSectionOptions,
): TagFilterSectionProps {
  return {
    selectedCount: options.selectedCount,
    open: options.open,
    editing: options.editing,
    tags: options.tags,
    selectedIds: options.selectedIds,
    draggedId: options.draggedId,
    dropTarget: options.dropTarget,
    onToggleOpen: () => options.setOpen((current) => !current),
    onToggleEditing: () => {
      const nextEditMode = !options.editing;
      options.setEditing(nextEditMode);
      if (nextEditMode) {
        options.setOpen(true);
      }
    },
    onAdd: () => {
      options.setOpen(true);
      options.setAddDialogOpen(true);
    },
    onToggle: options.onToggle,
    onEdit: options.onEdit,
    onDelete: (tag, label) =>
      options.setDeleteTarget({ type: "tag", id: tag.id, label }),
    onDragStart: options.onDragStart,
  };
}

function createSidebarEditHandlers({
  setAddModelDialogOpen,
  setAddTagDialogOpen,
  setEditingModel,
  setEditingTag,
}: SidebarEditHandlerOptions) {
  const handleEditModel = (model: Model) => {
    setAddModelDialogOpen(false);
    setEditingTag(null);
    setEditingModel({ ...model });
  };

  const handleEditTag = (tag: AssetTag) => {
    setAddTagDialogOpen(false);
    setEditingModel(null);
    setEditingTag({ ...tag });
  };

  return { handleEditModel, handleEditTag };
}

function getDeleteDescription(deleteTarget: DeleteTarget | null) {
  if (deleteTarget?.type === "model") {
    return `此操作將刪除模型「${deleteTarget.label}」，並移除所有素材與此模型的關聯。實際素材檔案不會被刪除。`;
  }

  if (deleteTarget?.type === "tag") {
    return `此操作將刪除標籤「${deleteTarget.label}」，並移除所有素材與此標籤的關聯。實際素材檔案不會被刪除。`;
  }

  return "";
}

function createSidebarDeleteHandlers({
  deleteTarget,
  setDeleteTarget,
  deleteModel,
  deleteTag,
}: SidebarDeleteHandlerOptions) {
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

  return {
    deleteDescription: getDeleteDescription(deleteTarget),
    handleConfirmDelete,
  };
}

function createSidebarExportHandler(exportSave: SidebarSaveAction) {
  return async () => {
    const selected = await saveDialog({
      title: "匯出 VRC Asset Manager 存檔",
      defaultPath: "vrc-asset-manager-save.json",
      filters: [{ name: "JSON 存檔", extensions: ["json"] }],
    });

    if (typeof selected !== "string") {
      return;
    }

    try {
      await exportSave(selected);
    } catch {
      // The store owns the visible error message.
    }
  };
}

function createSidebarImportSelectHandler(
  setImportPath: Dispatch<SetStateAction<string | null>>,
) {
  return async () => {
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
}

function createSidebarImportConfirmHandler({
  importPath,
  setImportPath,
  importSave,
}: Pick<
  SidebarSaveHandlerOptions,
  "importPath" | "setImportPath" | "importSave"
>) {
  return async () => {
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
}

function createSidebarSaveHandlers(options: SidebarSaveHandlerOptions) {
  return {
    handleExportSave: createSidebarExportHandler(options.exportSave),
    handleSelectImportSave: createSidebarImportSelectHandler(
      options.setImportPath,
    ),
    handleConfirmImportSave: createSidebarImportConfirmHandler(options),
  };
}

function useSidebarDialogController(store: SidebarStoreState) {
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [importPath, setImportPath] = useState<string | null>(null);

  return {
    deleteTarget,
    setDeleteTarget,
    importPath,
    setImportPath,
    ...createSidebarEditHandlers({
      setAddModelDialogOpen: store.setAddModelDialogOpen,
      setAddTagDialogOpen: store.setAddTagDialogOpen,
      setEditingModel: store.setEditingModel,
      setEditingTag: store.setEditingTag,
    }),
    ...createSidebarDeleteHandlers({
      deleteTarget,
      setDeleteTarget,
      deleteModel: store.deleteModel,
      deleteTag: store.deleteTag,
    }),
    ...createSidebarSaveHandlers({
      importPath,
      setImportPath,
      exportSave: store.exportSave,
      importSave: store.importSave,
    }),
  };
}

function createSidebarFilterPanelProps({
  store,
  sections,
  filterState,
  drag,
  dialogs,
}: SidebarFilterPanelControllerOptions) {
  return {
    modelFilter: createModelFilterProps({
      selectedCount: filterState.selectedModelCount,
      open: sections.isModelFilterOpen,
      editing: sections.isModelEditMode,
      models: store.models,
      selectedIds: filterState.selectedModelIds,
      draggedId: drag.draggedModelId,
      dropTarget: drag.modelDropTarget,
      onToggle: store.toggleModelFilter,
      onEdit: dialogs.handleEditModel,
      onDragStart: drag.handleModelDragStart,
      setOpen: sections.setIsModelFilterOpen,
      setEditing: sections.setIsModelEditMode,
      setAddDialogOpen: store.setAddModelDialogOpen,
      setDeleteTarget: dialogs.setDeleteTarget,
    }),
    tagFilter: createTagFilterProps({
      selectedCount: filterState.selectedTagCount,
      open: sections.isTagFilterOpen,
      editing: sections.isTagEditMode,
      tags: store.tags,
      selectedIds: filterState.selectedTagIds,
      draggedId: drag.draggedTagId,
      dropTarget: drag.tagDropTarget,
      onToggle: store.toggleTagFilter,
      onEdit: dialogs.handleEditTag,
      onDragStart: drag.handleTagDragStart,
      setOpen: sections.setIsTagFilterOpen,
      setEditing: sections.setIsTagEditMode,
      setAddDialogOpen: store.setAddTagDialogOpen,
      setDeleteTarget: dialogs.setDeleteTarget,
    }),
    shopFilter: {
      selectedCount: filterState.selectedShopCount,
      open: sections.isShopFilterOpen,
      backfilling: store.boothShopBackfilling,
      progress: store.boothShopBackfillProgress,
      options: store.shopOptions,
      selectedKeys: filterState.selectedShopKeys,
      onToggleOpen: () => sections.setIsShopFilterOpen((current) => !current),
      onToggle: store.toggleShopFilter,
      onBackfill: () => {
        void store.backfillBoothShopMetadata().catch(() => undefined);
      },
    },
  };
}

function SidebarHeader() {
  return (
    <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4">
      <h1 className="flex min-w-0 items-center gap-2 text-lg font-semibold text-sidebar-foreground">
        <Package className="h-5 w-5 shrink-0" />
        <span className="truncate">VRC Asset Manager</span>
      </h1>
    </div>
  );
}

function SidebarSaveActions({
  saving,
  appVersion,
  onExport,
  onImport,
}: SidebarSaveActionsProps) {
  return (
    <div className="space-y-2 border-t border-sidebar-border p-3">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-center"
          disabled={saving}
          onClick={onExport}
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
          onClick={onImport}
        >
          <Upload className="h-4 w-4" />
          匯入
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        VRC Asset Manager{appVersion ? ` v${appVersion}` : ""}
      </p>
    </div>
  );
}

function SidebarResizeHandle({
  resizing,
  onResizeStart,
}: SidebarResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="調整側邊欄寬度"
      className={cn(
        "absolute top-0 right-0 z-20 h-full w-1.5 cursor-col-resize touch-none bg-transparent transition-colors hover:bg-primary/50",
        resizing && "bg-primary/50",
      )}
      onPointerDown={onResizeStart}
    />
  );
}

function SidebarDragPreview({ position, label }: SidebarDragPreviewProps) {
  if (!position || !label) {
    return null;
  }

  return (
    <FloatingSurface
      padding="tooltip"
      shadow="lg"
      className="pointer-events-none fixed z-[60] max-w-80 -translate-y-1/2 text-sm font-medium"
      style={{
        left: position.x + 14,
        top: position.y,
      }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{label}</span>
      </div>
    </FloatingSurface>
  );
}

function SidebarDeleteDialog({
  target,
  description,
  onClose,
  onConfirm,
}: SidebarDeleteDialogProps) {
  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            確定要刪除這個{target?.type === "model" ? "模型" : "標籤"}嗎？
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            刪除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SidebarImportDialog({
  open,
  onClose,
  onConfirm,
}: SidebarImportDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確定要匯入這個存檔嗎？</AlertDialogTitle>
          <AlertDialogDescription>
            匯入會以選取的存檔替換目前資料庫中的素材、模型、標籤、VCC
            專案與套件來源。此操作不會刪除實際素材檔案，也不會覆寫 VCC 本身的設定。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            匯入
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SidebarShell({ sidebarRef, sidebarWidth, children }: SidebarShellProps) {
  return (
    <aside
      ref={sidebarRef}
      className="relative flex h-full min-h-0 shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
      style={{
        width: sidebarWidth,
        minWidth: SIDEBAR_MIN_WIDTH,
        maxWidth: `min(${SIDEBAR_MAX_WIDTH}px, 34vw)`,
      }}
    >
      {children}
    </aside>
  );
}

function SidebarTop(props: Pick<
  SidebarLayoutProps,
  | "search"
  | "statusFilters"
  | "filterState"
  | "onSearchChange"
  | "onStatusToggle"
  | "onClearFilters"
>) {
  return (
    <>
      <SidebarHeader />
      <SidebarSearch
        search={props.search}
        statusFilters={props.statusFilters}
        onSearchChange={props.onSearchChange}
        onStatusToggle={props.onStatusToggle}
      />
      <ActiveFilterSummary
        visible={props.filterState.hasActiveFilters}
        resultCount={props.filterState.filteredCount}
        onClear={props.onClearFilters}
      />
    </>
  );
}

function SidebarOverlayLayer(props: SidebarOverlayLayerProps) {
  return (
    <>
      <SidebarResizeHandle
        resizing={props.isResizingSidebar}
        onResizeStart={props.onResizeStart}
      />
      <SidebarDragPreview
        position={props.dragPreviewPosition}
        label={props.dragPreviewLabel}
      />
      <SidebarDeleteDialog
        target={props.deleteTarget}
        description={props.deleteDescription}
        onClose={props.onCloseDelete}
        onConfirm={props.onConfirmDelete}
      />
      <SidebarImportDialog
        open={props.importPath !== null}
        onClose={props.onCloseImport}
        onConfirm={props.onConfirmImport}
      />
    </>
  );
}

function SidebarLayout(props: SidebarLayoutProps) {
  return (
    <SidebarShell
      sidebarRef={props.sidebarRef}
      sidebarWidth={props.sidebarWidth}
    >
      <SidebarTop
        search={props.search}
        statusFilters={props.statusFilters}
        filterState={props.filterState}
        onSearchChange={props.onSearchChange}
        onStatusToggle={props.onStatusToggle}
        onClearFilters={props.onClearFilters}
      />
      <SidebarFilterPanel
        onAddAsset={props.onAddAsset}
        category={props.category}
        onCategoryChange={props.onCategoryChange}
        modelFilter={props.modelFilter}
        tagFilter={props.tagFilter}
        shopFilter={props.shopFilter}
      />
      <SidebarSaveActions
        saving={props.saving}
        appVersion={props.appVersion}
        onExport={props.onExport}
        onImport={props.onImport}
      />
      <SidebarOverlayLayer {...props} />
    </SidebarShell>
  );
}

function useSidebarController(): SidebarLayoutProps {
  const store = useAssetStore();
  const sidebar = useSidebarWidth();
  const sections = useSidebarSections();
  const dialogs = useSidebarDialogController(store);
  const appVersion = useAppVersion();
  const filterState = useSidebarFilterState(
    store.assets.length,
    store.filters,
  );
  const drag = useSidebarDragController(store, sections);
  const { modelFilter, tagFilter, shopFilter } = createSidebarFilterPanelProps({
    store,
    sections,
    filterState,
    drag,
    dialogs,
  });

  return {
    ...sidebar,
    search: store.filters.search,
    filterState,
    modelFilter,
    tagFilter,
    shopFilter,
    category: store.filters.category,
    statusFilters: store.filters.statusFilters,
    saving: store.saving,
    appVersion,
    dragPreviewPosition: drag.dragPreviewPosition,
    dragPreviewLabel: drag.dragPreviewLabel,
    deleteTarget: dialogs.deleteTarget,
    deleteDescription: dialogs.deleteDescription,
    importPath: dialogs.importPath,
    onSearchChange: store.setSearchFilter,
    onClearFilters: store.clearFilters,
    onCategoryChange: store.setCategoryFilter,
    onStatusToggle: store.toggleStatusFilter,
    onAddAsset: () => store.setAddAssetDialogOpen(true),
    onExport: () => void dialogs.handleExportSave(),
    onImport: () => void dialogs.handleSelectImportSave(),
    onResizeStart: sidebar.handleSidebarResizeStart,
    onCloseDelete: () => dialogs.setDeleteTarget(null),
    onConfirmDelete: () => void dialogs.handleConfirmDelete(),
    onCloseImport: () => dialogs.setImportPath(null),
    onConfirmImport: () => void dialogs.handleConfirmImportSave(),
  };
}

export function Sidebar() {
  return <SidebarLayout {...useSidebarController()} />;
}
