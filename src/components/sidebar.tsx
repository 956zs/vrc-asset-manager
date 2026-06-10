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
  Plus,
  Search,
  Tag,
  type LucideIcon,
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
import { isTauriRuntime } from "@/lib/tauri-runtime";
import { cn } from "@/lib/utils";
import { type AssetStore, useAssetStore } from "@/stores/asset-store";
import type { AssetCategory, AssetFilters, Model, Tag as AssetTag } from "@/types";

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

type DragPreviewPosition = {
  x: number;
  y: number;
};

type SidebarFilterKind = "model" | "tag";
type SidebarFilterItem = { id: number };
type SidebarReorder = (ids: number[]) => Promise<void>;
type SidebarBooleanSetter = Dispatch<SetStateAction<boolean>>;
type SidebarDialogOpenSetter = (open: boolean) => void;
type SidebarDeleteAction = (id: number) => Promise<void>;
type SidebarSaveAction = (path: string) => Promise<void>;
type SidebarModelSetter = (model: Model | null) => void;
type SidebarTagSetter = (tag: AssetTag | null) => void;
type SidebarStoreState = AssetStore;

type SidebarDragOptions = {
  models: readonly Model[];
  tags: readonly AssetTag[];
  isModelEditMode: boolean;
  isTagEditMode: boolean;
  reorderModels: SidebarReorder;
  reorderTags: SidebarReorder;
};

type SidebarDragSetters = {
  setDragState: Dispatch<SetStateAction<DragState | null>>;
  setDragPreviewPosition: Dispatch<SetStateAction<DragPreviewPosition | null>>;
  setModelDropTarget: Dispatch<SetStateAction<SidebarDropTarget | null>>;
  setTagDropTarget: Dispatch<SetStateAction<SidebarDropTarget | null>>;
};

type SidebarDragListenerOptions = SidebarDragSetters &
  Pick<SidebarDragOptions, "models" | "tags" | "reorderModels" | "reorderTags"> & {
    dragState: DragState | null;
  };

type SidebarDragCommitOptions = Pick<
  SidebarDragOptions,
  "models" | "tags" | "reorderModels" | "reorderTags"
> & {
  dragState: DragState;
  target: SidebarDropTarget | null;
};

type SidebarDragStartOptions = SidebarDragSetters &
  Pick<SidebarDragOptions, "isModelEditMode" | "isTagEditMode">;

type SidebarDragHandlers = {
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onPointerCancel: () => void;
};

type SidebarResizeOptions = {
  sidebarRef: RefObject<HTMLElement | null>;
  setSidebarWidth: Dispatch<SetStateAction<number>>;
};

type SidebarResizeHandlers = {
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: () => void;
};

type SidebarFilterListSectionProps<TItem extends SidebarFilterItem> = {
  icon: LucideIcon;
  kind: SidebarFilterKind;
  label: string;
  selectedCount: number;
  open: boolean;
  editing: boolean;
  editLabel: string;
  doneLabel: string;
  addLabel: string;
  items: readonly TItem[];
  selectedIds: ReadonlySet<number>;
  draggedId: number | null;
  dropTarget: SidebarDropTarget | null;
  rowEditLabel: string;
  rowDeleteLabel: string;
  getLabel: (item: TItem) => string;
  getSwatchColor?: (item: TItem) => string;
  onToggleOpen: () => void;
  onToggleEditing: () => void;
  onAdd: () => void;
  onToggle: (id: number) => void;
  onEdit: (item: TItem) => void;
  onDelete: (item: TItem, label: string) => void;
  onDragStart: (
    event: ReactPointerEvent<HTMLButtonElement>,
    id: number,
  ) => void;
};

type SidebarFilterRowsProps<TItem extends SidebarFilterItem> = Pick<
  SidebarFilterListSectionProps<TItem>,
  | "kind"
  | "items"
  | "selectedIds"
  | "draggedId"
  | "dropTarget"
  | "editing"
  | "rowEditLabel"
  | "rowDeleteLabel"
  | "getLabel"
  | "getSwatchColor"
  | "onToggle"
  | "onEdit"
  | "onDelete"
  | "onDragStart"
>;

type SidebarSearchProps = {
  search: string;
  onSearchChange: (value: string) => void;
};

type ActiveFilterSummaryProps = {
  resultCount: number;
  onClear: () => void;
};

type AddAssetButtonProps = {
  onClick: () => void;
};

