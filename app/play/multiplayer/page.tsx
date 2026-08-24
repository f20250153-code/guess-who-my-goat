import type { Metadata } from "next";
import { Suspense } from "react";
import { MultiplayerClient } from "./MultiplayerClient";

export const metadata: Metadata = {
  title: "Play Online — Guess Who",
  description: "Head-to-head 1v1 Guess Who, in real time.",
};

export default function MultiplayerPage() {
  return (
    <Suspense fallback={null}>
      <MultiplayerClient />
    </Suspense>
  );
}
