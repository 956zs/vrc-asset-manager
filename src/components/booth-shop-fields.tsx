"use client";

import { ExternalLink } from "lucide-react";

import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type BoothShopFieldsProps = {
  shopName: string;
  shopUrl: string;
  onShopNameChange: (shopName: string) => void;
  onShopUrlChange: (shopUrl: string) => void;
  className?: string;
  onOpenShop?: () => void;
  variant?: "default" | "compact";
};

export function BoothShopFields({
  shopName,
  shopUrl,
  onShopNameChange,
  onShopUrlChange,
  className,
  onOpenShop,
  variant = "default",
}: BoothShopFieldsProps) {
  const hasShopAction = Boolean(onOpenShop);

  return (
    <div
      className={cn(
        hasShopAction ? "grid gap-3" : "grid gap-3 sm:grid-cols-2",
        className,
      )}
    >
      <FormField label="BOOTH Shop" variant={variant}>
        <Input
          value={shopName}
          onChange={(event) => onShopNameChange(event.target.value)}
          placeholder="賣家名稱"
          className="min-w-0"
        />
      </FormField>
      <FormField label="Shop URL" variant={variant}>
        <div
          className={cn(
            "min-w-0",
            hasShopAction &&
              "asset-detail-action-grid grid max-w-full grid-cols-[minmax(0,1fr)_2.25rem] gap-2",
          )}
        >
          <Input
            value={shopUrl}
            onChange={(event) => onShopUrlChange(event.target.value)}
            placeholder="https://shop.booth.pm"
            className="min-w-0"
          />
          {onOpenShop && (
            <IconButton
              variant="outline"
              label="開啟 BOOTH Shop"
              icon={<ExternalLink className="h-4 w-4" />}
              data-context-url={shopUrl.trim() || undefined}
              onClick={onOpenShop}
              disabled={!shopUrl.trim()}
            />
          )}
        </div>
      </FormField>
    </div>
  );
}
