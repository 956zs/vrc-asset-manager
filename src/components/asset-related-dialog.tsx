import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ListRow } from "@/components/ui/list-row";
import { MetaBadge } from "@/components/ui/meta-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { SurfaceBox } from "@/components/ui/surface-box";
import { useAssetStore } from "@/stores/asset-store";
import type { Asset } from "@/types";

type RelatedAsset = {
  asset: Asset;
  score: number;
  reasons: string[];
};

type RelatedAssetLookup = {
  sourceModelIds: Set<number>;
  sourceTagIds: Set<number>;
  sourceTokens: Set<string>;
};

const displayAssetName = (asset: Asset) => asset.display_name || asset.name;

const tokenize = (value: string) => {
  const tokens: string[] = [];

  for (const token of value.toLowerCase().split(/[\s_\-()[\]{}.,，。/\\]+/)) {
    const trimmedToken = token.trim();
    if (trimmedToken.length >= 2) {
      tokens.push(trimmedToken);
    }
  }

  return tokens;
};

const buildRelatedAssetLookup = (source: Asset): RelatedAssetLookup => ({
  sourceModelIds: new Set(source.models.map((model) => model.id)),
  sourceTagIds: new Set(source.tags.map((tag) => tag.id)),
  sourceTokens: new Set(tokenize(displayAssetName(source))),
});

const scoreRelatedAsset = (
  asset: Asset,
  lookup: RelatedAssetLookup,
): RelatedAsset | null => {
  const reasons: string[] = [];
  let score = 0;

  for (const model of asset.models) {
    if (lookup.sourceModelIds.has(model.id)) {
      score += 4;
      reasons.push(`模型：${model.display_name || model.name}`);
    }
  }

  for (const tag of asset.tags) {
    if (lookup.sourceTagIds.has(tag.id)) {
      score += 3;
      reasons.push(`標籤：${tag.name}`);
    }
  }

  let tokenReasonCount = 0;
  for (const token of tokenize(displayAssetName(asset))) {
    if (lookup.sourceTokens.has(token)) {
      score += 1;
      if (tokenReasonCount < 2) {
        reasons.push(`名稱：${token}`);
      }
      tokenReasonCount += 1;
    }
  }

  return score > 0 ? { asset, score, reasons } : null;
};

const buildRelatedAssets = (source: Asset, assets: Asset[]): RelatedAsset[] => {
  const lookup = buildRelatedAssetLookup(source);
  const relatedAssets: RelatedAsset[] = [];

  for (const asset of assets) {
    if (asset.id === source.id) {
      continue;
    }

    const relatedAsset = scoreRelatedAsset(asset, lookup);
    if (relatedAsset) {
      relatedAssets.push(relatedAsset);
    }
  }

  return relatedAssets.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return displayAssetName(left.asset).localeCompare(displayAssetName(right.asset));
  });
};

type AssetRelatedDialogController = {
  loading: boolean;
  open: boolean;
  relatedAssets: RelatedAsset[];
  sourceAsset: Asset | null;
  closeRelatedAssetSearch: () => void;
  onSelectAsset: (assetId: number) => void;
};

function useAssetRelatedDialogController(): AssetRelatedDialogController {
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

  return {
    loading,
    open: relatedAssetSearchId !== null,
    relatedAssets,
    sourceAsset,
    closeRelatedAssetSearch,
    onSelectAsset: (assetId) => {
      selectAsset(assetId);
      closeRelatedAssetSearch();
    },
  };
}

function SourceAssetSummary({ asset }: { asset: Asset | null }) {
  if (!asset) {
    return null;
  }

  return (
    <SurfaceBox className="bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">來源素材</p>
      <p className="mt-1 truncate text-sm font-medium text-foreground">
        {displayAssetName(asset)}
      </p>
    </SurfaceBox>
  );
}

function LoadingRelatedAssets() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Spinner />
      搜尋中
    </div>
  );
}

function RelatedAssetThumbnail({ asset }: { asset: Asset }) {
  return (
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
  );
}

function RelatedAssetReasons({ reasons }: { reasons: string[] }) {
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {reasons.slice(0, 4).map((reason) => (
        <MetaBadge key={reason} variant="secondary">
          {reason}
        </MetaBadge>
      ))}
    </div>
  );
}

function RelatedAssetRow({
  relatedAsset,
  onSelectAsset,
}: {
  relatedAsset: RelatedAsset;
  onSelectAsset: (assetId: number) => void;
}) {
  const { asset, reasons } = relatedAsset;

  return (
    <ListRow
      surface="card"
      className="p-2"
      leading={<RelatedAssetThumbnail asset={asset} />}
      onClick={() => onSelectAsset(asset.id)}
      title={displayAssetName(asset)}
      titleClassName="text-card-foreground"
      trailing={<ArrowRight className="h-4 w-4 text-muted-foreground" />}
    >
      <RelatedAssetReasons reasons={reasons} />
    </ListRow>
  );
}

function RelatedAssetsList({
  relatedAssets,
  onSelectAsset,
}: Pick<AssetRelatedDialogController, "relatedAssets" | "onSelectAsset">) {
  if (relatedAssets.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        沒有找到明顯相關的素材
      </div>
    );
  }

  return (
    <>
      {relatedAssets.map((relatedAsset) => (
        <RelatedAssetRow
          key={relatedAsset.asset.id}
          relatedAsset={relatedAsset}
          onSelectAsset={onSelectAsset}
        />
      ))}
    </>
  );
}

function RelatedAssetsScrollArea({
  loading,
  relatedAssets,
  onSelectAsset,
}: Pick<
  AssetRelatedDialogController,
  "loading" | "relatedAssets" | "onSelectAsset"
>) {
  return (
    <ScrollArea className="min-h-0 max-h-[56vh]">
      <div className="space-y-2 pr-3">
        {loading ? (
          <LoadingRelatedAssets />
        ) : (
          <RelatedAssetsList
            relatedAssets={relatedAssets}
            onSelectAsset={onSelectAsset}
          />
        )}
      </div>
    </ScrollArea>
  );
}

function AssetRelatedDialogLayout({
  loading,
  open,
  relatedAssets,
  sourceAsset,
  closeRelatedAssetSearch,
  onSelectAsset,
}: AssetRelatedDialogController) {
  return (
    <Dialog
      open={open}
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
        <SourceAssetSummary asset={sourceAsset} />
        <RelatedAssetsScrollArea
          loading={loading}
          relatedAssets={relatedAssets}
          onSelectAsset={onSelectAsset}
        />
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={closeRelatedAssetSearch}>
            關閉
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AssetRelatedDialog() {
  return <AssetRelatedDialogLayout {...useAssetRelatedDialogController()} />;
}
