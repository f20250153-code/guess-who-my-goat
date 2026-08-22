import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayClient } from "./PlayClient";

export const metadata: Metadata = {
  title: "Play — Guess Who",
  description: "Pick a category, ask questions, and guess the secret character.",
};

export default function PlayPage() {
  return (
    <Suspense fallback={null}>
      <PlayClient />
    </Suspense>
  );
}
