import { invokeTauri } from "@/lib/tauri-runtime";
import { create, type StateCreator } from "zustand";
import { toggleId } from "@/lib/id-list";
import type {
  Asset,
  AssetCategory,
  ArchiveStrategy,
  AssetFilters,
  AssetSortOrder,
  AssetStatusFilter,
  BoothShopOption,
  BoothShopBackfillReport,
  BoothShopBackfillProgress,
  CreateAssetInput,
  ImportSourceInfo,
  ImportTargetPreview,
  LibrarySettings,
  ManagedImportBatchReport,
  ManagedImportItemInput,
  Model,
  SourceContentList,
  Tag,
  UpdateLibrarySettingsInput,
  ZipContentList,
  UpdateAssetInput,
} from "@/types";

type BackendModel = {
  id: number;
  name: string;
  displayName: string | null;
  sortOrder: number;
  createdAt: string;
};

type BackendTag = {
  id: number;
  name: string;
  color: string;
  sortOrder: number;
};

type BackendAssetLink = {
  id: number;
  label: string;
  url: string;
  sortOrder: number;
};

type BackendAsset = {
  id: number;
  name: string;
  displayName: string | null;
  category: AssetCategory;
  filePath: string;
  boothUrl: string | null;
  boothShopName: string | null;
  boothShopUrl: string | null;
  thumbnailUrl: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  models: BackendModel[];
  tags: BackendTag[];
  relatedLinks: BackendAssetLink[];
  fileExists: boolean;
};

type BackendSaveSummary = {
  path: string;
  models: number;
  tags: number;
  assets: number;
  assetModels: number;
  assetTags: number;
  assetLinks: number;
  vccProjects: number;
  vccRepositories: number;
  vccBackupPath: string | null;
  vccBackupFiles: number;
  vccCachedRepositories: number;
};

export type AssetStore = {
  assets: Asset[];
  shopOptions: BoothShopOption[];
  models: Model[];
  tags: Tag[];
  filters: AssetFilters;
  selectedAssetId: number | null;
  isAddAssetDialogOpen: boolean;
  isAddModelDialogOpen: boolean;
  isAddTagDialogOpen: boolean;
  editingModel: Model | null;
  editingTag: Tag | null;
  editingAssetRequestId: number | null;
  relatedAssetSearchId: number | null;
  loading: boolean;
  saving: boolean;
  boothShopBackfilling: boolean;
  error: string | null;
  notice: string | null;
  noticeTone: "success" | "loading";
  boothShopBackfillProgress: BoothShopBackfillProgress | null;
  librarySettings: LibrarySettings | null;
  importReport: ManagedImportBatchReport | null;
  loadAll: () => Promise<void>;
  loadAssets: () => Promise<void>;
  loadLibrarySettings: () => Promise<void>;
  getAllAssets: () => Promise<Asset[]>;
  clearError: () => void;
  clearNotice: () => void;
  clearImportReport: () => void;
  configureLibraryRoot: (rootPath: string) => Promise<void>;
  updateLibrarySettings: (input: UpdateLibrarySettingsInput) => Promise<void>;
  previewManagedImportTarget: (
    sourcePath: string,
    category: AssetCategory,
    archiveStrategy?: ArchiveStrategy | null,
  ) => Promise<ImportTargetPreview>;
  inspectImportSources: (paths: string[]) => Promise<ImportSourceInfo[]>;
  listZipContents: (sourcePath: string) => Promise<ZipContentList>;
  listImportSourceContents: (sourcePath: string) => Promise<SourceContentList>;
  managedImportBatch: (items: ManagedImportItemInput[]) => Promise<ManagedImportBatchReport>;
  backfillBoothShopMetadata: () => Promise<BoothShopBackfillReport>;
  setSearchFilter: (search: string) => void;
  setCategoryFilter: (category: AssetCategory | null) => void;
  setAssetSortOrder: (sortOrder: AssetSortOrder) => void;
  setShopFilter: (shop: BoothShopOption) => void;
  toggleShopFilter: (shop: BoothShopOption) => void;
  toggleStatusFilter: (status: AssetStatusFilter) => void;
  setFilters: (filters: AssetFilters) => void;
  toggleModelFilter: (modelId: number) => void;
  toggleTagFilter: (tagId: number) => void;
  clearFilters: () => void;
  selectAsset: (assetId: number | null) => void;
  addAsset: (asset: CreateAssetInput) => Promise<void>;
  updateAsset: (id: number, updates: UpdateAssetInput) => Promise<void>;
  deleteAsset: (id: number) => Promise<void>;
  addModel: (name: string, displayName?: string) => Promise<Model>;
  updateModel: (id: number, name: string, displayName?: string) => Promise<void>;
  deleteModel: (id: number) => Promise<void>;
  reorderModels: (modelIds: number[]) => Promise<void>;
  addTag: (name: string, color: string) => Promise<Tag>;
  updateTag: (id: number, name: string, color: string) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;
  reorderTags: (tagIds: number[]) => Promise<void>;
  exportSave: (path: string) => Promise<void>;
  importSave: (path: string) => Promise<void>;
  setAddAssetDialogOpen: (open: boolean) => void;
  setAddModelDialogOpen: (open: boolean) => void;
  setAddTagDialogOpen: (open: boolean) => void;
  setEditingModel: (model: Model | null) => void;
  setEditingTag: (tag: Tag | null) => void;
  requestAssetEdit: (assetId: number) => void;
  clearAssetEditRequest: () => void;
  openRelatedAssetSearch: (assetId: number) => void;
  closeRelatedAssetSearch: () => void;
};