type ModelFilterSectionProps = {
  selectedCount: number;
  open: boolean;
  editing: boolean;
  models: readonly Model[];
  selectedIds: ReadonlySet<number>;
  draggedId: number | null;
  dropTarget: SidebarDropTarget | null;
  onToggleOpen: () => void;
  onToggleEditing: () => void;
  onAdd: () => void;
  onToggle: (id: number) => void;
  onEdit: (model: Model) => void;
  onDelete: (model: Model, label: string) => void;
  onDragStart: (
    event: ReactPointerEvent<HTMLButtonElement>,
    id: number,
  ) => void;
};

type TagFilterSectionProps = {
  selectedCount: number;
  open: boolean;
  editing: boolean;
  tags: readonly AssetTag[];
  selectedIds: ReadonlySet<number>;
  draggedId: number | null;
  dropTarget: SidebarDropTarget | null;
  onToggleOpen: () => void;
  onToggleEditing: () => void;
  onAdd: () => void;
  onToggle: (id: number) => void;
  onEdit: (tag: AssetTag) => void;
  onDelete: (tag: AssetTag, label: string) => void;
  onDragStart: (
    event: ReactPointerEvent<HTMLButtonElement>,
    id: number,
  ) => void;
};

type SidebarFilterPanelProps = {
  onAddAsset: () => void;
  category: AssetCategory | null;
  onCategoryChange: (category: AssetCategory | null) => void;
  modelFilter: ModelFilterSectionProps;
  tagFilter: TagFilterSectionProps;
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
  isModelEditMode: boolean;
  setIsModelEditMode: SidebarBooleanSetter;
  isTagEditMode: boolean;
  setIsTagEditMode: SidebarBooleanSetter;
};

