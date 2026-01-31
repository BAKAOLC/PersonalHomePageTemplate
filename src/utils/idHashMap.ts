import mapData from '@/config/id-hash-map.json';

const map: Record<string, string> = mapData as Record<string, string>;

const reverseMap: Record<string, string> = {};
for (const k of Object.keys(map)) {
  reverseMap[map[k]] = k;
}

export function encodeKey(parts: Array<string | undefined | null>): string | undefined {
  const filtered = parts.filter(Boolean) as string[];
  if (filtered.length === 0) return undefined;
  const key = filtered.join('/');
  return map[key];
}

export function decodeHash(hash: string | undefined): string | undefined {
  if (!hash) return undefined;
  return reverseMap[hash];
}

export function hasHashForKey(parts: Array<string | undefined | null>): boolean {
  const filtered = parts.filter(Boolean) as string[];
  if (filtered.length === 0) return false;
  return !!map[filtered.join('/')];
}

export function parseParam(param: string | undefined): { parts: string[]; isHash: boolean; raw?: string } {
  if (!param) return { parts: [], isHash: false };

  const decoded = decodeHash(param);
  if (decoded) {
    const parts = decoded.split('/').filter(Boolean);
    return { parts, isHash: true, raw: param };
  }

  const parts = param.split('/').filter(Boolean);
  return { parts, isHash: false, raw: param };
}
