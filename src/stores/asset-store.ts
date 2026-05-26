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
  createdAt: string;
};

type BackendTag = Tag;

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
  fileExists: boolean;
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
  loading: boolean;
  saving: boolean;
  error: string | null;
  loadAll: () => Promise<void>;
  loadAssets: () => Promise<void>;
  clearError: () => void;
  setSearchFilter: (search: string) => void;
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
  addTag: (name: string, color: string) => Promise<void>;
  updateTag: (id: number, name: string, color: string) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;
  setAddAssetDialogOpen: (open: boolean) => void;
  setAddModelDialogOpen: (open: boolean) => void;
  setAddTagDialogOpen: (open: boolean) => void;
  setEditingModel: (model: Model | null) => void;
  setEditingTag: (tag: Tag | null) => void;
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
  created_at: model.createdAt,
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
  tags: asset.tags,
  file_exists: asset.fileExists,
});

const cleanFilters = (filters: AssetFilters) => ({
  search: filters.search.trim() || undefined,
  modelIds: filters.modelIds,
  tagIds: filters.tagIds,
});

const toggleId = (values: number[], id: number) =>
  values.includes(id) ? values.filter((value) => value !== id) : [...values, id];

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
  loading: false,
  saving: false,
  error: null,

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
        tags,
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

  clearError: () => set({ error: null }),

  setSearchFilter: (search) => {
    set((state) => ({ filters: { ...state.filters, search } }));
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
      const tag = await invoke<Tag>("create_tag", { input: { name, color } });
      set((state) => ({ tags: [...state.tags, tag] }));
    } catch (error) {
      set({ error: toMessage(error) });
      throw error;
    }
  },

  updateTag: async (id, name, color) => {
    set({ error: null });
    try {
      const tag = await invoke<Tag>("update_tag", { id, input: { name, color } });
      set((state) => ({
        tags: state.tags.map((current) => (current.id === id ? tag : current)),
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

  setAddAssetDialogOpen: (open) => set({ isAddAssetDialogOpen: open }),
  setAddModelDialogOpen: (open) => set({ isAddModelDialogOpen: open }),
  setAddTagDialogOpen: (open) => set({ isAddTagDialogOpen: open }),
  setEditingModel: (model) => set({ editingModel: model }),
  setEditingTag: (tag) => set({ editingTag: tag }),

  getFilteredAssets: () => get().assets,

  getSelectedAsset: () => {
    const { assets, selectedAssetId } = get();
    return assets.find((asset) => asset.id === selectedAssetId) ?? null;
  },
}));
