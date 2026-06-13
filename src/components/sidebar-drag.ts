import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from "react";
import type { SidebarDropTarget } from "@/components/sidebar-filter-row";
import type { AssetStore } from "@/stores/asset-store";
import type { Model, Tag as AssetTag } from "@/types";

export type DragState =
  | {
      type: "model";
      id: number;
    }
  | {
      type: "tag";
      id: number;
    };

export type DragPreviewPosition = {
  x: number;
  y: number;
};

type SidebarReorder = (ids: number[]) => Promise<void>;

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

export type SidebarDragSectionState = {
  isModelEditMode: boolean;
  isTagEditMode: boolean;
};

type SidebarDragStoreState = Pick<
  AssetStore,
  "models" | "tags" | "reorderModels" | "reorderTags"
>;

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

export function useSidebarDragController(
  store: SidebarDragStoreState,
  sections: SidebarDragSectionState,
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
