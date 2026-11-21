import json
import re
import sys


def unique(values):
    result = []
    seen = set()
    for value in values:
        if not isinstance(value, str):
            continue
        cleaned = re.sub(r"\s+", " ", value).strip()
        key = cleaned.lower()
        if cleaned and key not in seen:
            seen.add(key)
            result.append(cleaned)
    return result


def experience_from_text(text, entities):
    for entity in entities:
        if entity["label"] == "YEARS OF EXPERIENCE":
            match = re.search(
                r"\b(\d+(?:\.\d+)?)\s*(?:\+?\s*years?|yrs?)\b",
                entity["text"],
                re.I,
            )
            if match:
                return max(0, min(80, int(float(match.group(1)))))

    patterns = [
        r"\b(\d+(?:\.\d+)?)\s*(?:\+\s*)?years?\s+(?:of\s+)?(?:professional\s+)?experience\b",
        r"\b(?:professional\s+)?experience\s*[:\-]\s*(\d+(?:\.\d+)?)\s*(?:\+?\s*years?|yrs?)\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.I)
        if match:
            return max(0, min(80, int(float(match.group(1)))))
    return None


def main():
    payload = json.load(sys.stdin)
    text = payload.get("text", "")
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Resume text is required.")

    import en_Resume_Parser_pipeline

    nlp = en_Resume_Parser_pipeline.load()
    doc = nlp(text[:50000])
    entities = [
        {"text": entity.text, "label": entity.label_}
        for entity in doc.ents
        if entity.text.strip()
    ]

    by_label = {}
    for entity in entities:
        by_label.setdefault(entity["label"], []).append(entity["text"])

    name = unique(by_label.get("NAME", []))[0:1]
    title = unique(
        by_label.get("WORKED AS", [])
        + by_label.get("DESIGNATION", [])
    )[0:1]
    skills = unique(by_label.get("SKILLS", []))

    json.dump(
        {
            "candidateName": name[0] if name else None,
            "candidateTitle": title[0] if title else None,
            "extractedSkills": skills,
            "yearsExperience": experience_from_text(text, entities),
        },
        sys.stdout,
        ensure_ascii=False,
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        json.dump({"error": str(error)}, sys.stdout)
        sys.exit(1)
