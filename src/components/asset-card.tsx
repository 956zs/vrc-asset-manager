"use client";

import { AlertTriangle, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types";

const DATA_SVG_PREFIX = "data:image/svg+xml";
const assetCardVisibleTagLimit = 3;
const assetCardVisibleModelLimit = 2;

interface AssetCardProps {
  asset: Asset;
  isSelected: boolean;
  onClick: () => void;
}

export function AssetCard({ asset, isSelected, onClick }: AssetCardProps) {
  const displayName = asset.display_name || asset.name;

  return (
    <Card
      data-context-asset-id={asset.id}
      data-context-asset-name={displayName}
      data-context-path={asset.file_path}
      data-context-url={asset.booth_url || undefined}
      className={cn(
        "group relative self-start overflow-hidden py-0 transition-all duration-200",
        "cursor-pointer",
        "hover:ring-2 hover:ring-ring hover:shadow-md",
        isSelected && "ring-2 ring-primary shadow-md",
      )}
      onClick={onClick}
    >
      <AssetThumbnail asset={asset} displayName={displayName} />

      <div className="space-y-2 p-3">
        <h3 className="line-clamp-2 text-sm leading-tight font-medium text-foreground">
          {displayName}
        </h3>

        <AssetTags tags={asset.tags} />
        <AssetModels models={asset.models} />
      </div>
    </Card>
  );
}

function AssetThumbnail({
  asset,
  displayName,
}: {
  asset: Asset;
  displayName: string;
}) {
  const thumbnailIsSvg = isSvgThumbnail(asset.thumbnail_url);

  return (
    <div className="relative aspect-[4/3] overflow-hidden border-b border-border/60 bg-muted/70">
      {asset.thumbnail_url ? (
        <img
          src={asset.thumbnail_url}
          alt={displayName}
          className={cn(
            "h-full w-full bg-muted",
            thumbnailIsSvg ? "object-contain p-3" : "object-cover",
          )}
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
        <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
      </div>

      {!asset.file_exists && <MissingFileBadge />}
    </div>
  );
}

function MissingFileBadge() {
  return (
    <div className="absolute top-2 right-2">
      <Badge variant="destructive" className="gap-1 px-1.5 py-0.5">
        <AlertTriangle className="h-3 w-3" />
        <span className="text-xs">檔案遺失</span>
      </Badge>
    </div>
  );
}

function AssetTags({ tags }: { tags: Asset["tags"] }) {
  if (tags.length === 0) {
    return null;
  }

  const badges = [];
  let renderedTagCount = 0;

  for (const tag of tags) {
    if (renderedTagCount >= assetCardVisibleTagLimit) {
      break;
    }

    badges.push(
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
      </Badge>,
    );
    renderedTagCount += 1;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {badges}
      {tags.length > assetCardVisibleTagLimit && (
        <Badge variant="secondary" className="px-1.5 py-0 text-xs">
          +{tags.length - assetCardVisibleTagLimit}
        </Badge>
      )}
    </div>
  );
}

function AssetModels({ models }: { models: Asset["models"] }) {
  if (models.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <span className="truncate">{formatAssetModelSummary(models)}</span>
    </div>
  );
}

function formatAssetModelSummary(models: Asset["models"]) {
  let summary = "";
  let renderedModelCount = 0;

  for (const model of models) {
    if (renderedModelCount >= assetCardVisibleModelLimit) {
      break;
    }

    if (summary.length > 0) {
      summary += ", ";
    }

    summary += model.display_name || model.name;
    renderedModelCount += 1;
  }

  if (models.length <= assetCardVisibleModelLimit) {
    return summary;
  }

  return `${summary} +${models.length - assetCardVisibleModelLimit}`;
}

function isSvgThumbnail(thumbnailUrl: string | null) {
  return thumbnailUrl?.trimStart().startsWith(DATA_SVG_PREFIX) ?? false;
}
