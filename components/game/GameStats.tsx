import type { LucideIcon } from "lucide-react";
import { Gamepad2, Percent, Star, Target, Timer, Trophy } from "lucide-react";
import type { PlayerStats } from "@/lib/stats";
import { getAverageQuestions, getCategoryBreakdown, getFavoriteCategory, getWinRate } from "@/lib/stats";
import { getCategoryById } from "@/data/categories";

interface GameStatsProps {
  stats: PlayerStats;
}

function formatTime(ms: number | null): string {
  if (ms === null) return "—";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  expert: "Expert",
};

export function GameStats({ stats }: GameStatsProps) {
  const favoriteCategoryId = getFavoriteCategory(stats);
  const favoriteCategory = favoriteCategoryId ? getCategoryById(favoriteCategoryId) : null;
  const categoryBreakdown = getCategoryBreakdown(stats).slice(0, 6);
  const difficultyEntries = Object.entries(stats.difficultyPlayCounts).filter(([, count]) => count > 0);

  const cards: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Gamepad2, label: "Games Played", value: String(stats.gamesPlayed) },
    { icon: Trophy, label: "Games Won", value: String(stats.gamesWon) },
    { icon: Percent, label: "Win Rate", value: `${getWinRate(stats)}%` },
    { icon: Target, label: "Avg. Questions", value: String(getAverageQuestions(stats)) },
    { icon: Star, label: "Best Score", value: String(stats.bestScore) },
    { icon: Timer, label: "Best Time", value: formatTime(stats.bestTimeMs) },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-[14px] border border-border bg-bg-elevated p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
              <card.icon className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <p className="mt-3 font-mono text-2xl font-bold tabular-nums">{card.value}</p>
            <p className="mt-0.5 text-xs text-text-muted">{card.label}</p>
          </div>
        ))}
      </div>

      {favoriteCategory && (
        <div className="mt-3 flex items-center gap-3 rounded-[14px] border border-border bg-bg-elevated p-4">
          <span className="text-2xl" aria-hidden="true">
            {favoriteCategory.emoji}
          </span>
          <div>
            <p className="text-xs text-text-muted">Favorite category</p>
            <p className="font-display text-sm font-bold">{favoriteCategory.name}</p>
          </div>
        </div>
      )}

      {categoryBreakdown.length > 0 && (
        <div className="mt-3 rounded-[14px] border border-border bg-bg-elevated p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-faint">
            Performance by category
          </p>
          <div className="flex flex-col gap-2">
            {categoryBreakdown.map((row) => {
              const category = getCategoryById(row.categoryId);
              return (
                <div key={row.categoryId} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true">{category?.emoji ?? "🎮"}</span>
                    {category?.name ?? row.categoryId}
                  </span>
                  <span className="font-mono text-xs text-text-muted">
                    {row.won}/{row.played} won · {row.winRate}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {difficultyEntries.length > 0 && (
        <div className="mt-3 rounded-[14px] border border-border bg-bg-elevated p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-faint">
            Games by difficulty
          </p>
          <div className="flex flex-wrap gap-2">
            {difficultyEntries.map(([difficulty, count]) => (
              <span
                key={difficulty}
                className="rounded-full border border-border-strong bg-bg-elevated-2 px-3 py-1 text-xs font-semibold"
              >
                {DIFFICULTY_LABELS[difficulty] ?? difficulty}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
