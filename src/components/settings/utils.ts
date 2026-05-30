import type { AssetHealthIssue } from "@/types";

export type SettingsTab = "overview" | "updates" | "health" | "about";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "current"
  | "downloading"
  | "installed"
  | "error";

export const releaseUrl = "https://github.com/956zs/vrc-asset-manager/releases";

export const toMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const formatPercent = (downloaded: number, total: number | null) => {
  if (!total || total <= 0) {
    return null;
  }

  return Math.min(100, Math.round((downloaded / total) * 100));
};

export const displayIssueName = (issue: AssetHealthIssue) =>
  issue.displayName || issue.name;

export const issueLabel = (status: string) => {
  switch (status) {
    case "missing":
      return "缺失";
    case "unreadable":
      return "無法讀取";
    case "emptyFile":
      return "空檔案";
    case "emptyDirectory":
      return "空資料夾";
    case "unsupported":
      return "不支援";
    default:
      return status;
  }
};

export const issueBadgeVariant = (
  status: string,
): "destructive" | "outline" | "secondary" =>
  status === "missing" || status === "unreadable"
    ? "destructive"
    : status === "unsupported"
      ? "outline"
      : "secondary";
