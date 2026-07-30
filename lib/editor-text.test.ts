import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import type { Node as PMNode } from "@tiptap/pm/model";
import {
  docToPlainText,
  pmRangeToTextRange,
  textOffsetToPm,
  textRangeToPmRange,
} from "./editor-text";

const schema = getSchema([StarterKit]);

function doc(json: object): PMNode {
  return schema.nodeFromJSON(json);
}

const p = (...content: object[]) => ({ type: "paragraph", content });
const t = (text: string, marks?: string[]) => ({
  type: "text",
  text,
  ...(marks ? { marks: marks.map((type) => ({ type })) } : {}),
});

describe("docToPlainText", () => {
  it("joins paragraphs with a blank line so the detector still sees paragraphs", () => {
    const { text } = docToPlainText(doc({ type: "doc", content: [p(t("One.")), p(t("Two."))] }));
    expect(text).toBe("One.\n\nTwo.");
  });

  it("emits no markdown syntax for headings or lists", () => {
    // The detector flags "# " headings and bold-led bullets as a raw ChatGPT
    // export tell, so the projection must never introduce them itself.
    const { text } = docToPlainText(
      doc({
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [t("The Heading")] },
          {
            type: "bulletList",
            content: [
              { type: "listItem", content: [p(t("first item"))] },
              { type: "listItem", content: [p(t("second item"))] },
            ],
          },
        ],
      })
    );
    expect(text).not.toMatch(/^\s*#/m);
    expect(text).not.toMatch(/^\s*[-*•]\s/m);
    expect(text).toContain("The Heading");
    expect(text).toContain("first item");
  });

  it("separates list items with a single newline, not a blank line", () => {
    const { text } = docToPlainText(
      doc({
        type: "doc",
        content: [
          {
            type: "bulletList",
            content: [
              { type: "listItem", content: [p(t("alpha"))] },
              { type: "listItem", content: [p(t("beta"))] },
            ],
          },
        ],
      })
    );
    // A list should not read to the detector as a run of one-line paragraphs.
    expect(text).toBe("alpha\nbeta");
  });

  it("treats a sentence broken by formatting as one continuous string", () => {
    // Bold mid-sentence splits the text into three ProseMirror nodes; the
    // plain-text projection must not show a seam.
    const { text } = docToPlainText(
      doc({ type: "doc", content: [p(t("Hello "), t("brave", ["bold"]), t(" world."))] })
    );
    expect(text).toBe("Hello brave world.");
  });
});

describe("offset mapping", () => {
  it("round-trips a range through both coordinate spaces", () => {
    const d = doc({ type: "doc", content: [p(t("One.")), p(t("Two.")), p(t("Three."))] });
    const { text, segments } = docToPlainText(d);

    const start = text.indexOf("Two.");
    const end = start + "Two.".length;
    const pm = textRangeToPmRange(segments, start, end);

    expect(d.textBetween(pm.from, pm.to)).toBe("Two.");
    expect(pmRangeToTextRange(segments, pm.from, pm.to)).toEqual({ start, end });
  });

  it("maps correctly across a formatting boundary", () => {
    const d = doc({ type: "doc", content: [p(t("Hello "), t("brave", ["bold"]), t(" world."))] });
    const { text, segments } = docToPlainText(d);

    const start = text.indexOf("brave");
    const pm = textRangeToPmRange(segments, start, start + 5);
    expect(d.textBetween(pm.from, pm.to)).toBe("brave");

    // A span crossing the mark boundary must survive too.
    const wide = textRangeToPmRange(segments, 0, text.length);
    expect(d.textBetween(wide.from, wide.to)).toBe("Hello brave world.");
  });

  it("maps a span across a paragraph break back to the right words", () => {
    const d = doc({ type: "doc", content: [p(t("First one.")), p(t("Second one."))] });
    const { text, segments } = docToPlainText(d);

    const start = text.indexOf("one.");
    const end = text.indexOf("Second") + "Second".length;
    const pm = textRangeToPmRange(segments, start, end);

    // textBetween drops the block boundary, so the words either side must match.
    expect(d.textBetween(pm.from, pm.to, " ")).toBe("one. Second");
  });

  it("clamps an offset that lands inside a separator", () => {
    const d = doc({ type: "doc", content: [p(t("One.")), p(t("Two."))] });
    const { text, segments } = docToPlainText(d);

    // "One.\n\nTwo." - offset 5 is the second newline, which has no document
    // position of its own.
    expect(text[5]).toBe("\n");
    const pos = textOffsetToPm(segments, 5);
    expect(pos).toBeGreaterThan(0);
    expect(() => d.resolve(pos)).not.toThrow();
  });

  it("handles an empty document without throwing", () => {
    const { text, segments } = docToPlainText(doc({ type: "doc", content: [p()] }));
    expect(text).toBe("");
    expect(textOffsetToPm(segments, 0)).toBe(0);
  });
});
