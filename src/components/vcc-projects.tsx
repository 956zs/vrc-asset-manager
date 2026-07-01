import { ScrollArea } from "@/components/ui/scroll-area";
import { DeleteConfirmDialog } from "@/components/vcc/delete-confirm-dialog";
import { VccEmptyState } from "@/components/vcc/empty-state";
import { ProjectCard } from "@/components/vcc/project-card";
import { RepositoriesSection } from "@/components/vcc/repositories-section";
import { VccToolbar } from "@/components/vcc/toolbar";
import { useVccProjects } from "@/components/vcc/use-vcc-projects";

type VccController = ReturnType<typeof useVccProjects>;

function VccEmptyView({ vcc }: { vcc: VccController }) {
  return (
    <VccEmptyState
      error={vcc.error}
      onAddProject={() => {
        void vcc.addProject();
      }}
    />
  );
}

function VccHeader({ vcc }: { vcc: VccController }) {
  return (
    <VccToolbar
      projectCount={vcc.snapshots.length}
      error={vcc.error}
      loading={vcc.loading}
      onRefresh={() => {
        void vcc.loadProjects();
      }}
      onAddProject={() => {
        void vcc.addProject();
      }}
    />
  );
}

function VccRepositories({ vcc }: { vcc: VccController }) {
  return (
    <RepositoriesSection
      repositories={vcc.repositories}
      repositoryName={vcc.repositoryName}
      repositoryUrl={vcc.repositoryUrl}
      collapsed={vcc.repositoriesCollapsed}
      loading={vcc.loading}
      onToggleCollapsed={() => vcc.setRepositoriesCollapsed((current) => !current)}
      onRepositoryNameChange={vcc.setRepositoryName}
      onRepositoryUrlChange={vcc.setRepositoryUrl}
      onAddRepository={() => {
        void vcc.addRepository();
      }}
      onSyncRepositories={() => {
        void vcc.syncRepositories();
      }}
      onDeleteRepository={vcc.setDeleteRepositoryTarget}
    />
  );
}

function VccProjectCards({ vcc }: { vcc: VccController }) {
  return (
    <>
      {vcc.snapshots.map((snapshot) => (
        <ProjectCard
          key={snapshot.project.id}
          snapshot={snapshot}
          collapsed={vcc.collapsedProjectIds.has(snapshot.project.id)}
          packageFilter={vcc.packageFilter}
          busy={vcc.busyProjectId === snapshot.project.id}
          onToggleCollapsed={vcc.toggleProjectCollapsed}
          onPackageFilterChange={vcc.setPackageFilter}
          onOpenProject={(path) => {
            void vcc.openProject(path);
          }}
          onScanProject={(projectId) => {
            void vcc.scanProject(projectId);
          }}
          onDeleteProject={vcc.setDeleteTarget}
        />
      ))}
    </>
  );
}

function VccContent({ vcc }: { vcc: VccController }) {
  return (
    <>
      <VccHeader vcc={vcc} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-4">
          <VccRepositories vcc={vcc} />
          <VccProjectCards vcc={vcc} />
        </div>
      </ScrollArea>
      <VccDeleteDialogs vcc={vcc} />
    </>
  );
}

function VccDeleteDialogs({ vcc }: { vcc: VccController }) {
  return (
    <>
      <DeleteConfirmDialog
        open={vcc.deleteTarget !== null}
        title="確定要移除這個 VCC 專案嗎？"
        description={`這只會從本工具的追蹤清單移除「${
          vcc.deleteTarget?.project.name ?? ""
        }」，不會刪除 Unity 專案資料夾。`}
        onOpenChange={(open) => {
          if (!open) vcc.setDeleteTarget(null);
        }}
        onConfirm={vcc.deleteProject}
      />
      <DeleteConfirmDialog
        open={vcc.deleteRepositoryTarget !== null}
        title="確定要移除這個套件來源嗎？"
        description={`這只會從本工具移除「${
          vcc.deleteRepositoryTarget?.name ?? ""
        }」來源，不會修改任何 Unity 專案或已安裝套件。`}
        onOpenChange={(open) => {
          if (!open) vcc.setDeleteRepositoryTarget(null);
        }}
        onConfirm={vcc.deleteRepository}
      />
    </>
  );
}

export function VccProjects() {
  const vcc = useVccProjects();

  if (vcc.snapshots.length === 0 && !vcc.loading) {
    return <VccEmptyView vcc={vcc} />;
  }

  return <VccContent vcc={vcc} />;
}
