import { AlertTriangle, FolderOpen, RefreshCw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VccProjectSnapshot } from "@/types";
import { CollapseIconButton } from "./collapse-icon-button";
import { PackageTable } from "./package-table";
import type { PackageFilter } from "./types";
import { getPackageCounts } from "./types";

type ProjectCardProps = {
  snapshot: VccProjectSnapshot;
  collapsed: boolean;
  packageFilter: PackageFilter;
  busy: boolean;
  onToggleCollapsed: (projectId: number) => void;
  onPackageFilterChange: (filter: PackageFilter) => void;
  onOpenProject: (path: string) => void;
  onScanProject: (projectId: number) => void;
  onDeleteProject: (snapshot: VccProjectSnapshot) => void;
};

export function ProjectCard({
  snapshot,
  collapsed,
  packageFilter,
  busy,
  onToggleCollapsed,
  onPackageFilterChange,
  onOpenProject,
  onScanProject,
  onDeleteProject,
}: ProjectCardProps) {
  const { installedCount, availableCount } = getPackageCounts(snapshot.packages);

  return (
    <section className="rounded-md border border-border bg-card">
      <div
        className={cn(
          "flex items-start justify-between gap-3 p-3",
          !collapsed && "border-b border-border",
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-card-foreground">
              {snapshot.project.name}
            </h3>
            {snapshot.scan_error ? (
              <Badge variant="outline" className="text-destructive">
                掃描失敗
              </Badge>
            ) : (
              <Badge variant="secondary">
                {installedCount}/{availableCount}
              </Badge>
            )}
          </div>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
            {snapshot.project.path}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <CollapseIconButton
            collapsed={collapsed}
            collapsedLabel="展開 package 清單"
            expandedLabel="收合 package 清單"
            onClick={() => onToggleCollapsed(snapshot.project.id)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="開啟專案資料夾"
            aria-label="開啟專案資料夾"
            onClick={() => onOpenProject(snapshot.project.path)}
          >
            <FolderOpen className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="重新掃描專案"
            aria-label="重新掃描專案"
            disabled={busy}
            onClick={() => onScanProject(snapshot.project.id)}
          >
            <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="移除專案"
            aria-label="移除專案"
            disabled={busy}
            onClick={() => onDeleteProject(snapshot)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {!collapsed && snapshot.scan_error ? (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">{snapshot.scan_error}</span>
        </div>
      ) : !collapsed && snapshot.packages.length > 0 ? (
        <PackageTable
          packages={snapshot.packages}
          packageFilter={packageFilter}
          onPackageFilterChange={onPackageFilterChange}
        />
      ) : !collapsed ? (
        <p className="p-3 text-sm text-muted-foreground">沒有找到 VPM 套件</p>
      ) : null}
    </section>
  );
}