type AssetStoreSet = Parameters<StateCreator<AssetStore>>[0];
type AssetStoreGet = Parameters<StateCreator<AssetStore>>[1];
type AssetStoreStateFields = Pick<
  AssetStore,
  | "assets"
  | "shopOptions"
  | "models"
  | "tags"
  | "filters"
  | "selectedAssetId"
  | "isAddAssetDialogOpen"
  | "isAddModelDialogOpen"
  | "isAddTagDialogOpen"
  | "editingModel"
  | "editingTag"
  | "editingAssetRequestId"
  | "relatedAssetSearchId"
  | "loading"
  | "saving"
  | "boothShopBackfilling"
  | "error"
  | "notice"
  | "noticeTone"
  | "boothShopBackfillProgress"
  | "librarySettings"
  | "importReport"
>;

const defaultFilters: AssetFilters = {
  search: "",
  category: null,
  modelIds: [],
  tagIds: [],
  shopFilters: [],
  statusFilters: [],
  sortOrder: "updatedDesc",
};

const initialAssetStoreState: AssetStoreStateFields = {
  assets: [],
  shopOptions: [],
  models: [],
  tags: [],
  filters: defaultFilters,
  selectedAssetId: null,
  isAddAssetDialogOpen: false,
  isAddModelDialogOpen: false,
  isAddTagDialogOpen: false,
  editingModel: null,
  editingTag: null,
  editingAssetRequestId: null,
  relatedAssetSearchId: null,
  loading: false,
  saving: false,
  boothShopBackfilling: false,
  error: null,
  notice: null,
  noticeTone: "success",
  boothShopBackfillProgress: null,
  librarySettings: null,
  importReport: null,
};

let assetLoadGeneration = 0;

const nextAssetLoadGeneration = () => {
  assetLoadGeneration += 1;
  return assetLoadGeneration;
};

const isCurrentAssetLoad = (generation: number) =>
  generation === assetLoadGeneration;

const toMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const toModel = (model: BackendModel): Model => ({
  id: model.id,
  name: model.name,
  display_name: model.displayName,
  sort_order: model.sortOrder,
  created_at: model.createdAt,
});

const toTag = (tag: BackendTag): Tag => ({
  id: tag.id,
  name: tag.name,
  color: tag.color,
  sort_order: tag.sortOrder,
});

const toAssetLink = (link: BackendAssetLink) => ({
  id: link.id,
  label: link.label,
  url: link.url,
  sort_order: link.sortOrder,
});

const toAsset = (asset: BackendAsset): Asset => ({
  id: asset.id,
  name: asset.name,
  display_name: asset.displayName,
  file_path: asset.filePath,
  category: asset.category ?? "accessory",
  booth_url: asset.boothUrl,
  booth_shop_name: asset.boothShopName,
  booth_shop_url: asset.boothShopUrl,
  thumbnail_url: asset.thumbnailUrl,
  note: asset.note,
  created_at: asset.createdAt,
  updated_at: asset.updatedAt,
  models: asset.models.map(toModel),
  tags: asset.tags.map(toTag),
  related_links: (asset.relatedLinks ?? []).map(toAssetLink),
  file_exists: asset.fileExists,
});

