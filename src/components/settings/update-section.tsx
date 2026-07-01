import type { Update } from "@tauri-apps/plugin-updater";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Info,
  Newspaper,
  Power,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetaBadge } from "@/components/ui/meta-badge";
import { Panel } from "@/components/ui/panel";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { StatusMessage } from "@/components/ui/status-message";
import { SettingsSection } from "./settings-section";
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
  onRestartApp: () => void | Promise<void>;
  onOpenReleaseNotes: () => void | Promise<void>;
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
  | "onRestartApp"
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
  onRestartApp,
}: UpdateHeaderProps) {
  const busy = updateStatus === "checking" || updateStatus === "downloading";

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">更新</h3>
            <MetaBadge>
              {appVersion ? `目前 v${appVersion}` : "版本未知"}
            </MetaBadge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{updateDescription}</p>
        </div>
        <UpdateHeaderActions
          busy={busy}
          update={update}
          updateStatus={updateStatus}
          onCheckUpdate={onCheckUpdate}
          onInstallUpdate={onInstallUpdate}
          onRestartApp={onRestartApp}
        />
      </div>
      {updateStatus === "downloading" && (
        <Progress className="mt-4" value={downloadPercent ?? 18} />
      )}
    </Panel>
  );
}

function UpdateHeaderActions({
  busy,
  update,
  updateStatus,
  onCheckUpdate,
  onInstallUpdate,
  onRestartApp,
}: Pick<
  UpdateHeaderProps,
  "update" | "updateStatus" | "onCheckUpdate" | "onInstallUpdate" | "onRestartApp"
> & {
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
          <Spinner />
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
      {updateStatus === "installed" && (
        <Button type="button" onClick={() => void onRestartApp()}>
          <Power className="h-4 w-4" />
          立即重啟
        </Button>
      )}
    </div>
  );
}

function AvailableUpdateMessage({ update }: { update: Update }) {
  return (
    <StatusMessage
      tone="success"
      icon={<Download className="h-4 w-4" />}
      title={`v${update.version}`}
    >
      {update.body && (
        <p className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-muted-foreground">
          {update.body}
        </p>
      )}
    </StatusMessage>
  );
}

function SuccessUpdateMessage({ children }: { children: string }) {
  return (
    <StatusMessage tone="success" icon={<CheckCircle2 className="h-4 w-4" />}>
      {children}
    </StatusMessage>
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
    <StatusMessage
      tone="info"
      icon={<Info className="h-4 w-4" />}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void onOpenReleases()}
        >
          <ExternalLink className="h-4 w-4" />
          開啟 Releases
        </Button>
      }
    >
      {message}
    </StatusMessage>
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
      <StatusMessage tone="danger" icon={<TriangleAlert className="h-4 w-4" />}>
        {updateMessage}
      </StatusMessage>
    );
  }
  return null;
}

function LocalReleaseNotesPanel({
  onOpenReleaseNotes,
}: Pick<UpdateSectionProps, "onOpenReleaseNotes">) {
  return (
    <Panel className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">本版更新內容</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            查看已內建在 app 裡的 first-run release notes。
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void onOpenReleaseNotes()}>
          <Newspaper className="h-4 w-4" />
          查看更新內容
        </Button>
      </div>
    </Panel>
  );
}

export function UpdateSection(props: UpdateSectionProps) {
  return (
    <SettingsSection>
      <UpdateHeader {...props} />
      <LocalReleaseNotesPanel onOpenReleaseNotes={props.onOpenReleaseNotes} />
      <UpdateStatusMessage {...props} />
    </SettingsSection>
  );
}
