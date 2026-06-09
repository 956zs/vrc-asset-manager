export const toggleId = (ids: number[], id: number) => {
  const nextIds: number[] = [];
  let found = false;

  for (const currentId of ids) {
    if (currentId === id) {
      found = true;
    } else {
      nextIds.push(currentId);
    }
  }

  return found ? nextIds : [...ids, id];
};

export const sameIds = (left: number[], right: number[]) => {
  if (left.length !== right.length) {
    return false;
  }

  let sameOrder = true;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      sameOrder = false;
      break;
    }
  }

  if (sameOrder) {
    return true;
  }

  const rightIds = new Set(right);
  for (const id of left) {
    if (!rightIds.has(id)) {
      return false;
    }
  }

  return true;
};
