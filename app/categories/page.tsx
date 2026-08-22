import type { Metadata } from "next";
import { CategoryCard } from "@/components/home/CategoryCard";
import { categories, TOTAL_CHARACTER_COUNT } from "@/data/categories";

export const metadata: Metadata = {
  title: "Categories — Guess Who",
  description: "Browse every Guess Who category: footballers, cricketers, actors and more.",
};

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-secondary">
        {categories.length} categories · {TOTAL_CHARACTER_COUNT}+ characters
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">Categories</h1>
      <p className="mt-3 max-w-xl text-text-muted">
        Pick a category to jump straight into a game, or explore what each pack contains.
      </p>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </div>
  );
}
