"use client";

import { Package } from "lucide-react";
import { AssetCard } from "@/components/asset-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAssetStore } from "@/stores/asset-store";

export function AssetGrid() {
  const { loading, selectedAssetId, selectAsset, getFilteredAssets } = useAssetStore();
  const filteredAssets = getFilteredAssets();

  if (filteredAssets.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="space-y-3 text-center">
          <Package className="mx-auto h-16 w-16 text-muted-foreground/50" />
          <div>
            <h3 className="font-medium text-foreground">
              {loading ? "載入素材中" : "沒有找到素材"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {loading ? "正在同步本機資料庫" : "嘗試調整篩選條件或新增素材"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="p-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-4">
          {filteredAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              isSelected={selectedAssetId === asset.id}
              onClick={() => selectAsset(asset.id)}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
