import type { VccPackage, VccProjectSnapshot, VccRepository } from "@/types";

export type BackendVccProject = {
  id: number;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
};

export type BackendVccPackage = {
  packageId: string;
  displayName: string | null;
  requestedVersion: string | null;
  installedVersion: string | null;
  latestVersion: string | null;
  source: string | null;
  installed: boolean;
  available: boolean;
};

export type BackendVccRepository = {
  id: number;
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
};

export type BackendVccProjectSnapshot = {
  project: BackendVccProject;
  packages: BackendVccPackage[];
  vpmManifest: unknown | null;
  unityManifest: unknown | null;
  scannedAt: string;
  scanError: string | null;
};

export type PackageFilter = "all" | "installed" | "available" | "missing";

export const packageFilters: Array<{ value: PackageFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "installed", label: "已安裝" },
  { value: "available", label: "未安裝" },
  { value: "missing", label: "缺失" },
];

export const toSnapshot = (
  snapshot: BackendVccProjectSnapshot,
): VccProjectSnapshot => ({
  project: {
    id: snapshot.project.id,
    name: snapshot.project.name,
    path: snapshot.project.path,
    created_at: snapshot.project.createdAt,
    updated_at: snapshot.project.updatedAt,
  },
  packages: snapshot.packages.map((packageInfo) => ({
    package_id: packageInfo.packageId,
    display_name: packageInfo.displayName,
    requested_version: packageInfo.requestedVersion,
    installed_version: packageInfo.installedVersion,
    latest_version: packageInfo.latestVersion,
    source: packageInfo.source,
    installed: packageInfo.installed,
    available: packageInfo.available,
  })),
  vpm_manifest: snapshot.vpmManifest,
  unity_manifest: snapshot.unityManifest,
  scanned_at: snapshot.scannedAt,
  scan_error: snapshot.scanError,
});

export const toRepository = (repository: BackendVccRepository): VccRepository => ({
  id: repository.id,
  name: repository.name,
  url: repository.url,
  created_at: repository.createdAt,
  updated_at: repository.updatedAt,
});

export const getPackageCounts = (packages: VccPackage[]) => {
  const installedCount = packages.filter((packageInfo) => packageInfo.installed).length;
  const availableCount = packages.filter((packageInfo) => packageInfo.available).length;
  const missingCount = packages.filter(
    (packageInfo) => packageInfo.requested_version && !packageInfo.installed,
  ).length;

  return { installedCount, availableCount, missingCount };
};

export const filterPackages = (
  packages: VccPackage[],
  packageFilter: PackageFilter,
) => {
  if (packageFilter === "installed") {
    return packages.filter((packageInfo) => packageInfo.installed);
  }
  if (packageFilter === "available") {
    return packages.filter(
      (packageInfo) => !packageInfo.installed && packageInfo.available,
    );
  }
  if (packageFilter === "missing") {
    return packages.filter(
      (packageInfo) => Boolean(packageInfo.requested_version) && !packageInfo.installed,
    );
  }
  return packages;
};

export const isProtectedRepository = (repository: VccRepository) =>
  repository.url.includes("vrchat.github.io/packages") ||
  repository.url.includes("packages.vrchat.com");
