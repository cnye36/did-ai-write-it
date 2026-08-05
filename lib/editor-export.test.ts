import { describe, expect, it } from "vitest";
import { docToExportBlocks } from "./editor-export";

function doc(content: object[]): object {
  return { type: "doc", content };
}

function paragraph(content: object[], attrs?: object): object {
  return { type: "paragraph", ...(attrs ? { attrs } : {}), content };
}

function text(value: string, marks?: object[]): object {
  return { type: "text", text: value, ...(marks ? { marks } : {}) };
}

describe("docToExportBlocks", () => {
  it("extracts plain paragraph text", () => {
    const blocks = docToExportBlocks(doc([paragraph([text("Hello world")])]));
    expect(blocks).toEqual([{ type: "paragraph", align: undefined, runs: [{ text: "Hello world" }] }]);
  });

  it("carries bold, italic, strike, underline, code, and link marks", () => {
    const blocks = docToExportBlocks(
      doc([
        paragraph([
          text("bold", [{ type: "bold" }]),
          text(" plain "),
          text("link", [{ type: "link", attrs: { href: "https://example.com" } }]),
        ]),
      ])
    );
    expect(blocks).toEqual([
      {
        type: "paragraph",
        align: undefined,
        runs: [
          { text: "bold", bold: true },
          { text: " plain " },
          { text: "link", link: "https://example.com" },
        ],
      },
    ]);
  });

  it("reads a heading's level and alignment", () => {
    const blocks = docToExportBlocks(
      doc([{ type: "heading", attrs: { level: 2, textAlign: "center" }, content: [text("Title")] }])
    );
    expect(blocks).toEqual([{ type: "heading", level: 2, align: "center", runs: [{ text: "Title" }] }]);
  });

  it("flattens a bullet list's items to one run array per item", () => {
    const blocks = docToExportBlocks(
      doc([
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [paragraph([text("first")])] },
            { type: "listItem", content: [paragraph([text("second")])] },
          ],
        },
      ])
    );
    expect(blocks).toEqual([
      { type: "bulletList", items: [[{ text: "first" }], [{ text: "second" }]] },
    ]);
  });

  it("reads a task list's checked state", () => {
    const blocks = docToExportBlocks(
      doc([
        {
          type: "taskList",
          content: [
            { type: "taskItem", attrs: { checked: true }, content: [paragraph([text("done")])] },
            { type: "taskItem", attrs: { checked: false }, content: [paragraph([text("todo")])] },
          ],
        },
      ])
    );
    expect(blocks).toEqual([
      {
        type: "taskList",
        items: [
          { checked: true, runs: [{ text: "done" }] },
          { checked: false, runs: [{ text: "todo" }] },
        ],
      },
    ]);
  });

  it("joins a code block's text content", () => {
    const blocks = docToExportBlocks(doc([{ type: "codeBlock", content: [text("const x = 1;")] }]));
    expect(blocks).toEqual([{ type: "codeBlock", text: "const x = 1;" }]);
  });

  it("skips unknown node types instead of throwing", () => {
    const blocks = docToExportBlocks(doc([{ type: "table", content: [] }, paragraph([text("after")])]));
    expect(blocks).toEqual([{ type: "paragraph", align: undefined, runs: [{ text: "after" }] }]);
  });
});
