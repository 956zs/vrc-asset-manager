import { FileText, Folder } from "lucide-react";

import { MonoText } from "@/components/ui/mono-text";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { SurfaceBox } from "@/components/ui/surface-box";
import { cn } from "@/lib/utils";

type FileContentEntry = {
  path: string;
  isDirectory?: boolean | null;
  sizeBytes?: number | null;
};

type FileContentListProps = {
  title: string;
  totalCount: number;
  entries: readonly FileContentEntry[];
  className?: string;
  emptyMessage?: string;
  hiddenCount?: number;
  loading?: boolean;
  loadingMessage?: string;
  scrollClassName?: string;
  truncated?: boolean;
};

function isDirectoryEntry(entry: FileContentEntry) {
  return Boolean(entry.isDirectory) || entry.path.endsWith("/") || entry.path.endsWith("\\");
}

function formatFileSize(sizeBytes?: number | null) {
  if (sizeBytes == null) return "";
  if (sizeBytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(sizeBytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = sizeBytes / 1024 ** unitIndex;
  const digits = unitIndex === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

function FileContentList({
  title,
  totalCount,
  entries,
  className,
  emptyMessage = "沒有可顯示的內容",
  hiddenCount,
  loading = false,
  loadingMessage = "正在讀取內容...",
  scrollClassName = "max-h-72",
  truncated = false,
}: FileContentListProps) {
  if (loading) {
    return (
      <SurfaceBox className="flex h-36 items-center justify-center border-border/70 bg-muted/15 text-muted-foreground">
        <Spinner className="h-5 w-5" />
        <span className="ml-2 text-sm">{loadingMessage}</span>
      </SurfaceBox>
    );
  }

  if (entries.length === 0) {
    return (
      <SurfaceBox
        variant="dashed"
        className="bg-muted/20 px-3 py-8 text-center text-xs text-muted-foreground"
      >
        {emptyMessage}
      </SurfaceBox>
    );
  }

  return (
    <SurfaceBox
      className={cn(
        "overflow-hidden bg-muted/15",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <span className="min-w-0 truncate text-xs font-semibold text-foreground/85">
          {title}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          共 {totalCount} 個項目
        </span>
      </div>
      <ScrollArea className={scrollClassName}>
        <ul className="divide-y divide-border/60">
          {entries.map((entry) => {
            const directory = isDirectoryEntry(entry);
            const sizeLabel = formatFileSize(entry.sizeBytes);

            return (
              <li
                key={entry.path}
                className="flex min-w-0 items-center gap-2 px-3 py-1.5 text-xs leading-5 text-muted-foreground"
              >
                {directory ? (
                  <Folder className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : (
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <MonoText
                  as="span"
                  className="min-w-0 flex-1 text-foreground/78"
                  title={entry.path}
                >
                  {entry.path}
                </MonoText>
                {sizeLabel && (
                  <span className="shrink-0 pl-2 font-mono text-[11px] leading-none text-muted-foreground">
                    {sizeLabel}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </ScrollArea>
      {truncated && (
        <div className="border-t border-border px-3 py-1.5 text-center text-[11px] text-muted-foreground">
          只列出前 {entries.length} 個，其餘 {hiddenCount ?? 0} 個項目未顯示
        </div>
      )}
    </SurfaceBox>
  );
}

export { FileContentList };
