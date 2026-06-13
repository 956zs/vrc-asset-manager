"use client";

import { FileSearch, FolderSearch } from "lucide-react";
import { DetailFieldLabel } from "@/components/asset-detail/detail-field-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MonoText } from "@/components/ui/mono-text";

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
    <div className="asset-detail-action-grid mt-2 grid min-w-0 max-w-full grid-cols-2 gap-2">
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
    <MonoText
      className="mt-1"
      data-context-path={filePath}
      tone="default"
      wrap="break"
    >
      {filePath}
    </MonoText>
  );
}

export function AssetDetailLocationSection(props: AssetDetailLocationSectionProps) {
  return (
    <div className="min-w-0">
      <DetailFieldLabel>素材位置</DetailFieldLabel>
      {props.isEditing ? (
        <EditableLocationField {...props} />
      ) : (
        <ReadonlyLocationField filePath={props.filePath} />
      )}
    </div>
  );
}