const cleanFilters = (filters: AssetFilters) => ({
  search: filters.search.trim() || undefined,
  category: filters.category ?? undefined,
  modelIds: filters.modelIds,
  tagIds: filters.tagIds,
  shopFilters: filters.shopFilters,
  statusFilters: filters.statusFilters,
  sortOrder: filters.sortOrder,
});

const loadBackendAssets = async (filters: AssetFilters) => {
  const assets = await invokeTauri<BackendAsset[]>("get_assets", {
    filters: cleanFilters(filters),
  });
  return assets.map(toAsset);
};

const loadBackendShopOptions = () =>
  invokeTauri<BoothShopOption[]>("get_booth_shop_options");

const shopFilterKey = (shop: { name: string; url: string | null }) =>
  `${shop.name.trim()}|${shop.url?.trim() ?? ""}`;

const boothShopBackfillProgressEvent = "booth-shop-backfill-progress";

const initialBoothShopBackfillProgress: BoothShopBackfillProgress = {
  total: 0,
  current: 0,
  updated: 0,
  skipped: 0,
  failed: 0,
};

const boothShopBackfillProgressText = (progress: BoothShopBackfillProgress) => {
  if (progress.total === 0) {
    return "沒有需要補齊的既有素材。";
  }

  const percent = Math.round((progress.current / progress.total) * 100);
  return `BOOTH Shop 回填中：${progress.current}/${progress.total}（${percent}%）。已更新 ${progress.updated}，略過 ${progress.skipped}，失敗 ${progress.failed}。`;
};

const boothShopBackfillReportText = (report: BoothShopBackfillReport) => {
  if (report.totalCandidates === 0) {
    return "沒有需要補齊的 BOOTH Shop 資訊。";
  }

  return `BOOTH Shop 回填完成：更新 ${report.updated} 筆，略過 ${report.skipped} 筆，失敗 ${report.failed} 筆`;
};

const errorState = (
  error: unknown,
  state: Partial<
    Pick<AssetStore, "assets" | "models" | "tags" | "loading" | "saving">
  > = {},
) => ({
  ...state,
  error: toMessage(error),
});

const orderedByIds = <T extends { id: number }>(items: T[], ids: number[]) => {
  const order = new Map<number, number>();
  ids.forEach((id, index) => order.set(id, index));

  return [...items]
    .sort((first, second) => {
      const firstOrder = order.get(first.id) ?? Number.MAX_SAFE_INTEGER;
      const secondOrder = order.get(second.id) ?? Number.MAX_SAFE_INTEGER;
      return firstOrder - secondOrder;
    })
    .map((item, index) => ({ ...item, sort_order: index + 1 }));
};

const toBackendInput = (asset: Asset, updates: UpdateAssetInput) => ({
  displayName:
    updates.display_name !== undefined ? updates.display_name : asset.display_name,
  filePath: updates.file_path ?? asset.file_path,
  category: updates.category ?? asset.category,
  boothUrl: updates.booth_url !== undefined ? updates.booth_url : asset.booth_url,
  boothShopName:
    updates.booth_shop_name !== undefined
      ? updates.booth_shop_name
      : asset.booth_shop_name,
  boothShopUrl:
    updates.booth_shop_url !== undefined ? updates.booth_shop_url : asset.booth_shop_url,
  thumbnailUrl:
    updates.thumbnail_url !== undefined ? updates.thumbnail_url : asset.thumbnail_url,
  note: updates.note !== undefined ? updates.note : asset.note,
  modelIds: updates.model_ids ?? asset.models.map((model) => model.id),
  tagIds: updates.tag_ids ?? asset.tags.map((tag) => tag.id),
  relatedLinks:
    updates.related_links ??
    (asset.related_links ?? []).map((link) => ({
      label: link.label,
      url: link.url,
    })),
});

const toCreateBackendInput = (asset: CreateAssetInput) => ({
  displayName: asset.display_name,
  category: asset.category,
  filePath: asset.file_path,
  boothUrl: asset.booth_url,
  boothShopName: asset.booth_shop_name,
  boothShopUrl: asset.booth_shop_url,
  thumbnailUrl: asset.thumbnail_url,
  note: asset.note,
  modelIds: asset.model_ids,
  tagIds: asset.tag_ids,
  relatedLinks: asset.related_links,
});

export const selectSelectedAsset = (state: AssetStore) =>
  state.assets.find((asset) => asset.id === state.selectedAssetId) ?? null;

