import { clean, detect, type Finding } from "@rmw/core";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { stdin as stdinStream } from "node:process";

const VERSION = "0.1.0";

function usage(): string {
  return `rmw (rm watermarks) — detect & remove invisible Unicode from text

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

type Args = {
  command: "detect" | "clean" | "help" | "version";
  file?: string;
  output?: string;
  json: boolean;
  normalizeSpaces: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    command: "help",
    json: false,
    normalizeSpaces: true,
  };

  const rest = [...argv];
  if (rest.length === 0) return args;

  const head = rest.shift()!;
  if (head === "-h" || head === "--help") {
    args.command = "help";
    return args;
  }
  if (head === "-v" || head === "--version") {
    args.command = "version";
    return args;
  }
  if (head !== "detect" && head !== "clean") {
    throw new Error(`Unknown command: ${head}\n\n${usage()}`);
  }
  args.command = head;

  while (rest.length > 0) {
    const token = rest.shift()!;
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

async function readInput(file?: string): Promise<string> {
  if (file) {
    if (!existsSync(file)) throw new Error(`File not found: ${file}`);
    return readFileSync(file, "utf8");
  }
  if (stdinStream.isTTY) {
    throw new Error("No input file and stdin is a TTY. Pass a file or pipe text.");
  }
  const chunks: Buffer[] = [];
  for await (const chunk of stdinStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function formatFindings(findings: Finding[]): string {
  if (findings.length === 0) return "  (none)";
  return findings
    .map(
      (f) =>
        `  ${f.codepoint.padEnd(10)} ${String(f.count).padStart(4)}  ${f.kind.padEnd(11)} ${f.name}`,
    )
    .join("\n");
}

async function main(): Promise<number> {
  let args: Args;
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

  let text: string;
  try {
    text = await readInput(args.file);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return 1;
  }

  if (args.command === "detect") {
    const result = detect(text);
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(
        result.hasSuspiciousChars
          ? `Found ${result.totalSuspicious} suspicious character(s):`
          : "No suspicious Unicode characters found.",
      );
      if (result.findings.length > 0) {
        console.log(formatFindings(result.findings));
      }
      console.log(
        "\nNote: this only scans invisible/format Unicode. It cannot detect Anthropic's statistical text watermark.",
      );
    }
    return result.hasSuspiciousChars ? 0 : 0;
  }

  // clean
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
          output: args.output ?? "(stdout)",
        },
        null,
        2,
      ),
    );
  } else {
    console.error(
      `removed: ${result.removedCount} | spaces normalized: ${result.normalizedSpaces}` +
        (args.output ? ` | wrote ${args.output}` : ""),
    );
  }

  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
