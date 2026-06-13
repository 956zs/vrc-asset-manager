"use client";

import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SurfaceBox } from "@/components/ui/surface-box";
import { boothTagOriginText, type SuggestedBoothModel, type SuggestedBoothTagOrigins } from "@/lib/booth-product-info";

type BoothModelSuggestionPanelProps = {
  models: readonly SuggestedBoothModel[];
  onAdd: (model: SuggestedBoothModel) => void;
};

type BoothTagSuggestionPanelProps = {
  origins: SuggestedBoothTagOrigins;
  tags: readonly string[];
  onAdd: (tagName: string) => void;
};

function SuggestionShell({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <SurfaceBox variant="dashed" className="space-y-2 p-3">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <div className="flex min-w-0 max-w-full flex-wrap gap-2 overflow-hidden">
        {children}
      </div>
    </SurfaceBox>
  );
}

export function BoothModelSuggestionPanel({
  models,
  onAdd,
}: BoothModelSuggestionPanelProps) {
  if (models.length === 0) return null;

  return (
    <SuggestionShell title="BOOTH 建議模型">
      {models.map((model) => (
        <Button
          key={model.name}
          type="button"
          variant="outline"
          size="sm"
          className="h-7 min-w-0 !max-w-full !shrink gap-1 px-2 text-xs"
          onClick={() => onAdd(model)}
        >
          <Plus className="h-3 w-3 shrink-0" />
          <span className="min-w-0 truncate">{model.label}</span>
        </Button>
      ))}
    </SuggestionShell>
  );
}

export function BoothTagSuggestionPanel({
  origins,
  tags,
  onAdd,
}: BoothTagSuggestionPanelProps) {
  if (tags.length === 0) return null;

  return (
    <SuggestionShell title="BOOTH 建議標籤">
      {tags.map((tagName) => {
        const originText = boothTagOriginText(origins, tagName);

        return (
          <Button
            key={tagName}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto min-h-7 min-w-0 !max-w-full !shrink gap-1 px-2 py-1 text-left text-xs"
            onClick={() => onAdd(tagName)}
            title={originText ?? undefined}
          >
            <Plus className="h-3 w-3 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate">{tagName}</span>
              {originText && (
                <span className="block truncate text-[10px] text-muted-foreground">
                  {originText}
                </span>
              )}
            </span>
          </Button>
        );
      })}
    </SuggestionShell>
  );
}
