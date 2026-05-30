import { FolderPlus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VccToolbarProps = {
  projectCount: number;
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
  onAddProject: () => void;
};

export function VccToolbar({
  projectCount,
  error,
  loading,
  onRefresh,
  onAddProject,
}: VccToolbarProps) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{projectCount} 個專案</p>
        {error && <p className="truncate text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={onRefresh}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          重新掃描
        </Button>
        <Button type="button" size="sm" disabled={loading} onClick={onAddProject}>
          <FolderPlus className="h-4 w-4" />
          加入專案
        </Button>
      </div>
    </div>
  );
}
