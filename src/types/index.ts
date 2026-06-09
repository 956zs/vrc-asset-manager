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

export interface AssetHealthIssue {
  assetId: number;
  name: string;
  displayName: string | null;
  filePath: string;
  status: string;
  message: string;
}

export interface AssetHealthSummary {
  total: number;
  ok: number;
  missing: number;
  unreadable: number;
  emptyFiles: number;
  emptyDirectories: number;
  unsupported: number;
  issues: AssetHealthIssue[];
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

interface VccProject {
  id: number;
  name: string;
  path: string;
  created_at: string;
  updated_at: string;
}

export interface VccPackage {
  package_id: string;
  display_name: string | null;
  requested_version: string | null;
  installed_version: string | null;
  latest_version: string | null;
  source: string | null;
  installed: boolean;
  available: boolean;
}

export interface VccProjectSnapshot {
  project: VccProject;
  packages: VccPackage[];
  vpm_manifest: unknown | null;
  unity_manifest: unknown | null;
  scanned_at: string;
  scan_error: string | null;
}

export interface VccRepository {
  id: number;
  name: string;
  url: string;
  created_at: string;
  updated_at: string;
}
