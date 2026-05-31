import type { AssetLinkInput } from "@/types";

export type RelatedLinkDraft = AssetLinkInput;

export const createEmptyRelatedLink = (): RelatedLinkDraft => ({
  label: "",
  url: "",
});

export const normalizeRelatedLinks = (
  links: RelatedLinkDraft[],
): AssetLinkInput[] =>
  links
    .map((link) => ({
      label: link.label.trim(),
      url: link.url.trim(),
    }))
    .filter((link) => link.url.length > 0)
    .map((link) => ({
      label: link.label || link.url,
      url: link.url,
    }));

export const sameRelatedLinks = (
  left: RelatedLinkDraft[],
  right: RelatedLinkDraft[],
) => {
  const normalizedLeft = normalizeRelatedLinks(left);
  const normalizedRight = normalizeRelatedLinks(right);

  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every(
      (link, index) =>
        link.label === normalizedRight[index]?.label &&
        link.url === normalizedRight[index]?.url,
    )
  );
};
