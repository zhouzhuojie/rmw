/**
 * Invisible / format ranges used for watermarks, steganography, and paste junk.
 *
 * Sources cross-checked against:
 * - StegZero / unicode stego alphabets (ZWSP, ZWNJ, ZWJ, WJ, invisible math, BOM)
 * - spencermountain/out-of-character character list
 * - Common AI/invisible-character removers (VS1–16, soft hyphen, bidi, tags)
 * - Unicode Format category (Cf) as a catch-all for format controls
 */

/** Explicit ranges to strip (plus any remaining \p{Cf} — see isSuspicious). */
export const SUSPICIOUS_RANGES: readonly [number, number][] = [
  [0x00ad, 0x00ad], // soft hyphen
  [0x034f, 0x034f], // combining grapheme joiner (Mn, not Cf)
  [0x061c, 0x061c], // Arabic letter mark
  [0x115f, 0x1160], // Hangul choseong/jungseong fillers
  [0x17b4, 0x17b5], // Khmer inherent vowels
  [0x180b, 0x180f], // Mongolian free variation selectors + vowel separator
  [0x200b, 0x200f], // ZWSP, ZWNJ, ZWJ, LRM, RLM
  [0x202a, 0x202e], // bidi embeddings / overrides (Trojan Source)
  [0x2060, 0x206f], // word joiner, invisible math ops, bidi isolates, deprecated forms
  [0x2800, 0x2800], // Braille pattern blank (common “invisible char” paste)
  [0x3164, 0x3164], // Hangul filler
  [0xfe00, 0xfe0f], // variation selectors 1–16 (stego + orphan VS)
  [0xfeff, 0xfeff], // ZWNBSP / BOM
  [0xffa0, 0xffa0], // halfwidth Hangul filler
  [0xfff9, 0xfffb], // interlinear annotation controls
  [0x1d173, 0x1d17a], // musical symbol format controls (invisible)
  [0xe0000, 0xe007f], // Unicode tags (language-tag steganography)
  [0xe0100, 0xe01ef], // ideographic variation selectors (IVS)
];

/**
 * Line-like separators: not deleted — normalized to LF so structure is kept.
 * U+0085 NEL, U+2028 LINE SEPARATOR, U+2029 PARAGRAPH SEPARATOR.
 */
export const LINE_SEPARATORS: ReadonlySet<number> = new Set([
  0x0085, 0x2028, 0x2029,
]);

export type CharKind =
  | "zero-width"
  | "bidi"
  | "format"
  | "space"
  | "tag"
  | "variation"
  | "other";

export function isInRanges(
  codepoint: number,
  ranges: readonly [number, number][],
): boolean {
  return ranges.some(([start, end]) => codepoint >= start && codepoint <= end);
}

/**
 * True for characters we treat as suspicious (detect + remove).
 * Does not include Zs spaces (handled separately) or line separators
 * (normalized, not counted as “removed markers”).
 */
export function isSuspicious(codepoint: number, ch?: string): boolean {
  if (LINE_SEPARATORS.has(codepoint)) return false;
  if (isInRanges(codepoint, SUSPICIOUS_RANGES)) return true;
  // Catch-all: any Unicode Format (Cf) character (ZW*, bidi, soft hyphen, tags, …).
  if (ch !== undefined && /\p{Cf}/u.test(ch)) return true;
  return false;
}

export function kindOf(codepoint: number, category: string): CharKind {
  if (codepoint >= 0xe0000 && codepoint <= 0xe007f) return "tag";

  if (
    (codepoint >= 0xfe00 && codepoint <= 0xfe0f) ||
    (codepoint >= 0xe0100 && codepoint <= 0xe01ef) ||
    (codepoint >= 0x180b && codepoint <= 0x180d) ||
    codepoint === 0x180f
  ) {
    return "variation";
  }

  if (
    (codepoint >= 0x200b && codepoint <= 0x200d) ||
    codepoint === 0xfeff ||
    codepoint === 0x2060 ||
    codepoint === 0x00ad ||
    (codepoint >= 0x2061 && codepoint <= 0x2064)
  ) {
    return "zero-width";
  }

  if (
    (codepoint >= 0x200e && codepoint <= 0x200f) ||
    (codepoint >= 0x202a && codepoint <= 0x202e) ||
    (codepoint >= 0x2066 && codepoint <= 0x2069) ||
    codepoint === 0x061c
  ) {
    return "bidi";
  }

  if (category === "Zs" && codepoint !== 0x0020) return "space";
  if (isSuspicious(codepoint) || category === "Cf") return "format";
  return "other";
}

