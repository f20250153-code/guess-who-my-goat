"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Play, Save, Link2, Check } from "lucide-react";
import type { Character } from "@/types/character";
import type { CharacterPack } from "@/types/pack";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { validateNewPack, encodePack, PACK_LIMITS } from "@/lib/pack-utils";
import { readJSON, writeJSON, STORAGE_KEYS } from "@/lib/storage";
import { getInitials, getAvatarPalette } from "@/lib/character-utils";

interface CharacterDraft {
  draftId: string;
  name: string;
  description: string;
  gender: "" | "male" | "female" | "other";
  tags: string;
}

function emptyCharacter(): CharacterDraft {
  return {
    draftId: `draft_${Math.random().toString(36).slice(2, 9)}`,
    name: "",
    description: "",
    gender: "",
    tags: "",
  };
}

function draftsToCharacters(drafts: CharacterDraft[]): Character[] {
  return drafts
    .filter((d) => d.name.trim())
    .map((d) => {
      const tags = d.tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      const custom: Record<string, boolean> = {};
      for (const tag of tags) custom[tag] = true;

      return {
        id: d.draftId,
        name: d.name.trim(),
        categoryId: "custom",
        description: d.description.trim() || undefined,
        attributes: {
          gender: d.gender || undefined,
          custom,
        },
      };
    });
}

