import { describe, expect, it } from "vitest";
import {
  SUSPICIOUS_RANGES,
  annotate,
  clean,
  detect,
  isSuspicious,
} from "./index.js";

// --- helpers ---------------------------------------------------------------

const cp = (n: number) => String.fromCodePoint(n);
const join = (...codes: number[]) => codes.map(cp).join("");

/** Classic zero-width stego alphabet (StegZero V2-style). */
const STEGO_V2 = [
  0x200b, // ZWSP
  0x200c, // ZWNJ
  0x200d, // ZWJ
  0x2060, // word joiner
  0x2062, // invisible times
  0x2063, // invisible separator
  0x2064, // invisible plus
  0xfeff, // BOM / ZWNBSP
];

/** Binary stego pair commonly used because it survives some gateways. */
const STEGO_BINARY = [0x200b, 0x200c];

// --- isSuspicious / ranges -------------------------------------------------

describe("coverage ranges", () => {
  it("flags every StegZero-style invisible codepoint", () => {
    for (const code of STEGO_V2) {
      expect(isSuspicious(code, cp(code)), `U+${code.toString(16)}`).toBe(true);
    }
  });

  it("flags full bidi / Trojan Source set", () => {
    const bidi = [
      0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067,
      0x2068, 0x2069, 0x061c,
    ];
    for (const code of bidi) {
      expect(isSuspicious(code, cp(code)), `U+${code.toString(16)}`).toBe(true);
    }
  });

  it("flags variation selectors 1–16", () => {
    for (let code = 0xfe00; code <= 0xfe0f; code++) {
      expect(isSuspicious(code, cp(code))).toBe(true);
    }
  });

  it("flags Unicode tags used for steganography", () => {
    expect(isSuspicious(0xe0001, cp(0xe0001))).toBe(true);
    expect(isSuspicious(0xe0041, cp(0xe0041))).toBe(true); // TAG LATIN CAPITAL A
    expect(isSuspicious(0xe007f, cp(0xe007f))).toBe(true);
  });

  it("flags fillers and braille blank", () => {
    for (const code of [0x115f, 0x1160, 0x3164, 0xffa0, 0x2800, 0x034f]) {
      expect(isSuspicious(code, cp(code)), `U+${code.toString(16)}`).toBe(true);
    }
  });

  it("flags musical format controls and IVS sample", () => {
    expect(isSuspicious(0x1d173, cp(0x1d173))).toBe(true);
    expect(isSuspicious(0x1d17a, cp(0x1d17a))).toBe(true);
    expect(isSuspicious(0xe0100, cp(0xe0100))).toBe(true);
  });

  it("does not flag normal ASCII letters, digits, or newlines", () => {
    for (const ch of "Hello, world!\n\t123") {
      const code = ch.codePointAt(0)!;
      // tab/newline are Cc, not suspicious for our cleaner
      expect(isSuspicious(code, ch)).toBe(false);
    }
  });

  it("has non-empty explicit ranges", () => {
    expect(SUSPICIOUS_RANGES.length).toBeGreaterThan(10);
  });
});

// --- detect ----------------------------------------------------------------

describe("detect", () => {
  it("finds nothing in plain ASCII", () => {
    const r = detect("hello world\nline 2");
    expect(r.hasSuspiciousChars).toBe(false);
    expect(r.totalSuspicious).toBe(0);
    expect(r.findings).toEqual([]);
  });

  it("counts zero-width and bidi marks", () => {
    const r = detect(`hi${cp(0x200b)}${cp(0x200b)}${cp(0x202e)}there`);
    expect(r.hasSuspiciousChars).toBe(true);
    expect(r.totalSuspicious).toBe(3);
    expect(r.findings.find((f) => f.codepoint === "U+200B")?.count).toBe(2);
    expect(r.findings.find((f) => f.codepoint === "U+202E")?.kind).toBe("bidi");
  });

  it("flags non-ASCII spaces", () => {
    const r = detect(`a${cp(0x00a0)}b`);
    expect(r.totalSuspicious).toBe(1);
    expect(r.findings[0]?.codepoint).toBe("U+00A0");
    expect(r.findings[0]?.kind).toBe("space");
  });

  it("detects a binary stego payload between words", () => {
    // "hi" + bit pattern ZWSP/ZWNJ + "there"
    const payload = join(...STEGO_BINARY, ...STEGO_BINARY, 0x200b);
    const r = detect(`hi${payload}there`);
    expect(r.totalSuspicious).toBe(5);
    expect(r.findings.map((f) => f.codepoint).sort()).toEqual([
      "U+200B",
      "U+200C",
    ]);
  });

  it("detects full stego V2 alphabet embedded once each", () => {
    const r = detect(`x${join(...STEGO_V2)}y`);
    expect(r.totalSuspicious).toBe(STEGO_V2.length);
    for (const code of STEGO_V2) {
      const label = `U+${code.toString(16).toUpperCase().padStart(4, "0")}`;
      expect(r.findings.some((f) => f.codepoint === label)).toBe(true);
    }
  });

  it("detects variation selectors and tags", () => {
    const r = detect(`a${cp(0xfe0f)}${cp(0xe0042)}b`);
    expect(r.totalSuspicious).toBe(2);
    expect(r.findings.find((f) => f.codepoint === "U+FE0F")?.kind).toBe(
      "variation",
    );
    expect(r.findings.find((f) => f.codepoint === "U+E0042")?.kind).toBe("tag");
  });

  it("detects line separators", () => {
    const r = detect(`a${cp(0x2028)}b${cp(0x2029)}c${cp(0x0085)}d`);
    expect(r.totalSuspicious).toBe(3);
  });

  it("detects multiple exotic space types", () => {
    // em space, thin space, hair space, ideographic, NNBSP
    const spaces = [0x2003, 0x2009, 0x200a, 0x3000, 0x202f];
    const r = detect(spaces.map(cp).join("x"));
    // pattern: sp x sp x ... → 5 spaces
    expect(r.totalSuspicious).toBe(5);
    expect(r.findings.every((f) => f.kind === "space")).toBe(true);
  });
});

