import { Package } from "lucide-react";
import { AssetCard } from "@/components/asset-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { useAssetStore } from "@/stores/asset-store";

export function AssetGrid() {
  const assets = useAssetStore((state) => state.assets);
  const loading = useAssetStore((state) => state.loading);
  const selectedAssetId = useAssetStore((state) => state.selectedAssetId);
  const selectAsset = useAssetStore((state) => state.selectAsset);

  if (assets.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <EmptyState
          className="w-full max-w-md"
          icon={loading ? <Spinner /> : <Package className="h-7 w-7" />}
          title={loading ? "載入素材中" : "沒有找到素材"}
          description={
            loading ? "正在同步本機資料庫" : "嘗試調整篩選條件或新增素材"
          }
        />
      </div>
    );
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="p-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] items-start gap-4">
          {assets.map((asset) => (
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
