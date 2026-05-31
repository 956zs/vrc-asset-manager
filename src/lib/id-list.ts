export const toggleId = (ids: number[], id: number) =>
  ids.includes(id) ? ids.filter((currentId) => currentId !== id) : [...ids, id];

export const sameIds = (left: number[], right: number[]) => {
  if (left.length !== right.length) {
    return false;
  }

  const rightIds = new Set(right);
  return left.every((id) => rightIds.has(id));
};
