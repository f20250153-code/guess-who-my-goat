"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Infinity as InfinityIcon, Zap, ListChecks, Flame, ArrowLeft } from "lucide-react";
import type { Category, GameModeId, GameState } from "@/types/game";
import type { Question } from "@/types/question";
import { categories, getCategoryById } from "@/data/categories";
import {
  GAME_MODES,
  createGame,
  answerQuestion,
  eliminateCharacter,
  restoreCharacter,
  makeGuess,
  forceEndGame,
  buildGameResult,
} from "@/lib/game-engine";
import { decodePack } from "@/lib/pack-utils";
import { buildCustomPackQuestions } from "@/lib/question-engine";
import { recordGameResult } from "@/lib/stats";
import { GameHeader } from "@/components/game/GameHeader";
import { CharacterGrid } from "@/components/game/CharacterGrid";
import { QuestionPanel } from "@/components/game/QuestionPanel";
import { GuessModal } from "@/components/game/GuessModal";
import { GameResult } from "@/components/game/GameResult";
import { Button } from "@/components/shared/Button";
import { Modal } from "@/components/shared/Modal";
import { EmptyState } from "@/components/shared/EmptyState";

type Phase = "category" | "mode" | "countdown" | "playing" | "result";

const MODE_ICON: Record<GameModeId, React.ComponentType<{ className?: string }>> = {
  classic: InfinityIcon,
  speed: Zap,
  limited: ListChecks,
  challenge: Flame,
};

function packToCategory(pack: ReturnType<typeof decodePack>["pack"]): Category | null {
  if (!pack) return null;
  return {
    id: "custom",
    name: pack.name,
    description: pack.description || "A custom character pack.",
    icon: "Sparkles",
    emoji: "✨",
    theme: "violet",
    characters: pack.characters,
  };
}

interface InitialResolution {
  phase: Phase;
  category: Category | null;
  error: string | null;
}

/** Resolves ?category= or ?pack= from the URL. Computed once via a lazy
 * useState initializer (not an effect) since `useSearchParams` is already
 * available synchronously during the first render — no need to wait for
 * a mount effect just to read it. */
function resolveInitialState(searchParams: URLSearchParams): InitialResolution {
  const packParam = searchParams.get("pack");
  const categoryParam = searchParams.get("category");

  if (packParam) {
    const { pack, error } = decodePack(packParam);
    const asCategory = packToCategory(pack);
    if (asCategory && asCategory.characters.length >= 2) {
      return { phase: "mode", category: asCategory, error: null };
    }
    return { phase: "category", category: null, error: error ?? "This pack couldn't be loaded." };
  }

  if (categoryParam) {
    const found = getCategoryById(categoryParam);
    if (found && found.characters.length >= 2) {
      return { phase: "mode", category: found, error: null };
    }
  }

  return { phase: "category", category: null, error: null };
}

