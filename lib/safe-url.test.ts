import { describe, expect, it } from "vitest";
import { safeExternalUrl } from "./safe-url";

describe("safeExternalUrl", () => {
  it("allows HTTP and HTTPS links", () => {
    expect(safeExternalUrl("https://example.com/source")).toBe("https://example.com/source");
    expect(safeExternalUrl("http://example.com/source")).toBe("http://example.com/source");
  });

  it("rejects executable and malformed links", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html,test")).toBeNull();
    expect(safeExternalUrl("not a URL")).toBeNull();
  });
});
