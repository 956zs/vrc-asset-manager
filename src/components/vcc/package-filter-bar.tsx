import { Filter } from "lucide-react";

import { SegmentedControl } from "@/components/ui/segmented-field";
import type { PackageFilter } from "./types";
import { packageFilters } from "./types";

type PackageFilterBarProps = {
  packageFilter: PackageFilter;
  installedCount: number;
  availableCount: number;
  missingCount: number;
  onPackageFilterChange: (filter: PackageFilter) => void;
};

export function PackageFilterBar({
  packageFilter,
  installedCount,
  availableCount,
  missingCount,
  onPackageFilterChange,
}: PackageFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <Filter className="h-3.5 w-3.5 shrink-0" />
        <span>
          已安裝 {installedCount}，未安裝{" "}
          {Math.max(availableCount - installedCount, 0)}，缺失 {missingCount}
        </span>
      </div>
      <SegmentedControl
        className="flex shrink-0 border-0 bg-muted"
        options={packageFilters}
        value={packageFilter}
        variant="solid"
        onChange={onPackageFilterChange}
      />
    </div>
  );
}
