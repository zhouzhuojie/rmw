import {
  LINE_SEPARATORS,
  charName,
  codepointLabel,
  isSuspicious,
  kindOf,
  type CharKind,
} from "./chars.js";

export type AnnotatePart =
  | { type: "text"; value: string }
  | {
      type: "mark";
      value: string;
      codepoint: string;
      name: string;
      markKind: CharKind;
      /** Short label for inline UI chips, e.g. ZWSP */
      label: string;
    };

const SHORT_LABELS: Record<number, string> = {
  0x0085: "NEL",
  0x00a0: "NBSP",
  0x00ad: "SHY",
  0x034f: "CGJ",
  0x061c: "ALM",
  0x180e: "MVS",
  0x200b: "ZWSP",
  0x200c: "ZWNJ",
  0x200d: "ZWJ",
  0x200e: "LRM",
  0x200f: "RLM",
  0x2028: "LS",
  0x2029: "PS",
  0x202a: "LRE",
  0x202b: "RLE",
  0x202c: "PDF",
  0x202d: "LRO",
  0x202e: "RLO",
  0x202f: "NNBSP",
  0x2060: "WJ",
  0x2061: "FA",
  0x2062: "IT",
  0x2063: "IS",
  0x2064: "IP",
  0x2066: "LRI",
  0x2067: "RLI",
  0x2068: "FSI",
  0x2069: "PDI",
  0x2800: "BRAILLE",
  0x3000: "IDSP",
  0x3164: "HF",
  0xfe0f: "VS16",
  0xfeff: "BOM",
  0xffa0: "HHF",
};

function shortLabel(cp: number, codepoint: string): string {
  if (SHORT_LABELS[cp]) return SHORT_LABELS[cp];
  if (cp >= 0xfe00 && cp <= 0xfe0f) return `VS${cp - 0xfe00 + 1}`;
  if (cp >= 0xe0000 && cp <= 0xe007f) return "TAG";
  return codepoint.replace("U+", "");
}

function isMark(ch: string, cp: number): boolean {
  if (LINE_SEPARATORS.has(cp)) return true;
  if (/\p{Zs}/u.test(ch) && cp !== 0x0020) return true;
  return isSuspicious(cp, ch);
}

/**
 * Split text into plain runs and mark runs for inline visualization.
 */
export function annotate(text: string): AnnotatePart[] {
  const parts: AnnotatePart[] = [];
  let buf = "";

  const flush = (): void => {
    if (!buf) return;
    parts.push({ type: "text", value: buf });
    buf = "";
  };

  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (isMark(ch, cp)) {
      flush();
      const category = /\p{Zs}/u.test(ch)
        ? "Zs"
        : /\p{Cf}/u.test(ch)
          ? "Cf"
          : /\p{Mn}/u.test(ch)
            ? "Mn"
            : "Other";
      const code = codepointLabel(cp);
      parts.push({
        type: "mark",
        value: ch,
        codepoint: code,
        name: charName(ch, cp),
        markKind:
          category === "Zs" && cp !== 0x0020 ? "space" : kindOf(cp, category),
        label: shortLabel(cp, code),
      });
    } else {
      buf += ch;
    }
  }
  flush();
  return parts;
}
