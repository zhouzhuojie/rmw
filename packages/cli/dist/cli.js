#!/usr/bin/env node

// ../core/src/chars.ts
var SUSPICIOUS_RANGES = [
  [173, 173],
  // soft hyphen
  [847, 847],
  // combining grapheme joiner (Mn, not Cf)
  [1564, 1564],
  // Arabic letter mark
  [4447, 4448],
  // Hangul choseong/jungseong fillers
  [6068, 6069],
  // Khmer inherent vowels
  [6155, 6159],
  // Mongolian free variation selectors + vowel separator
  [8203, 8207],
  // ZWSP, ZWNJ, ZWJ, LRM, RLM
  [8234, 8238],
  // bidi embeddings / overrides (Trojan Source)
  [8288, 8303],
  // word joiner, invisible math ops, bidi isolates, deprecated forms
  [10240, 10240],
  // Braille pattern blank (common “invisible char” paste)
  [12644, 12644],
  // Hangul filler
  [65024, 65039],
  // variation selectors 1–16 (stego + orphan VS)
  [65279, 65279],
  // ZWNBSP / BOM
  [65440, 65440],
  // halfwidth Hangul filler
  [65529, 65531],
  // interlinear annotation controls
  [119155, 119162],
  // musical symbol format controls (invisible)
  [917504, 917631],
  // Unicode tags (language-tag steganography)
  [917760, 917999]
  // ideographic variation selectors (IVS)
];
var LINE_SEPARATORS = /* @__PURE__ */ new Set([
  133,
  8232,
  8233
]);
function isInRanges(codepoint, ranges) {
  return ranges.some(([start, end]) => codepoint >= start && codepoint <= end);
}
function isSuspicious(codepoint, ch) {
  if (LINE_SEPARATORS.has(codepoint)) return false;
  if (isInRanges(codepoint, SUSPICIOUS_RANGES)) return true;
  if (ch !== void 0 && /\p{Cf}/u.test(ch)) return true;
  return false;
}
function kindOf(codepoint, category) {
  if (codepoint >= 917504 && codepoint <= 917631) return "tag";
  if (codepoint >= 65024 && codepoint <= 65039 || codepoint >= 917760 && codepoint <= 917999 || codepoint >= 6155 && codepoint <= 6157 || codepoint === 6159) {
    return "variation";
  }
  if (codepoint >= 8203 && codepoint <= 8205 || codepoint === 65279 || codepoint === 8288 || codepoint === 173 || codepoint >= 8289 && codepoint <= 8292) {
    return "zero-width";
  }
  if (codepoint >= 8206 && codepoint <= 8207 || codepoint >= 8234 && codepoint <= 8238 || codepoint >= 8294 && codepoint <= 8297 || codepoint === 1564) {
    return "bidi";
  }
  if (category === "Zs" && codepoint !== 32) return "space";
  if (isSuspicious(codepoint) || category === "Cf") return "format";
  return "other";
}
function codepointLabel(codepoint) {
  const hex = codepoint.toString(16).toUpperCase();
  return `U+${hex.padStart(codepoint > 65535 ? 5 : 4, "0")}`;
}
var KNOWN_NAMES = {
  133: "NEXT LINE",
  160: "NO-BREAK SPACE",
  173: "SOFT HYPHEN",
  847: "COMBINING GRAPHEME JOINER",
  1564: "ARABIC LETTER MARK",
  4447: "HANGUL CHOSEONG FILLER",
  4448: "HANGUL JUNGSEONG FILLER",
  6068: "KHMER VOWEL INHERENT AQ",
  6069: "KHMER VOWEL INHERENT AA",
  6155: "MONGOLIAN FREE VARIATION SELECTOR ONE",
  6156: "MONGOLIAN FREE VARIATION SELECTOR TWO",
  6157: "MONGOLIAN FREE VARIATION SELECTOR THREE",
  6158: "MONGOLIAN VOWEL SEPARATOR",
  6159: "MONGOLIAN FREE VARIATION SELECTOR FOUR",
  8203: "ZERO WIDTH SPACE",
  8204: "ZERO WIDTH NON-JOINER",
  8205: "ZERO WIDTH JOINER",
  8206: "LEFT-TO-RIGHT MARK",
  8207: "RIGHT-TO-LEFT MARK",
  8232: "LINE SEPARATOR",
  8233: "PARAGRAPH SEPARATOR",
  8234: "LEFT-TO-RIGHT EMBEDDING",
  8235: "RIGHT-TO-LEFT EMBEDDING",
  8236: "POP DIRECTIONAL FORMATTING",
  8237: "LEFT-TO-RIGHT OVERRIDE",
  8238: "RIGHT-TO-LEFT OVERRIDE",
  8239: "NARROW NO-BREAK SPACE",
  8288: "WORD JOINER",
  8289: "FUNCTION APPLICATION",
  8290: "INVISIBLE TIMES",
  8291: "INVISIBLE SEPARATOR",
  8292: "INVISIBLE PLUS",
  8294: "LEFT-TO-RIGHT ISOLATE",
  8295: "RIGHT-TO-LEFT ISOLATE",
  8296: "FIRST STRONG ISOLATE",
  8297: "POP DIRECTIONAL ISOLATE",
  10240: "BRAILLE PATTERN BLANK",
  12288: "IDEOGRAPHIC SPACE",
  12644: "HANGUL FILLER",
  65024: "VARIATION SELECTOR-1",
  65038: "VARIATION SELECTOR-15",
  65039: "VARIATION SELECTOR-16",
  65279: "ZERO WIDTH NO-BREAK SPACE",
  65440: "HALFWIDTH HANGUL FILLER",
  65529: "INTERLINEAR ANNOTATION ANCHOR",
  65530: "INTERLINEAR ANNOTATION SEPARATOR",
  65531: "INTERLINEAR ANNOTATION TERMINATOR",
  119155: "MUSICAL SYMBOL BEGIN BEAM",
  119162: "MUSICAL SYMBOL END PHRASE",
  917536: "TAG SPACE",
  917631: "CANCEL TAG"
};
function charName(_ch, codepoint) {
  if (KNOWN_NAMES[codepoint]) return KNOWN_NAMES[codepoint];
  if (codepoint >= 65024 && codepoint <= 65039) {
    return `VARIATION SELECTOR-${codepoint - 65024 + 1}`;
  }
  if (codepoint >= 917760 && codepoint <= 917999) {
    return `VARIATION SELECTOR-${codepoint - 917760 + 17}`;
  }
  if (codepoint >= 917505 && codepoint <= 917630) {
    return `TAG CHARACTER ${codepointLabel(codepoint)}`;
  }
  if (codepoint >= 119155 && codepoint <= 119162) {
    return `MUSICAL SYMBOL FORMAT ${codepointLabel(codepoint)}`;
  }
  return `CODEPOINT ${codepointLabel(codepoint)}`;
}
function normalizeLineSeparator(codepoint) {
  if (codepoint === 133 || codepoint === 8232) return "\n";
  if (codepoint === 8233) return "\n";
  return null;
}

