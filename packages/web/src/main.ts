import { annotate, clean, detect, type AnnotatePart } from "@rmw/core";

const input = document.querySelector<HTMLTextAreaElement>("#input")!;
const viz = document.querySelector<HTMLDivElement>("#viz")!;
const legend = document.querySelector<HTMLUListElement>("#legend")!;
const output = document.querySelector<HTMLPreElement>("#output")!;
const status = document.querySelector<HTMLSpanElement>("#status")!;
const copyBtn = document.querySelector<HTMLButtonElement>("#copy-btn")!;
const clearBtn = document.querySelector<HTMLButtonElement>("#clear-btn")!;

const cp = (n: number) => String.fromCodePoint(n);

const EXAMPLES: Record<string, string> = {
  stego: [
    "Hello" + cp(0x200b) + cp(0x200c) + cp(0x200d) + "world",
    "",
    "Zero-width marks between the words.",
  ].join("\n"),

  bidi: [
    "filename: photo" + cp(0x202e) + "gpj.exe",
    "",
    "RLO reverses display order.",
    "Also " + cp(0x200e) + "LRM " + cp(0x200f) + "RLM",
  ].join("\n"),

  mixed: [
    "# Notes",
    "",
    "Draft" + cp(0x200b) + " hello.",
    "Status:" + cp(0x00a0) + "done",
    "Soft" + cp(0x00ad) + "hyphen.",
    "Wide" + cp(0x3000) + "space.",
    "BOM:" + cp(0xfeff) + "here",
    "Word" + cp(0x2060) + "join " + cp(0x2063) + "sep.",
    "",
    "Clean line.",
  ].join("\n"),
};

function setStatus(text: string, tone: "ok" | "bad" | "muted" = "muted"): void {
  status.textContent = text;
  status.classList.remove("ok", "bad");
  if (tone === "ok") status.classList.add("ok");
  if (tone === "bad") status.classList.add("bad");
}

function renderViz(parts: AnnotatePart[]): void {
  viz.replaceChildren();
  for (const part of parts) {
    if (part.type === "text") {
      viz.append(part.value);
      continue;
    }
    const mark = document.createElement("span");
    mark.className = "mark";
    mark.textContent = part.label;
    mark.title = `${part.codepoint} · ${part.name} · ${part.markKind}`;
    viz.append(mark);
  }
}

function renderLegend(parts: AnnotatePart[]): void {
  legend.replaceChildren();
  const counts = new Map<string, { label: string; codepoint: string; name: string; n: number }>();
  for (const part of parts) {
    if (part.type !== "mark") continue;
    const key = part.codepoint;
    const cur = counts.get(key);
    if (cur) cur.n += 1;
    else
      counts.set(key, {
        label: part.label,
        codepoint: part.codepoint,
        name: part.name,
        n: 1,
      });
  }
  for (const item of [...counts.values()].sort((a, b) =>
    a.codepoint.localeCompare(b.codepoint),
  )) {
    const li = document.createElement("li");
    const code = document.createElement("code");
    code.textContent = item.label;
    li.append(code, ` ×${item.n}  ${item.codepoint}  ${item.name}`);
    legend.append(li);
  }
}

function refresh(): void {
  const text = input.value;
  const parts = annotate(text);
  const report = detect(text);
  const result = clean(text);

  renderViz(parts);
  renderLegend(parts);

  output.textContent = result.text;
  copyBtn.disabled = result.text.length === 0;

  if (!text) {
    setStatus("");
    output.textContent = "";
    copyBtn.disabled = true;
    return;
  }

  if (!report.hasSuspiciousChars) {
    setStatus("clean — no invisible Unicode", "ok");
  } else {
    setStatus(
      `${report.totalSuspicious} mark(s) · ${report.findings.length} type(s) · removed live`,
      "bad",
    );
  }
}

function loadExample(key: string): void {
  const text = EXAMPLES[key];
  if (text === undefined) return;
  input.value = text;
  refresh();
  input.focus();
}

input.addEventListener("input", refresh);

copyBtn.addEventListener("click", async () => {
  const text = output.textContent ?? "";
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    setStatus("copied cleaned text", "ok");
  } catch {
    setStatus("copy failed — select cleaned text", "bad");
  }
});

clearBtn.addEventListener("click", () => {
  input.value = "";
  refresh();
  input.focus();
});

for (const btn of document.querySelectorAll<HTMLButtonElement>("[data-example]")) {
  btn.addEventListener("click", () => loadExample(btn.dataset.example!));
}

refresh();
