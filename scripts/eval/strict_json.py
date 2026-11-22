"""Strict JSON decoding helpers for datasets and model responses."""

import json


class StrictJSONError(ValueError):
    """Input is not strict JSON or contains duplicate object keys."""


def _object_without_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise StrictJSONError("Duplicate JSON object key.")
        result[key] = value
    return result


def _reject_constant(_value):
    raise StrictJSONError("Non-standard numeric constant is not valid JSON.")


def loads_strict(value):
    """Decode RFC-style JSON and reject duplicate keys and NaN/Infinity."""
    try:
        return json.loads(
            value,
            object_pairs_hook=_object_without_duplicate_keys,
            parse_constant=_reject_constant,
        )
    except StrictJSONError:
        raise
    except (json.JSONDecodeError, TypeError) as error:
        raise StrictJSONError("Malformed JSON.") from error
