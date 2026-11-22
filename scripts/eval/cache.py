"""Optional local, content-addressed response cache with strict JSON values."""

import hashlib
import json
import os
from pathlib import Path
import tempfile

from .strict_json import loads_strict


class ResponseCache:
    def __init__(self, directory):
        if directory is None:
            raise ValueError("An explicit cache directory is required.")
        self.directory = Path(directory).expanduser().resolve()

    @staticmethod
    def key(*, task, adapter, model, input_value):
        payload = json.dumps(
            {"task": task, "adapter": adapter, "model": model, "input": input_value},
            sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False,
        ).encode("utf-8")
        return hashlib.sha256(payload).hexdigest()

    def get(self, key):
        if len(key) != 64 or any(char not in "0123456789abcdef" for char in key):
            raise ValueError("Cache key must be a SHA-256 digest.")
        path = self.directory / f"{key}.json"
        if not path.is_file() or path.is_symlink():
            return None
        return loads_strict(path.read_text(encoding="utf-8"))

    def put(self, key, value):
        if len(key) != 64 or any(char not in "0123456789abcdef" for char in key):
            raise ValueError("Cache key must be a SHA-256 digest.")
        self.directory.mkdir(parents=True, exist_ok=True)
        path = self.directory / f"{key}.json"
        fd, temporary_name = tempfile.mkstemp(prefix=f".{key}.", suffix=".tmp", dir=self.directory)
        try:
            with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as stream:
                json.dump(value, stream, ensure_ascii=False, sort_keys=True, allow_nan=False)
                stream.write("\n")
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary_name, path)
        finally:
            try:
                os.unlink(temporary_name)
            except FileNotFoundError:
                pass