type SidebarFilterState = {
  selectedModelCount: number;
  selectedTagCount: number;
  hasActiveFilters: boolean;
  filteredCount: number;
  selectedModelIds: ReadonlySet<number>;
  selectedTagIds: ReadonlySet<number>;
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
  category: AssetCategory | null;
  saving: boolean;
    appVersion: string | null;
    onSearchChange: (value: string) => void;
    onClearFilters: () => void;
    onCategoryChange: (category: AssetCategory | null) => void;
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

function usePersistentSidebarSection(storageKey: string) {
  const [open, setOpen] = useState(() =>
    getInitialSidebarSectionOpen(storageKey),
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
  const selectedModelIds = useMemo(
    () => new Set(filters.modelIds),
    [filters.modelIds],
  );
  const selectedTagIds = useMemo(
    () => new Set(filters.tagIds),
    [filters.tagIds],
  );
  const hasActiveFilters = Boolean(
    filters.search || filters.category || selectedModelCount > 0 || selectedTagCount > 0,
  );

  return {
    selectedModelCount,
    selectedTagCount,
    hasActiveFilters,
    filteredCount: hasActiveFilters ? assetCount : 0,
    selectedModelIds,
    selectedTagIds,
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
  const [isModelEditMode, setIsModelEditMode] = useState(false);
  const [isTagEditMode, setIsTagEditMode] = useState(false);

  useOpenSidebarSectionOnEditMode(isModelEditMode, setIsModelFilterOpen);
  useOpenSidebarSectionOnEditMode(isTagEditMode, setIsTagFilterOpen);

  return {
    isModelFilterOpen,
    setIsModelFilterOpen,
    isTagFilterOpen,
    setIsTagFilterOpen,
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

type ReorderIdsOptions<T extends { id: number }> = {
  items: readonly T[];
  draggedId: number;
  targetId: number;
  placement: SidebarDropTarget["placement"];
};

function getReorderedIds<T extends { id: number }>({
  items,
  draggedId,
  targetId,
  placement,
}: ReorderIdsOptions<T>) {
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
}

function getPointerDropTargetId(
  type: DragState["type"],
  clientX: number,
  clientY: number,
): SidebarDropTarget | null {
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
}

function clearSidebarDragState(setters: SidebarDragSetters) {
  setters.setDragState(null);
  setters.setDragPreviewPosition(null);
  setters.setModelDropTarget(null);
  setters.setTagDropTarget(null);
}

function useDragPreviewLabel(
  dragState: DragState | null,
  models: readonly Model[],
  tags: readonly AssetTag[],
) {
  const modelById = useMemo(
    () => new Map(models.map((model) => [model.id, model])),
    [models],
  );
  const tagById = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag])),
    [tags],
  );

  return useMemo(() => {
    if (!dragState) {
      return null;
    }

    if (dragState.type === "model") {
      const model = modelById.get(dragState.id);
      return model?.display_name || model?.name || null;
    }

    return tagById.get(dragState.id)?.name ?? null;
  }, [dragState, modelById, tagById]);
}

function updateSidebarDropTarget(
  dragState: DragState,
  event: PointerEvent,
  setters: SidebarDragSetters,
) {
  event.preventDefault();
  setters.setDragPreviewPosition({ x: event.clientX, y: event.clientY });
  const target = getPointerDropTargetId(
    dragState.type,
    event.clientX,
    event.clientY,
  );
  const nextTarget = target?.id !== dragState.id ? target : null;

  if (dragState.type === "model") {
    setters.setModelDropTarget(nextTarget);
  } else {
    setters.setTagDropTarget(nextTarget);
  }
}

function commitSidebarDragSort({
  dragState,
  target,
  models,
  tags,
  reorderModels,
  reorderTags,
}: SidebarDragCommitOptions) {
  if (target === null || target.id === dragState.id) {
    return;
  }

  const nextIds =
    dragState.type === "model"
      ? getReorderedIds({
          items: models,
          draggedId: dragState.id,
          targetId: target.id,
          placement: target.placement,
        })
      : getReorderedIds({
          items: tags,
          draggedId: dragState.id,
          targetId: target.id,
          placement: target.placement,
        });
  const reorder = dragState.type === "model" ? reorderModels : reorderTags;

  if (nextIds) {
    void reorder(nextIds).catch(() => {
      // The store owns the visible error message.
    });
  }
}

function attachSidebarDragListeners(handlers: SidebarDragHandlers) {
  const previousCursor = document.body.style.cursor;
  const previousUserSelect = document.body.style.userSelect;

  document.body.style.cursor = "grabbing";
  document.body.style.userSelect = "none";
  window.addEventListener("pointermove", handlers.onPointerMove);
  window.addEventListener("pointerup", handlers.onPointerUp);
  window.addEventListener("pointercancel", handlers.onPointerCancel);

  return () => {
    document.body.style.cursor = previousCursor;
    document.body.style.userSelect = previousUserSelect;
    window.removeEventListener("pointermove", handlers.onPointerMove);
    window.removeEventListener("pointerup", handlers.onPointerUp);
    window.removeEventListener("pointercancel", handlers.onPointerCancel);
  };
}

function sidebarDragSetters(options: SidebarDragSetters): SidebarDragSetters {
  return {
    setDragState: options.setDragState,
    setDragPreviewPosition: options.setDragPreviewPosition,
    setModelDropTarget: options.setModelDropTarget,
    setTagDropTarget: options.setTagDropTarget,
  };
}

function useSidebarDragListeners(options: SidebarDragListenerOptions) {
  const { dragState, models, tags, reorderModels, reorderTags } = options;

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const setters = sidebarDragSetters(options);
    const onPointerCancel = () => clearSidebarDragState(setters);
    const onPointerMove = (event: PointerEvent) =>
      updateSidebarDropTarget(dragState, event, setters);
    const onPointerUp = (event: PointerEvent) => {
      const target = getPointerDropTargetId(
        dragState.type,
        event.clientX,
        event.clientY,
      );
      commitSidebarDragSort({
        dragState,
        target,
        models,
        tags,
        reorderModels,
        reorderTags,
      });
      clearSidebarDragState(setters);
    };

    return attachSidebarDragListeners({
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    });
  }, [dragState, models, tags, reorderModels, reorderTags]);
}

function startSidebarDrag(
  event: ReactPointerEvent<HTMLButtonElement>,
  dragState: DragState,
  setters: SidebarDragSetters,
) {
  event.preventDefault();
  event.stopPropagation();
  setters.setDragState(dragState);
  setters.setDragPreviewPosition({ x: event.clientX, y: event.clientY });

  if (dragState.type === "model") {
    setters.setModelDropTarget(null);
  } else {
    setters.setTagDropTarget(null);
  }
}

function useSidebarDragStartHandlers(options: SidebarDragStartOptions) {
  const handleModelDragStart = (
    event: ReactPointerEvent<HTMLButtonElement>,
    modelId: number,
  ) => {
    if (!options.isModelEditMode) {
      return;
    }
    startSidebarDrag(event, { type: "model", id: modelId }, options);
  };

  const handleTagDragStart = (
    event: ReactPointerEvent<HTMLButtonElement>,
    tagId: number,
  ) => {
    if (!options.isTagEditMode) {
      return;
    }
    startSidebarDrag(event, { type: "tag", id: tagId }, options);
  };

  return { handleModelDragStart, handleTagDragStart };
}

