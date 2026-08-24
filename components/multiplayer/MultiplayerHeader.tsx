"use client";

import { useEffect, useState } from "react";
import { LogOut, Timer, Wifi, WifiOff } from "lucide-react";
import type { PlayerView } from "@/types/multiplayer";
import { Button } from "@/components/shared/Button";

interface MultiplayerHeaderProps {
  view: PlayerView;
  categoryName: string;
  categoryEmoji: string;
  onLeave: () => void;
}

function pad(n: number) {
  return Math.max(0, n).toString().padStart(2, "0");
}

/** Purely a display countdown — derived from the server's own
 * turnStartedAt/turnTimeLimitMs, recomputed every second from Date.now().
 * The server enforces the real deadline independently (its own setTimeout
 * in server.ts); this never drives game logic, only what the player sees. */
function useTurnCountdown(turnStartedAt: number | null, turnTimeLimitMs: number): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (turnStartedAt === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSecondsLeft(null);
      return;
    }
    const compute = () => Math.ceil((turnStartedAt + turnTimeLimitMs - Date.now()) / 1000);
    setSecondsLeft(compute());
    const interval = setInterval(() => setSecondsLeft(compute()), 500);
    return () => clearInterval(interval);
  }, [turnStartedAt, turnTimeLimitMs]);

  return secondsLeft;
}

export function MultiplayerHeader({ view, categoryName, categoryEmoji, onLeave }: MultiplayerHeaderProps) {
  const secondsLeft = useTurnCountdown(view.turnStartedAt, view.turnTimeLimitMs);
  const isLowTime = typeof secondsLeft === "number" && secondsLeft <= 10;

  return (
    <div className="sticky top-16 z-30 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4 font-mono tabular-nums">
          <Stat label="Questions" value={pad(view.yourQuestionCount)} />
          <Divider />
          <Stat label="Remaining" value={pad(view.yourRemainingCandidateIds.length)} accent={view.yourRemainingCandidateIds.length <= 3} />
          <Divider />
          <div className="flex items-center gap-1.5">
            <Timer className={`h-3.5 w-3.5 ${isLowTime ? "text-danger" : "text-text-faint"}`} aria-hidden="true" />
            <Stat
              label={view.isYourTurn ? "Your turn" : "Their turn"}
              value={secondsLeft === null ? "--" : `${pad(Math.floor(Math.max(0, secondsLeft) / 60))}:${pad(Math.max(0, secondsLeft) % 60)}`}
              accent={isLowTime}
              dangerAccent={isLowTime}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-border-strong bg-bg-elevated px-3 py-1 text-xs font-semibold sm:flex">
            <span aria-hidden="true">{categoryEmoji}</span>
            {categoryName}
          </span>
          <span
            className="flex items-center gap-1.5 rounded-full border border-border-strong bg-bg-elevated px-3 py-1 text-xs font-semibold"
            title={view.opponentConnected ? "Opponent connected" : "Opponent disconnected — they have a grace period to reconnect"}
          >
            {view.opponentConnected ? (
              <Wifi className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
            )}
            {view.opponentName ?? "Opponent"}
          </span>
          <Button variant="ghost" size="sm" onClick={onLeave} aria-label="Leave match">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Leave</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  dangerAccent,
}: {
  label: string;
  value: string;
  accent?: boolean;
  dangerAccent?: boolean;
}) {
  return (
    <div className="leading-tight">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">{label}</p>
      <p
        className={`text-base font-semibold sm:text-lg ${
          dangerAccent ? "text-danger" : accent ? "text-warning" : "text-text"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Divider() {
  return <span className="h-8 w-px bg-border" aria-hidden="true" />;
}
