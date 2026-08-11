import {
  charName,
  codepointLabel,
  isSuspicious,
  kindOf,
  LINE_SEPARATORS,
  type CharKind,
} from "./chars.js";

export type Finding = {
  codepoint: string;
  name: string;
  count: number;
  kind: CharKind;
};

export type DetectResult = {
  findings: Finding[];
  totalSuspicious: number;
  /** True when any invisible/format/non-ASCII-space chars were found. */
  hasSuspiciousChars: boolean;
};

export function detect(text: string): DetectResult {
  const map = new Map<
    number,
    { name: string; count: number; kind: CharKind }
  >();

  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const category = unicodeCategory(ch);

    const isOddSpace = category === "Zs" && cp !== 0x0020;
    const isLineSep = LINE_SEPARATORS.has(cp);
    const suspicious = isSuspicious(cp, ch) || isOddSpace || isLineSep;
    if (!suspicious) continue;

    const existing = map.get(cp);
    if (existing) {
      existing.count += 1;
    } else {
      let kind = kindOf(cp, category);
      if (isOddSpace) kind = "space";
      if (isLineSep) kind = "format";
      map.set(cp, {
        name: charName(ch, cp),
        count: 1,
        kind,
      });
    }
  }

  const findings: Finding[] = [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([cp, item]) => ({
      codepoint: codepointLabel(cp),
      name: item.name,
      count: item.count,
      kind: item.kind,
    }));

  const totalSuspicious = findings.reduce((sum, f) => sum + f.count, 0);

  return {
    findings,
    totalSuspicious,
    hasSuspiciousChars: totalSuspicious > 0,
  };
}

function unicodeCategory(ch: string): string {
  if (/\p{Zs}/u.test(ch)) return "Zs";
  if (/\p{Cf}/u.test(ch)) return "Cf";
  if (/\p{Cc}/u.test(ch)) return "Cc";
  if (/\p{Mn}/u.test(ch)) return "Mn";
  return "Other";
}
