import { CheckCircle2 } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { BoothShopBackfillProgress } from "@/types";

type BoothShopBackfillProgressViewProps = {
  className?: string;
  message?: string;
  progress: BoothShopBackfillProgress | null;
  status?: "loading" | "success";
  variant?: "inline" | "toast";
};

function getBackfillProgressState(progress: BoothShopBackfillProgress | null) {
  const preparing = !progress || progress.total === 0;
  const percent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return { percent, preparing };
}

function BoothShopBackfillProgressView({
  className,
  message,
  progress,
  status = "loading",
  variant = "inline",
}: BoothShopBackfillProgressViewProps) {
  const { percent, preparing } = getBackfillProgressState(progress);
  const loading = status === "loading";
  const showPreparing = loading && preparing;
  const progressMax =
    showPreparing || !progress || progress.total <= 0 ? 100 : progress.total;
  const progressValue = showPreparing
    ? null
    : loading
      ? progress?.current ?? 0
      : progressMax;
  const inlineProgressLabel =
    showPreparing || !progress
      ? "正在準備回填清單..."
      : loading
        ? `處理 ${progress.current}/${progress.total}`
        : `完成 ${progress.current}/${progress.total}`;

  if (variant === "toast") {
    return (
      <div
        role={loading ? "status" : undefined}
        aria-live={loading ? "polite" : undefined}
        className={cn("grid w-full gap-3", className)}
      >
        <div className="flex items-start gap-3">
          <IconTile tone={loading ? "primary" : "success"} size="sm" className="mt-0.5">
            {loading ? <Spinner /> : <CheckCircle2 className="h-4 w-4" />}
          </IconTile>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-popover-foreground">
                {loading
                  ? showPreparing
                    ? "BOOTH Shop 回填準備中"
                    : "BOOTH Shop 回填中"
                  : "BOOTH Shop 回填完成"}
              </p>
              <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                {showPreparing ? "準備中" : `${loading ? percent : 100}%`}
              </span>
            </div>
            {message && (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {message}
              </p>
            )}
          </div>
        </div>
        <Progress
          value={progressValue}
          max={progressMax}
          indeterminate={showPreparing}
        />
        <BackfillProgressCounts progress={progress} />
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="truncate">{inlineProgressLabel}</span>
        <span className="shrink-0 tabular-nums">
          {showPreparing ? "準備中" : `${loading ? percent : 100}%`}
        </span>
      </div>
      <Progress
        className="h-1.5 bg-sidebar"
        value={progressValue}
        max={progressMax}
        indeterminate={showPreparing}
      />
      <BackfillProgressCounts
        progress={progress}
        className="gap-x-2 gap-y-0.5 text-[10px]"
      />
    </div>
  );
}

function BackfillProgressCounts({
  className,
  progress,
}: {
  className?: string;
  progress: BoothShopBackfillProgress | null;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground",
        className,
      )}
    >
      <span className="tabular-nums">更新 {progress?.updated ?? 0}</span>
      <span className="tabular-nums">略過 {progress?.skipped ?? 0}</span>
      <span className="tabular-nums">失敗 {progress?.failed ?? 0}</span>
    </div>
  );
}

export { BoothShopBackfillProgressView };
