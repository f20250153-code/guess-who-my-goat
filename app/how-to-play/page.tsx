import type { Metadata } from "next";
import { CheckCircle2, HelpCircle, MousePointerClick, Target, Users } from "lucide-react";
import { Button } from "@/components/shared/Button";

export const metadata: Metadata = {
  title: "How to Play — Guess Who",
  description: "Learn how to play Guess Who in under a minute.",
};

const STEPS = [
  {
    icon: Users,
    title: "1. Choose a category",
    description:
      "Pick from footballers, cricketers, actors, celebrities and more — each category is a deck of real characters with different attributes.",
  },
  {
    icon: HelpCircle,
    title: "2. A secret character is selected",
    description:
      "The game secretly picks one character from the board. Your job is to figure out who it is.",
  },
  {
    icon: MousePointerClick,
    title: "3. Ask yes/no questions",
    description:
      'Tap a suggested question like "Are they still active?" The game answers truthfully based on the secret character\'s real attributes.',
  },
  {
    icon: CheckCircle2,
    title: "4. Eliminate characters",
    description:
      "Every answer rules characters in or out automatically. You can also manually eliminate anyone you're confident isn't the answer.",
  },
  {
    icon: Target,
    title: "5. Make your guess",
    description:
      "When you're confident, tap Make a Guess and choose from the remaining candidates. Choose carefully — you only get one shot per game.",
  },
  {
    icon: CheckCircle2,
    title: "6. Win with fewer questions",
    description:
      "Guessing correctly in fewer questions and less time earns a higher score. Try Limited or Challenge mode once you've got the hang of it.",
  },
];

export default function HowToPlayPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-secondary">Guide</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">How to Play</h1>
      <p className="mt-3 max-w-xl text-text-muted">
        Guess Who is a game of deduction. Here&apos;s everything you need to know before your first
        round.
      </p>

      <ol className="mt-10 space-y-4">
        {STEPS.map((step) => (
          <li
            key={step.title}
            className="flex gap-4 rounded-[14px] border border-border bg-bg-elevated p-5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
              <step.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold">{step.title}</h2>
              <p className="mt-1 text-sm text-text-muted">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10 rounded-[14px] border border-border bg-bg-elevated-2 p-6">
        <h2 className="font-display text-lg font-bold">Example round</h2>
        <p className="mt-2 text-sm text-text-muted">
          Playing Cricketers, you ask <span className="text-text">&ldquo;Are they Indian?&rdquo;</span> —
          the answer is YES, so every non-Indian player is eliminated. Next you ask{" "}
          <span className="text-text">&ldquo;Are they a bowler?&rdquo;</span> — NO, ruling out the
          specialist bowlers. With two candidates left, you make your guess and win in just two
          questions.
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <Button href="/play" size="lg">
          Start playing
        </Button>
      </div>
    </div>
  );
}
