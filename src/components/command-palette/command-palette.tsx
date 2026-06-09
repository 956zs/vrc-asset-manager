"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Boxes,
  Eraser,
  Image as ImageIcon,
  Images,
  Loader2,
  Package,
  PackagePlus,
  Pencil,
  Search,
  Tag,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { type AssetStore, useAssetStore } from "@/stores/asset-store";
import type { Asset, AssetFilters, Model, Tag as AssetTag } from "@/types";
import {
  filterCommandPaletteItems,
  groupCommandPaletteItems,
} from "./search";
import type { CommandPaletteGroup, CommandPaletteItem } from "./types";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showAssets: () => void;
  showVcc: () => void;
};

type CommandPaletteSearchBarProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  loading: boolean;
  onQueryChange: (query: string) => void;
};

type CommandPaletteResultsProps = {
  groups: CommandPaletteGroup[];
  itemIndexById: ReadonlyMap<string, number>;
  activeIndex: number;
  onActivate: (index: number) => void;
  onRun: (item: CommandPaletteItem) => void;
};

type CommandPaletteGroupSectionProps = {
  group: CommandPaletteGroup;
  itemIndexById: ReadonlyMap<string, number>;
  activeIndex: number;
  onActivate: (index: number) => void;
  onRun: (item: CommandPaletteItem) => void;
};

type CommandPaletteRowProps = {
  item: CommandPaletteItem;
  itemIndex: number;
  active: boolean;
  onActivate: (index: number) => void;
  onRun: (item: CommandPaletteItem) => void;
};

type CommandPaletteItemIconProps = {
  item: CommandPaletteItem;
};

type AssetItemOptions = {
  asset: Asset;
  showAssets: () => void;
  selectAsset: (assetId: number) => void;
  setFilters: (filters: AssetFilters) => void;
};

type AssetItemMetadata = {
  subtitle: string;
  keywords: string[];
};

type ModelItemOptions = {
  model: Model;
  assetCount: number;
  showAssets: () => void;
  setFilters: (filters: AssetFilters) => void;
};

type TagItemOptions = {
  tag: AssetTag;
  assetCount: number;
  showAssets: () => void;
  setFilters: (filters: AssetFilters) => void;
};

type BaseActionItemsOptions = {
  hasActiveFilters: boolean;
  selectedAssetId: number | null;
  showAssets: () => void;
  showVcc: () => void;
  requestAssetEdit: (assetId: number) => void;
  setFilters: (filters: AssetFilters) => void;
  setAddAssetDialogOpen: (open: boolean) => void;
  setAddModelDialogOpen: (open: boolean) => void;
  setAddTagDialogOpen: (open: boolean) => void;
};

type CommandPaletteAssetCounts = {
  modelAssetCounts: ReadonlyMap<number, number>;
  tagAssetCounts: ReadonlyMap<number, number>;
};

type CommandPaletteKeyboardOptions = {
  visibleItems: readonly CommandPaletteItem[];
  activeIndex: number;
  setActiveIndex: (index: number | ((current: number) => number)) => void;
  closePalette: () => void;
  runItem: (item: CommandPaletteItem) => void;
};

type VisibleCommandPaletteItemsOptions = {
  query: string;
  baseActionItems: readonly CommandPaletteItem[];
  assetItems: readonly CommandPaletteItem[];
  modelItems: readonly CommandPaletteItem[];
  tagItems: readonly CommandPaletteItem[];
  showAssets: () => void;
  setFilters: (filters: AssetFilters) => void;
};

type CommandPaletteLayoutProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  loadingAssets: boolean;
  visibleGroups: CommandPaletteGroup[];
  itemIndexById: ReadonlyMap<string, number>;
  activeIndex: number;
  onQueryChange: (query: string) => void;
  onActivate: (index: number) => void;
  onRun: (item: CommandPaletteItem) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
};

type CommandPaletteResultIndexes = {
  visibleGroups: CommandPaletteGroup[];
  itemIndexById: ReadonlyMap<string, number>;
};

