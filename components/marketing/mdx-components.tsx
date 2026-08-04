import Image, { type ImageProps } from "next/image";
import type { MDXComponents } from "mdx/types";
import { Callout } from "@/components/marketing/blog-callout";

export const mdxComponents = {
  h2: (props) => (
    <h2 className="pt-4 text-2xl font-semibold tracking-tight text-ink" {...props} />
  ),
  h3: (props) => (
    <h3 className="pt-2 text-xl font-semibold tracking-tight text-ink" {...props} />
  ),
  ul: (props) => <ul className="list-disc space-y-2 pl-5" {...props} />,
  ol: (props) => <ol className="list-decimal space-y-2 pl-5" {...props} />,
  li: (props) => <li className="leading-relaxed" {...props} />,
  a: (props) => (
    <a className="text-accent underline-offset-2 hover:underline" {...props} />
  ),
  strong: (props) => <strong className="font-medium text-ink" {...props} />,
  blockquote: (props) => (
    <blockquote className="border-l-2 border-line pl-5 not-italic text-ink" {...props} />
  ),
  img: (props) => {
    const { src, alt, width, height, ...rest } = props;
    if (typeof src !== "string") return null;
    return (
      <Image
        src={src}
        alt={typeof alt === "string" ? alt : ""}
        width={typeof width === "number" ? width : Number(width) || 1200}
        height={typeof height === "number" ? height : Number(height) || 630}
        className="h-auto w-full rounded-2xl"
        sizes="(max-width: 768px) 100vw, 70ch"
        {...(rest as Omit<ImageProps, "src" | "alt" | "width" | "height">)}
      />
    );
  },
  Callout,
} satisfies MDXComponents;
