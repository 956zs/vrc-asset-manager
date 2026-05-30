import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
      <div className="flex shrink-0 items-center gap-1 rounded-md bg-muted p-1">
        {packageFilters.map((filter) => {
          const selected = packageFilter === filter.value;

          return (
            <Button
              key={filter.value}
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={selected}
              className={cn(
                "h-7 px-2 text-xs",
                selected &&
                  "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground",
              )}
              onClick={() => onPackageFilterChange(filter.value)}
            >
              {filter.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
