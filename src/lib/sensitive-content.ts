import type { Asset, Tag } from "@/types";

export const sensitiveTagName = "R18";
export const sensitiveTagColor = "#E11D48";

const sensitiveTagPatterns = [
  /^r[\s_-]*18$/i,
  /^18\+$/i,
  /^18禁$/i,
  /^adult$/i,
  /^nsfw$/i,
  /^成人向け?$/i,
  /^成年向け?$/i,
  /^アダルト$/i,
];

const normalizeSensitiveTagText = (value: string) =>
  value.trim().replace(/\s+/g, " ");

export function isSensitiveTagName(name: string) {
  const normalized = normalizeSensitiveTagText(name);
  return sensitiveTagPatterns.some((pattern) => pattern.test(normalized));
}

export function hasSensitiveTags(tags: readonly Pick<Tag, "name">[]) {
  return tags.some((tag) => isSensitiveTagName(tag.name));
}

export function hasSensitiveAssetTags(asset: Pick<Asset, "tags">) {
  return hasSensitiveTags(asset.tags);
}

export function suggestedTagColor(tagName: string) {
  return isSensitiveTagName(tagName) ? sensitiveTagColor : "#6B7280";
}