export function PlayClient() {
  const searchParams = useSearchParams();
  const [initial] = useState<InitialResolution>(() => resolveInitialState(searchParams));

  const [phase, setPhase] = useState<Phase>(initial.phase);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(initial.category);
  const [selectedMode, setSelectedMode] = useState<GameModeId>("classic");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [countdownStep, setCountdownStep] = useState<number>(3);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [guessModalOpen, setGuessModalOpen] = useState(false);
  const [questionDrawerOpen, setQuestionDrawerOpen] = useState(false);
  const [loadError] = useState<string | null>(initial.error);

  const startGame = useCallback(() => {
    if (!selectedCategory) return;
    const state = createGame({
      categoryId: selectedCategory.id,
      mode: selectedMode,
      characters: selectedCategory.characters,
    });
    setGameState(state);
    setPhase("playing");
    const modeConfig = GAME_MODES[selectedMode];
    setSecondsLeft(modeConfig.timeLimitSeconds ?? null);
  }, [selectedCategory, selectedMode]);

  // Countdown sequence: 3 -> 2 -> 1 -> GO -> start.
  useEffect(() => {
    if (phase !== "countdown") return;
    // Reset the counter each time a new countdown sequence begins (e.g. on
    // restart) — this mirrors React's own "reset state on external change"
    // pattern for an effect-driven animation sequence.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCountdownStep(3);
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setCountdownStep(2), 700));
    timers.push(setTimeout(() => setCountdownStep(1), 1400));
    timers.push(setTimeout(() => setCountdownStep(0), 2100)); // 0 == "GO!"
    timers.push(setTimeout(() => startGame(), 2700));
    return () => timers.forEach(clearTimeout);
  }, [phase, startGame]);

  const finishGame = useCallback(
    (updated: GameState) => {
      setGameState(updated);
      setPhase("result");
      const result = buildGameResult(updated, selectedCategory?.name ?? "Custom Pack");
      recordGameResult(result, selectedCategory?.id ?? "custom");
    },
    [selectedCategory],
  );

  // Speed-mode countdown timer.
  useEffect(() => {
    if (phase !== "playing" || secondsLeft === null || !gameState || gameState.status !== "in-progress") {
      return;
    }
    if (secondsLeft <= 0) {
      // Speed mode's clock has run out — end the round. This is a direct
      // consequence of the timer, not a derived-data update, so it's
      // intentionally handled here rather than in an event handler.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      finishGame(forceEndGame(gameState));
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [phase, secondsLeft, gameState, finishGame]);

  function handleSelectCategory(category: Category) {
    setSelectedCategory(category);
    setPhase("mode");
  }

  function handleSelectMode(mode: GameModeId) {
    setSelectedMode(mode);
    setPhase("countdown");
  }

  function handleAsk(question: Question) {
    setGameState((prev) => (prev ? answerQuestion(prev, question) : prev));
  }

  function handleToggleEliminate(id: string) {
    setGameState((prev) => {
      if (!prev) return prev;
      const isEliminated = prev.eliminatedCharacters.some((c) => c.id === id);
      return isEliminated ? restoreCharacter(prev, id) : eliminateCharacter(prev, id);
    });
  }

  function handleGuessConfirm(characterId: string) {
    if (!gameState) return;
    setGuessModalOpen(false);
    finishGame(makeGuess(gameState, characterId));
  }

  function handleRestart() {
    if (!selectedCategory) return;
    setPhase("countdown");
  }

  function handleChangeCategory() {
    setSelectedCategory(null);
    setGameState(null);
    setSecondsLeft(null);
    setPhase("category");
  }

  const eliminatedIds = useMemo(
    () => new Set(gameState?.eliminatedCharacters.map((c) => c.id) ?? []),
    [gameState],
  );

  const canAsk = useMemo(() => {
    if (!gameState || gameState.status !== "in-progress") return false;
    const maxQuestions = GAME_MODES[selectedMode].maxQuestions;
    return maxQuestions === undefined || gameState.questionCount < maxQuestions;
  }, [gameState, selectedMode]);

  const result = useMemo(() => {
    if (phase !== "result" || !gameState) return null;
    return buildGameResult(gameState, selectedCategory?.name ?? "Custom Pack");
  }, [phase, gameState, selectedCategory]);

  const customPool = useMemo(() => {
    if (!selectedCategory || selectedCategory.id !== "custom") return undefined;
    return buildCustomPackQuestions(selectedCategory.characters);
  }, [selectedCategory]);

  // ---------------------------------------------------------------- CATEGORY
  if (phase === "category") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-secondary">
          Step 1 of 2
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Choose a category
        </h1>
        {loadError && (
          <p className="mt-3 rounded-[10px] border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
            {loadError}
          </p>
        )}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => {
            const isEmpty = category.characters.length === 0;
            return (
              <button
                key={category.id}
                type="button"
                disabled={isEmpty}
                onClick={() => handleSelectCategory(category)}
                className="group flex flex-col rounded-[14px] border border-border bg-bg-elevated p-4 text-left transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="text-2xl" aria-hidden="true">
                  {category.emoji}
                </span>
                <h3 className="mt-3 font-display text-base font-bold leading-tight">{category.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-text-muted">{category.description}</p>
                <p className="mt-3 font-mono text-xs font-semibold text-text-faint">
                  {isEmpty ? "Coming soon" : `${category.characters.length} characters`}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------- MODE
  if (phase === "mode" && selectedCategory) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <button
          type="button"
          onClick={() => setPhase("category")}
          className="mb-4 flex items-center gap-1.5 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to categories
        </button>
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-secondary">
          Step 2 of 2 · {selectedCategory.emoji} {selectedCategory.name}
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Choose a mode
        </h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {Object.values(GAME_MODES).map((mode) => {
            const Icon = MODE_ICON[mode.id];
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleSelectMode(mode.id)}
                className="flex flex-col rounded-[14px] border border-border bg-bg-elevated p-5 text-left transition-colors hover:border-primary/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold">{mode.name}</h3>
                <p className="mt-1.5 text-sm text-text-muted">{mode.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------- COUNTDOWN
  if (phase === "countdown") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={countdownStep}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.4 }}
            transition={{ duration: 0.35 }}
            className="font-display text-8xl font-bold text-primary sm:text-9xl"
          >
            {countdownStep === 0 ? "GO!" : countdownStep}
          </motion.div>
        </AnimatePresence>
        <p className="mt-6 text-text-muted">Get ready to guess…</p>
      </div>
    );
  }

  // ----------------------------------------------------------------- RESULT
  if (phase === "result" && result && gameState) {
    return (
      <GameResult
        result={result}
        askedQuestions={gameState.askedQuestions}
        onPlayAgain={handleRestart}
        onChangeCategory={handleChangeCategory}
      />
    );
  }

  // ---------------------------------------------------------------- PLAYING
  if (phase === "playing" && gameState && selectedCategory) {
    const questionPanelProps = {
      categoryId: selectedCategory.id,
      candidates: gameState.possibleCharacters,
      askedQuestions: gameState.askedQuestions,
      canAsk,
      onAsk: handleAsk,
      pool: selectedCategory.id === "custom" ? customPool : undefined,
    };

    return (
      <div className="pb-24 lg:pb-10">
        <GameHeader
          categoryName={selectedCategory.name}
          categoryEmoji={selectedCategory.emoji}
          modeName={GAME_MODES[selectedMode].name}
          questionCount={gameState.questionCount}
          remainingCount={gameState.possibleCharacters.length}
          secondsLeft={secondsLeft}
          onRestart={handleRestart}
        />

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[1fr_340px] lg:items-start lg:gap-8">
          <CharacterGrid
            characters={gameState.allCharacters}
            eliminatedIds={eliminatedIds}
            onToggleEliminate={handleToggleEliminate}
          />

          <aside className="sticky top-[136px] mt-8 hidden rounded-[16px] border border-border bg-bg-elevated p-5 lg:block">
            <Button fullWidth size="lg" className="mb-5" onClick={() => setGuessModalOpen(true)}>
              Make a Guess
            </Button>
            <QuestionPanel {...questionPanelProps} />
          </aside>
        </div>

        {/* Mobile sticky action bar */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 p-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-7xl gap-3">
            <Button variant="secondary" fullWidth onClick={() => setQuestionDrawerOpen(true)}>
              Ask a Question
            </Button>
            <Button fullWidth onClick={() => setGuessModalOpen(true)}>
              Make a Guess
            </Button>
          </div>
        </div>

        <Modal
          open={questionDrawerOpen}
          onClose={() => setQuestionDrawerOpen(false)}
          title="Ask a question"
          maxWidthClassName="max-w-lg"
        >
          <QuestionPanel {...questionPanelProps} />
        </Modal>

        <GuessModal
          open={guessModalOpen}
          onClose={() => setGuessModalOpen(false)}
          candidates={gameState.possibleCharacters}
          onConfirm={handleGuessConfirm}
        />
      </div>
    );
  }

  // -------------------------------------------------------------- FALLBACK
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <EmptyState
        title="Nothing to play yet"
        description="Pick a category to start a new game."
        actionLabel="Choose a category"
        onAction={handleChangeCategory}
      />
    </div>
  );
}
