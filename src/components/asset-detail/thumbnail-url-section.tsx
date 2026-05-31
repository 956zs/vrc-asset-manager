"use client";

import { ImageDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AssetDetailThumbnailUrlSectionProps = {
  thumbnailUrl: string;
  boothUrl: string;
  fetching: boolean;
  onThumbnailUrlChange: (thumbnailUrl: string) => void;
  onFetchThumbnail: () => void;
};

export function AssetDetailThumbnailUrlSection({
  thumbnailUrl,
  boothUrl,
  fetching,
  onThumbnailUrlChange,
  onFetchThumbnail,
}: AssetDetailThumbnailUrlSectionProps) {
  return (
    <div className="min-w-0">
      <label className="text-sm font-medium text-muted-foreground">
        縮圖 URL
      </label>
      <div className="mt-1 grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_2.25rem] gap-2">
        <Input
          value={thumbnailUrl}
          onChange={(event) => onThumbnailUrlChange(event.target.value)}
          placeholder="https://..."
          className="min-w-0"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onFetchThumbnail}
          disabled={!boothUrl.trim() || fetching}
        >
          {fetching ? (
            <ImageDown className="h-4 w-4 animate-pulse" />
          ) : (
            <ImageDown className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
