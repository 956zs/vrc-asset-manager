"use client";

import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type AssetDetailHeaderProps = {
  isEditing: boolean;
  onStartEditing: () => void;
  onClose: () => void;
};

export function AssetDetailHeader({
  isEditing,
  onStartEditing,
  onClose,
}: AssetDetailHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
      <div className="min-w-0">
        <h2 className="truncate font-semibold text-foreground">管理素材</h2>
        <p className="text-xs text-muted-foreground">
          {isEditing ? "編輯中" : "檢視模式"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="編輯素材"
            aria-label="編輯素材"
            onClick={onStartEditing}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="關閉詳情"
          aria-label="關閉詳情"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
