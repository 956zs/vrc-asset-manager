"use client";

import { Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AssetDetailThumbnailProps = {
  thumbnailUrl: string;
  displayName: string;
};

export function AssetDetailThumbnail({
  thumbnailUrl,
  displayName,
}: AssetDetailThumbnailProps) {
  return (
    <div className="relative aspect-video min-w-0 overflow-hidden rounded-lg bg-muted">
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={displayName}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
            event.currentTarget.nextElementSibling?.classList.remove("hidden");
          }}
        />
      ) : null}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          thumbnailUrl && "hidden",
        )}
      >
        <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
      </div>
    </div>
  );
}
