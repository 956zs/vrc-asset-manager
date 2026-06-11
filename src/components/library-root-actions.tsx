"use client";

import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { FolderSearch } from "lucide-react";
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

  const selectLibraryRoot = async () => {
    const selected = await pickDirectory("選擇素材庫根目錄");
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
            : "選取一個資料夾作為素材庫根目錄；真正導入素材時才會依分類建立需要的資料夾。"}
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
          onClick={() => void selectLibraryRoot()}
        >
          <FolderSearch className="h-4 w-4" />
          選擇根目錄
        </Button>
      </div>
    </div>
  );
}
