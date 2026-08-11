import { clean, detect, type Finding } from "@rmw/core";

const input = document.querySelector<HTMLTextAreaElement>("#input")!;
const output = document.querySelector<HTMLTextAreaElement>("#output")!;
const summary = document.querySelector<HTMLParagraphElement>("#summary")!;
const findingsEl = document.querySelector<HTMLUListElement>("#findings")!;
const detectBtn = document.querySelector<HTMLButtonElement>("#detect-btn")!;
const cleanBtn = document.querySelector<HTMLButtonElement>("#clean-btn")!;
const copyBtn = document.querySelector<HTMLButtonElement>("#copy-btn")!;
const clearBtn = document.querySelector<HTMLButtonElement>("#clear-btn")!;

const cp = (n: number) => String.fromCodePoint(n);

/** Demo samples with real invisible characters. */
const EXAMPLES: Record<string, string> = {
  stego: [
    "Hello" + cp(0x200b) + cp(0x200c) + cp(0x200d) + "world",
    "",
    "Zero-width stego alphabet between the words (ZWSP, ZWNJ, ZWJ).",
  ].join("\n"),

  bidi: [
    "Safe filename: photo" + cp(0x202e) + "gpj.exe",
    "",
    "RLO (U+202E) reverses display order.",
    "Also: " + cp(0x200e) + "LRM " + cp(0x200f) + "RLM " + cp(0x2066) + "isolate" + cp(0x2069),
  ].join("\n"),

  mixed: [
    "# Meeting notes",
    "",
    "Claude" + cp(0x200b) + " says hello.",
    "Status:" + cp(0x00a0) + "done",
    "Soft" + cp(0x00ad) + "hyphen example.",
    "Wide" + cp(0x3000) + "ideographic space.",
    "BOM mid-text:" + cp(0xfeff) + "here",
    "Word" + cp(0x2060) + "joiner + " + cp(0x2063) + "invisible separator.",
    "",
    "Normal line with no marks.",
  ].join("\n"),
};

function renderFindings(findings: Finding[]): void {
  findingsEl.replaceChildren();
  for (const f of findings) {
    const li = document.createElement("li");
    li.textContent = `${f.codepoint}  ×${f.count}  ${f.kind}  ${f.name}`;
    findingsEl.appendChild(li);
  }
}

function setSummary(text: string, tone: "ok" | "bad" | "muted" = "muted"): void {
  summary.textContent = text;
  summary.classList.remove("ok", "bad");
  if (tone === "ok") summary.classList.add("ok");
  if (tone === "bad") summary.classList.add("bad");
}

function runDetect(): void {
  const result = detect(input.value);
  renderFindings(result.findings);
  if (!result.hasSuspiciousChars) {
    setSummary("detect: clean — no invisible Unicode found", "ok");
  } else {
    setSummary(
      `detect: found ${result.totalSuspicious} invisible character(s) (${result.findings.length} codepoint(s))`,
      "bad",
    );
  }
}

function runClean(): void {
  const result = clean(input.value);
  output.value = result.text;
  renderFindings(result.removed);
  copyBtn.disabled = result.text.length === 0;

  if (result.removedCount === 0 && result.normalizedSpaces === 0) {
    setSummary("clean: nothing to remove", "ok");
  } else {
    setSummary(
      `clean: removed ${result.removedCount}, normalized ${result.normalizedSpaces} space(s)`,
      "ok",
    );
  }
}

function loadExample(key: string): void {
  const text = EXAMPLES[key];
  if (!text) return;
  input.value = text;
  output.value = "";
  copyBtn.disabled = true;
  runDetect();
}

detectBtn.addEventListener("click", runDetect);
cleanBtn.addEventListener("click", runClean);

copyBtn.addEventListener("click", async () => {
  if (!output.value) return;
  try {
    await navigator.clipboard.writeText(output.value);
    setSummary("Copied cleaned text", "ok");
  } catch {
    setSummary("Could not copy — select cleaned text manually", "bad");
  }
});

clearBtn.addEventListener("click", () => {
  input.value = "";
  output.value = "";
  findingsEl.replaceChildren();
  copyBtn.disabled = true;
  setSummary("Load an example, then Detect or Clean.");
});

for (const btn of document.querySelectorAll<HTMLButtonElement>("[data-example]")) {
  btn.addEventListener("click", () => loadExample(btn.dataset.example!));
}

loadExample("mixed");
