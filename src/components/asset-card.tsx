"use client";

import { AlertTriangle, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types";

interface AssetCardProps {
  asset: Asset;
  isSelected: boolean;
  onClick: () => void;
}

export function AssetCard({ asset, isSelected, onClick }: AssetCardProps) {
  const displayName = asset.display_name || asset.name;

  return (
    <Card
      className={cn(
        "group relative cursor-pointer overflow-hidden py-0 transition-all duration-200",
        "hover:ring-2 hover:ring-ring hover:shadow-md",
        isSelected && "ring-2 ring-primary shadow-md",
      )}
      onClick={onClick}
    >
      <div className="relative aspect-square bg-muted">
        {asset.thumbnail_url ? (
          <img
            src={asset.thumbnail_url}
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
            "absolute inset-0 flex items-center justify-center bg-muted",
            asset.thumbnail_url && "hidden",
          )}
        >
          <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
        </div>

        {!asset.file_exists && (
          <div className="absolute top-2 right-2">
            <Badge variant="destructive" className="gap-1 px-1.5 py-0.5">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-xs">檔案遺失</span>
            </Badge>
          </div>
        )}
      </div>

      <div className="space-y-2 p-3">
        <h3 className="line-clamp-2 text-sm leading-tight font-medium text-foreground">
          {displayName}
        </h3>

        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {asset.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="px-1.5 py-0 text-xs"
                style={{
                  backgroundColor: `${tag.color}20`,
                  color: tag.color,
                  borderColor: `${tag.color}40`,
                }}
              >
                {tag.name}
              </Badge>
            ))}
            {asset.tags.length > 3 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                +{asset.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {asset.models.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="truncate">
              {asset.models
                .slice(0, 2)
                .map((model) => model.display_name || model.name)
                .join(", ")}
              {asset.models.length > 2 && ` +${asset.models.length - 2}`}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
