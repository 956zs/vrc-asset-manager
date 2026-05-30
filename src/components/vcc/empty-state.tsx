import { FolderPlus, PackageSearch } from "lucide-react";

import { Button } from "@/components/ui/button";

type VccEmptyStateProps = {
  error: string | null;
  onAddProject: () => void;
};

export function VccEmptyState({ error, onAddProject }: VccEmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="space-y-4 text-center">
        <PackageSearch className="mx-auto h-16 w-16 text-muted-foreground/50" />
        <div>
          <h3 className="font-medium text-foreground">尚未加入 VCC 專案</h3>
          <p className="text-sm text-muted-foreground">加入 Unity 專案資料夾</p>
        </div>
        <Button type="button" onClick={onAddProject}>
          <FolderPlus className="h-4 w-4" />
          加入專案
        </Button>
        {error && <p className="max-w-sm text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
