import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
  type ParagraphChild,
} from "docx";
import type { ExportBlock, InlineRun, TextAlign } from "@/lib/editor-export";

const ORDERED_LIST_REFERENCE = "editor-export-ordered-list";

const HEADING_LEVELS: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};

const ALIGNMENTS: Record<TextAlign, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
};

function runsToChildren(runs: InlineRun[]): ParagraphChild[] {
  return runs.map((run) => {
    const textRun = new TextRun({
      text: run.text,
      bold: run.bold,
      italics: run.italic,
      strike: run.strike,
      underline: run.underline ? {} : undefined,
      font: run.code ? "Courier New" : undefined,
    });
    return run.link ? new ExternalHyperlink({ link: run.link, children: [textRun] }) : textRun;
  });
}

function checklistPrefix(checked: boolean): string {
  return checked ? "☑ " : "☐ ";
}

/** Walks the shared `ExportBlock[]` (see lib/editor-export.ts) into a real
 *  .docx file, entirely client-side (docx is pure JS, no native deps). */
export async function blocksToDocxBlob(blocks: ExportBlock[]): Promise<Blob> {
  const children: Paragraph[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
        children.push(
          new Paragraph({
            alignment: block.align ? ALIGNMENTS[block.align] : undefined,
            children: runsToChildren(block.runs),
          })
        );
        break;
      case "blockquote":
        children.push(
          new Paragraph({
            indent: { left: 720 },
            children: runsToChildren(block.runs),
          })
        );
        break;
      case "heading":
        children.push(
          new Paragraph({
            heading: HEADING_LEVELS[block.level] ?? HeadingLevel.HEADING_1,
            alignment: block.align ? ALIGNMENTS[block.align] : undefined,
            children: runsToChildren(block.runs),
          })
        );
        break;
      case "bulletList":
        for (const item of block.items) {
          children.push(new Paragraph({ bullet: { level: 0 }, children: runsToChildren(item) }));
        }
        break;
      case "orderedList":
        for (const item of block.items) {
          children.push(
            new Paragraph({
              numbering: { reference: ORDERED_LIST_REFERENCE, level: 0 },
              children: runsToChildren(item),
            })
          );
        }
        break;
      case "taskList":
        for (const item of block.items) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: checklistPrefix(item.checked) }), ...runsToChildren(item.runs)],
            })
          );
        }
        break;
      case "codeBlock":
        for (const line of block.text.split("\n")) {
          children.push(new Paragraph({ children: [new TextRun({ text: line, font: "Courier New" })] }));
        }
        break;
      case "horizontalRule":
        children.push(new Paragraph({ thematicBreak: true }));
        break;
    }
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: ORDERED_LIST_REFERENCE,
          levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.START }],
        },
      ],
    },
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}
