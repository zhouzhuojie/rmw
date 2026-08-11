import { clean, detect, type Finding } from "@rmw/core";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { stdin as stdinStream } from "node:process";

const VERSION = "0.1.0";

/** Exit: 0 ok/clean · 1 detect found marks · 2 usage/IO error */
const EXIT_OK = 0;
const EXIT_FOUND = 1;
const EXIT_ERROR = 2;

function usage(): string {
  return `rmw (rm watermarks) — keep control of AI-generated text

Usage:
  rmw detect [file] [options]
  rmw clean  [file] [options]
  rmw help | version

Options:
  -o, --output <file>    clean: write to file (default: stdout)
  --json                 machine-readable output
  --fail                 detect: exit 1 when marks are found
  --no-space-normalize   clean: keep exotic Unicode spaces
  -q, --quiet            minimal output
  -v, --verbose          extra detail + scope note
  -h, --help             show help
  -V, --version          show version

Examples:
  npx --yes github:zhouzhuojie/rmw detect notes.md
  npx --yes github:zhouzhuojie/rmw clean notes.md -o clean.md
  cat notes.md | rmw clean > clean.md
  rmw detect notes.md --fail
  rmw detect notes.md --json

Exit codes:
  0  ok (detect clean, or clean done; detect with findings still 0 unless --fail)
  1  detect found marks (only with --fail)
  2  error

What it does:
  Detect and remove invisible / format Unicode (ZW*, bidi, tags, odd spaces…).
  Helps you keep AI-generated text and code under your control.
`;
}

type Command = "detect" | "clean" | "help" | "version";

type Args = {
  command: Command;
  file?: string;
  output?: string;
  json: boolean;
  normalizeSpaces: boolean;
  fail: boolean;
  quiet: boolean;
  verbose: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    command: "help",
    json: false,
    normalizeSpaces: true,
    fail: false,
    quiet: false,
    verbose: false,
  };

  const rest = [...argv];
  if (rest.length === 0) return args;

  const head = rest.shift()!;
  if (head === "-h" || head === "--help" || head === "help") {
    args.command = "help";
    return args;
  }
  if (head === "-V" || head === "--version" || head === "version") {
    args.command = "version";
    return args;
  }
  // legacy: -v alone as version if no subcommand? Prefer subcommand first.
  if (head !== "detect" && head !== "clean") {
    throw new Error(`Unknown command '${head}'. Try: rmw detect | rmw clean | rmw help`);
  }
  args.command = head;

  while (rest.length > 0) {
    const token = rest.shift()!;
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

async function readInput(file?: string): Promise<string> {
  if (file) {
    if (!existsSync(file)) throw new Error(`File not found: ${file}`);
    return readFileSync(file, "utf8");
  }
  if (stdinStream.isTTY) {
    throw new Error("No input. Pass a file or pipe text on stdin.\nExample: rmw detect notes.md");
  }
  const chunks: Buffer[] = [];
  for await (const chunk of stdinStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function formatFindings(findings: Finding[]): string {
  return findings
    .map(
      (f) =>
        `  ${f.codepoint.padEnd(10)} ×${String(f.count).padEnd(4)} ${f.kind.padEnd(11)} ${f.name}`,
    )
    .join("\n");
}

function scopeNote(): string {
  return "note: strips invisible / format Unicode from text you control";
}

function runDetect(text: string, args: Args): number {
  const result = detect(text);

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          command: "detect",
          clean: !result.hasSuspiciousChars,
          total: result.totalSuspicious,
          findings: result.findings,
        },
        null,
        2,
      ),
    );
  } else if (!args.quiet) {
    if (!result.hasSuspiciousChars) {
      console.log("detect: clean — no invisible Unicode found");
    } else {
      console.log(
        `detect: found ${result.totalSuspicious} invisible character(s) ` +
          `(${result.findings.length} codepoint(s))`,
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

function runClean(text: string, args: Args): number {
  const result = clean(text, { normalizeSpaces: args.normalizeSpaces });

  if (args.output) {
    writeFileSync(args.output, result.text, "utf8");
  } else {
    // Primary payload on stdout (pipe-friendly).
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
          output: args.output ?? "stdout",
        },
        null,
        2,
      ),
    );
  } else if (!args.quiet) {
    const parts = [
      `removed ${result.removedCount}`,
      `normalized ${result.normalizedSpaces} space(s)`,
    ];
    const dest = args.output ? ` → ${args.output}` : " → stdout";
    // Status on stderr so pipes stay pure.
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

async function main(): Promise<number> {
  let args: Args;
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

  let text: string;
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
  },
);
