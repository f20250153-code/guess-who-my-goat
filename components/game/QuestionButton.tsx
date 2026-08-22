"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { Question } from "@/types/question";

interface QuestionButtonProps {
  question: Question;
  smart: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function QuestionButton({ question, smart, disabled, onClick }: QuestionButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.98 }}
      className="flex w-full items-center justify-between gap-3 rounded-[10px] border border-border bg-bg-elevated px-3.5 py-3 text-left text-sm transition-colors hover:border-border-strong hover:bg-bg-elevated-2 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span>{question.text}</span>
      {smart && (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Smart
        </span>
      )}
    </motion.button>
  );
}
