const APP_DESTINATIONS = new Set(["/app/detect", "/app/plagiarism", "/app/fact-check"]);

/** Only allow known internal app destinations after authentication. */
export function safeAuthNext(value: string | null | undefined): string {
  if (!value) return "/app/detect";

  try {
    const url = new URL(value, "https://www.didaiwriteit.com");
    if (url.origin !== "https://www.didaiwriteit.com" || !APP_DESTINATIONS.has(url.pathname)) {
      return "/app/detect";
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return "/app/detect";
  }
}
