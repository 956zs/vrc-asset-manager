import { invokeTauri } from "@/lib/tauri-runtime";
import { sensitiveTagName } from "@/lib/sensitive-content";
import type { BoothProductInfo, Model, Tag } from "@/types";

export type SuggestedBoothModel = {
  displayName: string | null;
  label: string;
  name: string;
};

export type SuggestedBoothTagOrigins = Record<string, string[]>;

export type AppliedBoothProductInfo = {
  matchedModelIds: number[];
  matchedTagIds: number[];
  suggestedModels: SuggestedBoothModel[];
  suggestedTags: string[];
  suggestedTagOrigins: SuggestedBoothTagOrigins;
};

type ModelAliasGroup = SuggestedBoothModel & {
  aliases: readonly string[];
};

const defaultSuggestedTagLimit = 12;
const defaultSuggestedModelLimit = 32;
const modelAliasGroups: readonly ModelAliasGroup[] = [
  {
    name: "Kikyo",
    displayName: "桔梗",
    label: "桔梗 / Kikyo",
    aliases: ["桔梗", "Kikyo"],
  },
  {
    name: "Shinano",
    displayName: "しなの",
    label: "しなの / Shinano",
    aliases: ["しなの", "信濃", "シナノ", "Shinano"],
  },
  {
    name: "Manuka",
    displayName: "マヌカ",
    label: "マヌカ / Manuka",
    aliases: ["マヌカ", "Manuka", "Manukaマヌカ"],
  },
  {
    name: "Shinra",
    displayName: "森羅",
    label: "森羅 / Shinra",
    aliases: ["森羅", "Shinra"],
  },
  {
    name: "Sio",
    displayName: "しお",
    label: "しお / Sio",
    aliases: ["しお", "Sio"],
  },
  { name: "Moe", displayName: "萌", label: "萌 / Moe", aliases: ["萌", "Moe"] },
  {
    name: "Airi",
    displayName: "愛莉",
    label: "愛莉 / Airi",
    aliases: ["愛莉", "Airi"],
  },
  {
    name: "Kumaly",
    displayName: "クマリ",
    label: "クマリ / Kumaly",
    aliases: ["クマリ", "ひきくまりのクマリ", "ひきこまりのクマリ", "Kumaly"],
  },
  {
    name: "Milltina",
    displayName: "ミルティナ",
    label: "ミルティナ / Milltina",
    aliases: ["ミルティナ", "Milltina"],
  },
  {
    name: "Kipfel",
    displayName: "キプフェル",
    label: "キプフェル / Kipfel",
    aliases: ["キプフェル", "Kipfel"],
  },
  {
    name: "Rindo",
    displayName: "竜胆",
    label: "竜胆 / Rindo",
    aliases: ["竜胆", "龍胆", "Rindo"],
  },
  {
    name: "Mizuki",
    displayName: "瑞希",
    label: "瑞希 / Mizuki",
    aliases: ["瑞希", "Mizuki"],
  },
  {
    name: "Nagi",
    displayName: "凪",
    label: "凪 / Nagi",
    aliases: ["凪", "Nagi"],
  },
  {
    name: "Selestia",
    displayName: "セレスティア",
    label: "セレスティア / Selestia",
    aliases: ["セレスティア", "Selestia"],
  },
  {
    name: "Lime",
    displayName: "ライム",
    label: "ライム / Lime",
    aliases: ["ライム", "Lime"],
  },
  {
    name: "Plum",
    displayName: "プラム",
    label: "プラム / Plum",
    aliases: ["プラム", "Plum"],
  },
  {
    name: "Chocolat",
    displayName: "ショコラ",
    label: "ショコラ / Chocolat",
    aliases: ["ショコラ", "チョコラ", "Chocolat"],
  },
  {
    name: "Chiffon",
    displayName: "シフォン",
    label: "シフォン / Chiffon",
    aliases: ["シフォン", "Chiffon"],
  },
  {
    name: "Rurune",
    displayName: "ルルネ",
    label: "ルルネ / Rurune",
    aliases: ["ルルネ", "ルルン", "Rurune"],
  },
  {
    name: "Nenmir",
    displayName: "ネミア",
    label: "ネミア / Nenmir",
    aliases: ["ネミア", "Nenmir", "Nemir"],
  },
  {
    name: "Zome",
    displayName: "ゾメ",
    label: "ゾメ / Zome",
    aliases: ["ゾメ", "ゾメちゃん", "Zome"],
  },
  {
    name: "Ririka",
    displayName: "りりか",
    label: "りりか / Ririka",
    aliases: ["りりか", "Ririka"],
  },
  {
    name: "Mamehinata",
    displayName: "まめひなた",
    label: "まめひなた / Mamehinata",
    aliases: ["まめひなた", "Mamehinata"],
  },
  {
    name: "Lasyusha",
    displayName: "ラシューシャ",
    label: "ラシューシャ / Lasyusha",
    aliases: ["ラシューシャ", "Lasyusha"],
  },
  {
    name: "Shiratsume",
    displayName: "しらつめ",
    label: "しらつめ / Shiratsume",
    aliases: ["しらつめ", "Shiratsume", "Shirastume"],
  },
  {
    name: "Marycia",
    displayName: "マリシア",
    label: "マリシア / Marycia",
    aliases: ["マリシア", "Marycia"],
  },
  {
    name: "Rusk",
    displayName: "ラスク",
    label: "ラスク / Rusk",
    aliases: ["ラスク", "Rusk"],
  },
  {
    name: "Milk",
    displayName: "ミルク",
    label: "ミルク / Milk",
    aliases: ["ミルク", "Milk"],
  },
  {
    name: "Maya",
    displayName: "舞夜",
    label: "舞夜 / Maya",
    aliases: ["舞夜", "Maya"],
  },
  {
    name: "Mayo",
    displayName: "マヨ",
    label: "マヨ / Mayo",
    aliases: ["マヨ", "Mayo"],
  },
  {
    name: "Ichigo",
    displayName: "イチゴ",
    label: "イチゴ / Ichigo",
    aliases: ["イチゴ", "Ichigo"],
  },
  {
    name: "Karin",
    displayName: "カリン",
    label: "カリン / Karin",
    aliases: ["カリン", "Karin"],
  },
  {
    name: "TubeRose",
    displayName: null,
    label: "TubeRose",
    aliases: ["TubeRose"],
  },
  {
    name: "Velle",
    displayName: "ヴェール",
    label: "ヴェール / Velle",
    aliases: ["ヴェール", "Velle"],
  },
  {
    name: "Rize",
    displayName: "リゼ",
    label: "リゼ / Rize",
    aliases: ["リゼ", "Rize"],
  },
  {
    name: "Bina",
    displayName: "ビナア",
    label: "ビナア / Bina",
    aliases: ["ビナア", "Bina", "Binah"],
  },
  {
    name: "Hakuu",
    displayName: "薄荷",
    label: "薄荷 / Hakuu",
    aliases: ["薄荷", "ハクウ", "Hakuu"],
  },
  {
    name: "MARUBODY",
    displayName: null,
    label: "MARUBODY",
    aliases: ["MARUBODY"],
  },
  {
    name: "Mame Friends",
    displayName: null,
    label: "Mame Friends",
    aliases: ["Mame Friends"],
  },
  {
    name: "YugiMiyo",
    displayName: "ユギミヨ",
    label: "ユギミヨ / YugiMiyo",
    aliases: [
      "ユギミヨ",
      "ユギ、ミヨ",
      "ユギ",
      "ミヨ",
      "YugiMiyo",
      "Yugi",
      "Miyo",
    ],
  },
  {
    name: "Meiyun",
    displayName: "めいゆん",
    label: "めいゆん / Meiyun",
    aliases: ["めいゆん", "Meiyun"],
  },
  {
    name: "Sophina",
    displayName: "ソフィナ",
    label: "ソフィナ / Sophina",
    aliases: ["ソフィナ", "Sophina"],
  },
  {
    name: "Misaki",
    displayName: "海咲",
    label: "海咲 / Misaki",
    aliases: ["海咲", "Misaki"],
  },
  {
    name: "Milfy",
    displayName: "ミルフィ",
    label: "ミルフィ / Milfy",
    aliases: ["ミルフィ", "ミルフィー", "Milfy"],
  },
  {
    name: "Cian",
    displayName: "シアン",
    label: "シアン / Cian",
    aliases: ["シアン", "Cian"],
  },
  {
    name: "Mafuyu",
    displayName: "真冬",
    label: "真冬 / Mafuyu",
    aliases: ["真冬", "Mafuyu"],
  },
  {
    name: "Lumina",
    displayName: "ルミナ",
    label: "ルミナ / Lumina",
    aliases: ["ルミナ", "Lumina"],
  },
  {
    name: "Rinasciita",
    displayName: "リナシータ",
    label: "リナシータ / Rinasciita",
    aliases: ["リナシータ", "Rinasciita"],
  },
  {
    name: "Ramune",
    displayName: "ラムネ",
    label: "ラムネ / Ramune",
    aliases: ["ラムネ", "Ramune"],
  },
  {
    name: "Leefa",
    displayName: "リーファ",
    label: "リーファ / Leefa",
    aliases: ["リーファ", "Leefa", "Leafa"],
  },
  {
    name: "Watayuki",
    displayName: "わたゆき",
    label: "わたゆき / Watayuki",
    aliases: ["わたゆき", "Watayuki"],
  },
  {
    name: "Hinanatsu",
    displayName: "ひななつ",
    label: "ひななつ / Hinanatsu",
    aliases: ["ひななつ", "Hinanatsu"],
  },
  {
    name: "Mishuru",
    displayName: "みしゅる",
    label: "みしゅる / Mishuru",
    aliases: ["みしゅる", "Mishuru"],
  },
  {
    name: "Lapwing",
    displayName: "ラップウィング",
    label: "ラップウィング / Lapwing",
    aliases: ["ラップウィング", "Lapwing"],
  },
  {
    name: "Grus",
    displayName: null,
    label: "Grus",
    aliases: ["Grus"],
  },
  {
    name: "Mao",
    displayName: "真央",
    label: "真央 / Mao",
    aliases: ["真央", "マオ", "Mao"],
  },
  {
    name: "Eku",
    displayName: "エク",
    label: "エク / Eku",
    aliases: ["エク", "Eku"],
  },
  {
    name: "Shizuku",
    displayName: "しずく",
    label: "しずく / Shizuku",
    aliases: ["しずく", "シズク", "びしょぬれのしずくさん", "Shizuku"],
  },
  {
    name: "Hikarun",
    displayName: "ひかるん",
    label: "ひかるん / Hikarun",
    aliases: ["ひかるん", "ヒカルン", "Hikarun"],
  },
  {
    name: "Kuuta",
    displayName: "くうた",
    label: "くうた / Kuuta",
    aliases: ["くうた", "Kuuta"],
  },
  {
    name: "Luchika",
    displayName: "ルチカ",
    label: "ルチカ / Luchika",
    aliases: ["ルチカ", "Luchika"],
  },
  {
    name: "Natsume",
    displayName: "ナツメ",
    label: "ナツメ / Natsume",
    aliases: ["ナツメ", "Natsume"],
  },
  {
    name: "Fyuett",
    displayName: "フィユエ",
    label: "フィユエ / Fyuett",
    aliases: ["フィユエ", "Fyuett"],
  },
  {
    name: "Cazalis",
    displayName: "カザリス",
    label: "カザリス / Cazalis",
    aliases: ["カザリス", "Cazalis"],
  },
  {
    name: "Miya",
    displayName: "ミヤ",
    label: "ミヤ / Miya",
    aliases: ["ミヤ", "Miya"],
  },
];
const modelAliasPairs: readonly [string, string][] = modelAliasGroups.flatMap(
  (group) =>
    group.aliases.flatMap((left, index) =>
      group.aliases
        .slice(index + 1)
        .map((right) => [left, right] as [string, string]),
    ),
);

