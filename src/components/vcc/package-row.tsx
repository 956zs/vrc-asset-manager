import { MonoText } from "@/components/ui/mono-text";
import type { VccPackage } from "@/types";
import { PackageStatusIcon, PackageTableDataRow } from "./package-table-layout";

type PackageRowProps = {
  packageInfo: VccPackage;
};

export function PackageRow({ packageInfo }: PackageRowProps) {
  return (
    <PackageTableDataRow>
      <div className="min-w-0">
        <p className="truncate font-medium text-card-foreground">
          {packageInfo.display_name || packageInfo.package_id}
        </p>
        <MonoText>{packageInfo.package_id}</MonoText>
      </div>
      <p className="truncate text-xs text-muted-foreground">
        {packageInfo.source || "-"}
      </p>
      <MonoText>{packageInfo.requested_version || "-"}</MonoText>
      <MonoText>{packageInfo.latest_version || "-"}</MonoText>
      <MonoText tone="default">{packageInfo.installed_version || "-"}</MonoText>
      <PackageStatusIcon packageInfo={packageInfo} />
    </PackageTableDataRow>
  );
}
