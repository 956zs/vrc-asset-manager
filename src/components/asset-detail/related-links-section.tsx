"use client";

import { ExternalLink } from "lucide-react";
import { DetailFieldLabel } from "@/components/asset-detail/detail-field-label";
import { assetDetailRelatedLinksPreset } from "@/components/asset-form/field-presets";
import { RelatedLinksEditor } from "@/components/asset-form/related-links-editor";
import { IconButton } from "@/components/ui/icon-button";
import { ListRow } from "@/components/ui/list-row";
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
      {...assetDetailRelatedLinksPreset}
      links={editedRelatedLinks}
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
    <ListRow
      description={<span data-context-url={link.url}>{link.url}</span>}
      descriptionWrap="break"
      title={link.label}
      trailing={
        <IconButton
          variant="outline"
          label="開啟連結"
          icon={<ExternalLink className="h-4 w-4" />}
          data-context-url={link.url}
          onClick={() => onOpen(link.url)}
        />
      }
    />
  );
}

function ReadonlyRelatedLinks({
  relatedLinks,
  onOpen,
}: Pick<AssetDetailRelatedLinksSectionProps, "relatedLinks" | "onOpen">) {
  return (
    <>
      <DetailFieldLabel>相關連結</DetailFieldLabel>
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
