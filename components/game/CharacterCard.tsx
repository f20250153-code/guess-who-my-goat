"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import type { Character } from "@/types/character";
import { getAvatarPalette, getInitials, getCharacterSubtitle } from "@/lib/character-utils";
import { EliminationOverlay } from "./EliminationOverlay";

interface CharacterCardProps {
  character: Character;
  eliminated?: boolean;
  selected?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  /** Hides the name/details — used for the single face-down "secret
   * character" preview slot, never for the main board. */
  faceDown?: boolean;
}

export function CharacterCard({
  character,
  eliminated = false,
  selected = false,
  interactive = true,
  onClick,
  faceDown = false,
}: CharacterCardProps) {
  const palette = getAvatarPalette(character.id);
  const subtitle = getCharacterSubtitle(character);

  return (
    <motion.button
      type="button"
      layout
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      aria-pressed={selected}
      aria-label={
        faceDown
          ? "Secret character, hidden"
          : `${character.name}, ${subtitle}${eliminated ? ", eliminated" : ""}`
      }
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={interactive && !eliminated ? { y: -3 } : undefined}
      whileTap={interactive ? { scale: 0.97 } : undefined}
      transition={{ duration: 0.18 }}
      className={clsx(
        "group relative flex flex-col items-center rounded-[12px] border p-2.5 text-center transition-colors sm:p-3",
        eliminated
          ? "elim-strike border-border bg-bg-elevated/40 opacity-45 grayscale"
          : "border-border bg-bg-elevated hover:border-border-strong",
        selected && !eliminated && "border-primary shadow-[0_0_0_1px_rgba(124,92,255,0.55)]",
        !interactive && "cursor-default",
      )}
    >
      <div
        className="mb-2 flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold sm:h-14 sm:w-14 sm:text-base"
        style={{ background: faceDown ? "var(--bg-elevated-2)" : palette.bg, color: palette.fg }}
      >
        {faceDown ? "?" : getInitials(character.name)}
      </div>
      {!faceDown && (
        <>
          <p className="line-clamp-2 text-[11px] font-semibold leading-tight sm:text-xs">
            {character.name}
          </p>
          <p className="mt-0.5 line-clamp-1 text-[10px] text-text-faint sm:text-[11px]">{subtitle}</p>
        </>
      )}
      {selected && !eliminated && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          ✓
        </span>
      )}
      {eliminated && <EliminationOverlay />}
    </motion.button>
  );
}