const modelAliasBoundary = String.raw`[\s_\-()[\]{}.,，。/\\:;「」『』【】<>《》〈〉"'|・･~〜!！?？+*#＃@＠&＆=＝、◉●○■□◆◇♡❤♥★☆※▸▹▶►•·]`;
const modelAliasSplitPattern =
  /[\n\r\t/／|｜,，、;；:：()[\]{}【】「」『』<>《》〈〉・･~〜]+|\s[-–—]\s|\s{2,}/u;

const normalizeLookupText = (value: string) =>
  value.trim().toLocaleLowerCase().replace(/\s+/g, " ");

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const compactUnique = (values: string[]) => {
  const seen = new Set<string>();
  const compacted: string[] = [];

  for (const value of values) {
    const normalized = normalizeLookupText(value);
    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    compacted.push(value.trim());
  }

  return compacted;
};

const boothTagMappings: readonly {
  localName: string;
  aliases: readonly string[];
}[] = [
  {
    localName: "服裝",
    aliases: ["3D Clothing", "Clothing", "Clothes", "Outfit", "衣装", "衣裝"],
  },
  {
    localName: "髮型",
    aliases: ["Hair", "Hairstyle", "Hair Style", "髪型", "髮型"],
  },
  {
    localName: "配件",
    aliases: ["Accessory", "Accessories", "アクセサリー", "小物", "道具"],
  },
  {
    localName: "材質",
    aliases: ["Texture", "Textures", "テクスチャ", "テクスチャー", "Material"],
  },
  {
    localName: "Shader",
    aliases: ["Shader", "Shaders", "シェーダー", "シェーダ"],
  },
  {
    localName: "世界",
    aliases: ["World", "ワールド"],
  },
  {
    localName: "素體",
    aliases: ["Avatar", "アバター", "3D Model", "3Dモデル"],
  },
  {
    localName: "VRChat",
    aliases: ["VRChat", "VRC"],
  },
  {
    localName: sensitiveTagName,
    aliases: [
      "R18",
      "R-18",
      "R 18",
      "18+",
      "18禁",
      "Adult",
      "NSFW",
      "成人向け",
      "成人向",
      "成年向け",
      "成年向",
      "アダルト",
    ],
  },
];

