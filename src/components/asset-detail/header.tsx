import { Pencil, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";

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
          <IconButton
            label="編輯素材"
            icon={<Pencil className="h-4 w-4" />}
            onClick={onStartEditing}
          />
        )}
        <IconButton
          label="關閉詳情"
          icon={<X className="h-4 w-4" />}
          onClick={onClose}
        />
      </div>
    </div>
  );
}
