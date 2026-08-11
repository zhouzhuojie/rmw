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
var EXIT_OK = 0;
var EXIT_FOUND = 1;
var EXIT_ERROR = 2;
function usage() {
  return `rmw (rm watermarks) \u2014 detect & remove invisible Unicode

Usage:
  rmw detect [file] [options]
  rmw clean  [file] [options]
  rmw help
  rmw version

Options:
  -o, --output <file>       clean: write result to file (default: stdout)
  --json                    machine-readable output
  --no-space-normalize      clean: keep exotic Unicode spaces
  --fail                    detect: exit 1 when marks are found (CI)
  -q, --quiet               less output (status only / none for clean\u2192stdout)
  -v, --verbose             extra notes (scope of what rmw can detect)
  -h, --help                show help
  -V, --version             show version

Input:
  Pass a file path, or pipe text on stdin.

Examples:
  npx --yes github:zhouzhuojie/rmw detect notes.md
  npx --yes github:zhouzhuojie/rmw clean notes.md -o clean.md
  cat notes.md | rmw clean > clean.md
  rmw detect notes.md --fail          # CI: non-zero if dirty
  rmw detect notes.md --json

Exit codes:
  0  success (detect: clean \xB7 clean: done)
  1  detect found invisible/format Unicode (--fail or always; see below)
  2  error (bad args, missing file, \u2026)

By default detect exits 0 even when marks are found (inspection mode).
Pass --fail to exit 1 when anything is found (gate mode).

Scope:
  rmw only handles invisible / format Unicode (ZW*, bidi, tags, odd spaces\u2026).
  It does not detect statistical AI text watermarks.
`;
}
function parseArgs(argv) {
  const args = {
    command: "help",
    json: false,
    normalizeSpaces: true,
    fail: false,
    quiet: false,
    verbose: false
  };
  const rest = [...argv];
  if (rest.length === 0) return args;
  const head = rest.shift();
  if (head === "-h" || head === "--help" || head === "help") {
    args.command = "help";
    return args;
  }
  if (head === "-V" || head === "--version" || head === "version") {
    args.command = "version";
    return args;
  }
  if (head !== "detect" && head !== "clean") {
    throw new Error(`Unknown command '${head}'. Try: rmw detect | rmw clean | rmw help`);
  }
  args.command = head;
  while (rest.length > 0) {
    const token = rest.shift();
    switch (token) {
      case "--json":
        args.json = true;
        break;
      case "--no-space-normalize":
        args.normalizeSpaces = false;
        break;
      case "--fail":
        args.fail = true;
        break;
      case "-q":
      case "--quiet":
        args.quiet = true;
        break;
      case "-v":
      case "--verbose":
        args.verbose = true;
        break;
      case "-o":
      case "--output": {
        const value = rest.shift();
        if (!value) throw new Error("Missing value for -o/--output");
        args.output = value;
        break;
      }
      case "-h":
      case "--help":
        args.command = "help";
        break;
      case "-V":
      case "--version":
        args.command = "version";
        break;
      default:
        if (token.startsWith("-")) {
          throw new Error(`Unknown flag '${token}'. Try: rmw help`);
        }
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
    throw new Error("No input. Pass a file or pipe text on stdin.\nExample: rmw detect notes.md");
  }
  const chunks = [];
  for await (const chunk of stdinStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
function formatFindings(findings) {
  return findings.map(
    (f) => `  ${f.codepoint.padEnd(10)} \xD7${String(f.count).padEnd(4)} ${f.kind.padEnd(11)} ${f.name}`
  ).join("\n");
}
function scopeNote() {
  return "note: invisible/format Unicode only \u2014 not statistical AI watermarks";
}
function runDetect(text, args) {
  const result = detect(text);
  if (args.json) {
    console.log(
      JSON.stringify(
        {
          command: "detect",
          clean: !result.hasSuspiciousChars,
          total: result.totalSuspicious,
          findings: result.findings
        },
        null,
        2
      )
    );
  } else if (!args.quiet) {
    if (!result.hasSuspiciousChars) {
      console.log("detect: clean \u2014 no invisible Unicode found");
    } else {
      console.log(
        `detect: found ${result.totalSuspicious} invisible character(s) (${result.findings.length} codepoint(s))`
      );
      console.log(formatFindings(result.findings));
    }
    if (args.verbose) {
      console.error(scopeNote());
    }
  }
  if (result.hasSuspiciousChars && args.fail) return EXIT_FOUND;
  return EXIT_OK;
}
function runClean(text, args) {
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
          command: "clean",
          removed: result.removedCount,
          normalizedSpaces: result.normalizedSpaces,
          findings: result.removed,
          output: args.output ?? "stdout"
        },
        null,
        2
      )
    );
  } else if (!args.quiet) {
    const parts = [
      `removed ${result.removedCount}`,
      `normalized ${result.normalizedSpaces} space(s)`
    ];
    const dest = args.output ? ` \u2192 ${args.output}` : " \u2192 stdout";
    console.error(`clean: ${parts.join(", ")}${dest}`);
    if (args.verbose) {
      if (result.removed.length > 0) {
        console.error(formatFindings(result.removed));
      }
      console.error(scopeNote());
    }
  }
  return EXIT_OK;
}
async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`error: ${err instanceof Error ? err.message : err}`);
    return EXIT_ERROR;
  }
  if (args.command === "help") {
    console.log(usage());
    return EXIT_OK;
  }
  if (args.command === "version") {
    console.log(VERSION);
    return EXIT_OK;
  }
  let text;
  try {
    text = await readInput(args.file);
  } catch (err) {
    console.error(`error: ${err instanceof Error ? err.message : err}`);
    return EXIT_ERROR;
  }
  if (args.command === "detect") return runDetect(text, args);
  return runClean(text, args);
}
main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`error: ${err instanceof Error ? err.message : err}`);
    process.exit(EXIT_ERROR);
  }
);
