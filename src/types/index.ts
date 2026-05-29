export interface Model {
  id: number;
  name: string;
  display_name: string | null;
  sort_order: number;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  sort_order: number;
}

export interface AssetLink {
  id: number;
  label: string;
  url: string;
  sort_order: number;
}

export interface Asset {
  id: number;
  name: string;
  display_name: string | null;
  file_path: string;
  booth_url: string | null;
  thumbnail_url: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  models: Model[];
  tags: Tag[];
  related_links: AssetLink[];
  file_exists: boolean;
}

export interface AssetFilters {
  search: string;
  modelIds: number[];
  tagIds: number[];
}

export interface CreateAssetInput {
  display_name: string | null;
  file_path: string;
  booth_url: string | null;
  thumbnail_url: string | null;
  note: string | null;
  model_ids: number[];
  tag_ids: number[];
  related_links: AssetLinkInput[];
}

export interface UpdateAssetInput {
  display_name?: string | null;
  file_path?: string;
  booth_url?: string | null;
  thumbnail_url?: string | null;
  note?: string | null;
  model_ids?: number[];
  tag_ids?: number[];
  related_links?: AssetLinkInput[];
}

export interface AssetLinkInput {
  label: string;
  url: string;
}

export interface CreateModelInput {
  name: string;
  display_name: string | null;
}

export interface CreateTagInput {
  name: string;
  color: string;
}
