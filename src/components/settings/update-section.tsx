import type { Update } from "@tauri-apps/plugin-updater";
import {
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UpdateStatus } from "./utils";

type UpdateSectionProps = {
  appVersion: string | null;
  update: Update | null;
  updateStatus: UpdateStatus;
  updateMessage: string | null;
  updateDescription: string;
  downloadPercent: number | null;
  onCheckUpdate: () => void | Promise<void>;
  onInstallUpdate: () => void | Promise<void>;
};

export function UpdateSection({
  appVersion,
  update,
  updateStatus,
  updateMessage,
  updateDescription,
  downloadPercent,
  onCheckUpdate,
  onInstallUpdate,
}: UpdateSectionProps) {
  const busy = updateStatus === "checking" || updateStatus === "downloading";

  return (
    <section className="flex min-h-full flex-col gap-4">
      <div className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">更新</h3>
              <Badge variant="outline">{appVersion ? `目前 v${appVersion}` : "版本未知"}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{updateDescription}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void onCheckUpdate()}
            >
              {updateStatus === "checking" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              檢查更新
            </Button>
            {updateStatus === "available" && update && (
              <Button type="button" onClick={() => void onInstallUpdate()}>
                <Download className="h-4 w-4" />
                下載安裝
              </Button>
            )}
          </div>
        </div>

        {updateStatus === "downloading" && (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${downloadPercent ?? 18}%` }}
            />
          </div>
        )}
      </div>

      {updateStatus === "available" && update && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-foreground">
          <div className="flex items-center gap-2 font-medium">
            <Download className="h-4 w-4 text-primary" />
            v{update.version}
          </div>
          {update.body && (
            <p className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-muted-foreground">
              {update.body}
            </p>
          )}
        </div>
      )}

      {updateStatus === "current" && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          目前已是最新版本
        </div>
      )}

      {updateStatus === "installed" && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          更新已安裝，重新啟動後生效
        </div>
      )}

      {updateStatus === "error" && updateMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <TriangleAlert className="h-4 w-4" />
          {updateMessage}
        </div>
      )}
      <div className="min-h-[160px] flex-1 rounded-lg border border-dashed border-border bg-background/50" />
    </section>
  );
}
