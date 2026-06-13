import {
  Activity,
  CheckCircle2,
  FolderOpen,
  Pencil,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { IconTile } from "@/components/ui/icon-tile";
import { ListRow } from "@/components/ui/list-row";
import { MetaBadge } from "@/components/ui/meta-badge";
import { MetricCard, type MetricCardTone } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { StatusMessage } from "@/components/ui/status-message";
import { ToneBadge } from "@/components/ui/tone-badge";
import type { AssetHealthIssue, AssetHealthSummary } from "@/types";
import { SettingsSection } from "./settings-section";
import { displayIssueName, issueLabel } from "./utils";

type HealthSectionProps = {
  summary: AssetHealthSummary | null;
  loading: boolean;
  error: string | null;
  onScan: () => void | Promise<void>;
  onOpenIssueLocation: (issue: AssetHealthIssue) => void | Promise<void>;
  onEditIssueAsset: (issue: AssetHealthIssue) => void;
};

type HealthIssueActions = Pick<
  HealthSectionProps,
  "onOpenIssueLocation" | "onEditIssueAsset"
>;

type HealthIssueListProps = {
  issues: AssetHealthIssue[];
} & HealthIssueActions;

function HealthSummaryCard({
  summary,
  loading,
  onScan,
}: Pick<HealthSectionProps, "summary" | "loading" | "onScan">) {
  const issueCount = summary?.issues.length ?? 0;
  const statusLabel = summary
    ? issueCount > 0
      ? `${issueCount} 個問題`
      : "狀態正常"
    : "尚未掃描";

  return (
    <Panel className="p-5">
      <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-start gap-3">
          <IconTile tone="primary">
            <ShieldCheck className="h-5 w-5" />
          </IconTile>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">素材健康</h3>
              <HealthStatusBadge issueCount={issueCount} scanned={Boolean(summary)}>
                {statusLabel}
              </HealthStatusBadge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {summary
                ? `${summary.ok}/${summary.total} 個素材可正常讀取`
                : "掃描素材路徑、空檔案與無法讀取的項目"}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => void onScan()}
        >
          {loading ? (
            <Spinner />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          掃描素材
        </Button>
      </div>
      {summary && <HealthStatsGrid summary={summary} />}
    </Panel>
  );
}

function HealthStatsGrid({ summary }: { summary: AssetHealthSummary }) {
  return (
    <div className="mt-4 grid grid-cols-2 items-stretch gap-2 sm:grid-cols-4 lg:grid-cols-6">
      <HealthStat label="總數" value={summary.total} />
      <HealthStat label="正常" value={summary.ok} tone="good" />
      <HealthStat label="缺失" value={summary.missing} tone="warn" />
      <HealthStat label="無法讀取" value={summary.unreadable} tone="warn" />
      <HealthStat label="空檔案" value={summary.emptyFiles} tone="warn" />
      <HealthStat label="空資料夾" value={summary.emptyDirectories} tone="warn" />
    </div>
  );
}

function HealthErrorMessage({ error }: { error: string }) {
  return (
    <StatusMessage tone="danger" icon={<TriangleAlert className="h-4 w-4" />}>
      {error}
    </StatusMessage>
  );
}

function HealthOkMessage() {
  return (
    <EmptyState
      tone="success"
      className="min-h-[260px]"
      icon={<CheckCircle2 className="h-6 w-6" />}
      iconClassName="size-12"
      title="目前沒有素材路徑問題"
      description="所有已登錄素材都可以正常讀取。"
    />
  );
}

function HealthIssueList({
  issues,
  onOpenIssueLocation,
  onEditIssueAsset,
}: HealthIssueListProps) {
  return (
    <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-medium text-foreground">
        <TriangleAlert className="h-4 w-4 text-destructive" />
        需要處理的素材
      </div>
      <ScrollArea className="min-h-[220px] flex-1">
        <div className="divide-y divide-border">
          {issues.map((issue) => (
            <HealthIssueRow
              key={`${issue.assetId}-${issue.status}-${issue.filePath}`}
              issue={issue}
              onOpenIssueLocation={onOpenIssueLocation}
              onEditIssueAsset={onEditIssueAsset}
            />
          ))}
        </div>
      </ScrollArea>
    </Panel>
  );
}

function HealthEmptyState({
  loading,
  onScan,
}: Pick<HealthSectionProps, "loading" | "onScan">) {
  return (
    <EmptyState
      className="min-h-[320px]"
      icon={<Activity className="h-7 w-7" />}
      title="尚未掃描素材"
      description="執行一次掃描後，這裡會顯示素材路徑狀態與需要處理的項目。"
      action={
        <Button type="button" disabled={loading} onClick={() => void onScan()}>
          {loading ? (
            <Spinner />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          掃描素材
        </Button>
      }
    />
  );
}

function HealthDetails({
  summary,
  error,
  loading,
  onScan,
  onOpenIssueLocation,
  onEditIssueAsset,
}: Pick<HealthSectionProps, "summary" | "error" | "loading" | "onScan"> & HealthIssueActions) {
  const issueCount = summary?.issues.length ?? 0;

  if (error) return <HealthErrorMessage error={error} />;
  if (!summary) return <HealthEmptyState loading={loading} onScan={onScan} />;
  if (issueCount === 0) return <HealthOkMessage />;
  return (
    <HealthIssueList
      issues={summary.issues}
      onOpenIssueLocation={onOpenIssueLocation}
      onEditIssueAsset={onEditIssueAsset}
    />
  );
}

export function HealthSection(props: HealthSectionProps) {
  return (
    <SettingsSection>
      <HealthSummaryCard {...props} />
      <HealthDetails {...props} />
    </SettingsSection>
  );
}

function HealthStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "good" | "warn";
}) {
  const metricTone: MetricCardTone =
    tone === "warn" && value === 0 ? "default" : (tone ?? "default");

  return (
    <MetricCard label={label} value={value} size="compact" tone={metricTone} />
  );
}

function HealthStatusBadge({
  children,
  issueCount,
  scanned,
}: {
  children: string;
  issueCount: number;
  scanned: boolean;
}) {
  if (issueCount > 0) {
    return <ToneBadge tone="danger">{children}</ToneBadge>;
  }

  return (
    <MetaBadge variant={scanned ? "secondary" : "outline"}>
      {children}
    </MetaBadge>
  );
}

function HealthIssueStatusBadge({ status }: { status: string }) {
  if (status === "missing" || status === "unreadable") {
    return <ToneBadge tone="danger">{issueLabel(status)}</ToneBadge>;
  }

  return (
    <MetaBadge variant={status === "unsupported" ? "outline" : "secondary"}>
      {issueLabel(status)}
    </MetaBadge>
  );
}

function HealthIssueRow({
  issue,
  onOpenIssueLocation,
  onEditIssueAsset,
}: {
  issue: AssetHealthIssue;
  onOpenIssueLocation: (issue: AssetHealthIssue) => void | Promise<void>;
  onEditIssueAsset: (issue: AssetHealthIssue) => void;
}) {
  return (
    <ListRow
      className="p-3"
      title={
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="min-w-0 truncate">{displayIssueName(issue)}</span>
          <HealthIssueStatusBadge status={issue.status} />
        </div>
      }
      description={issue.filePath}
      trailing={
        <div className="flex items-center gap-2">
          <IconButton
            size="icon-sm"
            label="開啟素材位置"
            icon={<FolderOpen className="h-4 w-4" />}
            onClick={() => void onOpenIssueLocation(issue)}
          />
          <IconButton
            size="icon-sm"
            label="編輯素材"
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => onEditIssueAsset(issue)}
          />
        </div>
      }
    >
      <p className="mt-1 text-xs text-muted-foreground">{issue.message}</p>
    </ListRow>
  );
}
