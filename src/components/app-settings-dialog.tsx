"use client";

import { getName, getVersion } from "@tauri-apps/api/app";
import { invokeTauri } from "@/lib/tauri-runtime";
import { openUrl } from "@tauri-apps/plugin-opener";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import {
  Activity,
  Download,
  FolderCog,
  Info,
  ShieldCheck,
  X,
} from "lucide-react";
import appIconUrl from "@/assets/app-icon.png";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/stores/asset-store";
import type { AssetHealthIssue, AssetHealthSummary } from "@/types";
import { AboutSection } from "./settings/about-section";
import { HealthSection } from "./settings/health-section";
import { LibrarySection } from "./settings/library-section";
import { OverviewSection } from "./settings/overview-section";
import { UpdateSection } from "./settings/update-section";
import {
  formatPercent,
  formatUpdateErrorMessage,
  isReleaseJsonUnavailable,
  releaseUrl,
  toMessage,
  type SettingsTab,
  type UpdateStatus,
} from "./settings/utils";

type AppSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showAssets: () => void;
};

const tabs: Array<{
  id: SettingsTab;
  label: string;
  icon: typeof Info;
}> = [
  { id: "overview", label: "總覽", icon: Activity },
  { id: "library", label: "素材庫", icon: FolderCog },
  { id: "updates", label: "更新", icon: Download },
  { id: "health", label: "素材健康", icon: ShieldCheck },
  { id: "about", label: "關於", icon: Info },
];

type AppMetadata = {
  appName: string;
  appVersion: string | null;
  assetCount: number;
};

type SettingsStats = {
  assetCount: number;
  modelCount: number;
  tagCount: number;
};

type UpdateController = {
  update: Update | null;
  updateStatus: UpdateStatus;
  updateMessage: string | null;
  updateDescription: string;
  downloadPercent: number | null;
  onCheckUpdate: () => Promise<void>;
  onInstallUpdate: () => Promise<void>;
  onOpenReleases: () => void;
};

type UpdateDescriptionState = {
  status: UpdateStatus;
  update: Update | null;
  message: string | null;
  downloadPercent: number | null;
};

type HealthController = {
  summary: AssetHealthSummary | null;
  loading: boolean;
  error: string | null;
  onScan: () => Promise<void>;
  onOpenIssueLocation: (issue: AssetHealthIssue) => Promise<void>;
  onEditIssueAsset: (issue: AssetHealthIssue) => void;
};

type SettingsLayoutProps = AppMetadata & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: SettingsTab;
  stats: SettingsStats;
  update: UpdateController;
  health: HealthController;
  onOpenTab: (tab: SettingsTab) => void;
};

type UpdateSetters = {
  setUpdate: (update: Update | null) => void;
  setUpdateStatus: (status: UpdateStatus) => void;
  setUpdateMessage: (message: string | null) => void;
  setDownloadedBytes: (bytes: number | ((current: number) => number)) => void;
  setDownloadTotalBytes: (bytes: number | null) => void;
};

type HealthSetters = {
  setHealthSummary: (summary: AssetHealthSummary | null) => void;
  setHealthLoading: (loading: boolean) => void;
  setHealthError: (error: string | null) => void;
};

function useAppMetadata(
  open: boolean,
  storeAssetCount: number,
  getAllAssets: () => Promise<unknown[]>,
): AppMetadata {
  const [appName, setAppName] = useState("VRC Asset Manager");
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [assetCount, setAssetCount] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    void Promise.all([getName(), getVersion(), getAllAssets()])
      .then(([name, version, allAssets]) => {
        setAppName(name || "VRC Asset Manager");
        setAppVersion(version);
        setAssetCount(allAssets.length);
      })
      .catch(() => {
        setAppVersion(null);
        setAssetCount(storeAssetCount);
      });
  }, [storeAssetCount, getAllAssets, open]);

  return { appName, appVersion, assetCount: assetCount ?? storeAssetCount };
}

function useUpdateDescription({
  status,
  update,
  message,
  downloadPercent,
}: UpdateDescriptionState) {
  return useMemo(() => {
    if (status === "checking") return "正在連線到 GitHub Releases";
    if (status === "available" && update) return `可更新至 ${update.version}`;
    if (status === "current") return "目前已是最新版本";
    if (status === "unavailable") return "目前沒有可用的公開更新資訊";
    if (status === "installed") return "更新已安裝，重新啟動後生效";
    if (status !== "downloading") return message ?? "尚未檢查更新";
    return downloadPercent === null ? "正在下載更新" : `正在下載更新 ${downloadPercent}%`;
  }, [downloadPercent, message, status, update]);
}

function resetUpdateDownload(setters: UpdateSetters) {
  setters.setDownloadedBytes(0);
  setters.setDownloadTotalBytes(null);
}

