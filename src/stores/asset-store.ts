import { invokeTauri } from "@/lib/tauri-runtime";
import { create, type StateCreator } from "zustand";
import { toggleId } from "@/lib/id-list";
import type {
  Asset,
  AssetCategory,
  ArchiveStrategy,
  AssetFilters,
  CreateAssetInput,
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
  error: string | null;
  notice: string | null;
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
  listZipContents: (sourcePath: string) => Promise<ZipContentList>;
  listImportSourceContents: (sourcePath: string) => Promise<SourceContentList>;
  managedImportBatch: (items: ManagedImportItemInput[]) => Promise<ManagedImportBatchReport>;
  setSearchFilter: (search: string) => void;
  setCategoryFilter: (category: AssetCategory | null) => void;
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
  | "error"
  | "notice"
  | "librarySettings"
  | "importReport"
>;

const defaultFilters: AssetFilters = {
  search: "",
  category: null,
  modelIds: [],
  tagIds: [],
};

const initialAssetStoreState: AssetStoreStateFields = {
  assets: [],
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
  error: null,
  notice: null,
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
});

const loadBackendAssets = async (filters: AssetFilters) => {
  const assets = await invokeTauri<BackendAsset[]>("get_assets", {
    filters: cleanFilters(filters),
  });
  return assets.map(toAsset);
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
      if (!isCurrentAssetLoad(generation)) return;

      set({
        models: models.map(toModel),
        tags: tags.map(toTag),
        assets,
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
      if (isCurrentAssetLoad(generation)) set({ assets, loading: false });
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
  clearNotice: () => set({ notice: null }),
  clearImportReport: () => set({ importReport: null }),
  configureLibraryRoot: async (rootPath: string) => {
    set({ saving: true, error: null });
    try {
      const librarySettings = await invokeTauri<LibrarySettings>("configure_library_root", {
        rootPath,
      });
      set({ librarySettings, saving: false, notice: "素材庫根目錄已設定" });
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
      set({ librarySettings, saving: false, notice: "素材庫設定已更新" });
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
      });
      return report;
    } catch (error) {
      set(errorState(error, { saving: false }));
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
  setFilters: (filters: AssetFilters) => {
    set({ filters: { ...filters } });
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