const boothTagMappingByAlias = new Map(
  boothTagMappings.flatMap((mapping) =>
    mapping.aliases.map((alias) => [
      normalizeLookupText(alias),
      mapping.localName,
    ]),
  ),
);

const localBoothTagName = (tagName: string) =>
  boothTagMappingByAlias.get(normalizeLookupText(tagName)) ?? tagName.trim();

export const boothTagOriginText = (
  origins: SuggestedBoothTagOrigins,
  tagName: string,
) => {
  const values = origins[tagName] ?? [];
  return values.length > 0 ? `原文：${values.join(" / ")}` : null;
};

export const mergeBoothTagOrigins = (
  current: SuggestedBoothTagOrigins,
  next: SuggestedBoothTagOrigins,
) => {
  const merged: SuggestedBoothTagOrigins = { ...current };

  for (const [tagName, originals] of Object.entries(next)) {
    const existing = new Set(
      (merged[tagName] ?? []).map((origin) => normalizeLookupText(origin)),
    );
    const nextOriginals = [...(merged[tagName] ?? [])];

    for (const original of originals) {
      const key = normalizeLookupText(original);
      if (key && !existing.has(key)) {
        existing.add(key);
        nextOriginals.push(original);
      }
    }

    if (nextOriginals.length > 0) {
      merged[tagName] = nextOriginals;
    }
  }

  return merged;
};

