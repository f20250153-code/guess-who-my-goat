"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { Character } from "@/types/character";
import { Modal } from "@/components/shared/Modal";
import { Button } from "@/components/shared/Button";
import { getAvatarPalette, getInitials, getCharacterImageUrl } from "@/lib/character-utils";

interface GuessModalProps {
  open: boolean;
  onClose: () => void;
  candidates: Character[];
  onConfirm: (characterId: string) => void;
}

export function GuessModal({ open, onClose, candidates, onConfirm }: GuessModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const selected = candidates.find((c) => c.id === selectedId) ?? null;

  function handleClose() {
    setSelectedId(null);
    setConfirming(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Make a guess" maxWidthClassName="max-w-xl">
      {!confirming ? (
        <>
          <p className="mb-4 text-sm text-text-muted">
            Choose who you think the secret character is from the {candidates.length} remaining
            candidate{candidates.length === 1 ? "" : "s"}.
          </p>
          <div className="grid max-h-[50vh] grid-cols-3 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-4">
            {candidates.map((c) => {
              const palette = getAvatarPalette(c.id);
              const imageUrl = getCharacterImageUrl(c);
              const isSelected = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  aria-pressed={isSelected}
                  className={`flex flex-col items-center rounded-[10px] border p-2.5 text-center transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-bg-elevated-2 hover:border-border-strong"
                  }`}
                >
                  <CandidateAvatar name={c.name} imageUrl={imageUrl} palette={palette} />
                  <p className="line-clamp-2 text-[11px] font-semibold leading-tight">{c.name}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!selectedId} onClick={() => setConfirming(true)}>
              Continue
            </Button>
          </div>
        </>
      ) : (
        selected && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/15 text-warning">
              <AlertTriangle className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="text-lg font-semibold">
              Lock in <span className="text-primary">{selected.name}</span> as your final guess?
            </p>
            <p className="mt-2 text-sm text-text-muted">
              You won&apos;t be able to change your answer after this.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Go back
              </Button>
              <Button variant="primary" onClick={() => onConfirm(selected.id)}>
                Yes, I&apos;m sure
              </Button>
            </div>
          </div>
        )
      )}
    </Modal>
  );
}

function CandidateAvatar({
  name,
  imageUrl,
  palette,
}: {
  name: string;
  imageUrl: string | null;
  palette: { bg: string; fg: string };
}) {
  const [failed, setFailed] = useState(false);

  if (imageUrl && !failed) {
    return (
      // External, dynamically-sourced photo; see CharacterCard for the
      // same pattern and rationale.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="mb-1.5 h-10 w-10 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className="mb-1.5 flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold"
      style={{ background: palette.bg, color: palette.fg }}
    >
      {getInitials(name)}
    </div>
  );
}