type CommandPaletteItemSets = CommandPaletteResultIndexes & {
  visibleItems: CommandPaletteItem[];
};

type CommandPaletteItemSetsOptions = {
  store: AssetStore;
  allAssets: readonly Asset[];
  query: string;
  showAssets: () => void;
  showVcc: () => void;
};

type AssetCommandPaletteItemsOptions = {
  allAssets: readonly Asset[];
  showAssets: () => void;
  selectAsset: (assetId: number) => void;
  setFilters: (filters: AssetFilters) => void;
};

type ModelCommandPaletteItemsOptions = {
  models: readonly Model[];
  modelAssetCounts: ReadonlyMap<number, number>;
  showAssets: () => void;
  setFilters: (filters: AssetFilters) => void;
};

type TagCommandPaletteItemsOptions = {
  tags: readonly AssetTag[];
  tagAssetCounts: ReadonlyMap<number, number>;
  showAssets: () => void;
  setFilters: (filters: AssetFilters) => void;
};

const emptyFilters: AssetFilters = {
  search: "",
  modelIds: [],
  tagIds: [],
};
const assetPreviewModelLimit = 2;
const assetPreviewTagLimit = 3;
const defaultVisibleAssetLimit = 8;
const searchVisibleItemLimit = 60;

const displayAssetName = (asset: Asset) => asset.display_name || asset.name;

const appendPreviewLabel = (joined: string, value: string) => {
  if (value.trim().length === 0) {
    return joined;
  }

  return joined ? `${joined} · ${value}` : value;
};

function createAssetItemMetadata(asset: Asset): AssetItemMetadata {
  const keywords = [
    asset.name,
    asset.display_name ?? "",
    asset.file_path,
    asset.booth_url ?? "",
    asset.note ?? "",
  ];
  let subtitle = "";
  let previewModelCount = 0;
  let previewTagCount = 0;

  for (const model of asset.models) {
    const label = model.display_name || model.name;

    keywords.push(label);

    if (previewModelCount < assetPreviewModelLimit) {
      subtitle = appendPreviewLabel(subtitle, label);
      previewModelCount += 1;
    }
  }

  for (const tag of asset.tags) {
    keywords.push(tag.name);

    if (previewTagCount < assetPreviewTagLimit) {
      subtitle = appendPreviewLabel(subtitle, tag.name);
      previewTagCount += 1;
    }
  }

  for (const link of asset.related_links ?? []) {
    keywords.push(link.label, link.url);
  }

  return { subtitle: subtitle || asset.file_path, keywords };
}

function createAssetItem({
  asset,
  showAssets,
  selectAsset,
  setFilters,
}: AssetItemOptions): CommandPaletteItem {
  const title = displayAssetName(asset);
  const metadata = createAssetItemMetadata(asset);

  return {
    id: `asset-${asset.id}`,
    kind: "asset",
    group: "素材",
    title,
    subtitle: metadata.subtitle,
    badge: asset.file_exists ? undefined : "缺失",
    icon: Package,
    thumbnailUrl: asset.thumbnail_url,
    keywords: metadata.keywords,
    onSelect: () => {
      showAssets();
      selectAsset(asset.id);
      setFilters(emptyFilters);
    },
  };
}

function createModelItem({
  model,
  assetCount,
  showAssets,
  setFilters,
}: ModelItemOptions): CommandPaletteItem {
  return {
    id: `model-${model.id}`,
    kind: "model",
    group: "模型",
    title: model.display_name || model.name,
    subtitle: "依模型篩選",
    badge: `${assetCount} 素材`,
    icon: User,
    keywords: [model.name, model.display_name ?? "", "model", "avatar", "模型", "素體"],
    onSelect: () => {
      showAssets();
      setFilters({ search: "", modelIds: [model.id], tagIds: [] });
    },
  };
}

