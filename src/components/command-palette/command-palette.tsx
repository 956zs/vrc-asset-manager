"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
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
import { useAssetStore } from "@/stores/asset-store";
import type { Asset, AssetFilters } from "@/types";
import {
  filterCommandPaletteItems,
  groupCommandPaletteItems,
} from "./search";
import type { CommandPaletteItem } from "./types";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showAssets: () => void;
  showVcc: () => void;
};

const emptyFilters: AssetFilters = {
  search: "",
  modelIds: [],
  tagIds: [],
};

const displayAssetName = (asset: Asset) => asset.display_name || asset.name;

const joinLabels = (values: string[]) =>
  values.filter((value) => value.trim().length > 0).join(" · ");

export function CommandPalette({
  open,
  onOpenChange,
  showAssets,
  showVcc,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const {
    filters,
    models,
    tags,
    selectedAssetId,
    setFilters,
    selectAsset,
    requestAssetEdit,
    setAddAssetDialogOpen,
    setAddModelDialogOpen,
    setAddTagDialogOpen,
    getAllAssets,
  } = useAssetStore();

  const closePalette = () => onOpenChange(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      return;
    }

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);

    let cancelled = false;
    setLoadingAssets(true);
    void getAllAssets()
      .then((assets) => {
        if (!cancelled) {
          setAllAssets(assets);
        }
      })
      .catch((error) => {
        console.warn(error);
        if (!cancelled) {
          setAllAssets([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAssets(false);
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(focusTimer);
    };
  }, [getAllAssets, open]);

  const modelAssetCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const asset of allAssets) {
      for (const model of asset.models) {
        counts.set(model.id, (counts.get(model.id) ?? 0) + 1);
      }
    }
    return counts;
  }, [allAssets]);

  const tagAssetCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const asset of allAssets) {
      for (const tag of asset.tags) {
        counts.set(tag.id, (counts.get(tag.id) ?? 0) + 1);
      }
    }
    return counts;
  }, [allAssets]);

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.modelIds.length > 0 ||
    filters.tagIds.length > 0;

  const baseActionItems = useMemo<CommandPaletteItem[]>(() => {
    const actions: CommandPaletteItem[] = [
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
      {
        id: "action-add-asset",
        kind: "action",
        group: "常用操作",
        title: "新增素材",
        subtitle: "建立新的素材記錄",
        icon: PackagePlus,
        keywords: ["new", "add", "create", "新增", "素材"],
        onSelect: () => {
          showAssets();
          setAddAssetDialogOpen(true);
        },
      },
      {
        id: "action-add-model",
        kind: "action",
        group: "常用操作",
        title: "新增模型",
        subtitle: "加入素體篩選項目",
        icon: User,
        keywords: ["new", "add", "model", "avatar", "新增", "模型", "素體"],
        onSelect: () => {
          showAssets();
          setAddModelDialogOpen(true);
        },
      },
      {
        id: "action-add-tag",
        kind: "action",
        group: "常用操作",
        title: "新增標籤",
        subtitle: "加入素材分類",
        icon: Tag,
        keywords: ["new", "add", "tag", "新增", "標籤"],
        onSelect: () => {
          showAssets();
          setAddTagDialogOpen(true);
        },
      },
    ];

    if (selectedAssetId !== null) {
      actions.push({
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
      });
    }

    if (hasActiveFilters) {
      actions.push({
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
      });
    }

    return actions;
  }, [
    hasActiveFilters,
    requestAssetEdit,
    selectedAssetId,
    setAddAssetDialogOpen,
    setAddModelDialogOpen,
    setAddTagDialogOpen,
    setFilters,
    showAssets,
    showVcc,
  ]);

  const assetItems = useMemo<CommandPaletteItem[]>(
    () =>
      allAssets.map((asset) => {
        const title = displayAssetName(asset);
        const modelLabels = asset.models.map((model) => model.display_name || model.name);
        const tagLabels = asset.tags.map((tag) => tag.name);
        const subtitle =
          joinLabels([...modelLabels.slice(0, 2), ...tagLabels.slice(0, 3)]) ||
          asset.file_path;

        return {
          id: `asset-${asset.id}`,
          kind: "asset",
          group: "素材",
          title,
          subtitle,
          badge: asset.file_exists ? undefined : "缺失",
          icon: Package,
          thumbnailUrl: asset.thumbnail_url,
          keywords: [
            asset.name,
            asset.display_name ?? "",
            asset.file_path,
            asset.booth_url ?? "",
            asset.note ?? "",
            ...modelLabels,
            ...tagLabels,
            ...(asset.related_links ?? []).flatMap((link) => [link.label, link.url]),
          ],
          onSelect: () => {
            showAssets();
            selectAsset(asset.id);
            setFilters(emptyFilters);
          },
        };
      }),
    [allAssets, selectAsset, setFilters, showAssets],
  );

  const modelItems = useMemo<CommandPaletteItem[]>(
    () =>
      models.map((model) => {
        const title = model.display_name || model.name;
        const count = modelAssetCounts.get(model.id) ?? 0;

        return {
          id: `model-${model.id}`,
          kind: "model",
          group: "模型",
          title,
          subtitle: "依模型篩選",
          badge: `${count} 素材`,
          icon: User,
          keywords: [model.name, model.display_name ?? "", "model", "avatar", "模型", "素體"],
          onSelect: () => {
            showAssets();
            setFilters({ search: "", modelIds: [model.id], tagIds: [] });
          },
        };
      }),
    [modelAssetCounts, models, setFilters, showAssets],
  );

  const tagItems = useMemo<CommandPaletteItem[]>(
    () =>
      tags.map((tag) => {
        const count = tagAssetCounts.get(tag.id) ?? 0;

        return {
          id: `tag-${tag.id}`,
          kind: "tag",
          group: "標籤",
          title: tag.name,
          subtitle: "依標籤篩選",
          badge: `${count} 素材`,
          icon: Tag,
          accentColor: tag.color,
          keywords: [tag.name, "tag", "label", "標籤"],
          onSelect: () => {
            showAssets();
            setFilters({ search: "", modelIds: [], tagIds: [tag.id] });
          },
        };
      }),
    [setFilters, showAssets, tagAssetCounts, tags],
  );

  const visibleItems = useMemo(() => {
    const cleanedQuery = query.trim();
    const searchAction: CommandPaletteItem[] = cleanedQuery
      ? [
          {
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
          },
        ]
      : [];

    if (!cleanedQuery) {
      return [...baseActionItems, ...assetItems.slice(0, 8)];
    }

    return filterCommandPaletteItems(
      [...searchAction, ...baseActionItems, ...assetItems, ...modelItems, ...tagItems],
      cleanedQuery,
    ).slice(0, 60);
  }, [
    assetItems,
    baseActionItems,
    modelItems,
    query,
    setFilters,
    showAssets,
    tagItems,
  ]);

  const visibleGroups = useMemo(
    () => groupCommandPaletteItems(visibleItems),
    [visibleItems],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (visibleItems.length === 0 && activeIndex !== 0) {
      setActiveIndex(0);
      return;
    }

    if (activeIndex >= visibleItems.length) {
      setActiveIndex(Math.max(visibleItems.length - 1, 0));
    }
  }, [activeIndex, visibleItems.length]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const activeElement = document.querySelector<HTMLElement>(
      "[data-command-palette-item][data-active='true']",
    );
    activeElement?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const runItem = (item: CommandPaletteItem) => {
    closePalette();
    void Promise.resolve(item.onSelect()).catch(console.warn);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[18vh] max-h-[78vh] min-w-0 translate-y-0 overflow-hidden p-0 sm:max-w-[680px]"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>快速搜尋</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            aria-label="快速搜尋"
            placeholder="搜尋素材、模型、標籤或操作"
            className="h-10 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
            onChange={(event) => setQuery(event.target.value)}
          />
          {loadingAssets ? (
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

        <ScrollArea className="max-h-[58vh] min-h-[220px]">
          {visibleGroups.length > 0 ? (
            <div className="space-y-4 p-3">
              {visibleGroups.map((group) => (
                <section key={group.title} className="space-y-1">
                  <h3 className="px-2 text-xs font-medium text-muted-foreground">
                    {group.title}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const itemIndex = visibleItems.findIndex(
                        (current) => current.id === item.id,
                      );
                      const isActive = itemIndex === activeIndex;
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-command-palette-item=""
                          data-active={isActive ? "true" : undefined}
                          className={cn(
                            "grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-2 text-left transition-colors",
                            isActive
                              ? "bg-accent text-accent-foreground"
                              : "text-foreground hover:bg-accent/60",
                          )}
                          onMouseEnter={() => setActiveIndex(itemIndex)}
                          onClick={() => runItem(item)}
                        >
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

                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {item.title}
                            </span>
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
                                isActive && "bg-background/70",
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              找不到符合的項目
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
