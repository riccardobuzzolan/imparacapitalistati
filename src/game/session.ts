export function shuffled<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function nextItem<T>(
  items: readonly T[],
  excluded?: T,
  random = Math.random,
): T | undefined {
  const available =
    excluded === undefined ? items : items.filter((item) => item !== excluded);
  return available[Math.floor(random() * available.length)];
}
