import type { LucideIcon } from "lucide-react";
import { Gamepad2, Percent, Star, Target, Timer, Trophy } from "lucide-react";
import type { PlayerStats } from "@/lib/stats";
import { getAverageQuestions, getFavoriteCategory, getWinRate } from "@/lib/stats";
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

export function GameStats({ stats }: GameStatsProps) {
  const favoriteCategoryId = getFavoriteCategory(stats);
  const favoriteCategory = favoriteCategoryId ? getCategoryById(favoriteCategoryId) : null;

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
    </div>
  );
}
