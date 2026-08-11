# rmw

**rm watermarks** — keep control of AI-generated text and code.

[![Open Source](https://img.shields.io/badge/open%20source-MIT-1f4b3a)](https://github.com/zhouzhuojie/rmw)
[![GitHub](https://img.shields.io/badge/github-zhouzhuojie%2Frmw-181717?logo=github)](https://github.com/zhouzhuojie/rmw)
[![Demo](https://img.shields.io/badge/demo-GitHub%20Pages-2f6fed)](https://zhouzhuojie.github.io/rmw/)

Open source: [github.com/zhouzhuojie/rmw](https://github.com/zhouzhuojie/rmw)

Keep full control of AI-generated text and code. Strip zero-width spaces, bidi marks, variation selectors, tag characters, odd spaces, and other invisible/format Unicode — the hidden junk that breaks diffs, linters, and paste. One shared core for CLI and browser. Runs on your machine; nothing is uploaded.

---

## CLI (no install)

```bash
npx --yes github:zhouzhuojie/rmw detect notes.md
# detect: clean — no invisible Unicode found
# detect: found 6 invisible character(s) (5 codepoint(s))

npx --yes github:zhouzhuojie/rmw clean notes.md -o clean.md
# clean: removed 4, normalized 2 space(s) → clean.md

cat notes.md | npx --yes github:zhouzhuojie/rmw clean > clean.md
npx --yes github:zhouzhuojie/rmw detect notes.md --json
npx --yes github:zhouzhuojie/rmw detect notes.md --fail   # exit 1 if dirty
```

| Flag | Meaning |
|------|---------|
| `-o`, `--output` | `clean`: write to file (default: stdout) |
| `--json` | machine-readable output |
| `--fail` | `detect`: exit `1` when marks are found |
| `-q`, `--quiet` | minimal output |
| `-v`, `--verbose` | extra detail + scope note |
| `--no-space-normalize` | `clean`: keep exotic Unicode spaces |

**Exit codes:** `0` ok · `1` found marks (with `--fail`) · `2` error  

Node ≥ 18. `--yes` skips the npx prompt.

### Speed notes

The CLI is a **self-contained ~14KB** file at `packages/cli/dist/cli.js` (checked into git). Root package has **zero runtime dependencies**, so `npx` does not install Vite/Vitest/etc.

- **First** `npx github:…` is slower: clone + cache the repo once.
- **Later** runs reuse the npx cache and should feel much snappier.
- For a clone you already have: `node packages/cli/dist/cli.js detect notes.md` (instant).
- Optional one-liner without npx (always pulls latest `main`):

```bash
curl -fsSL https://raw.githubusercontent.com/zhouzhuojie/rmw/main/packages/cli/dist/cli.js | node - detect notes.md
```

### From a clone

```bash
npm install
npm run rmw -- detect notes.md
npm run rmw -- clean notes.md -o clean.md
npm run rmw -- help
```

---

## Web

**Demo:** [https://zhouzhuojie.github.io/rmw/](https://zhouzhuojie.github.io/rmw/)

```bash
git clone https://github.com/zhouzhuojie/rmw.git
cd rmw && npm install
npm run dev        # http://localhost:8080
npm run preview    # after npm run build, also :8080
```

Same engine as the CLI. Paste once: **inline chips** show invisible marks, **cleaned text** updates live. Nothing leaves the browser.

---

## What it catches

| Kind | Examples |
|------|----------|
| **Zero-width** | ZWSP `U+200B`, ZWNJ, ZWJ, word joiner, invisible math ops, soft hyphen, BOM |
| **Bidi** | LRM/RLM, embeddings, overrides, isolates |
| **Variation** | VS1–16, Mongolian FVS, ideographic VS |
| **Tags** | Unicode tags `U+E0000`–`U+E007F` |
| **Fillers** | Hangul fillers, Braille blank, musical format controls |
| **Spaces** | NBSP, ideographic, thin/hair/em… → ASCII space (optional) |
| **Catch-all** | Any remaining Unicode Format (`Cf`) character |

Line separators (`U+0085`, `U+2028`, `U+2029`) become newlines.

---

## Library

```ts
import { detect, clean } from "@rmw/core";

detect(text);
// { findings, totalSuspicious, hasSuspiciousChars }

clean(text);
// { text, removed, removedCount, normalizedSpaces }

clean(text, { normalizeSpaces: false });
```

---

## Layout

```
packages/
  core/   detect() + clean()
  cli/    source + bundled dist/cli.js (checked in for fast npx)
  web/    static UI
```

```bash
npm test
npm run build   # rebuild packages/cli/dist/cli.js — commit dist so npx stays current
```

## License

MIT
