import { Database, Globe2, Plus, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { ListRow } from "@/components/ui/list-row";
import { MetaBadge } from "@/components/ui/meta-badge";
import { Panel } from "@/components/ui/panel";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { VccRepository } from "@/types";
import { CollapseIconButton } from "./collapse-icon-button";
import { isProtectedRepository } from "./types";

type RepositoriesSectionProps = {
  repositories: VccRepository[];
  repositoryName: string;
  repositoryUrl: string;
  collapsed: boolean;
  loading: boolean;
  onToggleCollapsed: () => void;
  onRepositoryNameChange: (value: string) => void;
  onRepositoryUrlChange: (value: string) => void;
  onAddRepository: () => void;
  onSyncRepositories: () => void;
  onDeleteRepository: (repository: VccRepository) => void;
};

function RepositoriesHeader({
  collapsed,
  loading,
  repositories,
  onToggleCollapsed,
  onSyncRepositories,
}: Pick<
  RepositoriesSectionProps,
  "collapsed" | "loading" | "repositories" | "onToggleCollapsed" | "onSyncRepositories"
>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 p-3",
        !collapsed && "border-b border-border",
      )}
    >
      <RepositoriesTitle />
      <div className="flex shrink-0 items-center gap-2">
        <CollapseIconButton
          collapsed={collapsed}
          collapsedLabel="展開套件來源"
          expandedLabel="收合套件來源"
          onClick={onToggleCollapsed}
        />
        <SyncRepositoriesButton loading={loading} onSync={onSyncRepositories} />
        <MetaBadge variant="secondary">{repositories.length}</MetaBadge>
      </div>
    </div>
  );
}

function RepositoriesTitle() {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-card-foreground">套件來源</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        掃描 repo 中尚未安裝到專案的可用 package
      </p>
    </div>
  );
}

function SyncRepositoriesButton({
  loading,
  onSync,
}: {
  loading: boolean;
  onSync: () => void;
}) {
  return (
    <Button type="button" variant="outline" size="sm" disabled={loading} onClick={onSync}>
      {loading ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
      同步 VCC
    </Button>
  );
}

function AddRepositoryForm({
  repositoryName,
  repositoryUrl,
  loading,
  onRepositoryNameChange,
  onRepositoryUrlChange,
  onAddRepository,
}: Omit<
  RepositoriesSectionProps,
  "repositories" | "collapsed" | "onToggleCollapsed" | "onSyncRepositories" | "onDeleteRepository"
>) {
  return (
    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_auto] gap-2">
      <Input
        value={repositoryName}
        onChange={(event) => onRepositoryNameChange(event.target.value)}
        placeholder="來源名稱"
      />
      <Input
        value={repositoryUrl}
        onChange={(event) => onRepositoryUrlChange(event.target.value)}
        placeholder="https://.../index.json"
      />
      <Button type="button" disabled={!repositoryUrl.trim() || loading} onClick={onAddRepository}>
        <Plus className="h-4 w-4" />
        加入
      </Button>
    </div>
  );
}

function RepositoryRow({
  repository,
  loading,
  onDeleteRepository,
}: Pick<RepositoriesSectionProps, "loading" | "onDeleteRepository"> & {
  repository: VccRepository;
}) {
  return (
    <ListRow
      className="bg-muted/50 px-2 py-2"
      leading={<Globe2 className="h-4 w-4 text-muted-foreground" />}
      title={repository.name}
      titleClassName="text-card-foreground"
      description={
        <span data-context-url={repository.url}>{repository.url}</span>
      }
      trailing={
        <IconButton
          className="!size-8"
          label="移除套件來源"
          icon={<Trash2 className="h-4 w-4 text-destructive" />}
          disabled={loading || isProtectedRepository(repository)}
          onClick={() => onDeleteRepository(repository)}
        />
      }
    />
  );
}

function RepositoryList({
  repositories,
  loading,
  onDeleteRepository,
}: Pick<RepositoriesSectionProps, "repositories" | "loading" | "onDeleteRepository">) {
  return (
    <div className="space-y-2">
      {repositories.map((repository) => (
        <RepositoryRow
          key={repository.id}
          repository={repository}
          loading={loading}
          onDeleteRepository={onDeleteRepository}
        />
      ))}
    </div>
  );
}

function RepositoriesBody(props: RepositoriesSectionProps) {
  if (props.collapsed) {
    return null;
  }

  return (
    <div className="space-y-3 p-3">
      <AddRepositoryForm {...props} />
      <RepositoryList
        repositories={props.repositories}
        loading={props.loading}
        onDeleteRepository={props.onDeleteRepository}
      />
    </div>
  );
}

export function RepositoriesSection(props: RepositoriesSectionProps) {
  return (
    <Panel as="section" className="rounded-md shadow-none">
      <RepositoriesHeader
        collapsed={props.collapsed}
        loading={props.loading}
        repositories={props.repositories}
        onToggleCollapsed={props.onToggleCollapsed}
        onSyncRepositories={props.onSyncRepositories}
      />
      <RepositoriesBody {...props} />
    </Panel>
  );
}
