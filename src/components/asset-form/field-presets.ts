const assetDetailFieldPreset = {
  actionsLayout: "grid" as const,
  actionButtonClassName: "h-8 w-full px-2 text-xs",
  labelClassName: "text-sm font-medium text-muted-foreground",
};

const assetDetailModelSelectionPreset = {
  ...assetDetailFieldPreset,
  listClassName: "min-w-0 space-y-1",
  listSurface: "plain" as const,
};

const assetDetailTagSelectionPreset = {
  ...assetDetailFieldPreset,
  tagClassName:
    "min-w-0 !max-w-full !shrink cursor-pointer truncate transition-colors",
};

const assetDetailRelatedLinksPreset = {
  ...assetDetailFieldPreset,
  actionsLayout: "grid" as const,
  layout: "stacked" as const,
};

const compactMetadataFieldPreset = {
  actionsLayout: "compact" as const,
  actionButtonClassName:
    "h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground",
  labelClassName: "text-xs font-medium text-muted-foreground",
};

const compactModelSelectionPreset = {
  ...compactMetadataFieldPreset,
  listClassName: "max-h-28 space-y-1.5 bg-background/40 p-2",
};

const compactTagSelectionPreset = {
  ...compactMetadataFieldPreset,
  listClassName: "max-h-36 min-h-14 bg-background/35 p-3",
  listSurface: "panel" as const,
  tagClassName:
    "min-w-0 !max-w-full !shrink cursor-pointer truncate rounded-md px-2.5 py-1 text-xs leading-none transition-colors hover:brightness-110",
};

const compactRelatedLinksPreset = {
  ...compactMetadataFieldPreset,
  actionsLayout: "inline" as const,
  layout: "stacked" as const,
};

export {
  assetDetailModelSelectionPreset,
  assetDetailRelatedLinksPreset,
  assetDetailTagSelectionPreset,
  compactModelSelectionPreset,
  compactRelatedLinksPreset,
  compactTagSelectionPreset,
};
