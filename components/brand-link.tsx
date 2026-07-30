import Link from "next/link";
import Image from "next/image";

export function BrandLink({
  href = "/",
  onClick,
  className,
}: {
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`inline-flex items-center gap-2 text-sm font-semibold tracking-tight ${className ?? ""}`}
    >
      {/* Decorative mark; link text carries the accessible name. */}
      <Image
        src="/logo.png"
        alt="Did AI Write It? Logo"
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-full"
      />
      <span>
        Did <span className="text-accent">AI </span> Write It?
      </span>
    </Link>
  );
}
