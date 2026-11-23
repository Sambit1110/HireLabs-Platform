"""Rule-based layout variations of resume and job text (no model writes any text).

The team dataset uses one layout, so a model trained on it alone learns the layout as much
as the content. Each training sample can be re-laid-out: list order shuffled, the "Skills"
label renamed, comma lists turned into bullets or other separators, lines merged into one
paragraph, or the title lower-cased. The words and facts stay the same.
"""

import random
import re
from typing import List

SKILL_LABELS = ["Skills", "Technical skills", "Tech stack", "Core skills", "Tools", "Key skills", "Expertise"]
LIST_LINE = re.compile(r"^\s*([A-Za-z][A-Za-z ]{1,30}):\s*(.+,.+,.+)$")
BULLETS = ["•", "-", "*"]


def _relayout_list(label: str, items: List[str], rng: random.Random) -> List[str]:
    if rng.random() < 0.7:
        rng.shuffle(items)
    if label.strip().lower() == "skills" and rng.random() < 0.6:
        label = rng.choice(SKILL_LABELS)
    style = rng.random()
    if style < 0.3:
        bullet = rng.choice(BULLETS)
        return [f"{label}:"] + [f"{bullet} {item}" for item in items]
    if style < 0.45:
        return [f"{label}: " + " | ".join(items)]
    if style < 0.6:
        return [f"{label}: " + ", ".join(items[:-1]) + " and " + items[-1]]
    return [f"{label}: " + ", ".join(items)]


def relayout(text: str, rng: random.Random) -> str:
    """One random re-layout of the text; same words, different shape."""
    out: List[str] = []
    for line in text.split("\n"):
        match = LIST_LINE.match(line)
        if match:
            items = [item.strip() for item in match.group(2).split(",") if item.strip()]
            out.extend(_relayout_list(match.group(1), items, rng))
        else:
            out.append(line)
    if out and rng.random() < 0.2:
        out[0] = out[0].lower()
    if rng.random() < 0.25:
        # One paragraph: sentences joined, list headers kept readable.
        parts = [line.strip().rstrip(".") for line in out if line.strip()]
        return ". ".join(parts) + "."
    return "\n".join(out)
