"use client";

import { FolderOpen, Pencil, Save, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type AssetDetailFooterProps = {
  isEditing: boolean;
  saving: boolean;
  hasChanges: boolean;
  displayName: string;
  filePath: string;
  onCancelEditing: () => void;
  onSave: () => void;
  onDelete: () => void;
  onStartEditing: () => void;
  onOpenFolder: () => void;
};

function EditActionButtons({
  saving,
  hasChanges,
  onCancelEditing,
  onSave,
}: Pick<AssetDetailFooterProps, "saving" | "hasChanges" | "onCancelEditing" | "onSave">) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-2">
      <Button
        type="button"
        variant="outline"
        className="min-w-0"
        disabled={saving}
        onClick={onCancelEditing}
      >
        取消
      </Button>
      <Button
        type="button"
        className="min-w-0"
        disabled={!hasChanges || saving}
        onClick={onSave}
      >
        <Save className="h-4 w-4" />
        {saving ? "儲存中" : "儲存"}
      </Button>
    </div>
  );
}

function DeleteAssetDialog({
  displayName,
  saving,
  onDelete,
}: Pick<AssetDetailFooterProps, "displayName" | "saving" | "onDelete">) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          className="w-full min-w-0"
          disabled={saving}
        >
          <Trash2 className="h-4 w-4" />
          刪除素材
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確定要刪除這個素材嗎？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作將從資料庫中移除「{displayName}」的記錄。實際檔案不會被刪除。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete}>刪除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function EditingFooter(props: AssetDetailFooterProps) {
  return (
    <>
      <EditActionButtons
        saving={props.saving}
        hasChanges={props.hasChanges}
        onCancelEditing={props.onCancelEditing}
        onSave={props.onSave}
      />
      <DeleteAssetDialog
        displayName={props.displayName}
        saving={props.saving}
        onDelete={props.onDelete}
      />
    </>
  );
}

function ReadonlyFooter({
  filePath,
  onOpenFolder,
  onStartEditing,
}: Pick<AssetDetailFooterProps, "filePath" | "onOpenFolder" | "onStartEditing">) {
  return (
    <>
      <Button type="button" className="w-full min-w-0" onClick={onStartEditing}>
        <Pencil className="h-4 w-4" />
        編輯素材
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full min-w-0 justify-start"
        onClick={onOpenFolder}
        disabled={!filePath.trim()}
        data-context-path={filePath.trim() || undefined}
      >
        <FolderOpen className="h-4 w-4" />
        開啟素材資料夾
      </Button>
    </>
  );
}

export function AssetDetailFooter(props: AssetDetailFooterProps) {
  return (
    <div className="shrink-0 space-y-2 border-t border-border px-5 py-4">
      {props.isEditing ? <EditingFooter {...props} /> : <ReadonlyFooter {...props} />}
    </div>
  );
}
