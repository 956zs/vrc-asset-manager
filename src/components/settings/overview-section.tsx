import {
  Download,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  Tag,
  User,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AssetHealthSummary } from "@/types";
import type { SettingsTab, UpdateStatus } from "./utils";

type OverviewSectionProps = {
  appVersion: string | null;
  assetCount: number;
  modelCount: number;
  tagCount: number;
  updateStatus: UpdateStatus;
  updateDescription: string;
  healthSummary: AssetHealthSummary | null;
  healthLoading: boolean;
  onCheckUpdate: () => void | Promise<void>;
  onScanHealth: () => void | Promise<void>;
  onOpenTab: (tab: SettingsTab) => void;
};

export function OverviewSection({
  appVersion,
  assetCount,
  modelCount,
  tagCount,
  updateStatus,
  updateDescription,
  healthSummary,
  healthLoading,
  onCheckUpdate,
  onScanHealth,
  onOpenTab,
}: OverviewSectionProps) {
  return (
    <section className="flex min-h-full flex-col gap-4">
      <OverviewMetrics
        assetCount={assetCount}
        modelCount={modelCount}
        tagCount={tagCount}
      />
      <OverviewActionPanels
        appVersion={appVersion}
        updateStatus={updateStatus}
        updateDescription={updateDescription}
        healthSummary={healthSummary}
        healthLoading={healthLoading}
        onCheckUpdate={onCheckUpdate}
        onScanHealth={onScanHealth}
        onOpenTab={onOpenTab}
      />
    </section>
  );
}

function OverviewMetrics({
  assetCount,
  modelCount,
  tagCount,
}: Pick<OverviewSectionProps, "assetCount" | "modelCount" | "tagCount">) {
  return (
    <div className="grid items-stretch gap-3 sm:grid-cols-3">
      <OverviewMetric icon={PackageSearch} label="素材" value={assetCount} />
      <OverviewMetric icon={User} label="模型" value={modelCount} />
      <OverviewMetric icon={Tag} label="標籤" value={tagCount} />
    </div>
  );
}

function OverviewActionPanels(props: Omit<
  OverviewSectionProps,
  "assetCount" | "modelCount" | "tagCount"
>) {
  return (
    <div className="grid flex-1 items-stretch gap-4 lg:grid-cols-2">
      <UpdateActionPanel {...props} />
      <HealthActionPanel {...props} />
    </div>
  );
}

function UpdateActionPanel({
  appVersion,
  updateStatus,
  updateDescription,
  onCheckUpdate,
  onOpenTab,
}: Pick<
  OverviewSectionProps,
  "appVersion" | "updateStatus" | "updateDescription" | "onCheckUpdate" | "onOpenTab"
>) {
  return (
    <ActionPanel
      icon={Download}
      title="更新狀態"
      badge={appVersion ? `v${appVersion}` : "版本未知"}
      description={updateDescription}
      tone={updateStatus === "available" ? "accent" : undefined}
      action={<UpdateCheckButton updateStatus={updateStatus} onCheckUpdate={onCheckUpdate} />}
      onOpen={() => onOpenTab("updates")}
    />
  );
}

function UpdateCheckButton({
  updateStatus,
  onCheckUpdate,
}: Pick<OverviewSectionProps, "updateStatus" | "onCheckUpdate">) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={updateStatus === "checking" || updateStatus === "downloading"}
      onClick={() => void onCheckUpdate()}
    >
      <RefreshCw className="h-4 w-4" />
      檢查
    </Button>
  );
}

function HealthActionPanel({
  healthSummary,
  healthLoading,
  onScanHealth,
  onOpenTab,
}: Pick<
  OverviewSectionProps,
  "healthSummary" | "healthLoading" | "onScanHealth" | "onOpenTab"
>) {
  return (
    <ActionPanel
      icon={ShieldCheck}
      title="素材健康"
      badge={healthSummary ? `${healthSummary.issues.length} 個問題` : "尚未掃描"}
      description={getHealthDescription(healthSummary)}
      tone={healthSummary && healthSummary.issues.length > 0 ? "warn" : undefined}
      action={<HealthScanButton healthLoading={healthLoading} onScanHealth={onScanHealth} />}
      onOpen={() => onOpenTab("health")}
    />
  );
}

function HealthScanButton({
  healthLoading,
  onScanHealth,
}: Pick<OverviewSectionProps, "healthLoading" | "onScanHealth">) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={healthLoading}
      onClick={() => void onScanHealth()}
    >
      <RefreshCw className="h-4 w-4" />
      掃描
    </Button>
  );
}

function getHealthDescription(healthSummary: AssetHealthSummary | null) {
  if (!healthSummary) {
    return "檢查缺失、空檔案與無法讀取的素材";
  }

  return `${healthSummary.ok}/${healthSummary.total} 個素材正常`;
}

function OverviewMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof PackageSearch;
  label: string;
  value: number;
}) {
  return (
    <div className="flex h-full min-h-[96px] flex-col justify-center rounded-lg border border-border bg-card px-4 py-4 text-card-foreground shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ActionPanel({
  icon: Icon,
  title,
  badge,
  description,
  tone,
  action,
  onOpen,
}: {
  icon: typeof Download;
  title: string;
  badge: string;
  description: string;
  tone?: "accent" | "warn";
  action: ReactNode;
  onOpen: () => void;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[160px] flex-col justify-center rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm",
        tone === "accent" && "border-primary/30",
        tone === "warn" && "border-destructive/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
          onClick={onOpen}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">{title}</span>
              <Badge variant="secondary">{badge}</Badge>
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {description}
            </span>
          </span>
        </button>
        <div className="shrink-0">{action}</div>
      </div>
    </div>
  );
}
