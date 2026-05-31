"use client";

import { FileSearch, FolderSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AssetDetailLocationSectionProps = {
  isEditing: boolean;
  filePath: string;
  onFilePathChange: (filePath: string) => void;
  onBrowseFile: () => void;
  onBrowseFolder: () => void;
};

export function AssetDetailLocationSection({
  isEditing,
  filePath,
  onFilePathChange,
  onBrowseFile,
  onBrowseFolder,
}: AssetDetailLocationSectionProps) {
  return (
    <div className="min-w-0">
      <label className="text-sm font-medium text-muted-foreground">
        素材位置
      </label>
      {isEditing ? (
        <>
          <Input
            value={filePath}
            onChange={(event) => onFilePathChange(event.target.value)}
            className="mt-1 min-w-0 font-mono text-xs"
          />
          <div className="mt-2 grid min-w-0 max-w-full grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-w-0"
              onClick={onBrowseFile}
            >
              <FileSearch className="h-4 w-4" />
              選檔案
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-w-0"
              onClick={onBrowseFolder}
            >
              <FolderSearch className="h-4 w-4" />
              選資料夾
            </Button>
          </div>
        </>
      ) : (
        <p
          className="mt-1 break-all font-mono text-xs text-foreground"
          data-context-path={filePath}
        >
          {filePath}
        </p>
      )}
    </div>
  );
}