const splitModelAliasText = (value: string) =>
  value
    .split(modelAliasSplitPattern)
    .map((alias) => alias.trim())
    .filter((alias) => alias.length > 0);

const expandModelAliases = (aliases: string[]) => {
  const expanded = [...aliases];
  const normalizedAliases = aliases.map(normalizeLookupText);

  for (const [left, right] of modelAliasPairs) {
    const normalizedLeft = normalizeLookupText(left);
    const normalizedRight = normalizeLookupText(right);

    if (normalizedAliases.some((alias) => alias.includes(normalizedLeft))) {
      expanded.push(right);
    }
    if (normalizedAliases.some((alias) => alias.includes(normalizedRight))) {
      expanded.push(left);
    }
  }

  return expanded;
};

const containsJapaneseCharacter = (value: string) =>
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(value);

const isUsefulModelAlias = (alias: string) =>
  alias.length >= 2 || containsJapaneseCharacter(alias);

const modelAliases = (model: Model) =>
  compactUnique(
    expandModelAliases(
      [model.name, model.display_name ?? ""].flatMap(splitModelAliasText),
    ),
  ).filter(isUsefulModelAlias);

const productSearchText = (info: BoothProductInfo) =>
  [info.title ?? "", info.searchText, ...info.tags].join(" ");

