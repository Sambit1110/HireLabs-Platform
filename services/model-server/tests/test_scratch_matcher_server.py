"""Run: python -m unittest discover -s services/model-server/tests -t services/model-server"""
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "python"))

try:
    import torch  # noqa: F401
except ImportError:
    torch = None

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402


@unittest.skipIf(torch is None, "torch is not installed")
class ScratchMatcherServing(unittest.TestCase):
    def test_serves_the_scratch_matcher_from_a_marked_folder(self):
        from hirelabs_llm.encoder import Encoder, EncoderConfig, save
        from hirelabs_llm.tokenizer import BPETokenizer

        tok = BPETokenizer.train(["Data Analyst SQL Python"] * 5, vocab_size=300)
        with tempfile.TemporaryDirectory() as folder:
            save(Encoder(EncoderConfig(vocab_size=tok.vocab_size, n_layer=1, n_head=2, n_embd=32)), tok, folder)
            with patch.dict(os.environ, {"MATCHER_MODEL": folder, "HIRELABS_LLM_DIR": "/nonexistent"}, clear=True):
                with TestClient(main.app) as client:
                    self.assertTrue(client.get("/health").json()["matcher_ready"])
                    reply = client.post("/embed", json={"texts": ["SQL analyst", "Go engineer"]}).json()
        self.assertEqual(reply["model_used"], "hirelabs-matcher-v2")
        self.assertEqual(reply["dim"], 384)
        self.assertEqual([len(v) for v in reply["vectors"]], [384, 384])


if __name__ == "__main__":
    unittest.main()