export function codepointLabel(codepoint: number): string {
  const hex = codepoint.toString(16).toUpperCase();
  return `U+${hex.padStart(codepoint > 0xffff ? 5 : 4, "0")}`;
}

const KNOWN_NAMES: Record<number, string> = {
  0x0085: "NEXT LINE",
  0x00a0: "NO-BREAK SPACE",
  0x00ad: "SOFT HYPHEN",
  0x034f: "COMBINING GRAPHEME JOINER",
  0x061c: "ARABIC LETTER MARK",
  0x115f: "HANGUL CHOSEONG FILLER",
  0x1160: "HANGUL JUNGSEONG FILLER",
  0x17b4: "KHMER VOWEL INHERENT AQ",
  0x17b5: "KHMER VOWEL INHERENT AA",
  0x180b: "MONGOLIAN FREE VARIATION SELECTOR ONE",
  0x180c: "MONGOLIAN FREE VARIATION SELECTOR TWO",
  0x180d: "MONGOLIAN FREE VARIATION SELECTOR THREE",
  0x180e: "MONGOLIAN VOWEL SEPARATOR",
  0x180f: "MONGOLIAN FREE VARIATION SELECTOR FOUR",
  0x200b: "ZERO WIDTH SPACE",
  0x200c: "ZERO WIDTH NON-JOINER",
  0x200d: "ZERO WIDTH JOINER",
  0x200e: "LEFT-TO-RIGHT MARK",
  0x200f: "RIGHT-TO-LEFT MARK",
  0x2028: "LINE SEPARATOR",
  0x2029: "PARAGRAPH SEPARATOR",
  0x202a: "LEFT-TO-RIGHT EMBEDDING",
  0x202b: "RIGHT-TO-LEFT EMBEDDING",
  0x202c: "POP DIRECTIONAL FORMATTING",
  0x202d: "LEFT-TO-RIGHT OVERRIDE",
  0x202e: "RIGHT-TO-LEFT OVERRIDE",
  0x202f: "NARROW NO-BREAK SPACE",
  0x2060: "WORD JOINER",
  0x2061: "FUNCTION APPLICATION",
  0x2062: "INVISIBLE TIMES",
  0x2063: "INVISIBLE SEPARATOR",
  0x2064: "INVISIBLE PLUS",
  0x2066: "LEFT-TO-RIGHT ISOLATE",
  0x2067: "RIGHT-TO-LEFT ISOLATE",
  0x2068: "FIRST STRONG ISOLATE",
  0x2069: "POP DIRECTIONAL ISOLATE",
  0x2800: "BRAILLE PATTERN BLANK",
  0x3000: "IDEOGRAPHIC SPACE",
  0x3164: "HANGUL FILLER",
  0xfe00: "VARIATION SELECTOR-1",
  0xfe0e: "VARIATION SELECTOR-15",
  0xfe0f: "VARIATION SELECTOR-16",
  0xfeff: "ZERO WIDTH NO-BREAK SPACE",
  0xffa0: "HALFWIDTH HANGUL FILLER",
  0xfff9: "INTERLINEAR ANNOTATION ANCHOR",
  0xfffa: "INTERLINEAR ANNOTATION SEPARATOR",
  0xfffb: "INTERLINEAR ANNOTATION TERMINATOR",
  0x1d173: "MUSICAL SYMBOL BEGIN BEAM",
  0x1d17a: "MUSICAL SYMBOL END PHRASE",
  0xe0020: "TAG SPACE",
  0xe007f: "CANCEL TAG",
};

export function charName(_ch: string, codepoint: number): string {
  if (KNOWN_NAMES[codepoint]) return KNOWN_NAMES[codepoint];
  if (codepoint >= 0xfe00 && codepoint <= 0xfe0f) {
    return `VARIATION SELECTOR-${codepoint - 0xfe00 + 1}`;
  }
  if (codepoint >= 0xe0100 && codepoint <= 0xe01ef) {
    return `VARIATION SELECTOR-${codepoint - 0xe0100 + 17}`;
  }
  if (codepoint >= 0xe0001 && codepoint <= 0xe007e) {
    return `TAG CHARACTER ${codepointLabel(codepoint)}`;
  }
  if (codepoint >= 0x1d173 && codepoint <= 0x1d17a) {
    return `MUSICAL SYMBOL FORMAT ${codepointLabel(codepoint)}`;
  }
  return `CODEPOINT ${codepointLabel(codepoint)}`;
}

/** Map line-like separators to ASCII newlines. */
export function normalizeLineSeparator(codepoint: number): string | null {
  if (codepoint === 0x0085 || codepoint === 0x2028) return "\n";
  if (codepoint === 0x2029) return "\n";
  return null;
}