export default function CreatePackPage() {
  const router = useRouter();
  const [packName, setPackName] = useState("");
  const [packDescription, setPackDescription] = useState("");
  const [drafts, setDrafts] = useState<CharacterDraft[]>([emptyCharacter(), emptyCharacter()]);
  const [saved, setSaved] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const characters = useMemo(() => draftsToCharacters(drafts), [drafts]);

  const validationError = useMemo(
    () =>
      validateNewPack({
        name: packName,
        description: packDescription,
        category: "custom",
        characters,
      }),
    [packName, packDescription, characters],
  );

  function updateDraft(draftId: string, patch: Partial<CharacterDraft>) {
    setDrafts((prev) => prev.map((d) => (d.draftId === draftId ? { ...d, ...patch } : d)));
    setSaved(false);
    setShareUrl(null);
  }

  function addCharacter() {
    if (drafts.length >= PACK_LIMITS.maxCharacters) return;
    setDrafts((prev) => [...prev, emptyCharacter()]);
  }

  function removeCharacter(draftId: string) {
    setDrafts((prev) => prev.filter((d) => d.draftId !== draftId));
    setSaved(false);
    setShareUrl(null);
  }

  function buildPack(): CharacterPack {
    return {
      id: `pack_${Date.now().toString(36)}`,
      name: packName.trim(),
      description: packDescription.trim(),
      category: "custom",
      characters,
      createdAt: new Date().toISOString(),
      version: 1,
    };
  }

  function handleSave() {
    if (validationError) return;
    const pack = buildPack();
    const existing = readJSON<CharacterPack[]>(STORAGE_KEYS.customPacks, []);
    writeJSON(STORAGE_KEYS.customPacks, [...existing, pack]);
    setSaved(true);
  }

  function handlePlay() {
    if (validationError) return;
    const pack = buildPack();
    const encoded = encodePack(pack);
    if (!encoded) return;
    router.push(`/play?pack=${encoded}`);
  }

  function handleShare() {
    if (validationError) return;
    const pack = buildPack();
    const encoded = encodePack(pack);
    if (!encoded) return;
    const url = `${window.location.origin}/play?pack=${encoded}`;
    setShareUrl(url);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-secondary">
        No login required
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
        Create Your Own Pack
      </h1>
      <p className="mt-3 max-w-xl text-text-muted">
        Build a Guess Who pack out of your friends, coworkers, or any group you like. Add at least
        2 characters to start.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          {/* Pack details */}
          <div className="rounded-[14px] border border-border bg-bg-elevated p-5">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide">Pack details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-text-muted">Pack name</span>
                <input
                  type="text"
                  value={packName}
                  onChange={(e) => {
                    setPackName(e.target.value);
                    setSaved(false);
                    setShareUrl(null);
                  }}
                  placeholder="BITS Friends"
                  maxLength={PACK_LIMITS.maxNameLength}
                  className="h-10 w-full rounded-[8px] border border-border bg-bg-elevated-2 px-3 text-sm placeholder:text-text-faint focus-visible:outline-2 focus-visible:outline-secondary"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-text-muted">Description</span>
                <input
                  type="text"
                  value={packDescription}
                  onChange={(e) => {
                    setPackDescription(e.target.value);
                    setSaved(false);
                    setShareUrl(null);
                  }}
                  placeholder="Our hostel wing, guess who!"
                  maxLength={PACK_LIMITS.maxDescriptionLength}
                  className="h-10 w-full rounded-[8px] border border-border bg-bg-elevated-2 px-3 text-sm placeholder:text-text-faint focus-visible:outline-2 focus-visible:outline-secondary"
                />
              </label>
            </div>
          </div>

          {/* Characters */}
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide">
                Characters ({drafts.length})
              </h2>
              <Button size="sm" variant="secondary" onClick={addCharacter}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add character
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              {drafts.map((draft, i) => (
                <div key={draft.draftId} className="rounded-[12px] border border-border bg-bg-elevated p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-text-faint">
                      #{String(i + 1).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCharacter(draft.draftId)}
                      aria-label={`Remove character ${i + 1}`}
                      className="flex h-7 w-7 items-center justify-center rounded-[6px] text-text-faint hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(e) => updateDraft(draft.draftId, { name: e.target.value })}
                      placeholder="Name"
                      className="h-10 rounded-[8px] border border-border bg-bg-elevated-2 px-3 text-sm placeholder:text-text-faint focus-visible:outline-2 focus-visible:outline-secondary"
                    />
                    <select
                      value={draft.gender}
                      onChange={(e) =>
                        updateDraft(draft.draftId, { gender: e.target.value as CharacterDraft["gender"] })
                      }
                      className="h-10 rounded-[8px] border border-border bg-bg-elevated-2 px-3 text-sm focus-visible:outline-2 focus-visible:outline-secondary"
                    >
                      <option value="">Gender (optional)</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      type="text"
                      value={draft.tags}
                      onChange={(e) => updateDraft(draft.draftId, { tags: e.target.value })}
                      placeholder="Tags — e.g. indian, hosteller, football fan"
                      className="h-10 rounded-[8px] border border-border bg-bg-elevated-2 px-3 text-sm placeholder:text-text-faint focus-visible:outline-2 focus-visible:outline-secondary sm:col-span-2"
                    />
                    <input
                      type="text"
                      value={draft.description}
                      onChange={(e) => updateDraft(draft.draftId, { description: e.target.value })}
                      placeholder="Short description (optional)"
                      className="h-10 rounded-[8px] border border-border bg-bg-elevated-2 px-3 text-sm placeholder:text-text-faint focus-visible:outline-2 focus-visible:outline-secondary sm:col-span-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div>
          <div className="sticky top-24 rounded-[14px] border border-border bg-bg-elevated p-5">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide">Preview</h2>
            {characters.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Nothing yet"
                  description="Add at least 2 characters to start."
                />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2.5">
                {characters.map((c) => {
                  const palette = getAvatarPalette(c.id);
                  return (
                    <div
                      key={c.id}
                      className="flex flex-col items-center rounded-[10px] border border-border bg-bg-elevated-2 p-2.5 text-center"
                    >
                      <div
                        className="mb-1.5 flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold"
                        style={{ background: palette.bg, color: palette.fg }}
                      >
                        {getInitials(c.name)}
                      </div>
                      <p className="line-clamp-2 text-[11px] font-semibold leading-tight">{c.name}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {validationError && (
              <p className="mt-4 rounded-[8px] border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
                {validationError}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2.5">
              <Button fullWidth disabled={!!validationError} onClick={handlePlay}>
                <Play className="h-4 w-4" aria-hidden="true" />
                Start Playing
              </Button>
              <Button fullWidth variant="secondary" disabled={!!validationError} onClick={handleSave}>
                {saved ? <Check className="h-4 w-4" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {saved ? "Saved" : "Save pack"}
              </Button>
              <Button fullWidth variant="outline" disabled={!!validationError} onClick={handleShare}>
                <Link2 className="h-4 w-4" aria-hidden="true" />
                Copy share link
              </Button>
              {shareUrl && (
                <p className="break-all rounded-[8px] bg-bg-elevated-2 px-3 py-2 text-[11px] text-text-muted">
                  Link copied: {shareUrl}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
