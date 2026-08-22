"use client";

import { RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/shared/Button";

interface GameHeaderProps {
  categoryName: string;
  categoryEmoji: string;
  modeName: string;
  questionCount: number;
  remainingCount: number;
  secondsLeft?: number | null;
  onRestart: () => void;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function GameHeader({
  categoryName,
  categoryEmoji,
  modeName,
  questionCount,
  remainingCount,
  secondsLeft,
  onRestart,
}: GameHeaderProps) {
  const isLowTime = typeof secondsLeft === "number" && secondsLeft <= 10;

  return (
    <div className="sticky top-16 z-30 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4 font-mono tabular-nums">
          <Stat label="Questions" value={pad(questionCount)} />
          <Divider />
          <Stat label="Remaining" value={pad(remainingCount)} accent={remainingCount <= 3} />
          {typeof secondsLeft === "number" && (
            <>
              <Divider />
              <div className="flex items-center gap-1.5">
                <Timer
                  className={`h-3.5 w-3.5 ${isLowTime ? "text-danger" : "text-text-faint"}`}
                  aria-hidden="true"
                />
                <Stat
                  label="Time"
                  value={`${pad(Math.floor(secondsLeft / 60))}:${pad(secondsLeft % 60)}`}
                  accent={isLowTime}
                  dangerAccent={isLowTime}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-border-strong bg-bg-elevated px-3 py-1 text-xs font-semibold sm:flex">
            <span aria-hidden="true">{categoryEmoji}</span>
            {categoryName}
            <span className="text-text-faint">· {modeName}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={onRestart} aria-label="Restart game">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Restart</span>
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
