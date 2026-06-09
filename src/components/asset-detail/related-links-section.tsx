"use client";

import { ExternalLink } from "lucide-react";
import { RelatedLinksEditor } from "@/components/asset-form/related-links-editor";
import { Button } from "@/components/ui/button";
import type { RelatedLinkDraft } from "@/lib/asset-links";
import type { AssetLink } from "@/types";

type AssetDetailRelatedLinksSectionProps = {
  isEditing: boolean;
  relatedLinks: AssetLink[];
  editedRelatedLinks: RelatedLinkDraft[];
  onAdd: () => void;
  onCreateFirst: () => void;
  onUpdate: (
    index: number,
    field: keyof RelatedLinkDraft,
    value: string,
  ) => void;
  onRemove: (index: number) => void;
  onOpen: (url: string) => void;
};

function EditableRelatedLinks({
  editedRelatedLinks,
  onAdd,
  onCreateFirst,
  onUpdate,
  onRemove,
}: Omit<AssetDetailRelatedLinksSectionProps, "isEditing" | "relatedLinks" | "onOpen">) {
  return (
    <RelatedLinksEditor
      links={editedRelatedLinks}
      layout="stacked"
      actionsLayout="grid"
      actionButtonClassName="h-8 w-full px-2 text-xs"
      labelClassName="text-sm font-medium text-muted-foreground"
      onAdd={onAdd}
      onCreateFirst={onCreateFirst}
      onUpdate={onUpdate}
      onRemove={onRemove}
    />
  );
}

function ReadonlyRelatedLinkRow({
  link,
  onOpen,
}: {
  link: AssetLink;
  onOpen: (url: string) => void;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <div className="min-w-0 flex-1" data-context-url={link.url}>
        <p className="truncate text-sm font-medium text-foreground">{link.label}</p>
        <p className="break-all text-xs text-muted-foreground">{link.url}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        title="開啟連結"
        aria-label="開啟連結"
        data-context-url={link.url}
        onClick={() => onOpen(link.url)}
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ReadonlyRelatedLinks({
  relatedLinks,
  onOpen,
}: Pick<AssetDetailRelatedLinksSectionProps, "relatedLinks" | "onOpen">) {
  return (
    <>
      <label className="text-sm font-medium text-muted-foreground">相關連結</label>
      <div className="mt-2 min-w-0 space-y-2">
        {relatedLinks.length > 0 ? (
          relatedLinks.map((link) => (
            <ReadonlyRelatedLinkRow key={link.id} link={link} onOpen={onOpen} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">未設定</p>
        )}
      </div>
    </>
  );
}

export function AssetDetailRelatedLinksSection(
  props: AssetDetailRelatedLinksSectionProps,
) {
  return (
    <div className="min-w-0">
      {props.isEditing ? (
        <EditableRelatedLinks {...props} />
      ) : (
        <ReadonlyRelatedLinks
          relatedLinks={props.relatedLinks}
          onOpen={props.onOpen}
        />
      )}
    </div>
  );
}
