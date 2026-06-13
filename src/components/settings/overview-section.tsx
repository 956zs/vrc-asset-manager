import {
  Download,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  Tag,
  User,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { MetaBadge } from "@/components/ui/meta-badge";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import type { AssetHealthSummary } from "@/types";
import { SettingsSection } from "./settings-section";
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
    <SettingsSection>
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
    </SettingsSection>
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
    <MetricCard
      label={label}
      value={value}
      icon={<Icon className="h-5 w-5" />}
      className="bg-card shadow-sm"
    />
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
    <Panel
      tone={tone}
      className="flex h-full min-h-[160px] flex-col justify-center p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
          onClick={onOpen}
        >
          <IconTile>
            <Icon className="h-5 w-5" />
          </IconTile>
          <span className="min-w-0">
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">{title}</span>
              <MetaBadge variant="secondary">{badge}</MetaBadge>
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {description}
            </span>
          </span>
        </button>
        <div className="shrink-0">{action}</div>
      </div>
    </Panel>
  );
}
