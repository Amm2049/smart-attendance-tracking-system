export type RelOne<T> = T | T[] | null;

export function relFirst<T>(rel: RelOne<T> | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