function createTagItem({
  tag,
  assetCount,
  showAssets,
  setFilters,
}: TagItemOptions): CommandPaletteItem {
  return {
    id: `tag-${tag.id}`,
    kind: "tag",
    group: "標籤",
    title: tag.name,
    subtitle: "依標籤篩選",
    badge: `${assetCount} 素材`,
    icon: Tag,
    accentColor: tag.color,
    keywords: [tag.name, "tag", "label", "標籤"],
    onSelect: () => {
      showAssets();
      setFilters({ search: "", modelIds: [], tagIds: [tag.id] });
    },
  };
}

function createNavigationActionItems(
  showAssets: () => void,
  showVcc: () => void,
): CommandPaletteItem[] {
  return [
    {
      id: "action-assets",
      kind: "action",
      group: "常用操作",
      title: "切換到素材庫",
      subtitle: "VRC Asset Manager",
      icon: Images,
      keywords: ["assets", "asset", "素材", "素材庫"],
      onSelect: showAssets,
    },
    {
      id: "action-vcc",
      kind: "action",
      group: "常用操作",
      title: "切換到 VCC",
      subtitle: "VPM 專案與套件",
      icon: Boxes,
      keywords: ["vcc", "vpm", "package", "套件", "專案"],
      onSelect: showVcc,
    },
  ];
}

function createCreationActionItems(
  options: Pick<
    BaseActionItemsOptions,
    "showAssets" | "setAddAssetDialogOpen" | "setAddModelDialogOpen" | "setAddTagDialogOpen"
  >,
): CommandPaletteItem[] {
  const openDialog = (setter: (open: boolean) => void) => {
    options.showAssets();
    setter(true);
  };

  return [
    {
      id: "action-add-asset",
      kind: "action",
      group: "常用操作",
      title: "新增素材",
      subtitle: "建立新的素材記錄",
      icon: PackagePlus,
      keywords: ["new", "add", "create", "新增", "素材"],
      onSelect: () => openDialog(options.setAddAssetDialogOpen),
    },
    {
      id: "action-add-model",
      kind: "action",
      group: "常用操作",
      title: "新增模型",
      subtitle: "加入素體篩選項目",
      icon: User,
      keywords: ["new", "add", "model", "avatar", "新增", "模型", "素體"],
      onSelect: () => openDialog(options.setAddModelDialogOpen),
    },
    {
      id: "action-add-tag",
      kind: "action",
      group: "常用操作",
      title: "新增標籤",
      subtitle: "加入素材分類",
      icon: Tag,
      keywords: ["new", "add", "tag", "新增", "標籤"],
      onSelect: () => openDialog(options.setAddTagDialogOpen),
    },
  ];
}

function createSelectedAssetActionItem({
  selectedAssetId,
  showAssets,
  requestAssetEdit,
}: Pick<
  BaseActionItemsOptions,
  "selectedAssetId" | "showAssets" | "requestAssetEdit"
>): CommandPaletteItem | null {
  if (selectedAssetId === null) {
    return null;
  }

  return {
    id: "action-edit-selected-asset",
    kind: "action",
    group: "常用操作",
    title: "編輯目前素材",
    subtitle: "開啟右側編輯模式",
    icon: Pencil,
    keywords: ["edit", "modify", "編輯", "素材"],
    onSelect: () => {
      showAssets();
      requestAssetEdit(selectedAssetId);
    },
  };
}

function createClearFiltersActionItem({
  hasActiveFilters,
  showAssets,
  setFilters,
}: Pick<
  BaseActionItemsOptions,
  "hasActiveFilters" | "showAssets" | "setFilters"
>): CommandPaletteItem | null {
  if (!hasActiveFilters) {
    return null;
  }

  return {
    id: "action-clear-filters",
    kind: "action",
    group: "常用操作",
    title: "清除目前篩選",
    subtitle: "回到完整素材列表",
    icon: Eraser,
    keywords: ["clear", "reset", "filter", "清除", "篩選"],
    onSelect: () => {
      showAssets();
      setFilters(emptyFilters);
    },
  };
}

function compactItems(
  items: readonly (CommandPaletteItem | null)[],
): CommandPaletteItem[] {
  return items.filter((item): item is CommandPaletteItem => item !== null);
}

