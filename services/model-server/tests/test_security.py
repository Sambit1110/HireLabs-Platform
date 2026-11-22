"""Run: python -m unittest discover -s services/model-server/tests -t services/model-server"""
import os
import sys
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402

TOKEN = "t" * 40
CHAT = {
    "model": "hirelabs-evaluator",
    "messages": [{"role": "system", "content": "rules"}, {"role": "user", "content": "resume"}],
    "format": {"type": "object"},
    "options": {"temperature": 0, "seed": 42, "num_ctx": 16384},
    "stream": False,
}


def client(**env):
    values = {"MODEL_PLACEHOLDERS": "true", **env}
    patcher = patch.dict(os.environ, values, clear=True)
    patcher.start()
    test_client = TestClient(main.app)
    test_client.__enter__()

    def stop():
        test_client.__exit__(None, None, None)
        patcher.stop()

    return test_client, stop


class TokenRequired(unittest.TestCase):
    def setUp(self):
        self.client, stop = client(MODEL_API_TOKEN=TOKEN)
        self.addCleanup(stop)

    def test_rejects_missing_or_wrong_token(self):
        self.assertEqual(self.client.post("/parse", json={"text": "Python"}).status_code, 401)
        wrong = {"Authorization": "Bearer " + "x" * 40}
        self.assertEqual(self.client.post("/parse", json={"text": "Python"}, headers=wrong).status_code, 401)
        self.assertEqual(self.client.post("/embed", json={"texts": ["Python"]}).status_code, 401)
        self.assertEqual(self.client.post("/api/chat", json=CHAT).status_code, 401)
        self.assertEqual(self.client.get("/openapi.json").status_code, 401)

    def test_accepts_the_right_token(self):
        response = self.client.post("/parse", json={"text": "Python"}, headers={"Authorization": f"Bearer {TOKEN}"})
        self.assertEqual(response.status_code, 200)

    def test_health_stays_open_and_reports_readiness_only(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.json()), {"parser_ready", "matcher_ready", "placeholder", "evaluator_proxy"})


class ShortToken(unittest.TestCase):
    def test_refuses_to_start_with_a_short_token(self):
        with patch.dict(os.environ, {"MODEL_PLACEHOLDERS": "true", "MODEL_API_TOKEN": "short"}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "at least 32"):
                with TestClient(main.app):
                    pass


class NoTokenLocalDevelopment(unittest.TestCase):
    def test_open_when_no_token_is_set(self):
        test_client, stop = client()
        self.addCleanup(stop)
        self.assertEqual(test_client.post("/parse", json={"text": "Python"}).status_code, 200)


class EvaluatorProxy(unittest.TestCase):
    def setUp(self):
        self.client, stop = client(MODEL_API_TOKEN=TOKEN)
        self.addCleanup(stop)
        self.auth = {"Authorization": f"Bearer {TOKEN}"}

    def test_forwards_only_the_evaluator_without_streaming(self):
        reply = {"model": "hirelabs-evaluator", "message": {"role": "assistant", "content": "{}"}, "done": True}
        request = {**CHAT, "options": {**CHAT["options"], "num_gpu": 99}, "stream": True}
        with patch.object(main, "forward_to_ollama", return_value=reply) as forward:
            response = self.client.post("/api/chat", json=request, headers=self.auth)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"]["content"], "{}")
        sent = forward.call_args.args[0]
        self.assertEqual(sent["model"], "hirelabs-evaluator")
        self.assertIs(sent["stream"], False)
        self.assertEqual(sent["options"], {"temperature": 0, "seed": 42, "num_ctx": 16384})
        self.assertEqual(sent["format"], {"type": "object"})

    def test_refuses_any_other_model(self):
        with patch.object(main, "forward_to_ollama") as forward:
            response = self.client.post("/api/chat", json={**CHAT, "model": "llama3"}, headers=self.auth)
        self.assertEqual(response.status_code, 403)
        forward.assert_not_called()

    def test_refuses_an_oversized_context_or_prompt(self):
        with patch.object(main, "forward_to_ollama") as forward:
            big_ctx = {**CHAT, "options": {"num_ctx": 1_000_000}}
            self.assertEqual(self.client.post("/api/chat", json=big_ctx, headers=self.auth).status_code, 422)
            huge = {**CHAT, "messages": [{"role": "user", "content": "x" * 150_000}] * 2}
            self.assertEqual(self.client.post("/api/chat", json=huge, headers=self.auth).status_code, 413)
        forward.assert_not_called()

    def test_reports_503_when_ollama_is_down(self):
        with patch.object(main, "forward_to_ollama", side_effect=urllib.error.URLError("refused")):
            response = self.client.post("/api/chat", json=CHAT, headers=self.auth)
        self.assertEqual(response.status_code, 503)


if __name__ == "__main__":
    unittest.main()
