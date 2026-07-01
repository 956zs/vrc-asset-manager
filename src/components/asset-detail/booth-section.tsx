import { ExternalLink } from "lucide-react";
import { DetailFieldLabel } from "@/components/asset-detail/detail-field-label";
import { BoothShopFields } from "@/components/booth-shop-fields";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { ListRow } from "@/components/ui/list-row";
import { Spinner } from "@/components/ui/spinner";
import { SurfaceBox } from "@/components/ui/surface-box";

type AssetDetailBoothSectionProps = {
  isEditing: boolean;
  boothUrl: string;
  boothShopName: string;
  boothShopUrl: string;
  fetching: boolean;
  onBoothUrlChange: (boothUrl: string) => void;
  onBoothShopNameChange: (boothShopName: string) => void;
  onBoothShopUrlChange: (boothShopUrl: string) => void;
  onFetchProductInfo: () => void;
  onOpenBooth: () => void;
  onOpenBoothShop: () => void;
};

export function AssetDetailBoothSection({
  isEditing,
  boothUrl,
  boothShopName,
  boothShopUrl,
  fetching,
  onBoothUrlChange,
  onBoothShopNameChange,
  onBoothShopUrlChange,
  onFetchProductInfo,
  onOpenBooth,
  onOpenBoothShop,
}: AssetDetailBoothSectionProps) {
  return (
    <div className="min-w-0 space-y-4">
      <DetailFieldLabel>Booth 連結</DetailFieldLabel>
      {isEditing ? (
        <>
          <div className="asset-detail-action-grid mt-1 grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_2.25rem] gap-2">
            <Input
              value={boothUrl}
              onChange={(event) => onBoothUrlChange(event.target.value)}
              placeholder="https://booth.pm/ja/items/..."
              className="min-w-0"
            />
            <IconButton
              variant="outline"
              label="開啟 BOOTH 連結"
              icon={<ExternalLink className="h-4 w-4" />}
              data-context-url={boothUrl.trim() || undefined}
              onClick={onOpenBooth}
              disabled={!boothUrl.trim()}
            />
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
              <Spinner />
            ) : (
              "抓取資訊"
            )}
          </Button>
          <BoothShopFields
            className="mt-3"
            shopName={boothShopName}
            shopUrl={boothShopUrl}
            variant="compact"
            onShopNameChange={onBoothShopNameChange}
            onShopUrlChange={onBoothShopUrlChange}
            onOpenShop={onOpenBoothShop}
          />
        </>
      ) : (
        <div className="space-y-3">
          <ListRow
            className="mt-1"
            title={boothUrl || "未設定"}
            titleClassName="font-normal"
            titleWrap="break"
            trailing={
              <IconButton
                variant="outline"
                label="開啟 BOOTH 連結"
                icon={<ExternalLink className="h-4 w-4" />}
                data-context-url={boothUrl || undefined}
                onClick={onOpenBooth}
                disabled={!boothUrl}
              />
            }
          />
          <SurfaceBox className="border-border/70 bg-muted/15 p-3">
            <DetailFieldLabel as="p" className="text-xs">
              BOOTH Shop
            </DetailFieldLabel>
            <ListRow
              className="mt-1"
              description={
                boothShopUrl ? (
                  <span data-context-url={boothShopUrl}>{boothShopUrl}</span>
                ) : null
              }
              descriptionWrap="break"
              title={boothShopName || "未設定"}
              titleClassName="font-normal"
              titleWrap="break"
              trailing={
                <IconButton
                  variant="outline"
                  label="開啟 BOOTH Shop"
                  icon={<ExternalLink className="h-4 w-4" />}
                  data-context-url={boothShopUrl || undefined}
                  onClick={onOpenBoothShop}
                  disabled={!boothShopUrl}
                />
              }
            />
          </SurfaceBox>
        </div>
      )}
    </div>
  );
}
