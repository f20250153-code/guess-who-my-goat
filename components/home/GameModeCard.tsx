import { Infinity as InfinityIcon, Zap, ListChecks, Flame } from "lucide-react";
import type { GameMode } from "@/types/game";

const MODE_ICON: Record<GameMode["id"], React.ComponentType<{ className?: string }>> = {
  classic: InfinityIcon,
  speed: Zap,
  limited: ListChecks,
  challenge: Flame,
};

const MODE_ACCENT: Record<GameMode["id"], string> = {
  classic: "text-secondary bg-secondary/10",
  speed: "text-warning bg-warning/10",
  limited: "text-primary bg-primary/10",
  challenge: "text-danger bg-danger/10",
};

export function GameModeCard({ mode }: { mode: GameMode }) {
  const Icon = MODE_ICON[mode.id];
  return (
    <div className="rounded-[14px] border border-border bg-bg-elevated p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-[8px] ${MODE_ACCENT[mode.id]}`}>
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </div>
      <h3 className="mt-3 font-display text-base font-bold">{mode.name}</h3>
      <p className="mt-1 text-xs text-text-muted">{mode.description}</p>
    </div>
  );
}
