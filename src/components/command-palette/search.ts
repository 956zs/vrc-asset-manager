import type { CommandPaletteGroup, CommandPaletteItem } from "./types";

const normalize = (value: string) => value.trim().toLowerCase();

const tokenize = (value: string) =>
  normalize(value)
    .split(/[\s_\-()[\]{}.,，。/\\:;]+/)
    .filter(Boolean);

const scoreText = (value: string, query: string) => {
  const text = normalize(value);

  if (!text) {
    return 0;
  }

  if (text === query) {
    return 120;
  }

  if (text.startsWith(query)) {
    return 90;
  }

  if (text.includes(query)) {
    return 60;
  }

  const queryTokens = tokenize(query);
  if (queryTokens.length > 1 && queryTokens.every((token) => text.includes(token))) {
    return 42;
  }

  return 0;
};

export const filterCommandPaletteItems = (
  items: CommandPaletteItem[],
  query: string,
) => {
  const cleanedQuery = normalize(query);

  if (!cleanedQuery) {
    return items;
  }

  return items
    .map((item, index) => {
      const values = [item.title, item.subtitle ?? "", item.badge ?? "", ...item.keywords];
      const score = Math.max(...values.map((value) => scoreText(value, cleanedQuery)));
      return { item, index, score };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.index - right.index;
    })
    .map((result) => result.item);
};

export const groupCommandPaletteItems = (
  items: CommandPaletteItem[],
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