function useBaseActionItems(options: BaseActionItemsOptions) {
  return useMemo(
    () => [
      ...createNavigationActionItems(options.showAssets, options.showVcc),
      ...createCreationActionItems(options),
      ...compactItems([
        createSelectedAssetActionItem(options),
        createClearFiltersActionItem(options),
      ]),
    ],
    [
      options.hasActiveFilters,
      options.requestAssetEdit,
      options.selectedAssetId,
      options.setAddAssetDialogOpen,
      options.setAddModelDialogOpen,
      options.setAddTagDialogOpen,
      options.setFilters,
      options.showAssets,
      options.showVcc,
    ],
  );
}

function useCommandPaletteQuery(open: boolean) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [open]);

  return { inputRef, query, setQuery };
}

function useCommandPaletteAssets(
  open: boolean,
  getAllAssets: () => Promise<Asset[]>,
) {
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setLoadingAssets(true);
    void getAllAssets()
      .then((assets) => !cancelled && setAllAssets(assets))
      .catch((error) => {
        console.warn(error);
        if (!cancelled) {
          setAllAssets([]);
        }
      })
      .finally(() => !cancelled && setLoadingAssets(false));

    return () => {
      cancelled = true;
    };
  }, [getAllAssets, open]);

  return { allAssets, loadingAssets };
}

const incrementCount = (counts: Map<number, number>, id: number) =>
  counts.set(id, (counts.get(id) ?? 0) + 1);

function countCommandPaletteAssets(
  assets: readonly Asset[],
): CommandPaletteAssetCounts {
  const modelAssetCounts = new Map<number, number>();
  const tagAssetCounts = new Map<number, number>();

  for (const asset of assets) {
    for (const model of asset.models) {
      incrementCount(modelAssetCounts, model.id);
    }
    for (const tag of asset.tags) {
      incrementCount(tagAssetCounts, tag.id);
    }
  }

  return { modelAssetCounts, tagAssetCounts };
}

function useCommandPaletteAssetCounts(
  assets: readonly Asset[],
): CommandPaletteAssetCounts {
  return useMemo(() => countCommandPaletteAssets(assets), [assets]);
}

function hasCommandPaletteActiveFilters(filters: AssetFilters) {
  return (
    filters.search.trim().length > 0 ||
    filters.modelIds.length > 0 ||
    filters.tagIds.length > 0
  );
}

function useAssetCommandPaletteItems({
  allAssets,
  showAssets,
  selectAsset,
  setFilters,
}: AssetCommandPaletteItemsOptions) {
  return useMemo(
    () =>
      allAssets.map((asset) =>
        createAssetItem({ asset, showAssets, selectAsset, setFilters }),
      ),
    [allAssets, selectAsset, setFilters, showAssets],
  );
}

function useModelCommandPaletteItems({
  models,
  modelAssetCounts,
  showAssets,
  setFilters,
}: ModelCommandPaletteItemsOptions) {
  return useMemo(
    () =>
      models.map((model) =>
        createModelItem({
          model,
          assetCount: modelAssetCounts.get(model.id) ?? 0,
          showAssets,
          setFilters,
        }),
      ),
    [modelAssetCounts, models, setFilters, showAssets],
  );
}

function useTagCommandPaletteItems({
  tags,
  tagAssetCounts,
  showAssets,
  setFilters,
}: TagCommandPaletteItemsOptions) {
  return useMemo(
    () =>
      tags.map((tag) =>
        createTagItem({
          tag,
          assetCount: tagAssetCounts.get(tag.id) ?? 0,
          showAssets,
          setFilters,
        }),
      ),
    [setFilters, showAssets, tagAssetCounts, tags],
  );
}

function indexCommandPaletteItems(
  visibleItems: readonly CommandPaletteItem[],
): ReadonlyMap<string, number> {
  const itemIndexById = new Map<string, number>();
  visibleItems.forEach((item, index) => itemIndexById.set(item.id, index));
  return itemIndexById;
}