// --- clean -----------------------------------------------------------------

describe("clean", () => {
  it("leaves pure ASCII unchanged", () => {
    const input = "Hello, world!\n\n- list item";
    const r = clean(input);
    expect(r.text).toBe(input);
    expect(r.removedCount).toBe(0);
    expect(r.normalizedSpaces).toBe(0);
  });

  it("removes zero-width characters", () => {
    const r = clean(`foo${cp(0x200b)}bar${cp(0x200c)}baz`);
    expect(r.text).toBe("foobarbaz");
    expect(r.removedCount).toBe(2);
  });

  it("removes soft hyphen and bidi overrides", () => {
    const r = clean(`co${cp(0x00ad)}operate ${cp(0x202e)}x`);
    expect(r.text).toBe("cooperate x");
    expect(r.removedCount).toBe(2);
  });

  it("normalizes Unicode spaces to ASCII space", () => {
    const r = clean(`a${cp(0x00a0)}b${cp(0x3000)}c`);
    expect(r.text).toBe("a b c");
    expect(r.normalizedSpaces).toBe(2);
    expect(r.removedCount).toBe(0);
  });

  it("preserves newlines and Markdown structure", () => {
    const md = `# Title\n\n\`\`\`js\nconst x = 1;\n\`\`\`\n\npara`;
    const r = clean(md);
    expect(r.text).toBe(md);
  });

  it("can skip space normalization", () => {
    const r = clean(`a${cp(0x00a0)}b`, { normalizeSpaces: false });
    expect(r.text).toBe(`a${cp(0x00a0)}b`);
    expect(r.normalizedSpaces).toBe(0);
  });

  it("is idempotent after clean", () => {
    const dirty = `x${cp(0x200b)}${cp(0x00a0)}y${cp(0x202e)}`;
    const once = clean(dirty);
    const twice = clean(once.text);
    expect(twice.text).toBe(once.text);
    expect(twice.removedCount).toBe(0);
  });

  it("detect then clean clears findings", () => {
    const dirty = `Draft${cp(0x200b)} text${cp(0x00a0)}here`;
    expect(detect(dirty).hasSuspiciousChars).toBe(true);
    const { text } = clean(dirty);
    expect(detect(text).hasSuspiciousChars).toBe(false);
    expect(text).toBe("Draft text here");
  });

  it("strips an entire stego V2 payload", () => {
    const dirty = `Hello${join(...STEGO_V2)}world`;
    const r = clean(dirty);
    expect(r.text).toBe("Helloworld");
    expect(r.removedCount).toBe(STEGO_V2.length);
    expect(detect(r.text).hasSuspiciousChars).toBe(false);
  });

  it("strips variation selectors (including emoji VS-16)", () => {
    // U+2764 HEAVY BLACK HEART + FE0F (emoji presentation)
    const heartEmoji = `\u2764${cp(0xfe0f)}`;
    const r = clean(`love ${heartEmoji} now`);
    expect(r.text).toBe("love \u2764 now");
    expect(r.removedCount).toBe(1);
    expect(r.removed[0]?.codepoint).toBe("U+FE0F");
  });

  it("strips Unicode tag steganography", () => {
    // TAG characters spelling nothing useful — should vanish
    const tags = join(0xe0048, 0xe0049); // TAG H, TAG I
    const r = clean(`say${tags}hi`);
    expect(r.text).toBe("sayhi");
    expect(r.removedCount).toBe(2);
  });

  it("normalizes line/paragraph separators to LF", () => {
    const r = clean(`a${cp(0x2028)}b${cp(0x2029)}c${cp(0x0085)}d`);
    expect(r.text).toBe("a\nb\nc\nd");
    expect(r.removedCount).toBe(3);
  });

  it("removes Braille blank and Hangul fillers", () => {
    const r = clean(`x${cp(0x2800)}${cp(0x3164)}${cp(0xffa0)}y`);
    expect(r.text).toBe("xy");
    expect(r.removedCount).toBe(3);
  });

  it("removes musical format controls", () => {
    const r = clean(`n${cp(0x1d173)}ote${cp(0x1d17a)}`);
    expect(r.text).toBe("note");
    expect(r.removedCount).toBe(2);
  });

  it("removes combining grapheme joiner and Mongolian vowel separator", () => {
    const r = clean(`a${cp(0x034f)}b${cp(0x180e)}c`);
    expect(r.text).toBe("abc");
    expect(r.removedCount).toBe(2);
  });

  it("removes all bidi isolates and embeddings in one pass", () => {
    const bidi = join(
      0x202a,
      0x202b,
      0x202c,
      0x202d,
      0x202e,
      0x2066,
      0x2067,
      0x2068,
      0x2069,
    );
    const r = clean(`safe${bidi}code`);
    expect(r.text).toBe("safecode");
    expect(r.removedCount).toBe(9);
  });

  it("handles mixed real document junk", () => {
    const dirty = [
      "Title",
      cp(0xfeff), // BOM mid-text
      ": ",
      "foo",
      cp(0x200b),
      cp(0x200c),
      "bar",
      cp(0x00a0),
      "baz",
      cp(0x202e),
      "\n",
      "end",
    ].join("");
    const r = clean(dirty);
    expect(r.text).toBe("Title: foobar baz\nend");
    expect(detect(r.text).hasSuspiciousChars).toBe(false);
  });

  it("preserves tabs and normal spaces", () => {
    const r = clean("a\tb  c");
    expect(r.text).toBe("a\tb  c");
  });

  it("reports per-codepoint removal counts", () => {
    const r = clean(`${cp(0x200b)}${cp(0x200b)}${cp(0x200c)}`);
    expect(r.removed.find((f) => f.codepoint === "U+200B")?.count).toBe(2);
    expect(r.removed.find((f) => f.codepoint === "U+200C")?.count).toBe(1);
  });
});

