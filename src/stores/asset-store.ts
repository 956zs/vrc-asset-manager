import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import type {
  Asset,
  AssetFilters,
  CreateAssetInput,
  Model,
  Tag,
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

type AssetStore = {
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
  loadAll: () => Promise<void>;
  loadAssets: () => Promise<void>;
  getAllAssets: () => Promise<Asset[]>;
  clearError: () => void;
  clearNotice: () => void;
  setSearchFilter: (search: string) => void;
  setFilters: (filters: AssetFilters) => void;
  toggleModelFilter: (modelId: number) => void;
  toggleTagFilter: (tagId: number) => void;
  clearFilters: () => void;
  selectAsset: (assetId: number | null) => void;
  addAsset: (asset: CreateAssetInput) => Promise<void>;
  updateAsset: (id: number, updates: UpdateAssetInput) => Promise<void>;
  deleteAsset: (id: number) => Promise<void>;
  addModel: (name: string, displayName?: string) => Promise<void>;
  updateModel: (id: number, name: string, displayName?: string) => Promise<void>;
  deleteModel: (id: number) => Promise<void>;
  reorderModels: (modelIds: number[]) => Promise<void>;
  addTag: (name: string, color: string) => Promise<void>;
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
  getFilteredAssets: () => Asset[];
  getSelectedAsset: () => Asset | null;
};

const defaultFilters: AssetFilters = {
  search: "",
  modelIds: [],
  tagIds: [],
};

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
  modelIds: filters.modelIds,
  tagIds: filters.tagIds,
});

const toggleId = (values: number[], id: number) =>
  values.includes(id) ? values.filter((value) => value !== id) : [...values, id];

