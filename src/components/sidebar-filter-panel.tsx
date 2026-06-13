"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ListFilter,
  Package,
  Plus,
  RefreshCw,
  Search,
  Store,
  Tag,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { BoothShopBackfillProgressView } from "@/components/booth-shop-backfill-progress";
import {
  SidebarFilterSectionHeader,
  SidebarSectionToggleButton,
} from "@/components/sidebar-filter-section-header";
import {
  SidebarFilterRow,
  type SidebarDropTarget,
} from "@/components/sidebar-filter-row";
import {
  SidebarCountBadge,
  SidebarHelpText,
  SidebarOptionButton,
  SidebarOptionDescription,
} from "@/components/sidebar-option-row";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FloatingSurface } from "@/components/ui/floating-surface";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { SurfaceBox } from "@/components/ui/surface-box";
import { cn } from "@/lib/utils";
import type {
  AssetCategory,
  AssetStatusFilter,
  BoothShopBackfillProgress,
  BoothShopOption,
  Model,
  Tag as AssetTag,
} from "@/types";

type SidebarFilterKind = "model" | "tag";
type SidebarFilterItem = { id: number };

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
  statusFilters: readonly AssetStatusFilter[];
  onSearchChange: (value: string) => void;
  onStatusToggle: (status: AssetStatusFilter) => void;
};

type ActiveFilterSummaryProps = {
  resultCount: number;
  visible: boolean;
  onClear: () => void;
};

type AddAssetButtonProps = {
  onClick: () => void;
};

export type ModelFilterSectionProps = {
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

export type TagFilterSectionProps = {
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

export type ShopFilterSectionProps = {
  selectedCount: number;
  open: boolean;
  backfilling: boolean;
  progress: BoothShopBackfillProgress | null;
  options: readonly BoothShopOption[];
  selectedKeys: ReadonlySet<string>;
  onToggleOpen: () => void;
  onToggle: (shop: BoothShopOption) => void;
  onBackfill: () => void;
};

export type SidebarFilterPanelProps = {
  onAddAsset: () => void;
  category: AssetCategory | null;
  onCategoryChange: (category: AssetCategory | null) => void;
  modelFilter: ModelFilterSectionProps;
  tagFilter: TagFilterSectionProps;
  shopFilter: ShopFilterSectionProps;
};

const categoryRows: { value: AssetCategory | null; label: string }[] = [
  { value: null, label: "全部" },
  { value: "avatar", label: "素體" },
  { value: "accessory", label: "素體配件" },
  { value: "world", label: "世界" },
];

const statusRows: { value: AssetStatusFilter; label: string }[] = [
  { value: "missingRelatedLinks", label: "缺少相關連結" },
  { value: "missingBoothUrl", label: "缺少 BOOTH 連結" },
  { value: "missingThumbnail", label: "缺少縮圖" },
  { value: "missingModels", label: "缺少相容模型" },
  { value: "missingTags", label: "缺少標籤" },
  { value: "missingNote", label: "缺少備註" },
  { value: "missingFile", label: "檔案遺失" },
];

function SidebarFilterListSection<TItem extends SidebarFilterItem>(
  props: SidebarFilterListSectionProps<TItem>,
) {
  return (
    <div>
      <SidebarFilterSectionHeader {...props} />
      {props.open && (
        <SidebarFilterRows
          kind={props.kind}
          items={props.items}
          selectedIds={props.selectedIds}
          draggedId={props.draggedId}
          dropTarget={props.dropTarget}
          editing={props.editing}
          rowEditLabel={props.rowEditLabel}
          rowDeleteLabel={props.rowDeleteLabel}
          getLabel={props.getLabel}
          getSwatchColor={props.getSwatchColor}
          onToggle={props.onToggle}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
          onDragStart={props.onDragStart}
        />
      )}
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

export function SidebarSearch({
  search,
  statusFilters,
  onSearchChange,
  onStatusToggle,
}: SidebarSearchProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedStatusFilters = useMemo(
    () => new Set(statusFilters),
    [statusFilters],
  );

  useEffect(() => {
    if (!advancedOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setAdvancedOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAdvancedOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [advancedOpen]);

  return (
    <div ref={containerRef} className="relative p-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
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
        <IconButton
          variant="outline"
          className={cn(
            "border-sidebar-border bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80",
            advancedOpen && "ring-2 ring-ring/35",
          )}
          label="進階篩選"
          icon={<ListFilter className="h-4 w-4" />}
          badge={statusFilters.length > 0 ? statusFilters.length : null}
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((open) => !open)}
        />
      </div>
      {advancedOpen && (
        <FloatingSurface className="absolute top-full right-3 left-3 z-30 mt-1 border-sidebar-border bg-sidebar p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-sidebar-foreground">
              <ListFilter className="h-4 w-4 shrink-0" />
              <span className="truncate">進階篩選</span>
            </div>
            {statusFilters.length > 0 && (
              <SidebarCountBadge>{statusFilters.length} 項</SidebarCountBadge>
            )}
          </div>
          <StatusFilterSection
            selected={selectedStatusFilters}
            onToggle={onStatusToggle}
            showHeading={false}
          />
        </FloatingSurface>
      )}
    </div>
  );
}

export function ActiveFilterSummary({
  resultCount,
  visible,
  onClear,
}: ActiveFilterSummaryProps) {
  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "flex min-h-8 items-center justify-between px-3 pb-2 transition-opacity",
        !visible && "pointer-events-none opacity-0",
      )}
    >
      <span className="text-xs text-muted-foreground">{resultCount} 個結果</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs text-muted-foreground hover:text-sidebar-foreground"
        disabled={!visible}
        tabIndex={visible ? undefined : -1}
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
          <SidebarOptionButton
            key={row.value ?? "all"}
            active={selected === row.value}
            onClick={() => onChange(row.value)}
          >
            {row.label}
          </SidebarOptionButton>
        ))}
      </div>
    </div>
  );
}

