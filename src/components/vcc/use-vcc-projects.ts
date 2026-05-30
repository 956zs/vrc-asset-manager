import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { VccProjectSnapshot, VccRepository } from "@/types";
import type {
  BackendVccProject,
  BackendVccProjectSnapshot,
  BackendVccRepository,
  PackageFilter,
} from "./types";
import { toRepository, toSnapshot } from "./types";

export function useVccProjects() {
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

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const nextSnapshots = await invoke<BackendVccProjectSnapshot[]>(
        "scan_vcc_projects",
      );
      setSnapshots(nextSnapshots.map(toSnapshot));
    } catch (currentError) {
      setError(String(currentError));
    } finally {
      setLoading(false);
    }
  };

  const loadRepositories = async () => {
    const nextRepositories = await invoke<BackendVccRepository[]>(
      "get_vcc_repositories",
    );
    setRepositories(nextRepositories.map(toRepository));
  };

  const syncRepositories = async () => {
    setLoading(true);
    setError(null);
    try {
      const nextRepositories = await invoke<BackendVccRepository[]>(
        "sync_vcc_repositories",
      );
      setRepositories(nextRepositories.map(toRepository));
      await loadProjects();
    } catch (currentError) {
      setError(String(currentError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.all([loadRepositories(), loadProjects()]);
  }, []);

  const addProject = async () => {
    const selected = await openDialog({
      title: "選擇 VCC / Unity 專案資料夾",
      multiple: false,
      directory: true,
    });

    if (typeof selected !== "string") {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await invoke<BackendVccProject>("add_vcc_project", {
        input: { path: selected },
      });
      await loadProjects();
    } catch (currentError) {
      setError(String(currentError));
    } finally {
      setLoading(false);
    }
  };

  const scanProject = async (projectId: number) => {
    setBusyProjectId(projectId);
    setError(null);
    try {
      const snapshot = await invoke<BackendVccProjectSnapshot>("scan_vcc_project", {
        id: projectId,
      });
      setSnapshots((current) =>
        current.map((item) =>
          item.project.id === projectId ? toSnapshot(snapshot) : item,
        ),
      );
    } catch (currentError) {
      setError(String(currentError));
    } finally {
      setBusyProjectId(null);
    }
  };

  const deleteProject = async () => {
    if (!deleteTarget) {
      return;
    }

    setBusyProjectId(deleteTarget.project.id);
    setError(null);
    try {
      await invoke("delete_vcc_project", { id: deleteTarget.project.id });
      setSnapshots((current) =>
        current.filter((snapshot) => snapshot.project.id !== deleteTarget.project.id),
      );
      setDeleteTarget(null);
    } catch (currentError) {
      setError(String(currentError));
    } finally {
      setBusyProjectId(null);
    }
  };

  const addRepository = async () => {
    if (!repositoryUrl.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await invoke<BackendVccRepository>("add_vcc_repository", {
        input: {
          name: repositoryName.trim() || null,
          url: repositoryUrl.trim(),
        },
      });
      setRepositoryName("");
      setRepositoryUrl("");
      await loadRepositories();
      await loadProjects();
    } catch (currentError) {
      setError(String(currentError));
    } finally {
      setLoading(false);
    }
  };

  const deleteRepository = async () => {
    if (!deleteRepositoryTarget) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await invoke("delete_vcc_repository", { id: deleteRepositoryTarget.id });
      setDeleteRepositoryTarget(null);
      await loadRepositories();
      await loadProjects();
    } catch (currentError) {
      setError(String(currentError));
    } finally {
      setLoading(false);
    }
  };

  const openProject = async (path: string) => {
    try {
      await invoke("open_file_location", { path });
    } catch (currentError) {
      setError(String(currentError));
    }
  };

  const toggleProjectCollapsed = (projectId: number) => {
    setCollapsedProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  return {
    snapshots,
    repositories,
    repositoryName,
    repositoryUrl,
    loading,
    busyProjectId,
    error,
    deleteTarget,
    deleteRepositoryTarget,
    packageFilter,
    repositoriesCollapsed,
    collapsedProjectIds,
    setRepositoryName,
    setRepositoryUrl,
    setDeleteTarget,
    setDeleteRepositoryTarget,
    setPackageFilter,
    setRepositoriesCollapsed,
    loadProjects,
    syncRepositories,
    addProject,
    scanProject,
    deleteProject,
    addRepository,
    deleteRepository,
    openProject,
    toggleProjectCollapsed,
  };
}
