import Link from "next/link";

export function BlogCategoryFilter({
  categories,
  active,
}: {
  categories: string[];
  active: string | null;
}) {
  const pill = (label: string, href: string, isActive: boolean) => (
    <Link
      key={label}
      href={href}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? "border-accent bg-accent text-accent-ink"
          : "border-line text-muted hover:border-accent hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav aria-label="Filter by category" className="flex flex-wrap gap-2">
      {pill("All", "/blog", active === null)}
      {categories.map((category) =>
        pill(
          category,
          `/blog?category=${encodeURIComponent(category)}`,
          active === category,
        ),
      )}
    </nav>
  );
}
