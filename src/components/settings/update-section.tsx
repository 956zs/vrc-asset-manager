import type { Update } from "@tauri-apps/plugin-updater";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Info,
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
  onOpenReleases: () => void | Promise<void>;
};

type UpdateHeaderProps = Pick<
  UpdateSectionProps,
  | "appVersion"
  | "update"
  | "updateStatus"
  | "updateDescription"
  | "downloadPercent"
  | "onCheckUpdate"
  | "onInstallUpdate"
>;

type UpdateStatusMessageProps = Pick<
  UpdateSectionProps,
  "update" | "updateStatus" | "updateMessage" | "onOpenReleases"
>;

function UpdateHeader({
  appVersion,
  update,
  updateStatus,
  updateDescription,
  downloadPercent,
  onCheckUpdate,
  onInstallUpdate,
}: UpdateHeaderProps) {
  const busy = updateStatus === "checking" || updateStatus === "downloading";

  return (
    <div className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">更新</h3>
            <Badge variant="outline">
              {appVersion ? `目前 v${appVersion}` : "版本未知"}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{updateDescription}</p>
        </div>
        <UpdateHeaderActions
          busy={busy}
          update={update}
          updateStatus={updateStatus}
          onCheckUpdate={onCheckUpdate}
          onInstallUpdate={onInstallUpdate}
        />
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
  );
}

function UpdateHeaderActions({
  busy,
  update,
  updateStatus,
  onCheckUpdate,
  onInstallUpdate,
}: Pick<UpdateHeaderProps, "update" | "updateStatus" | "onCheckUpdate" | "onInstallUpdate"> & {
  busy: boolean;
}) {
  return (
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
  );
}

function AvailableUpdateMessage({ update }: { update: Update }) {
  return (
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
  );
}

function SuccessUpdateMessage({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-foreground">
      <CheckCircle2 className="h-4 w-4 text-primary" />
      {children}
    </div>
  );
}

function UnavailableUpdateMessage({
  message,
  onOpenReleases,
}: {
  message: string;
  onOpenReleases: () => void | Promise<void>;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/70 p-4 text-sm text-foreground">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground">{message}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void onOpenReleases()}
          >
            <ExternalLink className="h-4 w-4" />
            開啟 Releases
          </Button>
        </div>
      </div>
    </div>
  );
}

function UpdateStatusMessage({
  update,
  updateStatus,
  updateMessage,
  onOpenReleases,
}: UpdateStatusMessageProps) {
  if (updateStatus === "available" && update) {
    return <AvailableUpdateMessage update={update} />;
  }
  if (updateStatus === "current") {
    return <SuccessUpdateMessage>目前已是最新版本</SuccessUpdateMessage>;
  }
  if (updateStatus === "installed") {
    return <SuccessUpdateMessage>更新已安裝，重新啟動後生效</SuccessUpdateMessage>;
  }
  if (updateStatus === "unavailable" && updateMessage) {
    return <UnavailableUpdateMessage message={updateMessage} onOpenReleases={onOpenReleases} />;
  }
  if (updateStatus === "error" && updateMessage) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <TriangleAlert className="h-4 w-4" />
        {updateMessage}
      </div>
    );
  }
  return null;
}

export function UpdateSection(props: UpdateSectionProps) {
  return (
    <section className="flex min-h-full flex-col gap-4">
      <UpdateHeader {...props} />
      <UpdateStatusMessage {...props} />
    </section>
  );
}
