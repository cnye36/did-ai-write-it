/*
  Shared source of truth for both export formats (DOCX, PDF): walks a
  Tiptap/ProseMirror JSON document (the same shape round-tripped via
  RichEditorHandle.getDoc() / RunRow.doc) into a small, format-agnostic block
  representation. Neither generator touches ProseMirror JSON directly, so a
  future schema change (e.g. tables) only needs updating here.
*/

export interface InlineRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  underline?: boolean;
  code?: boolean;
  link?: string;
}

export type TextAlign = "left" | "center" | "right";

export type ExportBlock =
  | { type: "paragraph"; align?: TextAlign; runs: InlineRun[] }
  | { type: "blockquote"; align?: TextAlign; runs: InlineRun[] }
  | { type: "heading"; level: number; align?: TextAlign; runs: InlineRun[] }
  | { type: "bulletList"; items: InlineRun[][] }
  | { type: "orderedList"; items: InlineRun[][] }
  | { type: "taskList"; items: { checked: boolean; runs: InlineRun[] }[] }
  | { type: "codeBlock"; text: string }
  | { type: "horizontalRule" };

interface PMMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface PMNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  marks?: PMMark[];
  text?: string;
}

function alignOf(node: PMNode): TextAlign | undefined {
  const align = node.attrs?.textAlign;
  return align === "center" || align === "right" ? align : undefined;
}

/** A single textblock's (paragraph/heading/blockquote) content, flattened to
 *  runs. `hardBreak` becomes a literal newline inside the surrounding run's
 *  text rather than a separate block, matching how it reads on screen. */
function runsFromContent(content: PMNode[] | undefined): InlineRun[] {
  if (!content) return [];
  const runs: InlineRun[] = [];
  for (const node of content) {
    if (node.type === "hardBreak") {
      const last = runs[runs.length - 1];
      if (last) last.text += "\n";
      else runs.push({ text: "\n" });
      continue;
    }
    if (node.type !== "text" || !node.text) continue;
    const run: InlineRun = { text: node.text };
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") run.bold = true;
      else if (mark.type === "italic") run.italic = true;
      else if (mark.type === "strike") run.strike = true;
      else if (mark.type === "underline") run.underline = true;
      else if (mark.type === "code") run.code = true;
      else if (mark.type === "link" && typeof mark.attrs?.href === "string") run.link = mark.attrs.href;
    }
    runs.push(run);
  }
  return runs;
}

/** A list item's own paragraph(s) collapsed into one run of text: this
 *  export targets the simple single-paragraph items this editor actually
 *  produces, not arbitrarily nested block content within a list item. */
function runsFromListItem(item: PMNode): InlineRun[] {
  const runs: InlineRun[] = [];
  for (const child of item.content ?? []) {
    if (child.type !== "paragraph") continue;
    if (runs.length > 0) runs.push({ text: "\n" });
    runs.push(...runsFromContent(child.content));
  }
  return runs;
}

export function docToExportBlocks(doc: object): ExportBlock[] {
  const root = doc as PMNode;
  const blocks: ExportBlock[] = [];

  for (const node of root.content ?? []) {
    switch (node.type) {
      case "paragraph":
        blocks.push({ type: "paragraph", align: alignOf(node), runs: runsFromContent(node.content) });
        break;
      case "heading":
        blocks.push({
          type: "heading",
          level: typeof node.attrs?.level === "number" ? node.attrs.level : 1,
          align: alignOf(node),
          runs: runsFromContent(node.content),
        });
        break;
      case "blockquote": {
        const runs: InlineRun[] = [];
        for (const child of node.content ?? []) {
          if (child.type !== "paragraph") continue;
          if (runs.length > 0) runs.push({ text: "\n" });
          runs.push(...runsFromContent(child.content));
        }
        blocks.push({ type: "blockquote", runs });
        break;
      }
      case "bulletList":
        blocks.push({ type: "bulletList", items: (node.content ?? []).map(runsFromListItem) });
        break;
      case "orderedList":
        blocks.push({ type: "orderedList", items: (node.content ?? []).map(runsFromListItem) });
        break;
      case "taskList":
        blocks.push({
          type: "taskList",
          items: (node.content ?? []).map((item) => ({
            checked: item.attrs?.checked === true,
            runs: runsFromListItem(item),
          })),
        });
        break;
      case "codeBlock": {
        const text = (node.content ?? []).map((n) => n.text ?? "").join("");
        blocks.push({ type: "codeBlock", text });
        break;
      }
      case "horizontalRule":
        blocks.push({ type: "horizontalRule" });
        break;
      default:
        // Unknown/unsupported node: skip rather than throw, so an export
        // still succeeds with everything else it does understand.
        break;
    }
  }

  return blocks;
}
