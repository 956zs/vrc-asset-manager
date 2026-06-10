"use client";

import { Link2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { RelatedLinkDraft } from "@/lib/asset-links";

type RelatedLinksEditorLayout = "inline" | "stacked";
type RelatedLinksActionsLayout = "inline" | "grid";

type RelatedLinksEditorProps = {
  links: RelatedLinkDraft[];
  layout?: RelatedLinksEditorLayout;
  actionsLayout?: RelatedLinksActionsLayout;
  actionButtonClassName?: string;
  labelClassName?: string;
  onAdd: () => void;
  onCreateFirst: () => void;
  onUpdate: (
    index: number,
    field: keyof RelatedLinkDraft,
    value: string,
  ) => void;
  onRemove: (index: number) => void;
};

type RelatedLinkRowProps = Pick<
  RelatedLinksEditorProps,
  "layout" | "onRemove" | "onUpdate"
> & {
  index: number;
  link: RelatedLinkDraft;
};

function RelatedLinksEditorHeader({
  actionsLayout,
  actionButtonClassName,
  labelClassName,
  onAdd,
}: Pick<
  RelatedLinksEditorProps,
  "actionsLayout" | "actionButtonClassName" | "labelClassName" | "onAdd"
>) {
  return (
    <div
      className={cn(
        "flex gap-2",
        actionsLayout === "grid" ? "flex-col items-start" : "items-center justify-between",
      )}
    >
      <label className={labelClassName}>相關連結</label>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={actionButtonClassName}
        onClick={onAdd}
      >
        <Plus className="h-3.5 w-3.5" />
        新增
      </Button>
    </div>
  );
}

function StackedRelatedLinkRow({
  index,
  link,
  onRemove,
  onUpdate,
}: Omit<RelatedLinkRowProps, "layout">) {
  return (
    <div className="min-w-0 space-y-2 rounded-md border border-border p-2">
      <div className="asset-detail-action-grid grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_2.25rem] gap-2">
        <Input
          value={link.label}
          onChange={(event) => onUpdate(index, "label", event.target.value)}
          placeholder="論壇討論"
          className="min-w-0"
        />
        <RemoveLinkButton onRemove={() => onRemove(index)} />
      </div>
      <Input
        value={link.url}
        onChange={(event) => onUpdate(index, "url", event.target.value)}
        placeholder="https://..."
        className="min-w-0"
      />
    </div>
  );
}

function InlineRelatedLinkRow({
  index,
  link,
  onRemove,
  onUpdate,
}: Omit<RelatedLinkRowProps, "layout">) {
  return (
    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] gap-2">
      <Input
        value={link.label}
        onChange={(event) => onUpdate(index, "label", event.target.value)}
        placeholder="論壇討論"
      />
      <Input
        value={link.url}
        onChange={(event) => onUpdate(index, "url", event.target.value)}
        placeholder="https://..."
      />
      <RemoveLinkButton onRemove={() => onRemove(index)} />
    </div>
  );
}

function RelatedLinkRow(props: RelatedLinkRowProps) {
  if (props.layout === "stacked") {
    return <StackedRelatedLinkRow {...props} />;
  }

  return <InlineRelatedLinkRow {...props} />;
}

function RelatedLinksList({
  links,
  layout,
  onRemove,
  onUpdate,
}: Pick<RelatedLinksEditorProps, "links" | "layout" | "onRemove" | "onUpdate">) {
  return (
    <div className="space-y-2">
      {links.map((link, index) => (
        <RelatedLinkRow
          key={index}
          index={index}
          link={link}
          layout={layout}
          onRemove={onRemove}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}

function EmptyRelatedLinksButton({
  onCreateFirst,
}: Pick<RelatedLinksEditorProps, "onCreateFirst">) {
  return (
    <button
      type="button"
      className="flex w-full min-w-0 items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
      onClick={onCreateFirst}
    >
      <Link2 className="h-4 w-4" />
      <span className="min-w-0 truncate">新增論壇、教學或輔助插件連結</span>
    </button>
  );
}

export function RelatedLinksEditor({
  links,
  layout = "inline",
  actionsLayout = "inline",
  actionButtonClassName = "h-7 px-2 text-xs",
  labelClassName = "text-sm font-medium",
  onAdd,
  onCreateFirst,
  onUpdate,
  onRemove,
}: RelatedLinksEditorProps) {
  return (
    <div className="space-y-2">
      <RelatedLinksEditorHeader
        actionsLayout={actionsLayout}
        actionButtonClassName={actionButtonClassName}
        labelClassName={labelClassName}
        onAdd={onAdd}
      />
      {links.length > 0 ? (
        <RelatedLinksList
          links={links}
          layout={layout}
          onRemove={onRemove}
          onUpdate={onUpdate}
        />
      ) : (
        <EmptyRelatedLinksButton onCreateFirst={onCreateFirst} />
      )}
    </div>
  );
}

function RemoveLinkButton({ onRemove }: { onRemove: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="!size-9"
      title="移除連結"
      aria-label="移除連結"
      onClick={onRemove}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
