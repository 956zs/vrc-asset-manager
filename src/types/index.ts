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

export type AssetCategory = "avatar" | "accessory" | "world";
export type ImportOperation = "move" | "copy";
export type ArchiveStrategy = "keepArchive" | "extract";
export type ConflictStrategy = "cancel" | "rename" | "overwrite";
export type ImportSourceKind = "folder" | "zip" | "unityPackage" | "unsupported";
export type AssetStatusFilter =
  | "missingFile"
  | "missingBoothUrl"
  | "missingThumbnail"
  | "missingRelatedLinks"
  | "missingModels"
  | "missingTags"
  | "missingNote";
export type AssetSortOrder =
  | "updatedDesc"
  | "createdDesc"
  | "nameAsc"
  | "nameDesc";

export interface LibrarySettings {
  rootPath: string | null;
  avatarFolder: string;
  accessoryFolder: string;
  worldFolder: string;
  updatedAt: string;
}

export interface UpdateLibrarySettingsInput {
  rootPath: string | null;
  avatarFolder: string;
  accessoryFolder: string;
  worldFolder: string;
}

export interface ImportSourceInfo {
  sourcePath: string;
  name: string;
  kind: ImportSourceKind;
  supported: boolean;
  message: string | null;
}

export interface ImportTargetPreview {
  sourcePath: string;
  targetPath: string | null;
  conflict: boolean;
  message: string | null;
}

export interface ZipContentList {
  sourcePath: string;
  fileCount: number;
  paths: string[];
  entries: SourceContentEntry[];
}

export interface SourceContentEntry {
  path: string;
  isDirectory: boolean;
  sizeBytes: number | null;
}

export interface SourceContentList {
  sourcePath: string;
  kind: ImportSourceKind;
  fileCount: number;
  paths: string[];
  entries: SourceContentEntry[];
  truncated: boolean;
}

export interface ManagedImportItemInput {
  sourcePath: string;
  category: AssetCategory;
  operation: ImportOperation;
  archiveStrategy?: ArchiveStrategy | null;
  conflictStrategy?: ConflictStrategy | null;
  displayName: string | null;
  boothUrl: string | null;
  boothShopName: string | null;
  boothShopUrl: string | null;
  thumbnailUrl: string | null;
  note: string | null;
  modelIds: number[];
  tagIds: number[];
  relatedLinks: AssetLinkInput[];
}

export interface ManagedImportItemResult {
  sourcePath: string;
  success: boolean;
  asset: Asset | null;
  finalPath: string | null;
  operation: string;
  message: string;
}

export interface ManagedImportBatchReport {
  total: number;
  succeeded: number;
  failed: number;
  results: ManagedImportItemResult[];
}

export interface Asset {
  id: number;
  name: string;
  display_name: string | null;
  category: AssetCategory;
  file_path: string;
  booth_url: string | null;
  booth_shop_name: string | null;
  booth_shop_url: string | null;
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
  category: AssetCategory | null;
  modelIds: number[];
  tagIds: number[];
  shopFilters: BoothShopFilter[];
  statusFilters: AssetStatusFilter[];
  sortOrder: AssetSortOrder;
}

export interface BoothShopFilter {
  name: string;
  url: string | null;
}

export interface BoothShopOption extends BoothShopFilter {
  key: string;
  assetCount: number;
}

export interface BoothShopBackfillReport {
  totalCandidates: number;
  updated: number;
  skipped: number;
  failed: number;
}

export interface BoothShopBackfillProgress {
  total: number;
  current: number;
  updated: number;
  skipped: number;
  failed: number;
}

export interface CreateAssetInput {
  display_name: string | null;
  category: AssetCategory;
  file_path: string;
  booth_url: string | null;
  booth_shop_name: string | null;
  booth_shop_url: string | null;
  thumbnail_url: string | null;
  note: string | null;
  model_ids: number[];
  tag_ids: number[];
  related_links: AssetLinkInput[];
}

export interface UpdateAssetInput {
  display_name?: string | null;
  category?: AssetCategory;
  file_path?: string;
  booth_url?: string | null;
  booth_shop_name?: string | null;
  booth_shop_url?: string | null;
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

export interface BoothProductInfo {
  title: string | null;
  thumbnailUrl: string | null;
  shopName: string | null;
  shopUrl: string | null;
  tags: string[];
  searchText: string;
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