const createLoadActions = (set: AssetStoreSet, get: AssetStoreGet) => ({
  loadAll: async () => {
    const generation = nextAssetLoadGeneration();
    set({ loading: true, error: null });
    try {
      const [models, tags, assets, librarySettings] = await Promise.all([
        invokeTauri<BackendModel[]>("get_models"),
        invokeTauri<BackendTag[]>("get_tags"),
        loadBackendAssets(get().filters),
        invokeTauri<LibrarySettings>("get_library_settings"),
      ]);
      const shopOptions = await loadBackendShopOptions();
      if (!isCurrentAssetLoad(generation)) return;

      set({
        models: models.map(toModel),
        tags: tags.map(toTag),
        assets,
        shopOptions,
        librarySettings,
        loading: false,
      });
    } catch (error) {
      if (isCurrentAssetLoad(generation)) set(errorState(error, { loading: false }));
    }
  },
  loadAssets: async () => {
    const generation = nextAssetLoadGeneration();
    set({ loading: true, error: null });
    try {
      const assets = await loadBackendAssets(get().filters);
      const shopOptions = await loadBackendShopOptions();
      if (isCurrentAssetLoad(generation)) set({ assets, shopOptions, loading: false });
    } catch (error) {
      if (isCurrentAssetLoad(generation)) set(errorState(error, { loading: false }));
    }
  },
  getAllAssets: async () => loadBackendAssets(defaultFilters),
  loadLibrarySettings: async () => {
    try {
      const librarySettings = await invokeTauri<LibrarySettings>("get_library_settings");
      set({ librarySettings });
    } catch (error) {
      set(errorState(error));
    }
  },
});

