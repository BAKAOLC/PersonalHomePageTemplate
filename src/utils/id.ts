export function createPrefixedId(prefix: string): string {
  const randomPart = Math.random().toString(36).slice(2, 11);
  return `${prefix}-${Date.now()}-${randomPart}`;
}
