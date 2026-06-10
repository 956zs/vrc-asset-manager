import {
  Activity,
  CheckCircle2,
  FolderOpen,
  Loader2,
  Pencil,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { AssetHealthIssue, AssetHealthSummary } from "@/types";
import { displayIssueName, issueBadgeVariant, issueLabel } from "./utils";

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
    <div className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm">
      <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">素材健康</h3>
              <Badge variant={issueCount > 0 ? "destructive" : summary ? "secondary" : "outline"}>
                {statusLabel}
              </Badge>
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
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          掃描素材
        </Button>
      </div>
      {summary && <HealthStatsGrid summary={summary} />}
    </div>
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
    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      <TriangleAlert className="h-4 w-4" />
      {error}
    </div>
  );
}

function HealthOkMessage() {
  return (
    <div className="grid min-h-[260px] place-items-center rounded-lg border border-primary/30 bg-card p-8 text-center text-card-foreground shadow-sm">
      <div className="max-w-sm space-y-3">
        <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-primary/10 text-primary">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">目前沒有素材路徑問題</p>
          <p className="mt-1 text-sm text-muted-foreground">
            所有已登錄素材都可以正常讀取。
          </p>
        </div>
      </div>
    </div>
  );
}

function HealthIssueList({
  issues,
  onOpenIssueLocation,
  onEditIssueAsset,
}: HealthIssueListProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
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
    </div>
  );
}

function HealthEmptyState({
  loading,
  onScan,
}: Pick<HealthSectionProps, "loading" | "onScan">) {
  return (
    <div className="grid min-h-[320px] place-items-center rounded-lg border border-dashed border-border bg-card p-8 text-center text-card-foreground shadow-sm">
      <div className="max-w-sm space-y-4">
        <div className="mx-auto flex size-14 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Activity className="h-7 w-7" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">尚未掃描素材</p>
          <p className="mt-2 text-sm text-muted-foreground">
            執行一次掃描後，這裡會顯示素材路徑狀態與需要處理的項目。
          </p>
        </div>
        <Button type="button" disabled={loading} onClick={() => void onScan()}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          掃描素材
        </Button>
      </div>
    </div>
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
    <section className="flex min-h-full flex-col gap-4">
      <HealthSummaryCard {...props} />
      <HealthDetails {...props} />
    </section>
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
  return (
    <div
      className={cn(
        "flex h-full min-h-[76px] flex-col justify-center rounded-lg border border-border bg-background px-3 py-2",
        tone === "good" && "border-primary/30 bg-primary/10",
        tone === "warn" && value > 0 && "border-destructive/30 bg-destructive/10",
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
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
    <div className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="min-w-0 truncate text-sm font-medium text-foreground">
            {displayIssueName(issue)}
          </p>
          <Badge variant={issueBadgeVariant(issue.status)} className="shrink-0">
            {issueLabel(issue.status)}
          </Badge>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">{issue.filePath}</p>
        <p className="mt-1 text-xs text-muted-foreground">{issue.message}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="開啟素材位置"
          aria-label="開啟素材位置"
          onClick={() => void onOpenIssueLocation(issue)}
        >
          <FolderOpen className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="編輯素材"
          aria-label="編輯素材"
          onClick={() => onEditIssueAsset(issue)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
