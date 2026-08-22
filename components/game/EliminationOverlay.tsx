"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";

/** Renders on top of an eliminated CharacterCard. Deliberately subtle —
 * the card is already grayscaled and struck through by CSS — this just
 * adds a small, unambiguous icon so elimination reads even to someone
 * who can't perceive the grayscale/opacity change. */
export function EliminationOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-hidden="true"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-danger/90 text-white shadow-sm">
        <X className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    </motion.div>
  );
}