const createFilterActions = (set: AssetStoreSet, get: AssetStoreGet) => ({
  clearError: () => set({ error: null }),
  clearNotice: () => set({ notice: null, boothShopBackfillProgress: null }),
  clearImportReport: () => set({ importReport: null }),
  configureLibraryRoot: async (rootPath: string) => {
    set({ saving: true, error: null });
    try {
      const librarySettings = await invokeTauri<LibrarySettings>("configure_library_root", {
        rootPath,
      });
      set({ librarySettings, saving: false, notice: "素材庫根目錄已設定", noticeTone: "success" });
    } catch (error) {
      set(errorState(error, { saving: false }));
      throw error;
    }
  },
  updateLibrarySettings: async (input: UpdateLibrarySettingsInput) => {
    set({ saving: true, error: null });
    try {
      const librarySettings = await invokeTauri<LibrarySettings>("update_library_settings", {
        input,
      });
      set({ librarySettings, saving: false, notice: "素材庫設定已更新", noticeTone: "success" });
    } catch (error) {
      set(errorState(error, { saving: false }));
      throw error;
    }
  },
  previewManagedImportTarget: async (
    sourcePath: string,
    category: AssetCategory,
    archiveStrategy: ArchiveStrategy | null = null,
  ) => {
    return invokeTauri<ImportTargetPreview>("preview_managed_import_target", {
      sourcePath,
      category,
      archiveStrategy,
    });
  },
  inspectImportSources: async (paths: string[]) => {
    return invokeTauri<ImportSourceInfo[]>("inspect_import_sources", { paths });
  },
  listZipContents: async (sourcePath: string) => {
    return invokeTauri<ZipContentList>("list_zip_contents", { sourcePath });
  },
  listImportSourceContents: async (sourcePath: string) => {
    return invokeTauri<SourceContentList>("list_import_source_contents", { sourcePath });
  },
  managedImportBatch: async (items: ManagedImportItemInput[]) => {
    set({ saving: true, error: null, notice: null, importReport: null });
    try {
      const report = await invokeTauri<ManagedImportBatchReport>("managed_import_batch", {
        input: { items },
      });
      await get().loadAssets();
      set({
        saving: false,
        importReport: report,
        notice: `導入完成：${report.succeeded} 成功，${report.failed} 失敗`,
        noticeTone: "success",
      });
      return report;
    } catch (error) {
      set(errorState(error, { saving: false }));
      throw error;
    }
  },
  backfillBoothShopMetadata: async () => {
    if (get().boothShopBackfilling) {
      throw new Error("BOOTH Shop 回填已在進行中");
    }
    set({
      saving: true,
      boothShopBackfilling: true,
      error: null,
      notice: "BOOTH Shop 回填中：正在準備既有素材清單...",
      noticeTone: "loading",
      boothShopBackfillProgress: initialBoothShopBackfillProgress,
    });
    let unlisten: (() => void) | null = null;
    try {
      const { listen } = await import("@tauri-apps/api/event");
      unlisten = await listen<BoothShopBackfillProgress>(
        boothShopBackfillProgressEvent,
        (event) => {
          set({
            notice: boothShopBackfillProgressText(event.payload),
            noticeTone: "loading",
            boothShopBackfillProgress: event.payload,
          });
        },
      );
      const report = await invokeTauri<BoothShopBackfillReport>(
        "backfill_booth_shop_metadata",
      );
      unlisten?.();
      unlisten = null;
      await get().loadAssets();
      set({
        saving: false,
        boothShopBackfilling: false,
        notice: boothShopBackfillReportText(report),
        noticeTone: "success",
        boothShopBackfillProgress: {
          total: report.totalCandidates,
          current: report.totalCandidates,
          updated: report.updated,
          skipped: report.skipped,
          failed: report.failed,
        },
      });
      return report;
    } catch (error) {
      unlisten?.();
      set({
        ...errorState(error, { saving: false }),
        boothShopBackfilling: false,
        notice: null,
        boothShopBackfillProgress: null,
      });
      throw error;
    }
  },
  setSearchFilter: (search: string) => {
    set((state) => ({ filters: { ...state.filters, search } }));
    void get().loadAssets();
  },
  setCategoryFilter: (category: AssetCategory | null) => {
    set((state) => ({ filters: { ...state.filters, category } }));
    void get().loadAssets();
  },
  setAssetSortOrder: (sortOrder: AssetSortOrder) => {
    set((state) => ({ filters: { ...state.filters, sortOrder } }));
    void get().loadAssets();
  },
  setShopFilter: (shop: BoothShopOption) => {
    set((state) => ({
      filters: {
        ...state.filters,
        shopFilters: [{ name: shop.name, url: shop.url }],
      },
    }));
    void get().loadAssets();
  },
  toggleShopFilter: (shop: BoothShopOption) => {
    set((state) => {
      const key = shopFilterKey(shop);
      const selected = state.filters.shopFilters.some(
        (current) => shopFilterKey(current) === key,
      );
      return {
        filters: {
          ...state.filters,
          shopFilters: selected
            ? state.filters.shopFilters.filter(
                (current) => shopFilterKey(current) !== key,
              )
            : [...state.filters.shopFilters, { name: shop.name, url: shop.url }],
        },
      };
    });
    void get().loadAssets();
  },
  toggleStatusFilter: (status: AssetStatusFilter) => {
    set((state) => ({
      filters: {
        ...state.filters,
        statusFilters: state.filters.statusFilters.includes(status)
          ? state.filters.statusFilters.filter((item) => item !== status)
          : [...state.filters.statusFilters, status],
      },
    }));
    void get().loadAssets();
  },
  setFilters: (filters: AssetFilters) => {
    set({ filters: { ...defaultFilters, ...filters } });
    void get().loadAssets();
  },
  toggleModelFilter: (modelId: number) => {
    set((state) => ({
      filters: { ...state.filters, modelIds: toggleId(state.filters.modelIds, modelId) },
    }));
    void get().loadAssets();
  },
  toggleTagFilter: (tagId: number) => {
    set((state) => ({
      filters: { ...state.filters, tagIds: toggleId(state.filters.tagIds, tagId) },
    }));
    void get().loadAssets();
  },
  clearFilters: () => {
    set({ filters: { ...defaultFilters } });
    void get().loadAssets();
  },
  selectAsset: (assetId: number | null) => set({ selectedAssetId: assetId }),
});

const createAddAssetAction = (set: AssetStoreSet, get: AssetStoreGet) => async (
  asset: CreateAssetInput,
) => {
  set({ saving: true, error: null });
  try {
    const created = await invokeTauri<BackendAsset>("create_asset", {
      input: toCreateBackendInput(asset),
    });
    await get().loadAssets();
    set({ selectedAssetId: created.id, isAddAssetDialogOpen: false, saving: false });
  } catch (error) {
    set(errorState(error, { saving: false }));
    throw error;
  }
};

