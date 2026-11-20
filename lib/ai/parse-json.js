
export class AIJsonParseError extends Error {
  constructor(message) {
    super(message);
    this.name = "AIJsonParseError";
  }
}

function removeMarkdownFences(value) {
  const trimmed = value.trim();

  const fencedMatch = trimmed.match(
    /^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n?```$/i
  );

  return fencedMatch
    ? fencedMatch[1].trim()
    : trimmed;
}

function extractJSON(value) {
  let start = -1;
  let opening = "";
  let closing = "";
  let depth = 0;
  let insideString = false;
  let escaped = false;

  for (let i = 0; i < value.length; i++) {
    const character = value[i];

    if (start === -1) {
      if (character === "{" || character === "[") {
        start = i;
        opening = character;
        closing = character === "{" ? "}" : "]";
        depth = 1;
      }

      continue;
    }

    if (insideString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        insideString = false;
      }

      continue;
    }

    if (character === '"') {
      insideString = true;
      continue;
    }

    if (character === opening) {
      depth++;
    } else if (character === closing) {
      depth--;

      if (depth === 0) {
        return value.slice(start, i + 1);
      }
    }
  }

  return null;
}

export function parseAIJson(value) {
  if (typeof value !== "string") {
    throw new AIJsonParseError(
      "The AI response must be a string."
    );
  }

  const cleaned = removeMarkdownFences(value);

  if (!cleaned) {
    throw new AIJsonParseError(
      "The AI returned an empty response."
    );
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const extracted = extractJSON(cleaned);

    if (!extracted) {
      throw new AIJsonParseError(
        "The AI returned an unreadable JSON response."
      );
    }

    try {
      return JSON.parse(extracted);
    } catch {
      throw new AIJsonParseError(
        "The AI returned malformed JSON."
      );
    }
  }
}
