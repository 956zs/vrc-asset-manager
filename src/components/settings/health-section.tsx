import {
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

export function HealthSection({
  summary,
  loading,
  error,
  onScan,
  onOpenIssueLocation,
  onEditIssueAsset,
}: HealthSectionProps) {
  const issueCount = summary?.issues.length ?? 0;

  return (
    <section className="flex min-h-full flex-col gap-4">
      <div className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              素材健康
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {summary
                ? `${summary.ok}/${summary.total} 個素材正常，${issueCount} 個需要注意`
                : "尚未掃描"}
            </p>
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

        {summary && (
          <div className="mt-4 grid grid-cols-2 items-stretch gap-2 sm:grid-cols-4">
            <HealthStat label="總數" value={summary.total} />
            <HealthStat label="正常" value={summary.ok} tone="good" />
            <HealthStat label="缺失" value={summary.missing} tone="warn" />
            <HealthStat label="無法讀取" value={summary.unreadable} tone="warn" />
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <TriangleAlert className="h-4 w-4" />
          {error}
        </div>
      )}

      {summary && issueCount === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          目前沒有偵測到素材路徑問題
        </div>
      )}

      {summary && issueCount > 0 && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-medium text-foreground">
            <TriangleAlert className="h-4 w-4 text-destructive" />
            需要處理的素材
          </div>
          <ScrollArea className="min-h-[220px] flex-1">
            <div className="divide-y divide-border">
              {summary.issues.map((issue) => (
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
      )}
      {summary && issueCount === 0 && (
        <div className="min-h-[160px] flex-1 rounded-lg border border-dashed border-border bg-background/50" />
      )}
      {!summary && !error && (
        <div className="min-h-[220px] flex-1 rounded-lg border border-dashed border-border bg-background/50" />
      )}
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
