"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { TOTAL_CHARACTER_COUNT, categories } from "@/data/categories";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 15% 0%, rgba(124,92,255,0.16), transparent), radial-gradient(50% 40% at 100% 20%, rgba(34,211,238,0.10), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border-strong bg-bg-elevated px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-secondary"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {TOTAL_CHARACTER_COUNT}+ characters across {categories.length} categories
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
          >
            GUESS
            <br />
            WHO
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mt-5 max-w-md font-display text-xl font-medium leading-snug text-text sm:text-2xl"
          >
            Ask smart.
            <br />
            Eliminate faster.
            <br />
            Guess right.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="mt-4 max-w-md text-base text-text-muted"
          >
            A modern social guessing game for your friends. Pick a category, get a secret
            character, and out-question everyone at the table.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Button href="/play" size="lg">
              Play Now
              <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
            </Button>
            <Button href="/create" size="lg" variant="secondary">
              Create a Pack
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative"
        >
          <div className="rounded-[16px] border border-border bg-bg-elevated p-5 shadow-[var(--shadow-elevated)]">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <span className="font-mono text-xs font-semibold uppercase tracking-widest text-text-faint">
                Live round
              </span>
              <span className="rounded-full bg-secondary/15 px-2.5 py-0.5 font-mono text-xs font-semibold text-secondary">
                CRICKETERS
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {["MS Dhoni", "Virat Kohli", "Babar Azam", "Joe Root", "Ben Stokes", "Steve Smith"].map(
                (name, i) => (
                  <div
                    key={name}
                    className={`rounded-[10px] border border-border bg-bg-elevated-2 p-2.5 text-center text-[11px] font-medium leading-tight ${
                      i === 1 || i === 4 ? "elim-strike opacity-40 grayscale" : ""
                    }`}
                  >
                    <div className="mx-auto mb-1.5 h-8 w-8 rounded-full bg-primary/20" />
                    {name}
                  </div>
                ),
              )}
            </div>
            <div className="mt-4 flex items-center justify-between font-mono text-xs text-text-muted">
              <span>
                QUESTIONS <span className="text-text">04</span>
              </span>
              <span>
                REMAINING <span className="text-text">04</span>
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
