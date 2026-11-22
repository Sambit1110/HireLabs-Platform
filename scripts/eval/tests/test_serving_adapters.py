import io
import json
import os
import unittest
from unittest.mock import patch

from scripts.eval.serving_adapters import configured


class EvaluatorIntegration(unittest.TestCase):
    def predict(self, reported):
        env = {"HIRELABS_EVAL_ADAPTERS": "hirelabs_evaluator", "HIRELABS_ACCESS_TOKEN": "fixture"}
        body = {"data": {"model_used": reported, "result": {"fit_score": 78, "fit_verdict": "strong"}}}
        with patch.dict(os.environ, env, clear=True), patch(
            "scripts.eval.bias_check.urlopen", return_value=io.BytesIO(json.dumps(body).encode())
        ) as send:
            result = configured()["hirelabs_evaluator"].predict(
                {"resume_text": "Python projects", "job_description": "Build Python APIs"}
            )
            request = send.call_args.args[0]
            self.assertEqual(request.get_header("X-hirelabs-eval-provider"), "local")
            self.assertEqual(json.loads(request.data)["candidate"]["parsedText"], "Python projects")
            return result

    def test_accepts_attributed_local_prediction(self):
        self.assertEqual(self.predict("hirelabs-evaluator")["fit_score"], 78)

    def test_rejects_fallback_as_local_measurement(self):
        with self.assertRaisesRegex(ValueError, "requested local model"):
            self.predict("gemini-fallback")