function createCheckUpdateHandler(
  appVersion: string | null,
  setActiveTab: (tab: SettingsTab) => void,
  setters: UpdateSetters,
) {
  return async () => {
    setters.setUpdateStatus("checking");
    setters.setUpdateMessage(null);
    setters.setUpdate(null);
    resetUpdateDownload(setters);

    try {
      const nextUpdate = await check();
      setters.setUpdate(nextUpdate);
      setters.setUpdateStatus(nextUpdate ? "available" : "current");
      if (nextUpdate) setActiveTab("updates");
    } catch (error) {
      const message = toMessage(error);
      setters.setUpdateStatus(isReleaseJsonUnavailable(message) ? "unavailable" : "error");
      setters.setUpdateMessage(formatUpdateErrorMessage(message, appVersion));
      setActiveTab("updates");
    }
  };
}

function createInstallUpdateHandler(update: Update | null, setters: UpdateSetters) {
  return async () => {
    if (!update) {
      return;
    }

    setters.setUpdateStatus("downloading");
    setters.setUpdateMessage(null);
    resetUpdateDownload(setters);

    try {
      await update.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === "Started") {
          resetUpdateDownload(setters);
          setters.setDownloadTotalBytes(event.data.contentLength ?? null);
        } else if (event.event === "Progress") {
          setters.setDownloadedBytes((current) => current + event.data.chunkLength);
        }
      });
      setters.setUpdateStatus("installed");
      setters.setUpdateMessage("更新已安裝");
    } catch (error) {
      setters.setUpdateStatus("error");
      setters.setUpdateMessage(toMessage(error));
    }
  };
}

function useUpdateController(
  appVersion: string | null,
  setActiveTab: (tab: SettingsTab) => void,
): UpdateController {
  const [update, setUpdate] = useState<Update | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [downloadTotalBytes, setDownloadTotalBytes] = useState<number | null>(null);
  const setters = {
    setUpdate,
    setUpdateStatus,
    setUpdateMessage,
    setDownloadedBytes,
    setDownloadTotalBytes,
  };
  const downloadPercent = formatPercent(downloadedBytes, downloadTotalBytes);

  return {
    update,
    updateStatus,
    updateMessage,
    downloadPercent,
    updateDescription: useUpdateDescription({
      status: updateStatus,
      update,
      message: updateMessage,
      downloadPercent,
    }),
    onCheckUpdate: createCheckUpdateHandler(appVersion, setActiveTab, setters),
    onInstallUpdate: createInstallUpdateHandler(update, setters),
    onOpenReleases: () => void openUrl(releaseUrl),
  };
}

function createHealthScanHandler(
  setActiveTab: (tab: SettingsTab) => void,
  setters: HealthSetters,
) {
  return async () => {
    setters.setHealthLoading(true);
    setters.setHealthError(null);

    try {
      setters.setHealthSummary(await invokeTauri<AssetHealthSummary>("scan_asset_health"));
    } catch (error) {
      setters.setHealthError(toMessage(error));
    } finally {
      setters.setHealthLoading(false);
      setActiveTab("health");
    }
  };
}

function createIssueLocationHandler(setters: HealthSetters) {
  return async (issue: AssetHealthIssue) => {
    try {
      await invokeTauri("open_file_location", { path: issue.filePath });
    } catch (error) {
      setters.setHealthError(toMessage(error));
    }
  };
}

function useHealthController(
  props: AppSettingsDialogProps,
  setActiveTab: (tab: SettingsTab) => void,
): HealthController {
  const selectAsset = useAssetStore((state) => state.selectAsset);
  const requestAssetEdit = useAssetStore((state) => state.requestAssetEdit);
  const [summary, setHealthSummary] = useState<AssetHealthSummary | null>(null);
  const [loading, setHealthLoading] = useState(false);
  const [error, setHealthError] = useState<string | null>(null);
  const setters = { setHealthSummary, setHealthLoading, setHealthError };

  return {
    summary,
    loading,
    error,
    onScan: createHealthScanHandler(setActiveTab, setters),
    onOpenIssueLocation: createIssueLocationHandler(setters),
    onEditIssueAsset: (issue) => {
      props.showAssets();
      selectAsset(issue.assetId);
      requestAssetEdit(issue.assetId);
      props.onOpenChange(false);
    },
  };
}

function SettingsHeaderBrand({ appName, appVersion }: Pick<AppMetadata, "appName" | "appVersion">) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted shadow-sm">
        <img src={appIconUrl} alt="" aria-hidden="true" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold text-foreground">設定中心</h2>
        <p className="truncate text-xs text-muted-foreground">
          {appName}
          {appVersion ? ` · v${appVersion}` : ""}
        </p>
      </div>
    </div>
  );
}

