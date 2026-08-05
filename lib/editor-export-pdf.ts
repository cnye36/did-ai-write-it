import { jsPDF } from "jspdf";
import type { ExportBlock, InlineRun } from "@/lib/editor-export";

/*
  jsPDF lays out text imperatively (place this word at this x/y), unlike
  docx's declarative paragraph tree, so mixed-style text on one line (e.g.
  "plain **bold** plain") has to be word-wrapped by hand: split every run
  into words, track an x/y cursor, and start a new line/page whenever a word
  would overflow. Real jsPDF built-in fonts (helvetica/courier) only support
  normal/bold/italic/bolditalic, so underline is drawn as a manual line under
  the placed word rather than a font variant.
*/

const PAGE_MARGIN = 54; // 0.75in in points
const BODY_SIZE = 11;
const LINE_HEIGHT = 16;
const BLOCK_GAP = 10;
const LIST_INDENT = 20;

const HEADING_SIZES: Record<number, number> = { 1: 22, 2: 18, 3: 15, 4: 13, 5: 12, 6: 11 };

type FontStyle = "normal" | "bold" | "italic" | "bolditalic";

function fontStyleFor(run: InlineRun): FontStyle {
  if (run.bold && run.italic) return "bolditalic";
  if (run.bold) return "bold";
  if (run.italic) return "italic";
  return "normal";
}

class PdfCursor {
  doc: jsPDF;
  x: number;
  y: number;
  private pageWidth: number;
  private pageHeight: number;

  constructor(doc: jsPDF) {
    this.doc = doc;
    this.pageWidth = doc.internal.pageSize.getWidth();
    this.pageHeight = doc.internal.pageSize.getHeight();
    this.x = PAGE_MARGIN;
    this.y = PAGE_MARGIN;
  }

  private contentRight(indent: number): number {
    return this.pageWidth - PAGE_MARGIN - indent;
  }

  newLine(indent: number): void {
    this.x = PAGE_MARGIN + indent;
    this.y += LINE_HEIGHT;
    if (this.y > this.pageHeight - PAGE_MARGIN) {
      this.doc.addPage();
      this.y = PAGE_MARGIN;
    }
  }

  /** Places one already-measured word, wrapping to a new line first if it
   *  would overflow the current line at this indent level. */
  placeWord(word: string, width: number, indent: number, underline: boolean): void {
    if (this.x + width > this.contentRight(indent) && this.x > PAGE_MARGIN + indent) {
      this.newLine(indent);
    }
    this.doc.text(word, this.x, this.y);
    if (underline) {
      const underlineY = this.y + 2;
      this.doc.line(this.x, underlineY, this.x + width, underlineY);
    }
    this.x += width;
  }

  paragraphGap(): void {
    this.y += BLOCK_GAP;
    if (this.y > this.pageHeight - PAGE_MARGIN) {
      this.doc.addPage();
      this.y = PAGE_MARGIN;
    }
    this.x = PAGE_MARGIN;
  }
}

/** Word-wraps and places a run of styled text starting at the cursor's
 *  current position, indented `indent` points from the page margin. */
function placeRuns(cursor: PdfCursor, runs: InlineRun[], indent: number, fontSize: number): void {
  cursor.doc.setFontSize(fontSize);
  for (const run of runs) {
    const style = fontStyleFor(run);
    cursor.doc.setFont(run.code ? "courier" : "helvetica", style);
    for (const line of run.text.split("\n")) {
      if (line === "" && run.text.includes("\n")) {
        cursor.newLine(indent);
        continue;
      }
      const words = line.split(/(\s+)/).filter((w) => w.length > 0);
      for (const word of words) {
        if (/^\s+$/.test(word)) {
          cursor.x += cursor.doc.getTextWidth(word);
          continue;
        }
        const width = cursor.doc.getTextWidth(word);
        cursor.placeWord(word, width, indent, run.underline === true);
      }
    }
  }
}

export function blocksToPdfBlob(blocks: ExportBlock[]): Blob {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const cursor = new PdfCursor(doc);

  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
        // Center/right alignment isn't attempted for wrapped multi-line text
        // (jsPDF has no reflow-aware alignment primitive); left-aligned is
        // correct and readable everywhere, which an approximation isn't.
        placeRuns(cursor, block.runs, 0, BODY_SIZE);
        cursor.paragraphGap();
        break;
      case "blockquote":
        placeRuns(cursor, block.runs, LIST_INDENT, BODY_SIZE);
        cursor.paragraphGap();
        break;
      case "heading": {
        const size = HEADING_SIZES[block.level] ?? HEADING_SIZES[1];
        placeRuns(cursor, block.runs, 0, size);
        cursor.paragraphGap();
        break;
      }
      case "bulletList":
        for (const item of block.items) {
          doc.setFontSize(BODY_SIZE);
          doc.setFont("helvetica", "normal");
          cursor.placeWord("•", doc.getTextWidth("• "), 0, false);
          cursor.x += doc.getTextWidth(" ");
          placeRuns(cursor, item, LIST_INDENT, BODY_SIZE);
          cursor.newLine(0);
        }
        cursor.paragraphGap();
        break;
      case "orderedList":
        block.items.forEach((item, i) => {
          doc.setFontSize(BODY_SIZE);
          doc.setFont("helvetica", "normal");
          const label = `${i + 1}.`;
          cursor.placeWord(label, doc.getTextWidth(`${label} `), 0, false);
          cursor.x += doc.getTextWidth(" ");
          placeRuns(cursor, item, LIST_INDENT, BODY_SIZE);
          cursor.newLine(0);
        });
        cursor.paragraphGap();
        break;
      case "taskList":
        for (const item of block.items) {
          doc.setFontSize(BODY_SIZE);
          doc.setFont("helvetica", "normal");
          const box = item.checked ? "☑" : "☐";
          cursor.placeWord(box, doc.getTextWidth(`${box} `), 0, false);
          cursor.x += doc.getTextWidth(" ");
          placeRuns(cursor, item.runs, LIST_INDENT, BODY_SIZE);
          cursor.newLine(0);
        }
        cursor.paragraphGap();
        break;
      case "codeBlock":
        doc.setFontSize(BODY_SIZE - 1);
        doc.setFont("courier", "normal");
        for (const line of block.text.split("\n")) {
          doc.text(line, cursor.x, cursor.y);
          cursor.newLine(0);
        }
        cursor.paragraphGap();
        break;
      case "horizontalRule": {
        const width = doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2;
        doc.line(PAGE_MARGIN, cursor.y, PAGE_MARGIN + width, cursor.y);
        cursor.paragraphGap();
        break;
      }
    }
  }

  return doc.output("blob");
}