function useSidebarDragSorting(options: SidebarDragOptions) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPreviewPosition, setDragPreviewPosition] =
    useState<DragPreviewPosition | null>(null);
  const [modelDropTarget, setModelDropTarget] =
    useState<SidebarDropTarget | null>(null);
  const [tagDropTarget, setTagDropTarget] =
    useState<SidebarDropTarget | null>(null);
  const setters = {
    setDragState,
    setDragPreviewPosition,
    setModelDropTarget,
    setTagDropTarget,
  };

  useSidebarDragListeners({ ...options, ...setters, dragState });
  const dragPreviewLabel = useDragPreviewLabel(
    dragState,
    options.models,
    options.tags,
  );
  const { handleModelDragStart, handleTagDragStart } =
    useSidebarDragStartHandlers({ ...options, ...setters });

  return {
    dragPreviewPosition,
    dragPreviewLabel,
    draggedModelId: dragState?.type === "model" ? dragState.id : null,
    draggedTagId: dragState?.type === "tag" ? dragState.id : null,
    modelDropTarget,
    tagDropTarget,
    handleModelDragStart,
    handleTagDragStart,
  };
}

function useSidebarDragController(
  store: SidebarStoreState,
  sections: SidebarSectionState,
) {
  return useSidebarDragSorting({
    models: store.models,
    tags: store.tags,
    isModelEditMode: sections.isModelEditMode,
    isTagEditMode: sections.isTagEditMode,
    reorderModels: store.reorderModels,
    reorderTags: store.reorderTags,
  });
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
  };
}

function SidebarFilterListSection<TItem extends SidebarFilterItem>(
  props: SidebarFilterListSectionProps<TItem>,
) {
  return (
    <div>
      <SidebarFilterSectionHeader
        icon={props.icon}
        label={props.label}
        selectedCount={props.selectedCount}
        open={props.open}
        editing={props.editing}
        editLabel={props.editLabel}
        doneLabel={props.doneLabel}
        addLabel={props.addLabel}
        onToggleOpen={props.onToggleOpen}
        onToggleEditing={props.onToggleEditing}
        onAdd={props.onAdd}
      />
      {props.open && <SidebarFilterRows {...props} />}
    </div>
  );
}

function SidebarFilterRows<TItem extends SidebarFilterItem>({
  kind,
  items,
  selectedIds,
  draggedId,
  dropTarget,
  editing,
  rowEditLabel,
  rowDeleteLabel,
  getLabel,
  getSwatchColor,
  onToggle,
  onEdit,
  onDelete,
  onDragStart,
}: SidebarFilterRowsProps<TItem>) {
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const itemLabel = getLabel(item);
        return (
          <SidebarFilterRow
            key={item.id}
            kind={kind}
            id={item.id}
            label={itemLabel}
            checked={selectedIds.has(item.id)}
            editing={editing}
            dragging={draggedId === item.id}
            dropTarget={dropTarget}
            swatchColor={getSwatchColor?.(item)}
            editLabel={rowEditLabel}
            deleteLabel={rowDeleteLabel}
            onToggle={() => onToggle(item.id)}
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item, itemLabel)}
            onDragStart={onDragStart}
          />
        );
      })}
    </div>
  );
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

