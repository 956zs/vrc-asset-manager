"use client";

import { getName, getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import {
  Activity,
  Download,
  Info,
  ShieldCheck,
  X,
} from "lucide-react";
import appIconUrl from "@/assets/app-icon.png";
import { type ReactNode, useEffect, useMemo, useState } from "react";
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
import { OverviewSection } from "./settings/overview-section";
import { UpdateSection } from "./settings/update-section";
import {
  formatPercent,
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
  { id: "updates", label: "更新", icon: Download },
  { id: "health", label: "素材健康", icon: ShieldCheck },
  { id: "about", label: "關於", icon: Info },
];

export function AppSettingsDialog({
  open,
  onOpenChange,
  showAssets,
}: AppSettingsDialogProps) {
  const assets = useAssetStore((state) => state.assets);
  const models = useAssetStore((state) => state.models);
  const tags = useAssetStore((state) => state.tags);
  const getAllAssets = useAssetStore((state) => state.getAllAssets);
  const selectAsset = useAssetStore((state) => state.selectAsset);
  const requestAssetEdit = useAssetStore((state) => state.requestAssetEdit);
  const [activeTab, setActiveTab] = useState<SettingsTab>("overview");
  const [appName, setAppName] = useState("VRC Asset Manager");
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [assetCount, setAssetCount] = useState<number | null>(null);
  const [update, setUpdate] = useState<Update | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [downloadTotalBytes, setDownloadTotalBytes] = useState<number | null>(null);
  const [healthSummary, setHealthSummary] = useState<AssetHealthSummary | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

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
        setAssetCount(assets.length);
      });
  }, [assets.length, getAllAssets, open]);

  const downloadPercent = formatPercent(downloadedBytes, downloadTotalBytes);
  const updateDescription = useMemo(() => {
    if (updateStatus === "checking") {
      return "正在連線到 GitHub Releases";
    }

    if (updateStatus === "available" && update) {
      return `可更新至 ${update.version}`;
    }

    if (updateStatus === "current") {
      return "目前已是最新版本";
    }

    if (updateStatus === "downloading") {
      return downloadPercent === null
        ? "正在下載更新"
        : `正在下載更新 ${downloadPercent}%`;
    }

    if (updateStatus === "installed") {
      return "更新已安裝，重新啟動後生效";
    }

    return updateMessage ?? "尚未檢查更新";
  }, [downloadPercent, update, updateMessage, updateStatus]);

  const handleCheckUpdate = async () => {
    setUpdateStatus("checking");
    setUpdateMessage(null);
    setUpdate(null);
    setDownloadedBytes(0);
    setDownloadTotalBytes(null);

    try {
      const nextUpdate = await check();
      if (nextUpdate) {
        setUpdate(nextUpdate);
        setUpdateStatus("available");
        setActiveTab("updates");
        return;
      }

      setUpdateStatus("current");
    } catch (error) {
      setUpdateStatus("error");
      setUpdateMessage(toMessage(error));
      setActiveTab("updates");
    }
  };

  const handleInstallUpdate = async () => {
    if (!update) {
      return;
    }

    setUpdateStatus("downloading");
    setUpdateMessage(null);
    setDownloadedBytes(0);
    setDownloadTotalBytes(null);

    try {
      await update.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === "Started") {
          setDownloadedBytes(0);
          setDownloadTotalBytes(event.data.contentLength ?? null);
        } else if (event.event === "Progress") {
          setDownloadedBytes((current) => current + event.data.chunkLength);
        }
      });
      setUpdateStatus("installed");
      setUpdateMessage("更新已安裝");
    } catch (error) {
      setUpdateStatus("error");
      setUpdateMessage(toMessage(error));
    }
  };

  const handleScanHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);

    try {
      const summary = await invoke<AssetHealthSummary>("scan_asset_health");
      setHealthSummary(summary);
      setActiveTab("health");
    } catch (error) {
      setHealthError(toMessage(error));
      setActiveTab("health");
    } finally {
      setHealthLoading(false);
    }
  };

  const handleOpenIssueLocation = async (issue: AssetHealthIssue) => {
    try {
      await invoke("open_file_location", { path: issue.filePath });
    } catch (error) {
      setHealthError(toMessage(error));
    }
  };

  const handleEditIssueAsset = (issue: AssetHealthIssue) => {
    showAssets();
    selectAsset(issue.assetId);
    requestAssetEdit(issue.assetId);
    onOpenChange(false);
  };

  const content = {
    overview: (
      <OverviewSection
        appVersion={appVersion}
        assetCount={assetCount ?? assets.length}
        modelCount={models.length}
        tagCount={tags.length}
        updateStatus={updateStatus}
        updateDescription={updateDescription}
        healthSummary={healthSummary}
        healthLoading={healthLoading}
        onCheckUpdate={handleCheckUpdate}
        onScanHealth={handleScanHealth}
        onOpenTab={setActiveTab}
      />
    ),
    updates: (
      <UpdateSection
        appVersion={appVersion}
        update={update}
        updateStatus={updateStatus}
        updateMessage={updateMessage}
        updateDescription={updateDescription}
        downloadPercent={downloadPercent}
        onCheckUpdate={handleCheckUpdate}
        onInstallUpdate={handleInstallUpdate}
      />
    ),
    health: (
      <HealthSection
        summary={healthSummary}
        loading={healthLoading}
        error={healthError}
        onScan={handleScanHealth}
        onOpenIssueLocation={handleOpenIssueLocation}
        onEditIssueAsset={handleEditIssueAsset}
      />
    ),
    about: (
      <AboutSection
        appName={appName}
        appVersion={appVersion}
        assetCount={assetCount ?? assets.length}
        modelCount={models.length}
        tagCount={tags.length}
        onOpenReleases={() => void openUrl(releaseUrl)}
      />
    ),
  } satisfies Record<SettingsTab, ReactNode>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="grid h-[calc(100vh-1rem)] max-h-[calc(100vh-1rem)] min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:h-[760px] sm:max-h-[calc(100vh-2rem)] sm:max-w-[900px]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>設定 / 關於</DialogTitle>
          <DialogDescription>
            {appName} {appVersion ? `v${appVersion}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 border-b border-border bg-background px-5 py-4">
          <div className="grid items-center gap-4 lg:grid-cols-[minmax(220px,1fr)_auto_auto]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted shadow-sm">
                <img
                  src={appIconUrl}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-foreground">
                  設定中心
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  {appName}
                  {appVersion ? ` · v${appVersion}` : ""}
                </p>
              </div>
            </div>

            <div className="grid w-full max-w-full grid-cols-2 gap-1 rounded-lg border border-border bg-muted/50 p-1 sm:grid-cols-4 lg:w-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={cn(
                      "flex h-8 shrink-0 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground transition-colors",
                      "justify-center sm:min-w-[104px]",
                      selected && "bg-background text-foreground shadow-sm",
                    )}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="關閉"
              aria-label="關閉"
              className="absolute top-3 right-3 lg:static"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-full min-h-0 bg-muted/20">
          <div className="flex min-h-full p-5">
            <div className="min-h-full w-full">{content[activeTab]}</div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
