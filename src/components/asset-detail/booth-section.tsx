"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AssetDetailBoothSectionProps = {
  isEditing: boolean;
  boothUrl: string;
  onBoothUrlChange: (boothUrl: string) => void;
  onOpenBooth: () => void;
};

export function AssetDetailBoothSection({
  isEditing,
  boothUrl,
  onBoothUrlChange,
  onOpenBooth,
}: AssetDetailBoothSectionProps) {
  return (
    <div className="min-w-0">
      <label className="text-sm font-medium text-muted-foreground">
        Booth 連結
      </label>
      {isEditing ? (
        <div className="mt-1 grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_2.25rem] gap-2">
          <Input
            value={boothUrl}
            onChange={(event) => onBoothUrlChange(event.target.value)}
            placeholder="https://booth.pm/ja/items/..."
            className="min-w-0"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            data-context-url={boothUrl.trim() || undefined}
            onClick={onOpenBooth}
            disabled={!boothUrl.trim()}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="mt-1 flex min-w-0 items-start gap-2">
          <p className="min-w-0 flex-1 break-all text-sm text-foreground">
            {boothUrl || "未設定"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            data-context-url={boothUrl || undefined}
            onClick={onOpenBooth}
            disabled={!boothUrl}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
