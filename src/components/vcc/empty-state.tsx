import { FolderPlus, PackageSearch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type VccEmptyStateProps = {
  error: string | null;
  onAddProject: () => void;
};

export function VccEmptyState({ error, onAddProject }: VccEmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <EmptyState
        className="border-0 bg-transparent p-0 shadow-none"
        icon={<PackageSearch className="h-7 w-7" />}
        iconClassName="size-16 bg-muted/50 text-muted-foreground"
        title="尚未加入 VCC 專案"
        description="加入 Unity 專案資料夾"
        action={
          <>
            <Button type="button" onClick={onAddProject}>
              <FolderPlus className="h-4 w-4" />
              加入專案
            </Button>
            {error && (
              <p className="max-w-sm text-sm text-destructive">{error}</p>
            )}
          </>
        }
      />
    </div>
  );
}