// ../core/src/detect.ts
function detect(text) {
  const map = /* @__PURE__ */ new Map();
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    const category = unicodeCategory(ch);
    const isOddSpace = category === "Zs" && cp !== 32;
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
        kind
      });
    }
  }
  const findings = [...map.entries()].sort(([a], [b]) => a - b).map(([cp, item]) => ({
    codepoint: codepointLabel(cp),
    name: item.name,
    count: item.count,
    kind: item.kind
  }));
  const totalSuspicious = findings.reduce((sum, f) => sum + f.count, 0);
  return {
    findings,
    totalSuspicious,
    hasSuspiciousChars: totalSuspicious > 0
  };
}
function unicodeCategory(ch) {
  if (/\p{Zs}/u.test(ch)) return "Zs";
  if (/\p{Cf}/u.test(ch)) return "Cf";
  if (/\p{Cc}/u.test(ch)) return "Cc";
  if (/\p{Mn}/u.test(ch)) return "Mn";
  return "Other";
}

// ../core/src/clean.ts
function clean(text, options = {}) {
  const normalizeSpaces = options.normalizeSpaces !== false;
  const removedMap = /* @__PURE__ */ new Map();
  let normalizedSpaces = 0;
  const out = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    const line = normalizeLineSeparator(cp);
    if (line !== null) {
      bump(removedMap, cp, ch);
      out.push(line);
      continue;
    }
    if (isSuspicious(cp, ch)) {
      bump(removedMap, cp, ch);
      continue;
    }
    if (normalizeSpaces && /\p{Zs}/u.test(ch) && cp !== 32) {
      normalizedSpaces += 1;
      out.push(" ");
      continue;
    }
    out.push(ch);
  }
  const textOut = out.join("").normalize("NFC");
  const removed = [...removedMap.entries()].sort(([a], [b]) => a - b).map(([cp, info]) => ({
    codepoint: codepointLabel(cp),
    name: info.name,
    count: info.count,
    kind: info.kind
  }));
  const removedCount = removed.reduce((sum, f) => sum + f.count, 0);
  return {
    text: textOut,
    removed,
    removedCount,
    normalizedSpaces
  };
}
function bump(map, cp, ch) {
  const existing = map.get(cp);
  if (existing) {
    existing.count += 1;
    return;
  }
  const category = /\p{Zs}/u.test(ch) ? "Zs" : /\p{Cf}/u.test(ch) ? "Cf" : /\p{Mn}/u.test(ch) ? "Mn" : "Other";
  map.set(cp, {
    name: charName(ch, cp),
    count: 1,
    kind: kindOf(cp, category)
  });
}