function useCommandPaletteResultIndexes(
  visibleItems: readonly CommandPaletteItem[],
): CommandPaletteResultIndexes {
  return {
    visibleGroups: useMemo(() => groupCommandPaletteItems(visibleItems), [visibleItems]),
    itemIndexById: useMemo(() => indexCommandPaletteItems(visibleItems), [visibleItems]),
  };
}

function useCommandPaletteItemSets({
  store,
  allAssets,
  query,
  showAssets,
  showVcc,
}: CommandPaletteItemSetsOptions): CommandPaletteItemSets {
  const { modelAssetCounts, tagAssetCounts } = useCommandPaletteAssetCounts(allAssets);
  const baseActionItems = useBaseActionItems({
    hasActiveFilters: hasCommandPaletteActiveFilters(store.filters),
    requestAssetEdit: store.requestAssetEdit,
    selectedAssetId: store.selectedAssetId,
    setAddAssetDialogOpen: store.setAddAssetDialogOpen,
    setAddModelDialogOpen: store.setAddModelDialogOpen,
    setAddTagDialogOpen: store.setAddTagDialogOpen,
    setFilters: store.setFilters,
    showAssets,
    showVcc,
  });
  const assetItems = useAssetCommandPaletteItems({
    allAssets,
    showAssets,
    selectAsset: store.selectAsset,
    setFilters: store.setFilters,
  });
  const modelItems = useModelCommandPaletteItems({
    models: store.models,
    modelAssetCounts,
    showAssets,
    setFilters: store.setFilters,
  });
  const tagItems = useTagCommandPaletteItems({
    tags: store.tags,
    tagAssetCounts,
    showAssets,
    setFilters: store.setFilters,
  });
  const visibleItems = useVisibleCommandPaletteItems({
    query,
    baseActionItems,
    assetItems,
    modelItems,
    tagItems,
    showAssets,
    setFilters: store.setFilters,
  });
  return { visibleItems, ...useCommandPaletteResultIndexes(visibleItems) };
}

function createSearchActionItem(
  cleanedQuery: string,
  showAssets: () => void,
  setFilters: (filters: AssetFilters) => void,
): CommandPaletteItem {
  return {
    id: "action-search-query",
    kind: "action",
    group: "搜尋",
    title: `搜尋「${cleanedQuery}」`,
    subtitle: "套用素材搜尋",
    icon: Search,
    keywords: [cleanedQuery, "search", "find", "搜尋"],
    onSelect: () => {
      showAssets();
      setFilters({ search: cleanedQuery, modelIds: [], tagIds: [] });
    },
  };
}

function appendCommandPaletteItems(
  target: CommandPaletteItem[],
  items: readonly CommandPaletteItem[],
  limit = items.length,
) {
  for (let index = 0; index < items.length && index < limit; index += 1) {
    target.push(items[index]);
  }
}

function createDefaultVisibleItems(
  baseActionItems: readonly CommandPaletteItem[],
  assetItems: readonly CommandPaletteItem[],
) {
  const visibleItems: CommandPaletteItem[] = [];
  appendCommandPaletteItems(visibleItems, baseActionItems);
  appendCommandPaletteItems(visibleItems, assetItems, defaultVisibleAssetLimit);
  return visibleItems;
}

function createSearchableItems({
  cleanedQuery,
  baseActionItems,
  assetItems,
  modelItems,
  tagItems,
  showAssets,
  setFilters,
}: Omit<VisibleCommandPaletteItemsOptions, "query"> & { cleanedQuery: string }) {
  const searchableItems = [
    createSearchActionItem(cleanedQuery, showAssets, setFilters),
  ];
  appendCommandPaletteItems(searchableItems, baseActionItems);
  appendCommandPaletteItems(searchableItems, assetItems);
  appendCommandPaletteItems(searchableItems, modelItems);
  appendCommandPaletteItems(searchableItems, tagItems);
  return searchableItems;
}

