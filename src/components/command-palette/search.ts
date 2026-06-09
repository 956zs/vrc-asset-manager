import type { CommandPaletteGroup, CommandPaletteItem } from "./types";

type ScoredCommandPaletteItem = {
  item: CommandPaletteItem;
  index: number;
  score: number;
};

const exactTextScore = 120;
const prefixTextScore = 90;
const includesTextScore = 60;
const tokenMatchTextScore = 42;
const normalize = (value: string) => value.trim().toLowerCase();

const tokenize = (value: string) => {
  const tokens: string[] = [];

  for (const token of normalize(value).split(/[\s_\-()[\]{}.,，。/\\:;]+/)) {
    if (token) {
      tokens.push(token);
    }
  }

  return tokens;
};

const scoreText = (value: string, query: string, queryTokens: string[]) => {
  const text = normalize(value);

  if (!text) {
    return 0;
  }

  if (text === query) {
    return exactTextScore;
  }

  if (text.startsWith(query)) {
    return prefixTextScore;
  }

  if (text.includes(query)) {
    return includesTextScore;
  }

  if (queryTokens.length > 1 && queryTokens.every((token) => text.includes(token))) {
    return tokenMatchTextScore;
  }

  return 0;
};

const scoreCommandPaletteItem = (
  item: CommandPaletteItem,
  query: string,
  queryTokens: string[],
) => {
  let score = scoreText(item.title, query, queryTokens);
  if (score === exactTextScore) {
    return score;
  }

  score = Math.max(score, scoreText(item.subtitle ?? "", query, queryTokens));
  if (score === exactTextScore) {
    return score;
  }

  score = Math.max(score, scoreText(item.badge ?? "", query, queryTokens));
  if (score === exactTextScore) {
    return score;
  }

  for (const keyword of item.keywords) {
    score = Math.max(score, scoreText(keyword, query, queryTokens));
    if (score === exactTextScore) {
      return score;
    }
  }

  return score;
};

const takeCommandPaletteItems = (
  items: readonly CommandPaletteItem[],
  limit: number,
) => {
  const takenItems: CommandPaletteItem[] = [];

  for (let index = 0; index < items.length && index < limit; index += 1) {
    takenItems.push(items[index]);
  }

  return takenItems;
};

const takeScoredCommandPaletteItems = (
  items: readonly ScoredCommandPaletteItem[],
  limit: number,
) => {
  const takenItems: CommandPaletteItem[] = [];

  for (let index = 0; index < items.length && index < limit; index += 1) {
    takenItems.push(items[index].item);
  }

  return takenItems;
};

export const filterCommandPaletteItems = (
  items: readonly CommandPaletteItem[],
  query: string,
  limit = items.length,
) => {
  const cleanedQuery = normalize(query);

  if (!cleanedQuery) {
    return takeCommandPaletteItems(items, limit);
  }

  const queryTokens = tokenize(cleanedQuery);
  const results: ScoredCommandPaletteItem[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const score = scoreCommandPaletteItem(item, cleanedQuery, queryTokens);

    if (score > 0) {
      results.push({ item, index, score });
    }
  }

  results.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.index - right.index;
  });

  return takeScoredCommandPaletteItems(results, limit);
};

export const groupCommandPaletteItems = (
  items: readonly CommandPaletteItem[],
): CommandPaletteGroup[] => {
  const groups: CommandPaletteGroup[] = [];
  const groupByTitle = new Map<string, CommandPaletteGroup>();

  for (const item of items) {
    const existingGroup = groupByTitle.get(item.group);

    if (existingGroup) {
      existingGroup.items.push(item);
      continue;
    }

    const group = { title: item.group, items: [item] };
    groupByTitle.set(item.group, group);
    groups.push(group);
  }

  return groups;
};