// src/cli.ts
import { readFileSync, writeFileSync, existsSync } from "fs";
import { stdin as stdinStream } from "process";
var VERSION = "0.1.0";
function usage() {
  return `rmw (rm watermarks) \u2014 detect & remove invisible Unicode from text

Usage:
  rmw detect [file] [--json]
  rmw clean  [file] [-o out] [--json] [--no-space-normalize]
  rmw --help
  rmw --version

If no file is given, text is read from stdin.
Examples:
  rmw detect notes.md
  rmw clean notes.md -o clean.md
  cat notes.md | rmw clean > clean.md
  echo "a\\u200Bb" | rmw detect --json
`;
}
function parseArgs(argv) {
  const args = {
    command: "help",
    json: false,
    normalizeSpaces: true
  };
  const rest = [...argv];
  if (rest.length === 0) return args;
  const head = rest.shift();
  if (head === "-h" || head === "--help") {
    args.command = "help";
    return args;
  }
  if (head === "-v" || head === "--version") {
    args.command = "version";
    return args;
  }
  if (head !== "detect" && head !== "clean") {
    throw new Error(`Unknown command: ${head}

${usage()}`);
  }
  args.command = head;
  while (rest.length > 0) {
    const token = rest.shift();
    if (token === "--json") {
      args.json = true;
    } else if (token === "--no-space-normalize") {
      args.normalizeSpaces = false;
    } else if (token === "-o" || token === "--output") {
      const value = rest.shift();
      if (!value) throw new Error("Missing value for -o/--output");
      args.output = value;
    } else if (token === "-h" || token === "--help") {
      args.command = "help";
    } else if (token.startsWith("-")) {
      throw new Error(`Unknown flag: ${token}`);
    } else {
      if (args.file) throw new Error("Only one input file is allowed");
      args.file = token;
    }
  }
  return args;
}
async function readInput(file) {
  if (file) {
    if (!existsSync(file)) throw new Error(`File not found: ${file}`);
    return readFileSync(file, "utf8");
  }
  if (stdinStream.isTTY) {
    throw new Error("No input file and stdin is a TTY. Pass a file or pipe text.");
  }
  const chunks = [];
  for await (const chunk of stdinStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
function formatFindings(findings) {
  if (findings.length === 0) return "  (none)";
  return findings.map(
    (f) => `  ${f.codepoint.padEnd(10)} ${String(f.count).padStart(4)}  ${f.kind.padEnd(11)} ${f.name}`
  ).join("\n");
}
async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return 1;
  }
  if (args.command === "help") {
    console.log(usage());
    return 0;
  }
  if (args.command === "version") {
    console.log(VERSION);
    return 0;
  }
  let text;
  try {
    text = await readInput(args.file);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return 1;
  }
  if (args.command === "detect") {
    const result2 = detect(text);
    if (args.json) {
      console.log(JSON.stringify(result2, null, 2));
    } else {
      console.log(
        result2.hasSuspiciousChars ? `Found ${result2.totalSuspicious} suspicious character(s):` : "No suspicious Unicode characters found."
      );
      if (result2.findings.length > 0) {
        console.log(formatFindings(result2.findings));
      }
      console.log(
        "\nNote: this only scans invisible/format Unicode. It cannot detect Anthropic's statistical text watermark."
      );
    }
    return result2.hasSuspiciousChars ? 0 : 0;
  }
  const result = clean(text, { normalizeSpaces: args.normalizeSpaces });
  if (args.output) {
    writeFileSync(args.output, result.text, "utf8");
  } else {
    process.stdout.write(result.text);
    if (result.text.length > 0 && !result.text.endsWith("\n")) {
      process.stdout.write("\n");
    }
  }
  if (args.json) {
    console.error(
      JSON.stringify(
        {
          removedCount: result.removedCount,
          normalizedSpaces: result.normalizedSpaces,
          removed: result.removed,
          output: args.output ?? "(stdout)"
        },
        null,
        2
      )
    );
  } else {
    console.error(
      `removed: ${result.removedCount} | spaces normalized: ${result.normalizedSpaces}` + (args.output ? ` | wrote ${args.output}` : "")
    );
  }
  return 0;
}
main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
);
