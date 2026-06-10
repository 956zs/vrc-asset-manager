import { useEffect, useState } from "react";
import { invokeTauri } from "@/lib/tauri-runtime";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { VccProjectSnapshot, VccRepository } from "@/types";
import type {
  BackendVccProject,
  BackendVccProjectSnapshot,
  BackendVccRepository,
  PackageFilter,
} from "./types";
import { toRepository, toSnapshot } from "./types";

type StateSetter<T> = (value: T | ((current: T) => T)) => void;

type VccProjectState = {
  busyProjectId: number | null;
  collapsedProjectIds: Set<number>;
  deleteRepositoryTarget: VccRepository | null;
  deleteTarget: VccProjectSnapshot | null;
  error: string | null;
  loading: boolean;
  packageFilter: PackageFilter;
  repositories: VccRepository[];
  repositoriesCollapsed: boolean;
  repositoryName: string;
  repositoryUrl: string;
  snapshots: VccProjectSnapshot[];
  setBusyProjectId: (projectId: number | null) => void;
  setCollapsedProjectIds: StateSetter<Set<number>>;
  setDeleteRepositoryTarget: (target: VccRepository | null) => void;
  setDeleteTarget: (target: VccProjectSnapshot | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  setPackageFilter: (filter: PackageFilter) => void;
  setRepositories: (repositories: VccRepository[]) => void;
  setRepositoriesCollapsed: StateSetter<boolean>;
  setRepositoryName: (name: string) => void;
  setRepositoryUrl: (url: string) => void;
  setSnapshots: StateSetter<VccProjectSnapshot[]>;
};

type VccLoadActions = {
  loadProjects: () => Promise<void>;
  loadRepositories: () => Promise<void>;
  syncRepositories: () => Promise<void>;
};

function useVccProjectState(): VccProjectState {
  const [snapshots, setSnapshots] = useState<VccProjectSnapshot[]>([]);
  const [repositories, setRepositories] = useState<VccRepository[]>([]);
  const [repositoryName, setRepositoryName] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyProjectId, setBusyProjectId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VccProjectSnapshot | null>(null);
  const [deleteRepositoryTarget, setDeleteRepositoryTarget] =
    useState<VccRepository | null>(null);
  const [packageFilter, setPackageFilter] = useState<PackageFilter>("all");
  const [repositoriesCollapsed, setRepositoriesCollapsed] = useState(false);
  const [collapsedProjectIds, setCollapsedProjectIds] = useState<Set<number>>(
    () => new Set(),
  );

  return {
    snapshots, repositories, repositoryName, repositoryUrl, loading,
    busyProjectId, error, deleteTarget, deleteRepositoryTarget, packageFilter,
    repositoriesCollapsed, collapsedProjectIds, setSnapshots, setRepositories,
    setRepositoryName, setRepositoryUrl, setLoading, setBusyProjectId, setError,
    setDeleteTarget, setDeleteRepositoryTarget, setPackageFilter,
    setRepositoriesCollapsed, setCollapsedProjectIds,
  };
}

function useVccLoadActions(state: VccProjectState): VccLoadActions {
  const loadProjects = async () => {
    state.setLoading(true);
    state.setError(null);
    try {
      const nextSnapshots = await invokeTauri<BackendVccProjectSnapshot[]>(
        "scan_vcc_projects",
      );
      state.setSnapshots(nextSnapshots.map(toSnapshot));
    } catch (currentError) {
      state.setError(String(currentError));
    } finally {
      state.setLoading(false);
    }
  };
  const loadRepositories = async () => {
    const nextRepositories = await invokeTauri<BackendVccRepository[]>(
      "get_vcc_repositories",
    );
    state.setRepositories(nextRepositories.map(toRepository));
  };
  const syncRepositories = createSyncRepositoriesAction(state, loadProjects);

  useEffect(() => {
    void Promise.all([loadRepositories(), loadProjects()]);
  }, []);

  return { loadProjects, loadRepositories, syncRepositories };
}

function createSyncRepositoriesAction(
  state: VccProjectState,
  loadProjects: () => Promise<void>,
) {
  return async () => {
    state.setLoading(true);
    state.setError(null);
    try {
      const repositories = await invokeTauri<BackendVccRepository[]>(
        "sync_vcc_repositories",
      );
      state.setRepositories(repositories.map(toRepository));
      await loadProjects();
    } catch (currentError) {
      state.setError(String(currentError));
    } finally {
      state.setLoading(false);
    }
  };
}

function createAddProjectAction(
  state: VccProjectState,
  loadProjects: () => Promise<void>,
) {
  return async () => {
    const selected = await openDialog({
      title: "選擇 VCC / Unity 專案資料夾",
      multiple: false,
      directory: true,
    });
    if (typeof selected !== "string") return;

    state.setLoading(true);
    state.setError(null);
    try {
      await invokeTauri<BackendVccProject>("add_vcc_project", { input: { path: selected } });
      await loadProjects();
    } catch (currentError) {
      state.setError(String(currentError));
    } finally {
      state.setLoading(false);
    }
  };
}

function createScanProjectAction(state: VccProjectState) {
  return async (projectId: number) => {
    state.setBusyProjectId(projectId);
    state.setError(null);
    try {
      const snapshot = await invokeTauri<BackendVccProjectSnapshot>("scan_vcc_project", {
        id: projectId,
      });
      state.setSnapshots((current) =>
        current.map((item) =>
          item.project.id === projectId ? toSnapshot(snapshot) : item,
        ),
      );
    } catch (currentError) {
      state.setError(String(currentError));
    } finally {
      state.setBusyProjectId(null);
    }
  };
}

function createDeleteProjectAction(state: VccProjectState) {
  return async () => {
    if (!state.deleteTarget) return;

    const projectId = state.deleteTarget.project.id;
    state.setBusyProjectId(projectId);
    state.setError(null);
    try {
      await invokeTauri("delete_vcc_project", { id: projectId });
      state.setSnapshots((current) =>
        current.filter((snapshot) => snapshot.project.id !== projectId),
      );
      state.setDeleteTarget(null);
    } catch (currentError) {
      state.setError(String(currentError));
    } finally {
      state.setBusyProjectId(null);
    }
  };
}

function createAddRepositoryAction(state: VccProjectState, loaders: VccLoadActions) {
  return async () => {
    if (!state.repositoryUrl.trim()) return;

    state.setLoading(true);
    state.setError(null);
    try {
      await invokeTauri<BackendVccRepository>("add_vcc_repository", {
        input: {
          name: state.repositoryName.trim() || null,
          url: state.repositoryUrl.trim(),
        },
      });
      state.setRepositoryName("");
      state.setRepositoryUrl("");
      await loaders.loadRepositories();
      await loaders.loadProjects();
    } catch (currentError) {
      state.setError(String(currentError));
    } finally {
      state.setLoading(false);
    }
  };
}

function createDeleteRepositoryAction(state: VccProjectState, loaders: VccLoadActions) {
  return async () => {
    if (!state.deleteRepositoryTarget) return;

    state.setLoading(true);
    state.setError(null);
    try {
      await invokeTauri("delete_vcc_repository", { id: state.deleteRepositoryTarget.id });
      state.setDeleteRepositoryTarget(null);
      await loaders.loadRepositories();
      await loaders.loadProjects();
    } catch (currentError) {
      state.setError(String(currentError));
    } finally {
      state.setLoading(false);
    }
  };
}

function createOpenProjectAction(state: VccProjectState) {
  return async (path: string) => {
    try {
      await invokeTauri("open_file_location", { path });
    } catch (currentError) {
      state.setError(String(currentError));
    }
  };
}

function toggleCollapsedProjectId(current: Set<number>, projectId: number) {
  const next = new Set(current);
  if (next.has(projectId)) next.delete(projectId);
  else next.add(projectId);
  return next;
}

function createVccProjectsResult(state: VccProjectState, loaders: VccLoadActions) {
  return {
    snapshots: state.snapshots,
    repositories: state.repositories,
    repositoryName: state.repositoryName,
    repositoryUrl: state.repositoryUrl,
    loading: state.loading,
    busyProjectId: state.busyProjectId,
    error: state.error,
    deleteTarget: state.deleteTarget,
    deleteRepositoryTarget: state.deleteRepositoryTarget,
    packageFilter: state.packageFilter,
    repositoriesCollapsed: state.repositoriesCollapsed,
    collapsedProjectIds: state.collapsedProjectIds,
    setRepositoryName: state.setRepositoryName,
    setRepositoryUrl: state.setRepositoryUrl,
    setDeleteTarget: state.setDeleteTarget,
    setDeleteRepositoryTarget: state.setDeleteRepositoryTarget,
    setPackageFilter: state.setPackageFilter,
    setRepositoriesCollapsed: state.setRepositoriesCollapsed,
    loadProjects: loaders.loadProjects,
    syncRepositories: loaders.syncRepositories,
    addProject: createAddProjectAction(state, loaders.loadProjects),
    scanProject: createScanProjectAction(state),
    deleteProject: createDeleteProjectAction(state),
    addRepository: createAddRepositoryAction(state, loaders),
    deleteRepository: createDeleteRepositoryAction(state, loaders),
    openProject: createOpenProjectAction(state),
    toggleProjectCollapsed: (projectId: number) =>
      state.setCollapsedProjectIds((current) =>
        toggleCollapsedProjectId(current, projectId),
      ),
  };
}

export function useVccProjects() {
  const state = useVccProjectState();
  const loaders = useVccLoadActions(state);
  return createVccProjectsResult(state, loaders);
}
