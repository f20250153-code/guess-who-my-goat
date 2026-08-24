"use client";

import { motion } from "framer-motion";
import { Frown, Grid3x3, Loader2, PartyPopper, RotateCcw, UserX } from "lucide-react";
import type { Character } from "@/types/character";
import type { PlayerView } from "@/types/multiplayer";
import { Button } from "@/components/shared/Button";
import { getAvatarPalette, getInitials } from "@/lib/character-utils";

interface MultiplayerResultProps {
  view: PlayerView;
  board: Character[];
  onRequestRematch: () => void;
  onCancelRematch: () => void;
  onChangeCategory: () => void;
}

const WIN_REASON_LABEL: Record<NonNullable<PlayerView["winReason"]>, string> = {
  "correct-guess": "correctly guessed",
  "opponent-left": "opponent left",
  "timeout-forfeit": "timed out",
};

export function MultiplayerResult({ view, board, onRequestRematch, onCancelRematch, onChangeCategory }: MultiplayerResultProps) {
  const secretId = view.revealedSecrets?.opponentSecretCharacterId ?? null;
  const secret = secretId ? board.find((c) => c.id === secretId) : undefined;
  const palette = secret ? getAvatarPalette(secret.id) : { bg: "#2a1f4d", fg: "#c4b5fd" };
  const won = view.youWon === true;
  const opponentLeft = view.winReason === "opponent-left" && won;

  const bothWaitingOnRematch = view.state === "REMATCH_PENDING" || view.state === "REMATCH";
  const iRequestedRematch = view.yourReadyForRematch;
  const opponentRequestedRematch = view.opponentReadyForRematch;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto flex max-w-lg flex-col items-center px-4 py-14 text-center"
    >
      <div
        className={`mb-5 flex h-14 w-14 items-center justify-center rounded-full ${
          won ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
        }`}
      >
        {opponentLeft ? (
          <UserX className="h-7 w-7" aria-hidden="true" />
        ) : won ? (
          <PartyPopper className="h-7 w-7" aria-hidden="true" />
        ) : (
          <Frown className="h-7 w-7" aria-hidden="true" />
        )}
      </div>

      <h1 className="font-display text-4xl font-bold tracking-tight">
        {opponentLeft ? "You win by forfeit" : won ? "You won!" : "You lost"}
      </h1>
      <p className="mt-2 text-text-muted">
        {opponentLeft ? (
          <>{view.opponentName ?? "Your opponent"} left the match.</>
        ) : (
          <>
            {view.winReason && (
              <span className="capitalize">{WIN_REASON_LABEL[view.winReason]}</span>
            )}
            {secret && (
              <>
                {" "}
                — <span className="font-semibold text-text">{view.opponentName ?? "Your opponent"}</span>&apos;s
                character was <span className="font-semibold text-text">{secret.name}</span>
              </>
            )}
          </>
        )}
      </p>

      {secret && (
        <div
          className="mt-6 flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold shadow-[var(--shadow-elevated)]"
          style={{ background: palette.bg, color: palette.fg }}
        >
          {getInitials(secret.name)}
        </div>
      )}

      <div className="mt-8 grid w-full grid-cols-2 gap-3">
        <StatBlock label="Your questions" value={String(view.yourQuestionCount)} />
        <StatBlock label={`${view.opponentName ?? "Opponent"}'s questions`} value={String(view.opponentQuestionCount)} small />
      </div>

      <div className="mt-9 flex flex-col items-center gap-3">
        {!bothWaitingOnRematch && (
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={onRequestRematch}>
              <RotateCcw className="h-4.5 w-4.5" aria-hidden="true" />
              Request Rematch
            </Button>
            <Button size="lg" variant="secondary" onClick={onChangeCategory}>
              <Grid3x3 className="h-4.5 w-4.5" aria-hidden="true" />
              Back to Categories
            </Button>
          </div>
        )}

        {iRequestedRematch && !opponentRequestedRematch && (
          <div className="flex items-center gap-2 rounded-full border border-border-strong bg-bg-elevated px-4 py-2 text-sm text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Waiting for {view.opponentName ?? "your opponent"} to accept…
            <button type="button" onClick={onCancelRematch} className="ml-1 font-semibold text-danger hover:underline">
              Cancel
            </button>
          </div>
        )}

        {opponentRequestedRematch && !iRequestedRematch && (
          <div className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary">
            {view.opponentName ?? "Your opponent"} wants a rematch!
            <button type="button" onClick={onRequestRematch} className="ml-1 font-semibold underline">
              Accept
            </button>
          </div>
        )}
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
