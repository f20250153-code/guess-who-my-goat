import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Category } from "@/types/game";

const THEME_CLASSES: Record<Category["theme"], string> = {
  violet: "group-hover:border-primary/50 group-hover:shadow-[0_0_0_1px_rgba(124,92,255,0.25)]",
  cyan: "group-hover:border-secondary/50 group-hover:shadow-[0_0_0_1px_rgba(34,211,238,0.25)]",
  amber: "group-hover:border-warning/50 group-hover:shadow-[0_0_0_1px_rgba(251,191,36,0.25)]",
  rose: "group-hover:border-danger/50 group-hover:shadow-[0_0_0_1px_rgba(248,113,113,0.25)]",
  emerald: "group-hover:border-success/50 group-hover:shadow-[0_0_0_1px_rgba(52,211,153,0.25)]",
  sky: "group-hover:border-secondary/50 group-hover:shadow-[0_0_0_1px_rgba(34,211,238,0.25)]",
};

export function CategoryCard({ category }: { category: Category }) {
  const isEmpty = category.characters.length === 0;

  return (
    <Link
      href={isEmpty ? "/categories" : `/play?category=${category.id}`}
      className={`group relative flex flex-col rounded-[14px] border border-border bg-bg-elevated p-4 transition-all duration-200 ${THEME_CLASSES[category.theme]}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl" aria-hidden="true">
          {category.emoji}
        </span>
        <ArrowUpRight className="h-4 w-4 text-text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-text-muted" />
      </div>
      <h3 className="mt-3 font-display text-base font-bold leading-tight">{category.name}</h3>
      <p className="mt-1 line-clamp-2 text-xs text-text-muted">{category.description}</p>
      <p className="mt-3 font-mono text-xs font-semibold text-text-faint">
        {isEmpty ? "Coming soon" : `${category.characters.length} characters`}
      </p>
    </Link>
  );
}
