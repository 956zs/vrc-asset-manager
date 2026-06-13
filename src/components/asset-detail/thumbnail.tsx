"use client";

import { Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AssetDetailThumbnailProps = {
  thumbnailUrl: string;
  displayName: string;
  sensitive: boolean;
};

export function AssetDetailThumbnail({
  thumbnailUrl,
  displayName,
  sensitive,
}: AssetDetailThumbnailProps) {
  return (
    <div
      className="relative h-72 min-w-0 overflow-hidden rounded-lg border border-border/60 bg-muted"
      data-sensitive-preview={sensitive ? "" : undefined}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={displayName}
          className={cn(
            "h-full w-full object-contain",
            sensitive && "sensitive-thumbnail-media",
          )}
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
