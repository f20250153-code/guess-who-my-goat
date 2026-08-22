import { HelpCircle, MessageCircleQuestion, Swords, Trophy } from "lucide-react";
import { Hero } from "@/components/home/Hero";
import { CategoryCard } from "@/components/home/CategoryCard";
import { GameModeCard } from "@/components/home/GameModeCard";
import { Button } from "@/components/shared/Button";
import { categories } from "@/data/categories";
import { GAME_MODES } from "@/lib/game-engine";

const HOW_IT_WORKS = [
  {
    icon: Swords,
    title: "Pick a category",
    description: "Choose from footballers, actors, celebrities and more — or bring your own pack.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Ask yes/no questions",
    description: "Every question narrows the field. Sharper questions eliminate more candidates.",
  },
  {
    icon: Trophy,
    title: "Guess right, win",
    description: "Nail it in fewer questions and less time for a higher score.",
  },
];

const FEATURES = [
  "300+ real characters across 12 categories",
  "Smart-question hints that highlight the most useful thing to ask",
  "Four game modes, from unlimited Classic to 5-question Challenge",
  "Build and share your own custom character pack",
  "Local stats — track your win rate without an account",
];

export default function HomePage() {
  return (
    <>
      <Hero />

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-secondary">
              How it works
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Three steps to victory
            </h2>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.title} className="rounded-[14px] border border-border bg-bg-elevated p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="font-mono text-xs font-semibold text-text-faint">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">{step.title}</h3>
              <p className="mt-1.5 text-sm text-text-muted">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Game modes */}
      <section className="border-t border-border bg-bg-elevated/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-10">
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-secondary">
              Game modes
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Play your way
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.values(GAME_MODES).map((mode) => (
              <GameModeCard key={mode.id} mode={mode} />
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-secondary">
              Categories
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Choose your battlefield
            </h2>
          </div>
          <Button href="/categories" variant="outline" size="sm">
            View all categories
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      {/* Feature highlights */}
      <section className="border-t border-border bg-bg-elevated/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-widest text-secondary">
                Why you&apos;ll like it
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Built for game night
              </h2>
              <p className="mt-3 max-w-md text-sm text-text-muted">
                No sign-up, no ads, no waiting on a server. Just open the link and start playing —
                on a laptop at home or passed around on a single phone.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button href="/play">Start playing</Button>
                <Button href="/how-to-play" variant="ghost">
                  <HelpCircle className="h-4 w-4" aria-hidden="true" />
                  How to play
                </Button>
              </div>
            </div>
            <ul className="space-y-3">
              {FEATURES.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 rounded-[12px] border border-border bg-bg-elevated px-4 py-3 text-sm"
                >
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
