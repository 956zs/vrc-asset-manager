import { AlertTriangle, CheckCircle2, PackageSearch } from "lucide-react";

import type { VccPackage } from "@/types";

type PackageRowProps = {
  packageInfo: VccPackage;
};

export function PackageRow({ packageInfo }: PackageRowProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)_minmax(0,0.55fr)_minmax(0,0.55fr)_minmax(0,0.55fr)_auto] items-center gap-3 px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium text-card-foreground">
          {packageInfo.display_name || packageInfo.package_id}
        </p>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {packageInfo.package_id}
        </p>
      </div>
      <p className="truncate text-xs text-muted-foreground">
        {packageInfo.source || "-"}
      </p>
      <p className="truncate font-mono text-xs text-muted-foreground">
        {packageInfo.requested_version || "-"}
      </p>
      <p className="truncate font-mono text-xs text-muted-foreground">
        {packageInfo.latest_version || "-"}
      </p>
      <p className="truncate font-mono text-xs text-foreground">
        {packageInfo.installed_version || "-"}
      </p>
      {packageInfo.installed ? (
        <CheckCircle2 className="h-4 w-4 text-primary" />
      ) : packageInfo.requested_version ? (
        <AlertTriangle className="h-4 w-4 text-destructive" />
      ) : (
        <PackageSearch className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}