const createUpdateAssetAction = (set: AssetStoreSet, get: AssetStoreGet) => async (
  id: number,
  updates: UpdateAssetInput,
) => {
  const asset = get().assets.find((current) => current.id === id);
  if (!asset) return;

  set({ saving: true, error: null });
  try {
    await invokeTauri<BackendAsset>("update_asset", { id, input: toBackendInput(asset, updates) });
    await get().loadAssets();
    set({ saving: false });
  } catch (error) {
    set(errorState(error, { saving: false }));
    throw error;
  }
};

const createDeleteAssetAction = (set: AssetStoreSet, get: AssetStoreGet) => async (
  id: number,
) => {
  set({ saving: true, error: null });
  try {
    await invokeTauri("delete_asset", { id });
    await get().loadAssets();
    set({ selectedAssetId: null, saving: false });
  } catch (error) {
    set(errorState(error, { saving: false }));
    throw error;
  }
};

const createAssetActions = (set: AssetStoreSet, get: AssetStoreGet) => ({
  addAsset: createAddAssetAction(set, get),
  updateAsset: createUpdateAssetAction(set, get),
  deleteAsset: createDeleteAssetAction(set, get),
});

const createModelActions = (set: AssetStoreSet, get: AssetStoreGet) => ({
  addModel: createAddModelAction(set),
  updateModel: createUpdateModelAction(set, get),
  deleteModel: createDeleteModelAction(set, get),
});

const createAddModelAction = (set: AssetStoreSet) => async (
  name: string,
  displayName?: string,
) => {
  set({ error: null });
  try {
    const model = await invokeTauri<BackendModel>("create_model", {
      input: { name, displayName: displayName || null },
    });
    const created = toModel(model);
    set((state) => ({ models: [...state.models, created] }));
    return created;
  } catch (error) {
    set(errorState(error));
    throw error;
  }
};

const createUpdateModelAction = (set: AssetStoreSet, get: AssetStoreGet) => async (
  id: number,
  name: string,
  displayName?: string,
) => {
  set({ error: null });
  try {
    const model = await invokeTauri<BackendModel>("update_model", {
      id,
      input: { name, displayName: displayName || null },
    });
    set((state) => ({
      models: state.models.map((current) => current.id === id ? toModel(model) : current),
      editingModel: null,
    }));
    await get().loadAssets();
  } catch (error) {
    set(errorState(error));
    throw error;
  }
};

const createDeleteModelAction = (set: AssetStoreSet, get: AssetStoreGet) => async (
  id: number,
) => {
  set({ error: null });
  try {
    await invokeTauri("delete_model", { id });
    set((state) => ({
      models: state.models.filter((model) => model.id !== id),
      filters: { ...state.filters, modelIds: state.filters.modelIds.filter((item) => item !== id) },
    }));
    await get().loadAssets();
  } catch (error) {
    set(errorState(error));
    throw error;
  }
};

const createTagActions = (set: AssetStoreSet, get: AssetStoreGet) => ({
  addTag: createAddTagAction(set),
  updateTag: createUpdateTagAction(set, get),
  deleteTag: createDeleteTagAction(set, get),
});

const createAddTagAction = (set: AssetStoreSet) => async (name: string, color: string) => {
  set({ error: null });
  try {
    const tag = await invokeTauri<BackendTag>("create_tag", { input: { name, color } });
    const created = toTag(tag);
    set((state) => ({ tags: [...state.tags, created] }));
    return created;
  } catch (error) {
    set(errorState(error));
    throw error;
  }
};

const createUpdateTagAction = (set: AssetStoreSet, get: AssetStoreGet) => async (
  id: number,
  name: string,
  color: string,
) => {
  set({ error: null });
  try {
    const tag = await invokeTauri<BackendTag>("update_tag", { id, input: { name, color } });
    set((state) => ({
      tags: state.tags.map((current) => current.id === id ? toTag(tag) : current),
      editingTag: null,
    }));
    await get().loadAssets();
  } catch (error) {
    set(errorState(error));
    throw error;
  }
};

const createDeleteTagAction = (set: AssetStoreSet, get: AssetStoreGet) => async (
  id: number,
) => {
  set({ error: null });
  try {
    await invokeTauri("delete_tag", { id });
    set((state) => ({
      tags: state.tags.filter((tag) => tag.id !== id),
      filters: { ...state.filters, tagIds: state.filters.tagIds.filter((item) => item !== id) },
    }));
    await get().loadAssets();
  } catch (error) {
    set(errorState(error));
    throw error;
  }
};

