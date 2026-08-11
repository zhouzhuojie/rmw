import {
  charName,
  codepointLabel,
  isSuspicious,
  kindOf,
  normalizeLineSeparator,
  type CharKind,
} from "./chars.js";
import type { Finding } from "./detect.js";

export type CleanOptions = {
  /** When true (default), non-ASCII Unicode spaces become U+0020. */
  normalizeSpaces?: boolean;
};

export type CleanResult = {
  text: string;
  removed: Finding[];
  removedCount: number;
  normalizedSpaces: number;
};

export function clean(
  text: string,
  options: CleanOptions = {},
): CleanResult {
  const normalizeSpaces = options.normalizeSpaces !== false;
  const removedMap = new Map<
    number,
    { name: string; count: number; kind: CharKind }
  >();
  let normalizedSpaces = 0;
  const out: string[] = [];

  for (const ch of text) {
    const cp = ch.codePointAt(0)!;

    const line = normalizeLineSeparator(cp);
    if (line !== null) {
      // Count as format cleanup so detect/clean stay consistent.
      bump(removedMap, cp, ch);
      out.push(line);
      continue;
    }

    if (isSuspicious(cp, ch)) {
      bump(removedMap, cp, ch);
      continue;
    }

    if (normalizeSpaces && /\p{Zs}/u.test(ch) && cp !== 0x0020) {
      normalizedSpaces += 1;
      out.push(" ");
      continue;
    }

    out.push(ch);
  }

  const textOut = out.join("").normalize("NFC");

  const removed: Finding[] = [...removedMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([cp, info]) => ({
      codepoint: codepointLabel(cp),
      name: info.name,
      count: info.count,
      kind: info.kind,
    }));

  const removedCount = removed.reduce((sum, f) => sum + f.count, 0);

  return {
    text: textOut,
    removed,
    removedCount,
    normalizedSpaces,
  };
}

function bump(
  map: Map<number, { name: string; count: number; kind: CharKind }>,
  cp: number,
  ch: string,
): void {
  const existing = map.get(cp);
  if (existing) {
    existing.count += 1;
    return;
  }
  const category = /\p{Zs}/u.test(ch)
    ? "Zs"
    : /\p{Cf}/u.test(ch)
      ? "Cf"
      : /\p{Mn}/u.test(ch)
        ? "Mn"
        : "Other";
  map.set(cp, {
    name: charName(ch, cp),
    count: 1,
    kind: kindOf(cp, category),
  });
}
