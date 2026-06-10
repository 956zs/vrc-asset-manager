"use client";

import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { FolderPlus, FolderSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/stores/asset-store";

type LibraryRootActionsProps = {
  compact?: boolean;
  className?: string;
};

async function pickDirectory(title: string) {
  const selected = await openDialog({
    title,
    multiple: false,
    directory: true,
  });

  return typeof selected === "string" ? selected : null;
}

export function LibraryRootActions({ compact, className }: LibraryRootActionsProps) {
  const librarySettings = useAssetStore((state) => state.librarySettings);
  const configureLibraryRoot = useAssetStore((state) => state.configureLibraryRoot);
  const saving = useAssetStore((state) => state.saving);
  const hasRoot = Boolean(librarySettings?.rootPath);

  const selectExistingRoot = async () => {
    const selected = await pickDirectory("選取素材庫根目錄");
    if (selected) await configureLibraryRoot(selected);
  };
  const createRootFolders = async () => {
    const selected = await pickDirectory("選擇要建立三個分類資料夾的位置");
    if (selected) await configureLibraryRoot(selected);
  };

  return (
    <div
      className={cn(
        "space-y-3 rounded-md border border-dashed border-border bg-muted/30 p-3",
        hasRoot && "border-solid",
        className,
      )}
    >
      <div>
        <p className="text-sm font-medium">設定素材庫根目錄</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {hasRoot
            ? librarySettings?.rootPath
            : "選取既有素材庫，或讓 app 在指定位置建立「素體」「素體配件」「世界」三個空資料夾。"}
        </p>
        {!compact && hasRoot && (
          <p className="mt-2 text-xs text-muted-foreground">
            變更根目錄不會自動搬移既有素材檔案。
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={saving}
          onClick={() => void selectExistingRoot()}
        >
          <FolderSearch className="h-4 w-4" />
          自己選取
        </Button>
        <Button
          type="button"
          variant={hasRoot ? "outline" : "default"}
          size="sm"
          disabled={saving}
          onClick={() => void createRootFolders()}
        >
          <FolderPlus className="h-4 w-4" />
          幫我建立
        </Button>
      </div>
    </div>
  );
}
