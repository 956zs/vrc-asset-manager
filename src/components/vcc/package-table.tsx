import type { VccPackage } from "@/types";
import { PackageFilterBar } from "./package-filter-bar";
import { PackageRow } from "./package-row";
import { PackageTableHeaderRow } from "./package-table-layout";
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
      <PackageTableHeaderRow />
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