const createReorderActions = (set: AssetStoreSet, get: AssetStoreGet) => ({
  reorderModels: createReorderModelsAction(set, get),
  reorderTags: createReorderTagsAction(set, get),
});

const createReorderModelsAction = (set: AssetStoreSet, get: AssetStoreGet) => async (
  modelIds: number[],
) => {
  const previousModels = get().models;
  const previousAssets = get().assets;

  set((state) => ({
    error: null,
    models: orderedByIds(state.models, modelIds),
    assets: state.assets.map((asset) => ({
      ...asset,
      models: orderedByIds(asset.models, modelIds),
    })),
  }));

  try {
    await invokeTauri("reorder_models", { input: { modelIds } });
  } catch (error) {
    set(errorState(error, { models: previousModels, assets: previousAssets }));
    throw error;
  }
};

const createReorderTagsAction = (set: AssetStoreSet, get: AssetStoreGet) => async (
  tagIds: number[],
) => {
  const previousTags = get().tags;
  const previousAssets = get().assets;

  set((state) => ({
    error: null,
    tags: orderedByIds(state.tags, tagIds),
    assets: state.assets.map((asset) => ({
      ...asset,
      tags: orderedByIds(asset.tags, tagIds),
    })),
  }));

  try {
    await invokeTauri("reorder_tags", { input: { tagIds } });
  } catch (error) {
    set(errorState(error, { tags: previousTags, assets: previousAssets }));
    throw error;
  }
};

const createSaveActions = (set: AssetStoreSet, get: AssetStoreGet) => ({
  exportSave: createExportSaveAction(set),
  importSave: createImportSaveAction(set, get),
});

const createExportSaveAction = (set: AssetStoreSet) => async (path: string) => {
  set({ saving: true, error: null, notice: null });
  try {
    const summary = await invokeTauri<BackendSaveSummary>("export_save", { path });
    const vccBackupText = summary.vccBackupPath
      ? `，VCC 備份 ${summary.vccBackupFiles} 個檔案`
      : "";
    set({
      saving: false,
      notice: `已匯出存檔：${summary.assets} 個素材、${summary.models} 個模型、${summary.tags} 個標籤、${summary.vccProjects} 個 VCC 專案${vccBackupText}`,
      noticeTone: "success",
    });
  } catch (error) {
    set(errorState(error, { saving: false }));
    throw error;
  }
};

const createImportSaveAction = (set: AssetStoreSet, get: AssetStoreGet) => async (
  path: string,
) => {
  set({ saving: true, error: null, notice: null });
  try {
    const summary = await invokeTauri<BackendSaveSummary>("import_save", { path });
    set({ filters: { ...defaultFilters }, selectedAssetId: null });
    await get().loadAll();
    set({
      saving: false,
      notice: `已匯入存檔：${summary.assets} 個素材、${summary.models} 個模型、${summary.tags} 個標籤、${summary.vccProjects} 個 VCC 專案`,
      noticeTone: "success",
    });
  } catch (error) {
    set(errorState(error, { saving: false }));
    throw error;
  }
};

const createDialogActions = (set: AssetStoreSet) => ({
  setAddAssetDialogOpen: (open: boolean) => set({ isAddAssetDialogOpen: open }),
  setAddModelDialogOpen: (open: boolean) => set({ isAddModelDialogOpen: open }),
  setAddTagDialogOpen: (open: boolean) => set({ isAddTagDialogOpen: open }),
  setEditingModel: (model: Model | null) => set({ editingModel: model }),
  setEditingTag: (tag: Tag | null) => set({ editingTag: tag }),
  requestAssetEdit: (assetId: number) =>
    set({ selectedAssetId: assetId, editingAssetRequestId: assetId }),
  clearAssetEditRequest: () => set({ editingAssetRequestId: null }),
  openRelatedAssetSearch: (assetId: number) => set({ relatedAssetSearchId: assetId }),
  closeRelatedAssetSearch: () => set({ relatedAssetSearchId: null }),
});

const createAssetStore = (set: AssetStoreSet, get: AssetStoreGet): AssetStore => ({
  ...initialAssetStoreState,
  ...createLoadActions(set, get),
  ...createFilterActions(set, get),
  ...createAssetActions(set, get),
  ...createModelActions(set, get),
  ...createTagActions(set, get),
  ...createReorderActions(set, get),
  ...createSaveActions(set, get),
  ...createDialogActions(set),
});

export const useAssetStore = create<AssetStore>((set, get) =>
  createAssetStore(set, get),
);
