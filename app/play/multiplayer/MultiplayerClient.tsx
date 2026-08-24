"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  Swords,
  Users,
  WifiOff,
} from "lucide-react";
import type { Character } from "@/types/character";
import type { AskedQuestion } from "@/types/question";
import { categories } from "@/data/categories";
import { questions as builtInQuestions } from "@/data/questions";
import { generateBoardQuestions, generateNumericBoardQuestions } from "@/lib/question-generator";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { CharacterGrid } from "@/components/game/CharacterGrid";
import { QuestionPanel } from "@/components/game/QuestionPanel";
import { GuessModal } from "@/components/game/GuessModal";
import { MultiplayerHeader } from "@/components/multiplayer/MultiplayerHeader";
import { MultiplayerResult } from "@/components/multiplayer/MultiplayerResult";
import { Button } from "@/components/shared/Button";
import { Modal } from "@/components/shared/Modal";

const ELIGIBLE_CATEGORIES = categories.filter((c) => c.characters.length >= 2);

type SetupMode = "create" | "join";

export function MultiplayerClient() {
  const mp = useMultiplayerGame();

  const [setupMode, setSetupMode] = useState<SetupMode>("create");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string>(ELIGIBLE_CATEGORIES[0]?.id ?? "");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [guessModalOpen, setGuessModalOpen] = useState(false);
  const [questionDrawerOpen, setQuestionDrawerOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [manuallyEliminated, setManuallyEliminated] = useState<Set<string>>(new Set());

  const view = mp.view;

  // A rematch produces a brand-new gameId with a fresh board — manual
  // cross-offs from the previous game shouldn't carry over.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setManuallyEliminated(new Set());
  }, [view?.gameId]);

  const category = useMemo(() => categories.find((c) => c.id === view?.categoryId), [view?.categoryId]);

  const candidates: Character[] = useMemo(() => {
    if (!view) return [];
    const ids = new Set(view.yourRemainingCandidateIds);
    return view.board.filter((c) => ids.has(c.id));
  }, [view]);

  const questionPool = useMemo(() => {
    if (!view) return [];
    return [
      ...builtInQuestions,
      ...generateBoardQuestions(view.categoryId, view.board),
      ...generateNumericBoardQuestions(view.categoryId, view.board),
    ];
  }, [view]);

  const askedQuestions: AskedQuestion[] = useMemo(() => {
    if (!view) return [];
    return view.yourAskedQuestions.map((record) => {
      const question = questionPool.find((q) => q.id === record.questionId) ?? {
        id: record.questionId,
        text: record.questionText,
        group: "identity" as const,
        attribute: "gender" as const,
        operator: "equals" as const,
        value: "",
      };
      return {
        question,
        answer: record.answer,
        questionNumber: record.questionNumber,
        eliminatedCount: record.eliminatedCount,
      };
    });
  }, [view, questionPool]);

  async function handleCreate() {
    if (!categoryId) return;
    setBusy(true);
    setSetupError(null);
    const res = await mp.createRoom(categoryId, name.trim() || "Player");
    setBusy(false);
    if (!res.ok) setSetupError(res.message);
  }

  async function handleJoin() {
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) {
      setSetupError("Enter a room code.");
      return;
    }
    setBusy(true);
    setSetupError(null);
    const res = await mp.joinRoom(code, name.trim() || "Player");
    setBusy(false);
    if (!res.ok) setSetupError(res.message);
  }

  function handleCopyCode() {
    if (!view) return;
    navigator.clipboard?.writeText(view.roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleToggleEliminate(id: string) {
    setManuallyEliminated((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleGuessConfirm(characterId: string) {
    setGuessModalOpen(false);
    mp.finalGuess(characterId);
  }

  function handleLeaveRequest() {
    if (view && (view.state === "PLAYING" || view.state === "PLAYER_GUESS")) {
      setLeaveConfirmOpen(true);
    } else {
      mp.leaveRoom();
    }
  }

  // -------------------------------------------------------------- NOT SET UP
  if (!mp.configured) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/15 text-warning">
          <WifiOff className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="font-display text-2xl font-bold">Online play isn&apos;t set up yet</h1>
        <p className="mt-3 text-sm text-text-muted">
          This deployment doesn&apos;t have a multiplayer server configured
          (<code className="rounded bg-bg-elevated-2 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_MULTIPLAYER_SERVER_URL</code>).
          Single-player and pass-and-play still work great — head back and pick a category.
        </p>
        <Button href="/play" size="lg" className="mt-6">
          Back to Play
        </Button>
      </div>
    );
  }

  // ------------------------------------------------------------------ ERROR
  const errorBanner = mp.lastError && (
    <div className="mx-auto mb-4 max-w-2xl rounded-[10px] border border-danger/40 bg-danger/10 px-4 py-2.5 text-center text-sm text-danger">
      {mp.lastError.message}
      <button type="button" onClick={mp.dismissError} className="ml-2 font-semibold underline">
        Dismiss
      </button>
    </div>
  );

  // -------------------------------------------------------------- RESUMING
  if (mp.resuming) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <p className="mt-4 text-text-muted">Reconnecting to your match…</p>
      </div>
    );
  }

  // -------------------------------------------------------------- EXPIRED
  if (mp.roomExpired) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-2xl font-bold">That room is gone</h1>
        <p className="mt-3 text-text-muted">
          The room expired or was closed. Start a new one whenever you&apos;re ready.
        </p>
        <Button size="lg" className="mt-6" onClick={mp.resetLocal}>
          Back to setup
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------- SET UP
  if (!view) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <a href="/play" className="mb-4 flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Play
        </a>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Swords className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Play Online</h1>
            <p className="text-sm text-text-muted">Head-to-head, 1v1, real time.</p>
          </div>
        </div>

        <div className="mb-5 flex gap-1.5 rounded-[10px] border border-border bg-bg-elevated p-1.5">
          <button
            type="button"
            onClick={() => setSetupMode("create")}
            className={`flex-1 rounded-[8px] px-3 py-2 text-sm font-semibold transition-colors ${
              setupMode === "create" ? "bg-primary text-primary-foreground" : "text-text-muted hover:text-text"
            }`}
          >
            Create a Room
          </button>
          <button
            type="button"
            onClick={() => setSetupMode("join")}
            className={`flex-1 rounded-[8px] px-3 py-2 text-sm font-semibold transition-colors ${
              setupMode === "join" ? "bg-primary text-primary-foreground" : "text-text-muted hover:text-text"
            }`}
          >
            Join a Room
          </button>
        </div>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-faint">
            Your name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Player"
            maxLength={40}
            className="h-11 w-full rounded-[10px] border border-border bg-bg-elevated px-3.5 text-sm placeholder:text-text-faint focus-visible:outline-2 focus-visible:outline-secondary"
          />
        </label>

        {setupMode === "create" ? (
          <>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-faint">
              Category
            </span>
            <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {ELIGIBLE_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={`rounded-[10px] border p-3 text-left text-sm transition-colors ${
                    categoryId === c.id ? "border-primary bg-primary/10" : "border-border bg-bg-elevated hover:border-border-strong"
                  }`}
                >
                  <span className="mr-1.5" aria-hidden="true">{c.emoji}</span>
                  <span className="font-semibold">{c.name}</span>
                </button>
              ))}
            </div>
            {setupError && <p className="mb-3 text-sm text-danger">{setupError}</p>}
            <Button size="lg" fullWidth onClick={handleCreate} disabled={busy || !categoryId}>
              {busy ? <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden="true" /> : <Users className="h-4.5 w-4.5" aria-hidden="true" />}
              Create Room
            </Button>
          </>
        ) : (
          <>
            <label className="mb-5 block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-faint">
                Room code
              </span>
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="ABCDEF"
                maxLength={6}
                className="h-12 w-full rounded-[10px] border border-border bg-bg-elevated px-3.5 text-center font-mono text-xl font-bold tracking-[0.3em] placeholder:text-text-faint focus-visible:outline-2 focus-visible:outline-secondary"
              />
            </label>
            {setupError && <p className="mb-3 text-sm text-danger">{setupError}</p>}
            <Button size="lg" fullWidth onClick={handleJoin} disabled={busy || !roomCodeInput}>
              {busy ? <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden="true" /> : <Users className="h-4.5 w-4.5" aria-hidden="true" />}
              Join Room
            </Button>
          </>
        )}
      </div>
    );
  }

  // -------------------------------------------------------- WAITING FOR P2
  if (view.state === "WAITING_FOR_PLAYERS") {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <h1 className="mt-5 font-display text-3xl font-bold tracking-tight">Waiting for an opponent…</h1>
        <p className="mt-3 text-text-muted">Share this room code with a friend:</p>
        <button
          type="button"
          onClick={handleCopyCode}
          className="mt-4 flex items-center gap-3 rounded-[14px] border border-border-strong bg-bg-elevated px-6 py-4 font-mono text-3xl font-bold tracking-[0.3em] transition-colors hover:border-primary/50"
        >
          {view.roomId}
          {copied ? <Check className="h-6 w-6 text-success" aria-hidden="true" /> : <Copy className="h-6 w-6 text-text-faint" aria-hidden="true" />}
        </button>
        <Button variant="ghost" className="mt-8" onClick={() => mp.leaveRoom()}>
          Cancel
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------- RESULT
  if (view.state === "GAME_OVER" || view.state === "REMATCH_PENDING" || view.state === "REMATCH") {
    return (
      <div className="pb-10">
        {errorBanner}
        <MultiplayerResult
          view={view}
          board={view.board}
          onRequestRematch={mp.requestRematch}
          onCancelRematch={mp.cancelRematch}
          onChangeCategory={() => mp.leaveRoom()}
        />
      </div>
    );
  }

  // --------------------------------------------------------------- PLAYING
  const questionPanelProps = {
    categoryId: view.categoryId,
    board: view.board,
    candidates,
    askedQuestions,
    canAsk: view.isYourTurn,
    onAsk: (q: (typeof questionPool)[number]) => mp.askQuestion(q.id),
    pool: questionPool,
  };

  return (
    <div className="pb-24 lg:pb-10">
      <MultiplayerHeader
        view={view}
        categoryName={category?.name ?? view.categoryId}
        categoryEmoji={category?.emoji ?? "🎮"}
        onLeave={handleLeaveRequest}
      />
      {errorBanner}

      {!view.isYourTurn && (
        <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6">
          <p className="rounded-[10px] border border-border bg-bg-elevated px-4 py-2.5 text-center text-sm text-text-muted">
            Waiting for {view.opponentName ?? "your opponent"} to ask a question…
          </p>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[1fr_340px] lg:items-start lg:gap-8">
        <CharacterGrid characters={view.board} eliminatedIds={manuallyEliminated} onToggleEliminate={handleToggleEliminate} />

        <aside className="sticky top-[136px] mt-8 hidden rounded-[16px] border border-border bg-bg-elevated p-5 lg:block">
          <Button fullWidth size="lg" className="mb-5" disabled={!view.isYourTurn} onClick={() => setGuessModalOpen(true)}>
            Make a Guess
          </Button>
          <QuestionPanel {...questionPanelProps} />
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl gap-3">
          <Button variant="secondary" fullWidth disabled={!view.isYourTurn} onClick={() => setQuestionDrawerOpen(true)}>
            Ask a Question
          </Button>
          <Button fullWidth disabled={!view.isYourTurn} onClick={() => setGuessModalOpen(true)}>
            Make a Guess
          </Button>
        </div>
      </div>

      <Modal open={questionDrawerOpen} onClose={() => setQuestionDrawerOpen(false)} title="Ask a question" maxWidthClassName="max-w-lg">
        <QuestionPanel {...questionPanelProps} />
      </Modal>

      <GuessModal open={guessModalOpen} onClose={() => setGuessModalOpen(false)} candidates={candidates} onConfirm={handleGuessConfirm} />

      <Modal open={leaveConfirmOpen} onClose={() => setLeaveConfirmOpen(false)} title="Leave the match?" maxWidthClassName="max-w-sm">
        <p className="text-sm text-text-muted">
          Leaving now forfeits the match — {view.opponentName ?? "your opponent"} will be declared the winner.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setLeaveConfirmOpen(false)}>
            Keep playing
          </Button>
          <Button variant="danger" onClick={() => mp.leaveRoom()}>
            Leave and forfeit
          </Button>
        </div>
      </Modal>

      <AnimatePresence>
        {mp.lastEffect?.type === "QUESTION_ANSWERED" && (
          <motion.div
            key={`${mp.lastEffect.questionText}-${mp.lastEffect.answer}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center"
          >
            <div className="rounded-full border border-border-strong bg-bg-elevated px-4 py-2 text-xs font-semibold shadow-[var(--shadow-elevated)]">
              &ldquo;{mp.lastEffect.questionText}&rdquo; — {mp.lastEffect.answer ? "Yes" : "No"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