function StatusFilterSection({
  selected,
  onToggle,
  showHeading = true,
}: {
  selected: ReadonlySet<AssetStatusFilter>;
  onToggle: (status: AssetStatusFilter) => void;
  showHeading?: boolean;
}) {
  return (
    <div className="space-y-2">
      {showHeading && (
        <div className="flex items-center gap-2 px-1 text-xs font-semibold text-muted-foreground">
          <ListFilter className="h-4 w-4" />
          資料狀態
          {selected.size > 0 && (
            <SidebarCountBadge className="px-1.5 text-[10px] text-sidebar-foreground">
              {selected.size}
            </SidebarCountBadge>
          )}
        </div>
      )}
      <div className="space-y-1">
        {statusRows.map((row) => {
          const active = selected.has(row.value);
          return (
            <SidebarOptionButton
              key={row.value}
              active={active}
              onClick={() => onToggle(row.value)}
            >
              {row.label}
            </SidebarOptionButton>
          );
        })}
      </div>
      {selected.size > 1 && (
        <SidebarHelpText>多個狀態會同時符合才顯示。</SidebarHelpText>
      )}
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

function shopOptionKey(shop: Pick<BoothShopOption, "name" | "url">) {
  return `${shop.name.trim()}|${shop.url?.trim() ?? ""}`;
}

function ShopFilterSection(props: ShopFilterSectionProps) {
  return (
    <div>
      <div className="mb-2">
        <SidebarSectionToggleButton
          icon={Store}
          label="依 BOOTH Shop 篩選"
          selectedCount={props.selectedCount}
          open={props.open}
          onToggleOpen={props.onToggleOpen}
        />
      </div>
      {props.open && (
        <div className="space-y-1">
          <SurfaceBox className="mb-2 border-sidebar-border bg-sidebar-accent/30 p-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 w-full justify-center gap-1.5 border-sidebar-border bg-sidebar text-xs"
              disabled={props.backfilling}
              onClick={props.onBackfill}
            >
              {props.backfilling ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {props.backfilling ? "回填中" : "補齊既有素材"}
            </Button>
            <SidebarHelpText className="mt-1.5 px-0">
              從已有 BOOTH 連結抓取缺少的 Shop 資訊。
            </SidebarHelpText>
            {props.backfilling && (
              <BoothShopBackfillProgressView
                className="mt-2"
                progress={props.progress}
              />
            )}
          </SurfaceBox>
          {props.options.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              尚無 BOOTH Shop 資訊
            </p>
          ) : (
            props.options.map((shop) => {
              const checked = props.selectedKeys.has(shopOptionKey(shop));
              return (
                <div
                  key={shop.key}
                  className={cn(
                    "grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-sidebar-accent",
                    checked && "bg-sidebar-accent",
                  )}
                  onClick={() => props.onToggle(shop)}
                >
                  <Checkbox
                    checked={checked}
                    onClick={(event) => event.stopPropagation()}
                    onCheckedChange={() => props.onToggle(shop)}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-sidebar-foreground">
                      {shop.name}
                    </p>
                    {shop.url && (
                      <SidebarOptionDescription>
                        {shop.url}
                      </SidebarOptionDescription>
                    )}
                  </div>
                  <SidebarCountBadge className="px-1.5 text-[10px]">
                    {shop.assetCount}
                  </SidebarCountBadge>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export function SidebarFilterPanel({
  onAddAsset,
  category,
  onCategoryChange,
  modelFilter,
  tagFilter,
  shopFilter,
}: SidebarFilterPanelProps) {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="space-y-6 p-3">
        <AddAssetButton onClick={onAddAsset} />
        <CategoryFilterSection selected={category} onChange={onCategoryChange} />
        <ModelFilterSection {...modelFilter} />
        <TagFilterSection {...tagFilter} />
        <ShopFilterSection {...shopFilter} />
      </div>
    </ScrollArea>
  );
}