function useVisibleCommandPaletteItems({
  query,
  baseActionItems,
  assetItems,
  modelItems,
  tagItems,
  showAssets,
  setFilters,
}: VisibleCommandPaletteItemsOptions) {
  return useMemo(() => {
    const cleanedQuery = query.trim();

    if (!cleanedQuery) {
      return createDefaultVisibleItems(baseActionItems, assetItems);
    }

    return filterCommandPaletteItems(
      createSearchableItems({
        cleanedQuery,
        baseActionItems,
        assetItems,
        modelItems,
        tagItems,
        showAssets,
        setFilters,
      }),
      cleanedQuery,
      searchVisibleItemLimit,
    );
  }, [assetItems, baseActionItems, modelItems, query, setFilters, showAssets, tagItems]);
}

function useCommandPaletteActiveIndex(
  open: boolean,
  query: string,
  visibleItemCount: number,
) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (visibleItemCount === 0 && activeIndex !== 0) {
      setActiveIndex(0);
      return;
    }

    if (activeIndex >= visibleItemCount) {
      setActiveIndex(Math.max(visibleItemCount - 1, 0));
    }
  }, [activeIndex, visibleItemCount]);

  return { activeIndex, setActiveIndex };
}

function useScrollActiveCommandPaletteItem(open: boolean, activeIndex: number) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const activeElement = document.querySelector<HTMLElement>(
      "[data-command-palette-item][data-active='true']",
    );
    activeElement?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);
}

function createCommandPaletteKeyDownHandler({
  visibleItems,
  activeIndex,
  setActiveIndex,
  closePalette,
  runItem,
}: CommandPaletteKeyboardOptions) {
  return (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing) {
      return;
    }

    const key = event.key.toLowerCase();
    const modifier = event.ctrlKey || event.metaKey;

    if (modifier && key === "k") {
      event.preventDefault();
      closePalette();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        visibleItems.length === 0 ? 0 : (current + 1) % visibleItems.length,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        visibleItems.length === 0
          ? 0
          : (current - 1 + visibleItems.length) % visibleItems.length,
      );
      return;
    }

    if (event.key === "Enter" && visibleItems[activeIndex]) {
      event.preventDefault();
      runItem(visibleItems[activeIndex]);
    }
  };
}

function CommandPaletteSearchBar({
  inputRef,
  query,
  loading,
  onQueryChange,
}: CommandPaletteSearchBarProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        aria-label="快速搜尋"
        placeholder="搜尋素材、模型、標籤或操作"
        className="h-10 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
        onChange={(event) => onQueryChange(event.target.value)}
      />
      {loading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <div className="hidden shrink-0 items-center gap-1 sm:flex">
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            Ctrl
          </kbd>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            K
          </kbd>
        </div>
      )}
    </div>
  );
}

function CommandPaletteItemIcon({ item }: CommandPaletteItemIconProps) {
  const Icon = item.icon;

  return (
    <span
      className={cn(
        "flex size-10 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-muted-foreground",
        item.kind === "tag" && "border-transparent bg-transparent",
      )}
    >
      {item.thumbnailUrl ? (
        <img
          src={item.thumbnailUrl}
          alt={item.title}
          className="h-full w-full object-cover"
        />
      ) : item.kind === "tag" && item.accentColor ? (
        <span
          className="size-4 rounded-full"
          style={{ backgroundColor: item.accentColor }}
        />
      ) : item.kind === "asset" ? (
        <ImageIcon className="h-5 w-5" />
      ) : (
        <Icon className="h-5 w-5" />
      )}
    </span>
  );
}

function CommandPaletteRow({
  item,
  itemIndex,
  active,
  onActivate,
  onRun,
}: CommandPaletteRowProps) {
  return (
    <button
      type="button"
      data-command-palette-item=""
      data-active={active ? "true" : undefined}
      className={cn(
        "grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-2 text-left transition-colors",
        active ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/60",
      )}
      onMouseEnter={() => itemIndex >= 0 && onActivate(itemIndex)}
      onClick={() => onRun(item)}
    >
      <CommandPaletteItemIcon item={item} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{item.title}</span>
        {item.subtitle && (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {item.subtitle}
          </span>
        )}
      </span>
      {item.badge && (
        <span
          className={cn(
            "rounded border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground",
            active && "bg-background/70",
          )}
        >
          {item.badge}
        </span>
      )}
    </button>
  );
}

