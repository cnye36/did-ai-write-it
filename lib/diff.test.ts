import { describe, expect, it } from "vitest";
import { diffText } from "./diff";

describe("diffText", () => {
  it("marks identical text as fully unchanged", () => {
    const text = "The cat sat on the mat. It was a sunny day.";
    const { entries, summary } = diffText(text, text);
    expect(entries.every((e) => e.kind === "unchanged")).toBe(true);
    expect(summary).toMatchObject({ added: 0, removed: 0, changed: 0, unchanged: 2 });
  });

  it("detects a pure addition", () => {
    const before = "The cat sat on the mat.";
    const after = "The cat sat on the mat. It was a sunny day.";
    const { entries, summary } = diffText(before, after);
    expect(summary).toMatchObject({ added: 1, removed: 0, changed: 0, unchanged: 1 });
    const added = entries.find((e) => e.kind === "added");
    expect(added?.after).toBe("It was a sunny day.");
  });

  it("detects a pure removal", () => {
    const before = "The cat sat on the mat. It was a sunny day.";
    const after = "The cat sat on the mat.";
    const { entries, summary } = diffText(before, after);
    expect(summary).toMatchObject({ added: 0, removed: 1, changed: 0, unchanged: 1 });
    const removed = entries.find((e) => e.kind === "removed");
    expect(removed?.before).toBe("It was a sunny day.");
  });

  it("pairs a rewritten sentence as changed with a word-level diff", () => {
    const before = "The cat sat on the mat. It was a sunny day.";
    const after = "The cat sat on the mat. It was a rainy afternoon.";
    const { entries, summary } = diffText(before, after);
    expect(summary).toMatchObject({ added: 0, removed: 0, changed: 1, unchanged: 1 });
    const changed = entries.find((e) => e.kind === "changed");
    expect(changed?.before).toBe("It was a sunny day.");
    expect(changed?.after).toBe("It was a rainy afternoon.");
    expect(changed?.wordDiff).not.toBeNull();
    expect(changed?.wordDiff?.some((p) => p.removed && p.value.includes("sunny"))).toBe(true);
    expect(changed?.wordDiff?.some((p) => p.added && p.value.includes("rainy"))).toBe(true);
  });

  it("reports word counts before and after", () => {
    const { summary } = diffText("one two three", "one two three four");
    expect(summary.wordsBefore).toBe(3);
    expect(summary.wordsAfter).toBe(4);
  });
});
