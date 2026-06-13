import { AlertTriangle, FolderOpen, RefreshCw, Trash2 } from "lucide-react";

import { IconButton } from "@/components/ui/icon-button";
import { MetaBadge } from "@/components/ui/meta-badge";
import { MonoText } from "@/components/ui/mono-text";
import { Panel } from "@/components/ui/panel";
import { Spinner } from "@/components/ui/spinner";
import { ToneBadge } from "@/components/ui/tone-badge";
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
    return <ToneBadge tone="danger">掃描失敗</ToneBadge>;
  }

  return <MetaBadge variant="secondary">{installedCount}/{availableCount}</MetaBadge>;
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
      <MonoText
        className="mt-1"
        data-context-path={snapshot.project.path}
        wrap="break"
      >
        {snapshot.project.path}
      </MonoText>
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
      <IconButton
        label="開啟專案資料夾"
        icon={<FolderOpen className="h-4 w-4" />}
        data-context-path={snapshot.project.path}
        disabled={false}
        onClick={() => onOpenProject(snapshot.project.path)}
      />
      <IconButton
        label="重新掃描專案"
        icon={busy ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
        disabled={busy}
        onClick={() => onScanProject(snapshot.project.id)}
      />
      <IconButton
        label="移除專案"
        icon={<Trash2 className="h-4 w-4 text-destructive" />}
        disabled={busy}
        onClick={() => onDeleteProject(snapshot)}
      />
    </div>
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
    <Panel as="section" className="rounded-md shadow-none">
      <ProjectHeader {...props} />
      {!props.collapsed && (
        <ProjectBody
          snapshot={props.snapshot}
          packageFilter={props.packageFilter}
          onPackageFilterChange={props.onPackageFilterChange}
        />
      )}
    </Panel>
  );
}
