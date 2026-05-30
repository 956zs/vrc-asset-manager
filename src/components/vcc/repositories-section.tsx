import { Database, Globe2, Plus, RefreshCw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function RepositoriesSection({
  repositories,
  repositoryName,
  repositoryUrl,
  collapsed,
  loading,
  onToggleCollapsed,
  onRepositoryNameChange,
  onRepositoryUrlChange,
  onAddRepository,
  onSyncRepositories,
  onDeleteRepository,
}: RepositoriesSectionProps) {
  return (
    <section className="rounded-md border border-border bg-card">
      <div
        className={cn(
          "flex items-center justify-between gap-3 p-3",
          !collapsed && "border-b border-border",
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-card-foreground">套件來源</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            掃描 repo 中尚未安裝到專案的可用 package
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CollapseIconButton
            collapsed={collapsed}
            collapsedLabel="展開套件來源"
            expandedLabel="收合套件來源"
            onClick={onToggleCollapsed}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={onSyncRepositories}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            同步 VCC
          </Button>
          <Badge variant="secondary">{repositories.length}</Badge>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-3 p-3">
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
            <Button
              type="button"
              disabled={!repositoryUrl.trim() || loading}
              onClick={onAddRepository}
            >
              <Plus className="h-4 w-4" />
              加入
            </Button>
          </div>
          <div className="space-y-2">
            {repositories.map((repository) => (
              <div
                key={repository.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md bg-muted/50 px-2 py-2"
              >
                <Globe2 className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-card-foreground">
                    {repository.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {repository.url}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="!size-8"
                  title="移除套件來源"
                  aria-label="移除套件來源"
                  disabled={loading || isProtectedRepository(repository)}
                  onClick={() => onDeleteRepository(repository)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
