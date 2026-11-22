"""Text normalization used by keyword baselines.

This mirrors ``lib/resume/text.js`` for matching-style text inputs. Parser
annotations and parser predictions are scored against the original ``text``
field from JSONL; this function must not be applied before exact-span scoring,
because normalization, whitespace trimming, and clipping can move offsets.
"""

import re
import unicodedata


_CONTROL_CHARS = re.compile(r"[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]")
_NON_BREAKING_SPACES = re.compile(r"[\u00a0\u2007\u202f]")
_ZERO_WIDTH = re.compile(r"[\u200b-\u200d\ufeff]")
_BULLET_LINE = re.compile(r"^[\u2022\u25cf\u25aa\u25e6]\s*", re.MULTILINE)


def clean_text(value, max_length=50000):
    """Return application-style normalized text for non-span comparisons."""
    if not isinstance(value, str):
        return ""
    if not isinstance(max_length, int) or isinstance(max_length, bool) or max_length < 0:
        max_length = 50000
    if max_length == 0:
        return ""

    text = unicodedata.normalize("NFC", value)
    text = _CONTROL_CHARS.sub(" ", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = _NON_BREAKING_SPACES.sub(" ", text)
    text = _ZERO_WIDTH.sub("", text)
    text = re.sub(r"[^\S\n]+", " ", text)
    text = "\n".join(line.strip() for line in text.split("\n"))
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = _BULLET_LINE.sub("- ", text)
    text = re.sub(r" {2,}", " ", text).strip()

    if len(text) > max_length:
        text = text[:max_length]
        last_boundary = max(text.rfind(" "), text.rfind("\n"))
        if last_boundary > max_length * 0.9:
            text = text[:last_boundary]
        text = text.rstrip()
    return text
