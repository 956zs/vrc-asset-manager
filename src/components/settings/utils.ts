import type { AssetHealthIssue } from "@/types";

export type SettingsTab = "overview" | "updates" | "health" | "about";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "current"
  | "unavailable"
  | "downloading"
  | "installed"
  | "error";

export const releaseUrl = "https://github.com/956zs/vrc-asset-manager/releases";

export const toMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const isPrereleaseVersion = (version: string | null) =>
  Boolean(version && /-(alpha|beta|rc|dev|preview)/i.test(version));

const releaseJsonUnavailablePatterns = [
  "could not fetch a valid release json",
  "latest.json",
  "release not found",
  "not found",
  "404",
];

export const isReleaseJsonUnavailable = (message: string) => {
  const normalized = message.toLowerCase();

  return releaseJsonUnavailablePatterns.some((pattern) =>
    normalized.includes(pattern),
  );
};

export const formatUpdateErrorMessage = (
  message: string,
  appVersion: string | null,
) => {
  if (isReleaseJsonUnavailable(message)) {
    return isPrereleaseVersion(appVersion)
      ? "目前 beta 版沒有可用的公開更新資訊。Draft / prerelease 不會透過 stable 更新端點推送，請到 GitHub Releases 手動確認。"
      : "目前沒有可用的公開更新資訊。請稍後再試，或到 GitHub Releases 手動確認。";
  }

  return message;
};

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