// --- round-trip matrix -----------------------------------------------------

describe("annotate", () => {
  it("splits plain text and marks for visualization", () => {
    const parts = annotate(`Hi${cp(0x200b)}there`);
    expect(parts).toEqual([
      { type: "text", value: "Hi" },
      expect.objectContaining({
        type: "mark",
        label: "ZWSP",
        codepoint: "U+200B",
      }),
      { type: "text", value: "there" },
    ]);
  });

  it("returns a single text part when clean", () => {
    expect(annotate("hello")).toEqual([{ type: "text", value: "hello" }]);
  });
});

describe("per-codepoint clean matrix", () => {
  const samples: { code: number; label: string }[] = [
    { code: 0x00ad, label: "soft hyphen" },
    { code: 0x034f, label: "CGJ" },
    { code: 0x061c, label: "ALM" },
    { code: 0x180e, label: "Mongolian VS" },
    { code: 0x200b, label: "ZWSP" },
    { code: 0x200c, label: "ZWNJ" },
    { code: 0x200d, label: "ZWJ" },
    { code: 0x200e, label: "LRM" },
    { code: 0x200f, label: "RLM" },
    { code: 0x202e, label: "RLO" },
    { code: 0x2060, label: "WJ" },
    { code: 0x2061, label: "function application" },
    { code: 0x2062, label: "invisible times" },
    { code: 0x2063, label: "invisible separator" },
    { code: 0x2064, label: "invisible plus" },
    { code: 0x2800, label: "braille blank" },
    { code: 0x3164, label: "Hangul filler" },
    { code: 0xfe00, label: "VS1" },
    { code: 0xfe0f, label: "VS16" },
    { code: 0xfeff, label: "BOM" },
    { code: 0xffa0, label: "halfwidth Hangul filler" },
    { code: 0x1d173, label: "musical begin beam" },
    { code: 0xe0041, label: "TAG A" },
    { code: 0xe0100, label: "IVS17" },
  ];

  it.each(samples)("removes $label (U+$code)", ({ code }) => {
    const dirty = `A${cp(code)}B`;
    const r = clean(dirty);
    expect(r.text).toBe("AB");
    expect(r.removedCount).toBe(1);
    expect(detect(dirty).hasSuspiciousChars).toBe(true);
    expect(detect(r.text).hasSuspiciousChars).toBe(false);
  });
});
