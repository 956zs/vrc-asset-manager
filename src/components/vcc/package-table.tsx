import type { VccPackage } from "@/types";
import { PackageFilterBar } from "./package-filter-bar";
import { PackageRow } from "./package-row";
import type { PackageFilter } from "./types";
import { filterPackages, getPackageCounts } from "./types";

type PackageTableProps = {
  packages: VccPackage[];
  packageFilter: PackageFilter;
  onPackageFilterChange: (filter: PackageFilter) => void;
};

export function PackageTable({
  packages,
  packageFilter,
  onPackageFilterChange,
}: PackageTableProps) {
  const { installedCount, availableCount, missingCount } = getPackageCounts(packages);
  const filteredPackages = filterPackages(packages, packageFilter);

  return (
    <div className="divide-y divide-border">
      <PackageFilterBar
        packageFilter={packageFilter}
        installedCount={installedCount}
        availableCount={availableCount}
        missingCount={missingCount}
        onPackageFilterChange={onPackageFilterChange}
      />
      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)_minmax(0,0.55fr)_minmax(0,0.55fr)_minmax(0,0.55fr)_auto] items-center gap-3 px-3 py-2 text-xs font-medium text-muted-foreground">
        <span>Package</span>
        <span>來源</span>
        <span>需求</span>
        <span>最新</span>
        <span>已安裝</span>
        <span />
      </div>
      {filteredPackages.map((packageInfo) => (
        <PackageRow key={packageInfo.package_id} packageInfo={packageInfo} />
      ))}
      {filteredPackages.length === 0 && (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          這個篩選沒有 package
        </p>
      )}
    </div>
  );
}