function SettingsTabList({
  activeTab,
  onOpenTab,
}: {
  activeTab: SettingsTab;
  onOpenTab: (tab: SettingsTab) => void;
}) {
  return (
    <div className="flex w-full max-w-full gap-1 overflow-x-auto rounded-lg border border-border bg-muted/50 p-1 lg:w-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={cn(
              "flex h-8 min-w-[104px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm text-muted-foreground transition-colors",
              tab.id === "health" && "min-w-[120px]",
              selected && "bg-background text-foreground shadow-sm",
            )}
            onClick={() => onOpenTab(tab.id)}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function SettingsHeader(props: SettingsLayoutProps) {
  return (
    <div className="min-h-0 border-b border-border bg-background px-5 py-4">
      <div className="grid items-center gap-4 lg:grid-cols-[minmax(220px,1fr)_auto_auto]">
        <SettingsHeaderBrand appName={props.appName} appVersion={props.appVersion} />
        <SettingsTabList activeTab={props.activeTab} onOpenTab={props.onOpenTab} />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="關閉"
          aria-label="關閉"
          className="absolute top-3 right-3 lg:static"
          onClick={() => props.onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SettingsOverviewContent({
  stats,
  appVersion,
  update,
  health,
  onOpenTab,
}: SettingsLayoutProps) {
  return (
    <OverviewSection
      appVersion={appVersion}
      {...stats}
      updateStatus={update.updateStatus}
      updateDescription={update.updateDescription}
      healthSummary={health.summary}
      healthLoading={health.loading}
      onCheckUpdate={update.onCheckUpdate}
      onScanHealth={health.onScan}
      onOpenTab={onOpenTab}
    />
  );
}

function SettingsUpdateContent({ appVersion, update }: SettingsLayoutProps) {
  return (
    <UpdateSection
      appVersion={appVersion}
      update={update.update}
      updateStatus={update.updateStatus}
      updateMessage={update.updateMessage}
      updateDescription={update.updateDescription}
      downloadPercent={update.downloadPercent}
      onCheckUpdate={update.onCheckUpdate}
      onInstallUpdate={update.onInstallUpdate}
      onOpenReleases={update.onOpenReleases}
    />
  );
}

function SettingsHealthContent({ health }: SettingsLayoutProps) {
  return (
    <HealthSection
      summary={health.summary}
      loading={health.loading}
      error={health.error}
      onScan={health.onScan}
      onOpenIssueLocation={health.onOpenIssueLocation}
      onEditIssueAsset={health.onEditIssueAsset}
    />
  );
}

function SettingsAboutContent({
  stats,
  appName,
  appVersion,
  update,
}: SettingsLayoutProps) {
  return (
    <AboutSection
      {...stats}
      appName={appName}
      appVersion={appVersion}
      onOpenReleases={update.onOpenReleases}
    />
  );
}

function SettingsContent(props: SettingsLayoutProps) {
  if (props.activeTab === "library") return <LibrarySection />;
  if (props.activeTab === "updates") return <SettingsUpdateContent {...props} />;
  if (props.activeTab === "health") return <SettingsHealthContent {...props} />;
  if (props.activeTab === "about") return <SettingsAboutContent {...props} />;
  return <SettingsOverviewContent {...props} />;
}

function AppSettingsLayout(props: SettingsLayoutProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="grid h-[calc(100vh-1rem)] max-h-[calc(100vh-1rem)] min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:h-[760px] sm:max-h-[calc(100vh-2rem)] sm:max-w-[900px]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>設定 / 關於</DialogTitle>
          <DialogDescription>
            {props.appName} {props.appVersion ? `v${props.appVersion}` : ""}
          </DialogDescription>
        </DialogHeader>
        <SettingsHeader {...props} />
        <ScrollArea className="h-full min-h-0 bg-muted/20">
          <div className="flex min-h-full p-5">
            <div className="min-h-full w-full">
              <SettingsContent {...props} />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function useAppSettingsController(props: AppSettingsDialogProps): SettingsLayoutProps {
  const assets = useAssetStore((state) => state.assets);
  const models = useAssetStore((state) => state.models);
  const tags = useAssetStore((state) => state.tags);
  const getAllAssets = useAssetStore((state) => state.getAllAssets);
  const [activeTab, setActiveTab] = useState<SettingsTab>("overview");
  const metadata = useAppMetadata(props.open, assets.length, getAllAssets);
  const update = useUpdateController(metadata.appVersion, setActiveTab);
  const health = useHealthController(props, setActiveTab);

  return {
    ...props,
    ...metadata,
    activeTab,
    update,
    health,
    stats: {
      assetCount: metadata.assetCount,
      modelCount: models.length,
      tagCount: tags.length,
    },
    onOpenTab: setActiveTab,
  };
}

export function AppSettingsDialog(props: AppSettingsDialogProps) {
  return <AppSettingsLayout {...useAppSettingsController(props)} />;
}
