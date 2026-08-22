"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { GameStats } from "@/components/game/GameStats";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { EMPTY_STATS, loadStats, resetStats, type PlayerStats } from "@/lib/stats";

export default function StatsPage() {
  const [stats, setStats] = useState<PlayerStats>(EMPTY_STATS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // localStorage isn't available during SSR, so stats are loaded after
    // mount rather than in a lazy useState initializer (which would cause
    // a hydration mismatch between server and client output).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStats(loadStats());
    setLoaded(true);
  }, []);

  function handleReset() {
    setStats(resetStats());
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-secondary">
            No login required
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">Your Stats</h1>
          <p className="mt-3 max-w-md text-text-muted">
            Saved locally on this device. Clear your browser data and these reset too.
          </p>
        </div>
        {loaded && stats.gamesPlayed > 0 && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset stats
          </Button>
        )}
      </div>

      <div className="mt-10">
        {!loaded ? null : stats.gamesPlayed === 0 ? (
          <EmptyState
            title="No games yet"
            description="Play your first round and your stats will show up here."
            actionLabel="Play now"
            actionHref="/play"
          />
        ) : (
          <GameStats stats={stats} />
        )}
      </div>
    </div>
  );
}
