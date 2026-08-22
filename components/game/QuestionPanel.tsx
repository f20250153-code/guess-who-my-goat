"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, History, MessageCircleQuestion, Send } from "lucide-react";
import type { Character } from "@/types/character";
import type { AskedQuestion, Question, QuestionGroup } from "@/types/question";
import { getAvailableQuestions, isSmartQuestion } from "@/lib/question-engine";
import { QuestionButton } from "./QuestionButton";

interface QuestionPanelProps {
  categoryId: string;
  candidates: Character[];
  askedQuestions: AskedQuestion[];
  canAsk: boolean;
  onAsk: (question: Question) => void;
  /** Overrides the built-in question bank — used for custom packs, whose
   * questions are generated on the fly from their freeform attributes. */
  pool?: Question[];
}

const GROUP_LABELS: Record<QuestionGroup, string> = {
  identity: "Identity",
  career: "Career",
  status: "Status",
  sport: "Sport",
  age: "Age",
  achievements: "Achievements",
  origin: "Origin",
};

export function QuestionPanel({
  categoryId,
  candidates,
  askedQuestions,
  canAsk,
  onAsk,
  pool,
}: QuestionPanelProps) {
  const [customText, setCustomText] = useState("");
  const [customHint, setCustomHint] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);

  const askedIds = useMemo(() => askedQuestions.map((aq) => aq.question.id), [askedQuestions]);

  const available = useMemo(
    () => getAvailableQuestions(categoryId, askedIds, pool),
    [categoryId, askedIds, pool],
  );

  const smartQuestions = useMemo(
    () => available.filter((q) => isSmartQuestion(q, candidates)).slice(0, 3),
    [available, candidates],
  );

  const grouped = useMemo(() => {
    const map = new Map<QuestionGroup, Question[]>();
    for (const q of available) {
      if (!map.has(q.group)) map.set(q.group, []);
      map.get(q.group)!.push(q);
    }
    return map;
  }, [available]);

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customText.trim()) return;
    setCustomHint("Try one of the suggested questions below — free-form questions aren't supported yet.");
    setCustomText("");
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <MessageCircleQuestion className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="font-display text-sm font-bold uppercase tracking-wide">Ask a question</h2>
        </div>

        <form onSubmit={handleCustomSubmit} className="mb-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Type your own question…"
              disabled={!canAsk}
              className="h-10 flex-1 rounded-[8px] border border-border bg-bg-elevated px-3 text-sm placeholder:text-text-faint focus-visible:outline-2 focus-visible:outline-secondary disabled:opacity-50"
              aria-label="Custom question"
            />
            <button
              type="submit"
              disabled={!canAsk}
              aria-label="Submit custom question"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-bg-elevated-2 text-text-muted hover:text-text disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          {customHint && <p className="mt-2 text-xs text-warning">{customHint}</p>}
        </form>

        {smartQuestions.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-faint">
              Recommended
            </p>
            <div className="flex flex-col gap-2">
              {smartQuestions.map((q) => (
                <QuestionButton key={q.id} question={q} smart disabled={!canAsk} onClick={() => onAsk(q)} />
              ))}
            </div>
          </div>
        )}

        <div className="flex max-h-[360px] flex-col gap-4 overflow-y-auto pr-1">
          {Array.from(grouped.entries()).map(([group, groupQuestions]) => (
            <div key={group}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-faint">
                {GROUP_LABELS[group]}
              </p>
              <div className="flex flex-col gap-2">
                {groupQuestions.map((q) => (
                  <QuestionButton
                    key={q.id}
                    question={q}
                    smart={smartQuestions.some((sq) => sq.id === q.id)}
                    disabled={!canAsk}
                    onClick={() => onAsk(q)}
                  />
                ))}
              </div>
            </div>
          ))}
          {available.length === 0 && (
            <p className="rounded-[10px] border border-dashed border-border-strong p-4 text-center text-xs text-text-muted">
              You&apos;ve asked every available question. Time to make your guess!
            </p>
          )}
        </div>
      </div>

      {askedQuestions.length > 0 && (
        <div className="border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="flex w-full items-center justify-between text-left"
            aria-expanded={historyOpen}
          >
            <span className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide">
              <History className="h-4 w-4 text-text-muted" aria-hidden="true" />
              History ({askedQuestions.length})
            </span>
            <ChevronDown
              className={`h-4 w-4 text-text-muted transition-transform ${historyOpen ? "rotate-180" : ""}`}
            />
          </button>
          <AnimatePresence initial={false}>
            {historyOpen && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 flex flex-col gap-2 overflow-hidden"
              >
                {[...askedQuestions].reverse().map((aq) => (
                  <li
                    key={aq.question.id}
                    className="flex items-center justify-between gap-3 rounded-[8px] bg-bg-elevated px-3 py-2 text-xs"
                  >
                    <span className="text-text-muted">
                      <span className="mr-1.5 font-mono text-text-faint">Q{aq.questionNumber}</span>
                      {aq.question.text}
                    </span>
                    <span
                      className={`shrink-0 font-mono font-bold ${
                        aq.answer ? "text-success" : "text-danger"
                      }`}
                    >
                      {aq.answer ? "YES" : "NO"}
                    </span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
