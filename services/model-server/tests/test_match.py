"""Run: python -m unittest discover -s services/model-server/tests -t services/model-server"""
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402

TOKEN = "t" * 40
AUTH = {"Authorization": f"Bearer {TOKEN}"}
BODY = {"job": "Data Analyst\nRequired skills: SQL, Python", "resume": "Data Analyst\nSkills: SQL"}


def client(**env):
    patcher = patch.dict(os.environ, {"MODEL_API_TOKEN": TOKEN, "HIRELABS_LLM_DIR": "/nonexistent", **env}, clear=True)
    patcher.start()
    test_client = TestClient(main.app)
    test_client.__enter__()

    def stop():
        test_client.__exit__(None, None, None)
        patcher.stop()

    return test_client, stop


class Match(unittest.TestCase):
    def test_needs_the_token(self):
        test_client, stop = client(MODEL_PLACEHOLDERS="true")
        self.addCleanup(stop)
        self.assertEqual(test_client.post("/match", json=BODY).status_code, 401)

    def test_token_also_works_in_the_hirelabs_header(self):
        test_client, stop = client(MODEL_PLACEHOLDERS="true")
        self.addCleanup(stop)
        # A private Hugging Face Space puts its own token in Authorization.
        headers = {"Authorization": "Bearer hf_example", "X-HireLabs-Token": TOKEN}
        self.assertEqual(test_client.post("/match", json=BODY, headers=headers).status_code, 200)
        wrong = {"Authorization": "Bearer hf_example", "X-HireLabs-Token": "x" * 40}
        self.assertEqual(test_client.post("/match", json=BODY, headers=wrong).status_code, 401)

    def test_placeholder_mode_is_marked(self):
        test_client, stop = client(MODEL_PLACEHOLDERS="true")
        self.addCleanup(stop)
        response = test_client.post("/match", json=BODY, headers=AUTH)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["X-HireLabs-Placeholder"], "true")
        self.assertEqual(response.json()["model_used"], "llm-placeholder")

    def test_503_when_the_model_is_missing(self):
        test_client, stop = client()
        self.addCleanup(stop)
        self.assertFalse(test_client.get("/health").json()["llm_ready"])
        self.assertEqual(test_client.post("/match", json=BODY, headers=AUTH).status_code, 503)

    def test_returns_the_model_result(self):
        test_client, stop = client()
        self.addCleanup(stop)
        scorer = MagicMock()
        scorer.match.return_value = {"score": 81, "verdict": "strong", "pmi": 0.2,
                                     "missingSkills": ["Python"], "model_used": "hirelabs-llm"}
        main.app.state.llm = scorer
        response = test_client.post("/match", json=BODY, headers=AUTH)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["score"], 81)
        scorer.match.assert_called_once_with(BODY["job"], BODY["resume"])
        self.assertTrue(test_client.get("/health").json()["llm_ready"])

    def test_rejects_blank_or_missing_text(self):
        test_client, stop = client(MODEL_PLACEHOLDERS="true")
        self.addCleanup(stop)
        self.assertEqual(test_client.post("/match", json={"job": "  ", "resume": "x"}, headers=AUTH).status_code, 422)
        self.assertEqual(test_client.post("/match", json={"job": "x"}, headers=AUTH).status_code, 422)


if __name__ == "__main__":
    unittest.main()
