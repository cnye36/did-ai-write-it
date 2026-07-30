export const SITE_URL = "https://www.didaiwriteit.com";
export const SITE_NAME = "Did AI Write It";

/** JSON-LD payloads render as a raw <script> tag; escape `<` so embedded
 * strings can't break out into HTML (see Next.js JSON-LD guide). */
export function jsonLdScriptProps(data: object) {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: {
      __html: JSON.stringify(data).replace(/</g, "\\u003c"),
    },
  } as const;
}

export const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  description:
    "Real, verified AI-detection scores for any draft, plus plagiarism and fact-checking, free to start.",
};

export const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
};