function SidebarSearch({ search, onSearchChange }: SidebarSearchProps) {
  return (
    <div className="p-3">
      <div className="relative">
        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          data-shortcut="asset-search"
          placeholder="搜尋素材..."
          className="border-sidebar-border bg-sidebar-accent pl-8 text-sidebar-foreground placeholder:text-muted-foreground"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function ActiveFilterSummary({
  resultCount,
  onClear,
}: ActiveFilterSummaryProps) {
  return (
    <div className="flex items-center justify-between px-3 pb-2">
      <span className="text-xs text-muted-foreground">{resultCount} 個結果</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs text-muted-foreground hover:text-sidebar-foreground"
        onClick={onClear}
      >
        <X className="mr-1 h-3 w-3" />
        清除篩選
      </Button>
    </div>
  );
}

function AddAssetButton({ onClick }: AddAssetButtonProps) {
  return (
    <Button className="w-full justify-start" onClick={onClick}>
      <Plus className="mr-2 h-4 w-4" />
      新增素材
    </Button>
  );
}

const categoryRows: { value: AssetCategory | null; label: string }[] = [
  { value: null, label: "全部" },
  { value: "avatar", label: "素體" },
  { value: "accessory", label: "素體配件" },
  { value: "world", label: "世界" },
];

function CategoryFilterSection({
  selected,
  onChange,
}: {
  selected: AssetCategory | null;
  onChange: (category: AssetCategory | null) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1 text-xs font-semibold text-muted-foreground">
        <Package className="h-4 w-4" />
        素材庫
      </div>
      <div className="space-y-1">
        {categoryRows.map((row) => (
          <button
            key={row.value ?? "all"}
            type="button"
            className={cn(
              "flex h-8 w-full items-center rounded-md px-3 text-left text-sm transition-colors hover:bg-sidebar-accent",
              selected === row.value && "bg-sidebar-accent font-medium text-sidebar-foreground",
            )}
            onClick={() => onChange(row.value)}
          >
            {row.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ModelFilterSection(props: ModelFilterSectionProps) {
  return (
    <SidebarFilterListSection
      icon={User}
      kind="model"
      label="依模型篩選"
      selectedCount={props.selectedCount}
      open={props.open}
      editing={props.editing}
      editLabel="編輯模型清單"
      doneLabel="完成編輯模型"
      addLabel="新增模型"
      items={props.models}
      selectedIds={props.selectedIds}
      draggedId={props.draggedId}
      dropTarget={props.dropTarget}
      rowEditLabel="編輯模型"
      rowDeleteLabel="刪除模型"
      getLabel={(model) => model.display_name || model.name}
      onToggleOpen={props.onToggleOpen}
      onToggleEditing={props.onToggleEditing}
      onAdd={props.onAdd}
      onToggle={props.onToggle}
      onEdit={props.onEdit}
      onDelete={props.onDelete}
      onDragStart={props.onDragStart}
    />
  );
}

function TagFilterSection(props: TagFilterSectionProps) {
  return (
    <SidebarFilterListSection
      icon={Tag}
      kind="tag"
      label="依標籤篩選"
      selectedCount={props.selectedCount}
      open={props.open}
      editing={props.editing}
      editLabel="編輯標籤清單"
      doneLabel="完成編輯標籤"
      addLabel="新增標籤"
      items={props.tags}
      selectedIds={props.selectedIds}
      draggedId={props.draggedId}
      dropTarget={props.dropTarget}
      rowEditLabel="編輯標籤"
      rowDeleteLabel="刪除標籤"
      getLabel={(tag) => tag.name}
      getSwatchColor={(tag) => tag.color}
      onToggleOpen={props.onToggleOpen}
      onToggleEditing={props.onToggleEditing}
      onAdd={props.onAdd}
      onToggle={props.onToggle}
      onEdit={props.onEdit}
      onDelete={props.onDelete}
      onDragStart={props.onDragStart}
    />
  );
}

function SidebarFilterPanel({
  onAddAsset,
  category,
  onCategoryChange,
  modelFilter,
  tagFilter,
}: SidebarFilterPanelProps) {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="space-y-6 p-3">
        <AddAssetButton onClick={onAddAsset} />
        <CategoryFilterSection selected={category} onChange={onCategoryChange} />
        <ModelFilterSection {...modelFilter} />
        <TagFilterSection {...tagFilter} />
      </div>
    </ScrollArea>
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
    <div
      className="pointer-events-none fixed z-[60] max-w-80 -translate-y-1/2 rounded-md border border-border bg-popover px-3 py-2 text-sm font-medium text-popover-foreground shadow-lg"
      style={{
        left: position.x + 14,
        top: position.y,
      }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{label}</span>
      </div>
    </div>
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
  "search" | "filterState" | "onSearchChange" | "onClearFilters"
>) {
  return (
    <>
      <SidebarHeader />
      <SidebarSearch
        search={props.search}
        onSearchChange={props.onSearchChange}
      />
      {props.filterState.hasActiveFilters && (
        <ActiveFilterSummary
          resultCount={props.filterState.filteredCount}
          onClear={props.onClearFilters}
        />
      )}
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
        filterState={props.filterState}
        onSearchChange={props.onSearchChange}
        onClearFilters={props.onClearFilters}
      />
      <SidebarFilterPanel
        onAddAsset={props.onAddAsset}
        category={props.category}
        onCategoryChange={props.onCategoryChange}
        modelFilter={props.modelFilter}
        tagFilter={props.tagFilter}
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
  const { modelFilter, tagFilter } = createSidebarFilterPanelProps({
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
    category: store.filters.category,
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
