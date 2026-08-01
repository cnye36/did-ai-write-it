import { describe, expect, it } from "vitest";
import { emptyProvenance, recordProvenance } from "./provenance";
import { normalize } from "./winston-sentences";

describe("recordProvenance", () => {
  it("tags a changed sentence with the given source", () => {
    const before = "The cat sat on the mat. It was a sunny day.";
    const after = "The cat sat on the mat. It was a rainy afternoon.";
    const map = recordProvenance(emptyProvenance(), before, after, "ai");
    expect(map.get(normalize("It was a rainy afternoon."))).toBe("ai");
  });

  it("tags an added sentence with the given source", () => {
    const before = "The cat sat on the mat.";
    const after = "The cat sat on the mat. It was a sunny day.";
    const map = recordProvenance(emptyProvenance(), before, after, "user");
    expect(map.get(normalize("It was a sunny day."))).toBe("user");
  });

  it("does not tag sentences that are untouched", () => {
    const before = "The cat sat on the mat. It was a sunny day.";
    const after = "The cat sat on the mat. It was a rainy afternoon.";
    const map = recordProvenance(emptyProvenance(), before, after, "ai");
    expect(map.has(normalize("The cat sat on the mat."))).toBe(false);
  });

  it("keeps prior entries for sentences untouched by the latest edit", () => {
    let map = recordProvenance(emptyProvenance(), "One. Two.", "One rewritten. Two.", "ai");
    map = recordProvenance(map, "One rewritten. Two.", "One rewritten. Two edited by hand.", "user");
    expect(map.get(normalize("One rewritten."))).toBe("ai");
    expect(map.get(normalize("Two edited by hand."))).toBe("user");
  });

  it("overwrites a sentence's provenance when it changes again under a different source", () => {
    let map = recordProvenance(emptyProvenance(), "One. Two.", "One rewritten by AI. Two.", "ai");
    map = recordProvenance(map, "One rewritten by AI. Two.", "One rewritten by hand. Two.", "user");
    expect(map.get(normalize("One rewritten by hand."))).toBe("user");
  });
});
