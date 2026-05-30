"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Image as ImageIcon, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/stores/asset-store";
import type { Asset } from "@/types";

type RelatedAsset = {
  asset: Asset;
  score: number;
  reasons: string[];
};

const displayAssetName = (asset: Asset) => asset.display_name || asset.name;

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .split(/[\s_\-()[\]{}.,，。/\\]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

const buildRelatedAssets = (source: Asset, assets: Asset[]): RelatedAsset[] => {
  const sourceModelIds = new Set(source.models.map((model) => model.id));
  const sourceTagIds = new Set(source.tags.map((tag) => tag.id));
  const sourceTokens = new Set(tokenize(displayAssetName(source)));

  return assets
    .filter((asset) => asset.id !== source.id)
    .map((asset) => {
      const sharedModels = asset.models.filter((model) => sourceModelIds.has(model.id));
      const sharedTags = asset.tags.filter((tag) => sourceTagIds.has(tag.id));
      const sharedTokens = tokenize(displayAssetName(asset)).filter((token) =>
        sourceTokens.has(token),
      );
      const score =
        sharedModels.length * 4 + sharedTags.length * 3 + sharedTokens.length;
      const reasons = [
        ...sharedModels.map((model) => `模型：${model.display_name || model.name}`),
        ...sharedTags.map((tag) => `標籤：${tag.name}`),
        ...sharedTokens.slice(0, 2).map((token) => `名稱：${token}`),
      ];

      return { asset, score, reasons };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return displayAssetName(left.asset).localeCompare(displayAssetName(right.asset));
    });
};

export function AssetRelatedDialog() {
  const {
    relatedAssetSearchId,
    closeRelatedAssetSearch,
    selectAsset,
    getAllAssets,
  } = useAssetStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (relatedAssetSearchId === null) {
      return;
    }

    setLoading(true);
    void getAllAssets()
      .then(setAssets)
      .catch((error) => {
        console.warn(error);
        setAssets([]);
      })
      .finally(() => setLoading(false));
  }, [relatedAssetSearchId, getAllAssets]);

  const sourceAsset = useMemo(
    () => assets.find((asset) => asset.id === relatedAssetSearchId) ?? null,
    [assets, relatedAssetSearchId],
  );
  const relatedAssets = useMemo(
    () => (sourceAsset ? buildRelatedAssets(sourceAsset, assets) : []),
    [assets, sourceAsset],
  );

  return (
    <Dialog
      open={relatedAssetSearchId !== null}
      onOpenChange={(open) => {
        if (!open) {
          closeRelatedAssetSearch();
        }
      }}
    >
      <DialogContent className="max-h-[86vh] min-w-0 overflow-hidden sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>相關素材</DialogTitle>
          <DialogDescription>
            依相同模型、標籤與名稱關鍵字尋找可能相關的素材
          </DialogDescription>
        </DialogHeader>

        {sourceAsset && (
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">來源素材</p>
            <p className="mt-1 truncate text-sm font-medium text-foreground">
              {displayAssetName(sourceAsset)}
            </p>
          </div>
        )}

        <ScrollArea className="min-h-0 max-h-[56vh]">
          <div className="space-y-2 pr-3">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Search className="h-4 w-4 animate-pulse" />
                搜尋中
              </div>
            ) : relatedAssets.length > 0 ? (
              relatedAssets.map(({ asset, reasons }) => (
                <button
                  key={asset.id}
                  type="button"
                  className={cn(
                    "grid w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-card p-2 text-left transition-colors",
                    "hover:border-primary/60 hover:bg-accent/50",
                  )}
                  onClick={() => {
                    selectAsset(asset.id);
                    closeRelatedAssetSearch();
                  }}
                >
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-muted">
                    {asset.thumbnail_url ? (
                      <img
                        src={asset.thumbnail_url}
                        alt={displayAssetName(asset)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-card-foreground">
                      {displayAssetName(asset)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {reasons.slice(0, 4).map((reason) => (
                        <Badge key={reason} variant="secondary" className="text-[11px]">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                沒有找到明顯相關的素材
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={closeRelatedAssetSearch}>
            關閉
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
