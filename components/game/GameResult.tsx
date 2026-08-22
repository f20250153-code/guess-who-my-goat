"use client";

import { motion } from "framer-motion";
import { PartyPopper, RotateCcw, Frown, Grid3x3, Trophy } from "lucide-react";
import type { GameResult as GameResultType } from "@/types/game";
import type { AskedQuestion } from "@/types/question";
import { Button } from "@/components/shared/Button";
import { getAvatarPalette, getInitials } from "@/lib/character-utils";

interface GameResultProps {
  result: GameResultType;
  askedQuestions: AskedQuestion[];
  onPlayAgain: () => void;
  onChangeCategory: () => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function GameResult({ result, askedQuestions, onPlayAgain, onChangeCategory }: GameResultProps) {
  const palette = getAvatarPalette(result.secretCharacter.id);
  const usefulQuestions = askedQuestions.filter((q) => q.eliminatedCount > 0).length;
  const accuracy =
    askedQuestions.length > 0 ? Math.round((usefulQuestions / askedQuestions.length) * 100) : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto flex max-w-lg flex-col items-center px-4 py-14 text-center"
    >
      <div
        className={`mb-5 flex h-14 w-14 items-center justify-center rounded-full ${
          result.won ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
        }`}
      >
        {result.won ? (
          <PartyPopper className="h-7 w-7" aria-hidden="true" />
        ) : (
          <Frown className="h-7 w-7" aria-hidden="true" />
        )}
      </div>

      <h1 className="font-display text-4xl font-bold tracking-tight">
        {result.won ? "You got it!" : "So close..."}
      </h1>
      <p className="mt-2 text-text-muted">
        {result.won ? "You correctly identified" : "The answer was"}{" "}
        <span className="font-semibold text-text">{result.secretCharacter.name}</span>
        {!result.won && result.guessedCharacter && (
          <>
            {" "}
            — you guessed{" "}
            <span className="font-semibold text-text">{result.guessedCharacter.name}</span>
          </>
        )}
      </p>

      <div
        className="mt-6 flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold shadow-[var(--shadow-elevated)]"
        style={{ background: palette.bg, color: palette.fg }}
      >
        {getInitials(result.secretCharacter.name)}
      </div>

      <div className="mt-8 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBlock label="Questions" value={String(result.questionCount)} />
        <StatBlock label="Time" value={formatDuration(result.durationMs)} />
        <StatBlock label="Accuracy" value={`${accuracy}%`} />
        <StatBlock label="Category" value={result.category} small />
      </div>

      {result.won && (
        <div className="mt-6 flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 font-mono text-sm font-bold text-primary">
          <Trophy className="h-4 w-4" aria-hidden="true" />
          Score: {result.score}
        </div>
      )}

      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={onPlayAgain}>
          <RotateCcw className="h-4.5 w-4.5" aria-hidden="true" />
          Play Again
        </Button>
        <Button size="lg" variant="secondary" onClick={onChangeCategory}>
          <Grid3x3 className="h-4.5 w-4.5" aria-hidden="true" />
          Change Category
        </Button>
      </div>
    </motion.div>
  );
}

function StatBlock({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-[12px] border border-border bg-bg-elevated px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">{label}</p>
      <p className={`mt-1 font-mono font-bold ${small ? "text-xs" : "text-lg"}`}>{value}</p>
    </div>
  );
}