function CommandPaletteGroupSection({
  group,
  itemIndexById,
  activeIndex,
  onActivate,
  onRun,
}: CommandPaletteGroupSectionProps) {
  return (
    <section className="space-y-1">
      <h3 className="px-2 text-xs font-medium text-muted-foreground">
        {group.title}
      </h3>
      <div className="space-y-1">
        {group.items.map((item) => {
          const itemIndex = itemIndexById.get(item.id) ?? -1;
          return (
            <CommandPaletteRow
              key={item.id}
              item={item}
              itemIndex={itemIndex}
              active={itemIndex === activeIndex}
              onActivate={onActivate}
              onRun={onRun}
            />
          );
        })}
      </div>
    </section>
  );
}

function CommandPaletteResults({
  groups,
  itemIndexById,
  activeIndex,
  onActivate,
  onRun,
}: CommandPaletteResultsProps) {
  return (
    <ScrollArea className="max-h-[58vh] min-h-[220px]">
      {groups.length > 0 ? (
        <div className="space-y-4 p-3">
          {groups.map((group) => (
            <CommandPaletteGroupSection
              key={group.title}
              group={group}
              itemIndexById={itemIndexById}
              activeIndex={activeIndex}
              onActivate={onActivate}
              onRun={onRun}
            />
          ))}
        </div>
      ) : (
        <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
          找不到符合的項目
        </div>
      )}
    </ScrollArea>
  );
}

function CommandPaletteLayout({
  open,
  onOpenChange,
  inputRef,
  query,
  loadingAssets,
  visibleGroups,
  itemIndexById,
  activeIndex,
  onQueryChange,
  onActivate,
  onRun,
  onKeyDown,
}: CommandPaletteLayoutProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[18vh] max-h-[78vh] min-w-0 translate-y-0 overflow-hidden p-0 sm:max-w-[680px]"
        onKeyDown={onKeyDown}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>快速搜尋</DialogTitle>
        </DialogHeader>
        <CommandPaletteSearchBar
          inputRef={inputRef}
          query={query}
          loading={loadingAssets}
          onQueryChange={onQueryChange}
        />
        <CommandPaletteResults
          groups={visibleGroups}
          itemIndexById={itemIndexById}
          activeIndex={activeIndex}
          onActivate={onActivate}
          onRun={onRun}
        />
      </DialogContent>
    </Dialog>
  );
}

function useCommandPaletteController({
  open,
  onOpenChange,
  showAssets,
  showVcc,
}: CommandPaletteProps): CommandPaletteLayoutProps {
  const store = useAssetStore();
  const closePalette = () => onOpenChange(false);
  const { inputRef, query, setQuery } = useCommandPaletteQuery(open);
  const { allAssets, loadingAssets } = useCommandPaletteAssets(open, store.getAllAssets);
  const { visibleItems, visibleGroups, itemIndexById } =
    useCommandPaletteItemSets({ store, allAssets, query, showAssets, showVcc });
  const { activeIndex, setActiveIndex } =
    useCommandPaletteActiveIndex(open, query, visibleItems.length);

  useScrollActiveCommandPaletteItem(open, activeIndex);

  const runItem = (item: CommandPaletteItem) => {
    closePalette();
    void Promise.resolve(item.onSelect()).catch(console.warn);
  };
  const handleKeyDown = createCommandPaletteKeyDownHandler({
    visibleItems,
    activeIndex,
    setActiveIndex,
    closePalette,
    runItem,
  });

  return {
    open,
    onOpenChange,
    inputRef,
    query,
    loadingAssets,
    visibleGroups,
    itemIndexById,
    activeIndex,
    onQueryChange: setQuery,
    onActivate: setActiveIndex,
    onRun: runItem,
    onKeyDown: handleKeyDown,
  };
}

export function CommandPalette(props: CommandPaletteProps) {
  return <CommandPaletteLayout {...useCommandPaletteController(props)} />;
}
