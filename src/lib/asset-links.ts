import type { AssetLinkInput } from "@/types";

export type RelatedLinkDraft = AssetLinkInput;
type UpdateRelatedLinkOptions = {
  links: RelatedLinkDraft[];
  index: number;
  field: keyof RelatedLinkDraft;
  value: string;
};
type NormalizedRelatedLinkCursor = AssetLinkInput & { nextIndex: number };

export const createEmptyRelatedLink = (): RelatedLinkDraft => ({
  label: "",
  url: "",
});

export const addEmptyRelatedLink = (
  links: RelatedLinkDraft[],
): RelatedLinkDraft[] => [...links, createEmptyRelatedLink()];

export const removeRelatedLink = (
  links: RelatedLinkDraft[],
  index: number,
): RelatedLinkDraft[] =>
  links.filter((_, currentIndex) => currentIndex !== index);

export const updateRelatedLink = ({
  links,
  index,
  field,
  value,
}: UpdateRelatedLinkOptions): RelatedLinkDraft[] =>
  links.map((link, currentIndex) =>
    currentIndex === index ? { ...link, [field]: value } : link,
  );

export const normalizeRelatedLinks = (
  links: RelatedLinkDraft[],
): AssetLinkInput[] => {
  const normalizedLinks: AssetLinkInput[] = [];

  for (const link of links) {
    const label = link.label.trim();
    const url = link.url.trim();

    if (url.length > 0) {
      normalizedLinks.push({ label: label || url, url });
    }
  }

  return normalizedLinks;
};

const nextNormalizedRelatedLink = (
  links: RelatedLinkDraft[],
  startIndex: number,
): NormalizedRelatedLinkCursor | null => {
  for (let index = startIndex; index < links.length; index += 1) {
    const label = links[index].label.trim();
    const url = links[index].url.trim();

    if (url.length > 0) {
      return { label: label || url, url, nextIndex: index + 1 };
    }
  }

  return null;
};

export const sameRelatedLinks = (
  left: RelatedLinkDraft[],
  right: RelatedLinkDraft[],
) => {
  let leftIndex = 0;
  let rightIndex = 0;

  while (true) {
    const leftLink = nextNormalizedRelatedLink(left, leftIndex);
    const rightLink = nextNormalizedRelatedLink(right, rightIndex);

    if (!leftLink || !rightLink) {
      return leftLink === rightLink;
    }
    if (leftLink.label !== rightLink.label || leftLink.url !== rightLink.url) {
      return false;
    }

    leftIndex = leftLink.nextIndex;
    rightIndex = rightLink.nextIndex;
  }
};