const orderedByIds = <T extends { id: number }>(items: T[], ids: number[]) => {
  const order = new Map(ids.map((id, index) => [id, index]));
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

export const useAssetStore = create<AssetStore>((set, get) => ({
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

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const filters = cleanFilters(get().filters);
      const [models, tags, assets] = await Promise.all([
        invoke<BackendModel[]>("get_models"),
        invoke<BackendTag[]>("get_tags"),
        invoke<BackendAsset[]>("get_assets", { filters }),
      ]);
      set({
        models: models.map(toModel),
        tags: tags.map(toTag),
        assets: assets.map(toAsset),
        loading: false,
      });
    } catch (error) {
      set({ error: toMessage(error), loading: false });
    }
  },

  loadAssets: async () => {
    set({ loading: true, error: null });
    try {
      const filters = cleanFilters(get().filters);
      const assets = await invoke<BackendAsset[]>("get_assets", { filters });
      set({ assets: assets.map(toAsset), loading: false });
    } catch (error) {
      set({ error: toMessage(error), loading: false });
    }
  },

  getAllAssets: async () => {
    const assets = await invoke<BackendAsset[]>("get_assets", {
      filters: { modelIds: [], tagIds: [] },
    });
    return assets.map(toAsset);
  },

  clearError: () => set({ error: null }),
  clearNotice: () => set({ notice: null }),

  setSearchFilter: (search) => {
    set((state) => ({ filters: { ...state.filters, search } }));
    void get().loadAssets();
  },

  setFilters: (filters) => {
    set({ filters: { ...filters } });
    void get().loadAssets();
  },

  toggleModelFilter: (modelId) => {
    set((state) => ({
      filters: {
        ...state.filters,
        modelIds: toggleId(state.filters.modelIds, modelId),
      },
    }));
    void get().loadAssets();
  },

  toggleTagFilter: (tagId) => {
    set((state) => ({
      filters: {
        ...state.filters,
        tagIds: toggleId(state.filters.tagIds, tagId),
      },
    }));
    void get().loadAssets();
  },

  clearFilters: () => {
    set({ filters: { ...defaultFilters } });
    void get().loadAssets();
  },

  selectAsset: (assetId) => set({ selectedAssetId: assetId }),

  addAsset: async (asset) => {
    set({ saving: true, error: null });
    try {
      const created = await invoke<BackendAsset>("create_asset", {
        input: {
          displayName: asset.display_name,
          filePath: asset.file_path,
          boothUrl: asset.booth_url,
          thumbnailUrl: asset.thumbnail_url,
          note: asset.note,
          modelIds: asset.model_ids,
          tagIds: asset.tag_ids,
          relatedLinks: asset.related_links,
        },
      });
      await get().loadAssets();
      set({
        selectedAssetId: created.id,
        isAddAssetDialogOpen: false,
        saving: false,
      });
    } catch (error) {
      set({ error: toMessage(error), saving: false });
      throw error;
    }
  },

  updateAsset: async (id, updates) => {
    const asset = get().assets.find((current) => current.id === id);
    if (!asset) {
      return;
    }

    set({ saving: true, error: null });
    try {
      await invoke<BackendAsset>("update_asset", {
        id,
        input: toBackendInput(asset, updates),
      });
      await get().loadAssets();
      set({ saving: false });
    } catch (error) {
      set({ error: toMessage(error), saving: false });
      throw error;
    }
  },

  deleteAsset: async (id) => {
    set({ saving: true, error: null });
    try {
      await invoke("delete_asset", { id });
      await get().loadAssets();
      set({ selectedAssetId: null, saving: false });
    } catch (error) {
      set({ error: toMessage(error), saving: false });
      throw error;
    }
  },

  addModel: async (name, displayName) => {
    set({ error: null });
    try {
      const model = await invoke<BackendModel>("create_model", {
        input: { name, displayName: displayName || null },
      });
      set((state) => ({ models: [...state.models, toModel(model)] }));
    } catch (error) {
      set({ error: toMessage(error) });
      throw error;
    }
  },

  updateModel: async (id, name, displayName) => {
    set({ error: null });
    try {
      const model = await invoke<BackendModel>("update_model", {
        id,
        input: { name, displayName: displayName || null },
      });
      set((state) => ({
        models: state.models.map((current) =>
          current.id === id ? toModel(model) : current,
        ),
        editingModel: null,
      }));
      await get().loadAssets();
    } catch (error) {
      set({ error: toMessage(error) });
      throw error;
    }
  },

  deleteModel: async (id) => {
    set({ error: null });
    try {
      await invoke("delete_model", { id });
      set((state) => ({
        models: state.models.filter((model) => model.id !== id),
        filters: {
          ...state.filters,
          modelIds: state.filters.modelIds.filter((modelId) => modelId !== id),
        },
      }));
      await get().loadAssets();
    } catch (error) {
      set({ error: toMessage(error) });
      throw error;
    }
  },

  addTag: async (name, color) => {
    set({ error: null });
    try {
      const tag = await invoke<BackendTag>("create_tag", { input: { name, color } });
      set((state) => ({ tags: [...state.tags, toTag(tag)] }));
    } catch (error) {
      set({ error: toMessage(error) });
      throw error;
    }
  },

  updateTag: async (id, name, color) => {
    set({ error: null });
    try {
      const tag = await invoke<BackendTag>("update_tag", { id, input: { name, color } });
      set((state) => ({
        tags: state.tags.map((current) =>
          current.id === id ? toTag(tag) : current,
        ),
        editingTag: null,
      }));
      await get().loadAssets();
    } catch (error) {
      set({ error: toMessage(error) });
      throw error;
    }
  },

  deleteTag: async (id) => {
    set({ error: null });
    try {
      await invoke("delete_tag", { id });
      set((state) => ({
        tags: state.tags.filter((tag) => tag.id !== id),
        filters: {
          ...state.filters,
          tagIds: state.filters.tagIds.filter((tagId) => tagId !== id),
        },
      }));
      await get().loadAssets();
    } catch (error) {
      set({ error: toMessage(error) });
      throw error;
    }
  },

  reorderModels: async (modelIds) => {
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
      await invoke("reorder_models", { input: { modelIds } });
    } catch (error) {
      set({
        models: previousModels,
        assets: previousAssets,
        error: toMessage(error),
      });
      throw error;
    }
  },

  reorderTags: async (tagIds) => {
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
      await invoke("reorder_tags", { input: { tagIds } });
    } catch (error) {
      set({
        tags: previousTags,
        assets: previousAssets,
        error: toMessage(error),
      });
      throw error;
    }
  },

  exportSave: async (path) => {
    set({ saving: true, error: null, notice: null });
    try {
      const summary = await invoke<BackendSaveSummary>("export_save", { path });
      const vccBackupText = summary.vccBackupPath
        ? `，VCC 備份 ${summary.vccBackupFiles} 個檔案`
        : "";
      set({
        saving: false,
        notice: `已匯出存檔：${summary.assets} 個素材、${summary.models} 個模型、${summary.tags} 個標籤、${summary.vccProjects} 個 VCC 專案${vccBackupText}`,
      });
    } catch (error) {
      set({ error: toMessage(error), saving: false });
      throw error;
    }
  },

  importSave: async (path) => {
    set({ saving: true, error: null, notice: null });
    try {
      const summary = await invoke<BackendSaveSummary>("import_save", { path });
      set({
        filters: { ...defaultFilters },
        selectedAssetId: null,
      });
      await get().loadAll();
      set({
        saving: false,
        notice: `已匯入存檔：${summary.assets} 個素材、${summary.models} 個模型、${summary.tags} 個標籤、${summary.vccProjects} 個 VCC 專案`,
      });
    } catch (error) {
      set({ error: toMessage(error), saving: false });
      throw error;
    }
  },

  setAddAssetDialogOpen: (open) => set({ isAddAssetDialogOpen: open }),
  setAddModelDialogOpen: (open) => set({ isAddModelDialogOpen: open }),
  setAddTagDialogOpen: (open) => set({ isAddTagDialogOpen: open }),
  setEditingModel: (model) => set({ editingModel: model }),
  setEditingTag: (tag) => set({ editingTag: tag }),
  requestAssetEdit: (assetId) =>
    set({ selectedAssetId: assetId, editingAssetRequestId: assetId }),
  clearAssetEditRequest: () => set({ editingAssetRequestId: null }),
  openRelatedAssetSearch: (assetId) => set({ relatedAssetSearchId: assetId }),
  closeRelatedAssetSearch: () => set({ relatedAssetSearchId: null }),

  getFilteredAssets: () => get().assets,

  getSelectedAsset: () => {
    const { assets, selectedAssetId } = get();
    return assets.find((asset) => asset.id === selectedAssetId) ?? null;
  },
}));
