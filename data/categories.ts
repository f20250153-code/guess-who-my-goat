import type { Category } from "@/types/game";
import { footballers } from "./footballers";
import { cricketers } from "./cricketers";
import { actors } from "./actors";
import { actresses } from "./actresses";
import { singers } from "./singers";
import { famousPersonalities } from "./famousPersonalities";
import { f1Drivers } from "./f1Drivers";
import { basketballPlayers } from "./basketballPlayers";
import { gamers } from "./gamers";
import { techBusiness } from "./techBusiness";
import { fictionalCharacters } from "./fictionalCharacters";
import { indianCelebrities } from "./indianCelebrities";

/**
 * Single source of truth for every built-in category. To add a new
 * category: create a data/<name>.ts file exporting a Character[], then add
 * one entry here. Nothing else in the app needs to change.
 */
export const categories: Category[] = [
  {
    id: "footballers",
    name: "Footballers",
    description: "World-class strikers, midfielders and legends of the pitch.",
    icon: "Goal",
    emoji: "⚽",
    theme: "emerald",
    characters: footballers,
  },
  {
    id: "cricketers",
    name: "Cricketers",
    description: "Batting icons, bowling greats and captains from across the world.",
    icon: "Dumbbell",
    emoji: "🏏",
    theme: "sky",
    characters: cricketers,
  },
  {
    id: "actors",
    name: "Actors",
    description: "Leading men from Hollywood to Bollywood.",
    icon: "Clapperboard",
    emoji: "🎬",
    theme: "violet",
    characters: actors,
  },
  {
    id: "actresses",
    name: "Actresses",
    description: "Award-winning and blockbuster leading actresses.",
    icon: "Drama",
    emoji: "🎭",
    theme: "rose",
    characters: actresses,
  },
  {
    id: "singers",
    name: "Singers",
    description: "Chart-topping voices from every corner of the globe.",
    icon: "Mic2",
    emoji: "🎤",
    theme: "amber",
    characters: singers,
  },
  {
    id: "famous-personalities",
    name: "Famous Personalities",
    description: "Leaders, scientists, and icons who changed the world.",
    icon: "Globe2",
    emoji: "🌎",
    theme: "cyan",
    characters: famousPersonalities,
  },
  {
    id: "f1-drivers",
    name: "F1 Drivers",
    description: "Champions and challengers of the Formula 1 grid.",
    icon: "Flag",
    emoji: "🏎️",
    theme: "rose",
    characters: f1Drivers,
  },
  {
    id: "basketball",
    name: "Basketball Players",
    description: "NBA legends and today's biggest stars.",
    icon: "CircleDot",
    emoji: "🏀",
    theme: "amber",
    characters: basketballPlayers,
  },
  {
    id: "gamers",
    name: "Gamers & Streamers",
    description: "The biggest names in streaming and esports.",
    icon: "Gamepad2",
    emoji: "🎮",
    theme: "violet",
    characters: gamers,
  },
  {
    id: "tech-business",
    name: "Tech & Business",
    description: "Founders and executives shaping the modern economy.",
    icon: "Briefcase",
    emoji: "💻",
    theme: "sky",
    characters: techBusiness,
  },
  {
    id: "fictional",
    name: "Fictional Characters",
    description: "Heroes and villains from film, TV, games and books.",
    icon: "Sparkles",
    emoji: "🦸",
    theme: "violet",
    characters: fictionalCharacters,
  },
  {
    id: "indian-celebrities",
    name: "Indian Celebrities",
    description: "Icons of Indian cinema, sport, business and culture.",
    icon: "Star",
    emoji: "🇮🇳",
    theme: "emerald",
    characters: indianCelebrities,
  },
  {
    // Combined pool per spec Phase 12 — Actors + Actresses, deduplicated
    // by id (their id prefixes never collide: "ac-" vs "as-"). Not a new
    // data source of its own, just an alternate lens on the two existing
    // pools, so it stays derived rather than hand-maintained.
    id: "movie-stars",
    name: "Movie Stars",
    description: "Leading men and women from Hollywood to Bollywood.",
    icon: "Film",
    emoji: "🌟",
    theme: "rose",
    derived: true,
    characters: [...actors, ...actresses].map((c) => ({ ...c, categoryId: "movie-stars" })),
  },
];

export function getCategoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

// Excludes derived categories (e.g. Movie Stars) so a character shared
// between two listed categories is only ever counted once.
export const TOTAL_CHARACTER_COUNT = categories
  .filter((c) => !c.derived)
  .reduce((sum, c) => sum + c.characters.length, 0);
