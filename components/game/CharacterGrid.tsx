"use client";

import { AnimatePresence } from "framer-motion";
import type { Character } from "@/types/character";
import { CharacterCard } from "./CharacterCard";

interface CharacterGridProps {
  characters: Character[];
  eliminatedIds: Set<string>;
  onToggleEliminate: (id: string) => void;
  selectMode?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

export function CharacterGrid({
  characters,
  eliminatedIds,
  onToggleEliminate,
  selectMode = false,
  selectedId = null,
  onSelect,
}: CharacterGridProps) {
  return (
    <div
      className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5"
      role="list"
      aria-label="Character board"
    >
      <AnimatePresence>
        {characters.map((character) => {
          const eliminated = eliminatedIds.has(character.id);
          // In select mode (making a guess) only remaining candidates are
          // shown, and clicking selects rather than eliminates.
          if (selectMode && eliminated) return null;
          return (
            <div key={character.id} role="listitem">
              <CharacterCard
                character={character}
                eliminated={eliminated}
                selected={selectMode && selectedId === character.id}
                onClick={() => {
                  if (selectMode) {
                    onSelect?.(character.id);
                  } else {
                    onToggleEliminate(character.id);
                  }
                }}
              />
            </div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
