import { AlertTriangle, CheckCircle2, PackageSearch } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { VccPackage } from "@/types";

const packageTableGridClass =
  "grid grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)_minmax(0,0.55fr)_minmax(0,0.55fr)_minmax(0,0.55fr)_auto] items-center gap-3 px-3 py-2";

function PackageTableHeaderRow() {
  return (
    <div
      className={cn(
        packageTableGridClass,
        "text-xs font-medium text-muted-foreground",
      )}
    >
      <span>Package</span>
      <span>來源</span>
      <span>需求</span>
      <span>最新</span>
      <span>已安裝</span>
      <span />
    </div>
  );
}

function PackageTableDataRow({ children }: { children: ReactNode }) {
  return <div className={cn(packageTableGridClass, "text-sm")}>{children}</div>;
}

function PackageStatusIcon({ packageInfo }: { packageInfo: VccPackage }) {
  if (packageInfo.installed) {
    return <CheckCircle2 className="h-4 w-4 text-primary" />;
  }

  if (packageInfo.requested_version) {
    return <AlertTriangle className="h-4 w-4 text-destructive" />;
  }

  return <PackageSearch className="h-4 w-4 text-muted-foreground" />;
}

export { PackageStatusIcon, PackageTableDataRow, PackageTableHeaderRow };
