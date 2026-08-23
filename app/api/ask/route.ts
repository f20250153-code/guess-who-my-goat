import { NextRequest, NextResponse } from "next/server";
import type { CharacterAttributes } from "@/types/character";

export const runtime = "nodejs";

const MAX_QUESTION_LENGTH = 200;

const SYSTEM_PROMPT = `You are the question-judge for a "Guess Who" party game. The player is trying to identify a secret character by asking yes/no questions.

You will be given:
1. A JSON object of factual attributes about the secret character. The character's NAME is deliberately withheld.
2. The player's question, in their own words.

Reply with EXACTLY ONE WORD, nothing else:
- YES — the question is a fair yes/no question and the answer is yes, based on the given attributes (or, only for real well-known public figures, your own reliable general knowledge).
- NO — same, but the answer is no.
- UNKNOWN — it's a fair yes/no question, but there isn't enough information to answer confidently. Do not guess.
- INVALID — the question is not a genuine yes/no question about the character's attributes. This includes: asking directly for the character's name or identity ("who is this", "is it [name]", "what's their name"), asking something with no yes/no answer, or anything unrelated to the game.

Never reveal the character's name under any circumstance, even indirectly. Stay strictly factual — do not speculate beyond what you're confident about. Respond with only the single word.`;

interface AskRequestBody {
  question: string;
  attributes: CharacterAttributes;
  isCustomPack: boolean;
}

export async function POST(req: NextRequest) {
  let body: AskRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json({ error: "Question is too long." }, { status: 400 });
  }
  if (!body.attributes || typeof body.attributes !== "object") {
    return NextResponse.json({ error: "Missing character data." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No key configured on this deployment — degrade gracefully rather
    // than 500ing, so the client can fall back to suggested questions.
    return NextResponse.json({ error: "AI questions are not configured on this deployment." }, { status: 503 });
  }

  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const userContent = [
    `Character attributes (JSON, name withheld):`,
    JSON.stringify(body.attributes),
    "",
    body.isCustomPack
      ? "This is a custom, user-created pack — rely ONLY on the given attributes. You have no outside knowledge of this specific person, so if the attributes don't cover it, answer UNKNOWN."
      : "You may supplement with your own reliable general knowledge of this kind of public figure, but never contradict the given attributes.",
    "",
    `Player's question: "${question}"`,
  ].join("\n");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "AI request failed." }, { status: 502 });
    }

    const data = await response.json();
    const rawText: string = data?.content?.[0]?.text ?? "";
    const normalized = rawText.trim().toUpperCase();

    let answer: "YES" | "NO" | "UNKNOWN" | "INVALID" = "UNKNOWN";
    if (normalized.startsWith("YES")) answer = "YES";
    else if (normalized.startsWith("NO")) answer = "NO";
    else if (normalized.startsWith("INVALID")) answer = "INVALID";

    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ error: "AI request failed." }, { status: 502 });
  }
}