const matchesModelAlias = (searchText: string, alias: string) => {
  const pattern = new RegExp(
    `(^|${modelAliasBoundary})${escapeRegExp(alias)}($|${modelAliasBoundary})`,
    "iu",
  );

  return pattern.test(searchText);
};

const modelIdentityKeys = (model: Model) =>
  compactUnique([
    model.name,
    model.display_name ?? "",
    ...[model.name, model.display_name ?? ""].flatMap(splitModelAliasText),
    ...modelAliases(model),
  ]).map(normalizeLookupText);

const collectSuggestedModels = (
  searchText: string,
  models: readonly Model[],
  suggestedModelLimit = defaultSuggestedModelLimit,
) => {
  const existingModelKeys = new Set(models.flatMap(modelIdentityKeys));
  const suggestedModels: SuggestedBoothModel[] = [];
  const suggestedKeys = new Set<string>();

  for (const group of modelAliasGroups) {
    if (!group.aliases.some((alias) => matchesModelAlias(searchText, alias))) {
      continue;
    }

    const aliasKeys = group.aliases.map(normalizeLookupText);
    if (aliasKeys.some((alias) => existingModelKeys.has(alias))) {
      continue;
    }

    const suggestedKey = normalizeLookupText(group.name);
    if (suggestedKeys.has(suggestedKey)) {
      continue;
    }

    suggestedKeys.add(suggestedKey);
    suggestedModels.push({
      displayName: group.displayName,
      label: group.label,
      name: group.name,
    });

    if (suggestedModels.length >= suggestedModelLimit) {
      break;
    }
  }

  return suggestedModels;
};

export const applyBoothProductInfo = (
  info: BoothProductInfo,
  models: readonly Model[],
  tags: readonly Tag[],
  suggestedTagLimit = defaultSuggestedTagLimit,
): AppliedBoothProductInfo => {
  const searchText = productSearchText(info);
  const matchedModelIds: number[] = [];
  const matchedTagIds: number[] = [];
  const suggestedTags: string[] = [];
  const suggestedTagOrigins: SuggestedBoothTagOrigins = {};
  const suggestedTagKeys = new Set<string>();
  const existingTagByName = new Map(
    tags.map((tag) => [normalizeLookupText(tag.name), tag]),
  );

  for (const model of models) {
    if (
      modelAliases(model).some((alias) => matchesModelAlias(searchText, alias))
    ) {
      matchedModelIds.push(model.id);
    }
  }
  const suggestedModels = collectSuggestedModels(searchText, models);

  for (const tagName of compactUnique(info.tags)) {
    const localTagName = localBoothTagName(tagName);
    const localTagKey = normalizeLookupText(localTagName);
    const originalTagKey = normalizeLookupText(tagName);
    const existingTag =
      existingTagByName.get(localTagKey) ??
      existingTagByName.get(originalTagKey);
    if (existingTag) {
      matchedTagIds.push(existingTag.id);
      continue;
    }

    if (
      suggestedTags.length < suggestedTagLimit &&
      !suggestedTagKeys.has(localTagKey)
    ) {
      suggestedTags.push(localTagName);
      suggestedTagKeys.add(localTagKey);
    }

    if (suggestedTagKeys.has(localTagKey) && localTagKey !== originalTagKey) {
      suggestedTagOrigins[localTagName] = [
        ...(suggestedTagOrigins[localTagName] ?? []),
        tagName,
      ];
    }
  }

  return {
    matchedModelIds,
    matchedTagIds,
    suggestedModels,
    suggestedTags,
    suggestedTagOrigins,
  };
};

export const mergeIds = (currentIds: number[], nextIds: readonly number[]) => {
  const merged = [...currentIds];
  const seen = new Set(currentIds);

  for (const id of nextIds) {
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(id);
    }
  }

  return merged;
};

export async function fetchBoothProductInfo(
  url: string,
): Promise<BoothProductInfo | null> {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return null;
  }

  return invokeTauri<BoothProductInfo | null>("fetch_booth_product_info", {
    url: trimmedUrl,
  });
}
