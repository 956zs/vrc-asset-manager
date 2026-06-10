"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AssetDetailBoothSectionProps = {
  isEditing: boolean;
  boothUrl: string;
  fetching: boolean;
  onBoothUrlChange: (boothUrl: string) => void;
  onFetchProductInfo: () => void;
  onOpenBooth: () => void;
};

export function AssetDetailBoothSection({
  isEditing,
  boothUrl,
  fetching,
  onBoothUrlChange,
  onFetchProductInfo,
  onOpenBooth,
}: AssetDetailBoothSectionProps) {
  return (
    <div className="min-w-0">
      <label className="text-sm font-medium text-muted-foreground">
        Booth 連結
      </label>
      {isEditing ? (
        <>
          <div className="asset-detail-action-grid mt-1 grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_2.25rem] gap-2">
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 w-full min-w-0"
            onClick={onFetchProductInfo}
            disabled={!boothUrl.trim() || fetching}
          >
            {fetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "抓取資訊"
            )}
          </Button>
        </>
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
