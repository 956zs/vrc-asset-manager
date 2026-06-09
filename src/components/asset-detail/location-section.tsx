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

function LocationBrowseActions({
  onBrowseFile,
  onBrowseFolder,
}: Pick<AssetDetailLocationSectionProps, "onBrowseFile" | "onBrowseFolder">) {
  return (
    <div className="mt-2 grid min-w-0 max-w-full grid-cols-2 gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-w-0"
        title="選檔案"
        aria-label="選檔案"
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
        title="選資料夾"
        aria-label="選資料夾"
        onClick={onBrowseFolder}
      >
        <FolderSearch className="h-4 w-4" />
        選資料夾
      </Button>
    </div>
  );
}

function EditableLocationField({
  filePath,
  onFilePathChange,
  onBrowseFile,
  onBrowseFolder,
}: Omit<AssetDetailLocationSectionProps, "isEditing">) {
  return (
    <>
      <Input
        value={filePath}
        onChange={(event) => onFilePathChange(event.target.value)}
        className="mt-1 min-w-0 font-mono text-xs"
      />
      <LocationBrowseActions
        onBrowseFile={onBrowseFile}
        onBrowseFolder={onBrowseFolder}
      />
    </>
  );
}

function ReadonlyLocationField({ filePath }: { filePath: string }) {
  return (
    <p
      className="mt-1 break-all font-mono text-xs text-foreground"
      data-context-path={filePath}
    >
      {filePath}
    </p>
  );
}

export function AssetDetailLocationSection(props: AssetDetailLocationSectionProps) {
  return (
    <div className="min-w-0">
      <label className="text-sm font-medium text-muted-foreground">素材位置</label>
      {props.isEditing ? (
        <EditableLocationField {...props} />
      ) : (
        <ReadonlyLocationField filePath={props.filePath} />
      )}
    </div>
  );
}
