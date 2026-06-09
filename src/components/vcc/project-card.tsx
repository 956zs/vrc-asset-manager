import { AlertTriangle, FolderOpen, RefreshCw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

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

function ProjectStatusBadge({ snapshot }: { snapshot: VccProjectSnapshot }) {
  const { installedCount, availableCount } = getPackageCounts(snapshot.packages);

  if (snapshot.scan_error) {
    return (
      <Badge variant="outline" className="text-destructive">
        掃描失敗
      </Badge>
    );
  }

  return <Badge variant="secondary">{installedCount}/{availableCount}</Badge>;
}

function ProjectTitleBlock({ snapshot }: { snapshot: VccProjectSnapshot }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <h3 className="truncate text-sm font-semibold text-card-foreground">
          {snapshot.project.name}
        </h3>
        <ProjectStatusBadge snapshot={snapshot} />
      </div>
      <p
        className="mt-1 break-all font-mono text-xs text-muted-foreground"
        data-context-path={snapshot.project.path}
      >
        {snapshot.project.path}
      </p>
    </div>
  );
}

function ProjectActions({
  snapshot,
  collapsed,
  busy,
  onToggleCollapsed,
  onOpenProject,
  onScanProject,
  onDeleteProject,
}: Omit<ProjectCardProps, "packageFilter" | "onPackageFilterChange">) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <CollapseIconButton
        collapsed={collapsed}
        collapsedLabel="展開 package 清單"
        expandedLabel="收合 package 清單"
        onClick={() => onToggleCollapsed(snapshot.project.id)}
      />
      <ProjectIconButton
        title="開啟專案資料夾"
        contextPath={snapshot.project.path}
        disabled={false}
        onClick={() => onOpenProject(snapshot.project.path)}
      >
        <FolderOpen className="h-4 w-4" />
      </ProjectIconButton>
      <ProjectIconButton
        title="重新掃描專案"
        disabled={busy}
        onClick={() => onScanProject(snapshot.project.id)}
      >
        <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} />
      </ProjectIconButton>
      <ProjectIconButton
        title="移除專案"
        disabled={busy}
        onClick={() => onDeleteProject(snapshot)}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </ProjectIconButton>
    </div>
  );
}

function ProjectIconButton({
  title,
  contextPath,
  disabled,
  children,
  onClick,
}: {
  title: string;
  contextPath?: string;
  disabled: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={title}
      aria-label={title}
      data-context-path={contextPath}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function ProjectHeader(props: ProjectCardProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 p-3",
        !props.collapsed && "border-b border-border",
      )}
    >
      <ProjectTitleBlock snapshot={props.snapshot} />
      <ProjectActions {...props} />
    </div>
  );
}

function ProjectScanError({ scanError }: { scanError: string }) {
  return (
    <div className="flex items-center gap-2 p-3 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">{scanError}</span>
    </div>
  );
}

function ProjectBody({
  snapshot,
  packageFilter,
  onPackageFilterChange,
}: Pick<ProjectCardProps, "snapshot" | "packageFilter" | "onPackageFilterChange">) {
  if (snapshot.scan_error) {
    return <ProjectScanError scanError={snapshot.scan_error} />;
  }

  if (snapshot.packages.length === 0) {
    return <p className="p-3 text-sm text-muted-foreground">沒有找到 VPM 套件</p>;
  }

  return (
    <PackageTable
      packages={snapshot.packages}
      packageFilter={packageFilter}
      onPackageFilterChange={onPackageFilterChange}
    />
  );
}

export function ProjectCard(props: ProjectCardProps) {
  return (
    <section className="rounded-md border border-border bg-card">
      <ProjectHeader {...props} />
      {!props.collapsed && (
        <ProjectBody
          snapshot={props.snapshot}
          packageFilter={props.packageFilter}
          onPackageFilterChange={props.onPackageFilterChange}
        />
      )}
    </section>
  );
}
