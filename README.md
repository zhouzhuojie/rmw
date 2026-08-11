# rmw

**rm watermarks** — detect and remove invisible Unicode from text.

[![Open Source](https://img.shields.io/badge/open%20source-MIT-1f4b3a)](https://github.com/zhouzhuojie/rmw)
[![GitHub](https://img.shields.io/badge/github-zhouzhuojie%2Frmw-181717?logo=github)](https://github.com/zhouzhuojie/rmw)
[![Pages](https://img.shields.io/badge/demo-GitHub%20Pages-2f6fed)](https://zhouzhuojie.github.io/rmw/)

**Open source.** Verify the code at [github.com/zhouzhuojie/rmw](https://github.com/zhouzhuojie/rmw).

Zero-width spaces, bidi overrides, variation selectors, tag characters, odd spaces — the junk that breaks diffs, linters, paste, and quiet tracking. One shared core. Three surfaces: library, CLI, browser.

Runs entirely on your machine. Nothing is uploaded.

> **Not** a statistical Claude watermark remover. Anthropic’s model-level token bias is not hidden characters; `rmw` does not claim to strip that. It cleans the Unicode you *can* prove is there.

---

## CLI — no install (preferred)

Runs straight from GitHub via `npx`. No clone, no `pnpm install`, no npm publish.

```bash
npx --yes github:zhouzhuojie/rmw detect notes.md
# detect: clean — no invisible Unicode found
#   or
# detect: found 6 invisible character(s) (5 codepoint(s))
#   U+200B     ×1    zero-width  ZERO WIDTH SPACE
#   ...

npx --yes github:zhouzhuojie/rmw clean notes.md -o clean.md
# clean: removed 4, normalized 2 space(s) → clean.md

cat notes.md | npx --yes github:zhouzhuojie/rmw clean > clean.md
npx --yes github:zhouzhuojie/rmw detect notes.md --json
npx --yes github:zhouzhuojie/rmw detect notes.md --fail   # exit 1 if dirty (CI)
```

| Flag | Meaning |
|------|---------|
| `--json` | machine-readable output |
| `--fail` | `detect` exits `1` when marks are found |
| `-q` / `--quiet` | minimal output |
| `-v` / `--verbose` | list details + scope note |
| `-o` / `--output` | `clean` write to file |

**Exit codes:** `0` ok · `1` detect found marks (with `--fail`) · `2` error

`--yes` skips the npx install prompt. Requires Node ≥ 18.

---

## Web UI

**Live demo:** [https://zhouzhuojie.github.io/rmw/](https://zhouzhuojie.github.io/rmw/)

Local (port **8080**):

```bash
git clone https://github.com/zhouzhuojie/rmw.git
cd rmw
pnpm install
pnpm dev
# → http://localhost:8080
```

Paste → **Detect** or **Clean** → copy. Built-in examples load dirty Unicode so you can try immediately. Same engine as the CLI; fully client-side.

```bash
pnpm build && pnpm preview   # also http://localhost:8080
```

---

## CLI — from a local clone

```bash
pnpm install
pnpm rmw detect notes.md
pnpm rmw clean notes.md -o clean.md
pnpm rmw clean notes.md --no-space-normalize
pnpm rmw help
```

---

## What it catches

| Kind | Examples |
|------|----------|
| **Zero-width** | ZWSP `U+200B`, ZWNJ, ZWJ, word joiner, invisible math ops, soft hyphen, BOM |
| **Bidi** | LRM/RLM, embeddings, overrides, isolates (Trojan Source class) |
| **Variation** | VS1–16 (`U+FE00`–`U+FE0F`), Mongolian FVS, ideographic VS |
| **Tags** | Unicode tag block `U+E0000`–`U+E007F` (stego alphabets) |
| **Fillers** | Hangul fillers, Braille blank, musical format controls |
| **Spaces** | NBSP, ideographic, thin/hair/em… → ASCII space (optional) |
| **Catch-all** | Any remaining Unicode **Format (`Cf`)** character |

Line separators (`U+0085`, `U+2028`, `U+2029`) become normal newlines.

---

## Library

```ts
import { detect, clean } from "@rmw/core";

const report = detect(text);
// { findings, totalSuspicious, hasSuspiciousChars }

const { text, removed, removedCount, normalizedSpaces } = clean(input);
clean(input, { normalizeSpaces: false });
```

---

## Repo layout

```
packages/
  core/   detect() + clean()   shared by CLI and web
  cli/    rmw (bundled to dist for npx)
  web/    static UI (Vite)
```

```bash
pnpm test
pnpm build
```

The published/git entrypoint is the **self-contained** binary at `packages/cli/dist/cli.js` (zero runtime deps). Rebuild it with `pnpm build` after CLI changes, and commit the dist so `npx github:…` keeps working.

---

## License

MIT
