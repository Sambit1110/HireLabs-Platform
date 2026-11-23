"""Run: python3 -m unittest discover -s scripts/python/tests -t scripts/python  (needs torch)"""
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

try:
    import torch
except ImportError:  # the matcher-only environment has no torch
    torch = None

TEXTS = [
    "Data Analyst\nData Analyst with 3 years of experience in Retail.\nSkills: SQL, Python, Tableau",
    "Senior Data Analyst\nWe are hiring a Data Analyst.\nRequired skills: SQL, Python, Excel\nPreferred skills: dbt",
    "Backend Engineer\nBackend Engineer with 5 years of experience in Travel.\nSkills: Docker, Go, REST APIs",
]


@unittest.skipIf(torch is None, "torch is not installed")
class Tokenizer(unittest.TestCase):
    def setUp(self):
        from hirelabs_llm.tokenizer import BPETokenizer

        self.tok = BPETokenizer.train(TEXTS * 5, vocab_size=300)

    def test_round_trips_text_including_unicode(self):
        text = "Résumé: Python, C++ & SQL — 5 yrs\n"
        self.assertEqual(self.tok.decode(self.tok.encode(text)), text)

    def test_merges_shrink_common_words(self):
        self.assertLess(len(self.tok.encode(" Analyst")), len(" Analyst".encode()))

    def test_special_token_text_in_user_input_is_not_special(self):
        ids = self.tok.encode("<|end|>")
        self.assertNotIn(self.tok.token("<|end|>"), ids)

    def test_save_and_load_give_the_same_ids(self):
        from hirelabs_llm.tokenizer import BPETokenizer

        with tempfile.TemporaryDirectory() as folder:
            path = os.path.join(folder, "tok.json")
            self.tok.save(path)
            loaded = BPETokenizer.load(path)
        self.assertEqual(loaded.encode(TEXTS[0]), self.tok.encode(TEXTS[0]))
        self.assertEqual(loaded.vocab_size, self.tok.vocab_size)


@unittest.skipIf(torch is None, "torch is not installed")
class ModelAndScoring(unittest.TestCase):
    def setUp(self):
        from hirelabs_llm.model import GPT, GPTConfig
        from hirelabs_llm.score import Scorer
        from hirelabs_llm.tokenizer import BPETokenizer

        torch.manual_seed(0)
        tok = BPETokenizer.train(TEXTS * 5, vocab_size=300)
        self.model = GPT(GPTConfig(vocab_size=tok.vocab_size, block_size=64, n_layer=1, n_head=2, n_embd=32, dropout=0.0))
        self.scorer = Scorer(self.model, tok, {"a": 2.0, "b": 0.0})

    def test_forward_shapes_and_loss_ignore_padding(self):
        x = torch.randint(0, self.model.config.vocab_size, (2, 10))
        y = x.clone()
        y[:, 5:] = -100
        logits, loss = self.model(x, y)
        self.assertEqual(tuple(logits.shape), (2, 10, self.model.config.vocab_size))
        self.assertTrue(torch.isfinite(loss))

    def test_batched_scores_equal_one_at_a_time(self):
        # Right-padding a short resume next to a long one must not change its score.
        resumes = [TEXTS[0], TEXTS[2] + "\nLed migrations to Kubernetes"]
        together = self.scorer.pmi(TEXTS[1], resumes)
        alone = [self.scorer.pmi(TEXTS[1], [r])[0] for r in resumes]
        for a, b in zip(together, alone):
            self.assertAlmostEqual(a, b, places=4)

    def test_long_inputs_are_truncated_to_the_context(self):
        value = self.scorer.pmi(TEXTS[1] * 40, [TEXTS[0] * 40])[0]
        self.assertTrue(abs(value) < 100)

    def test_match_returns_score_verdict_and_missing_skills(self):
        result = self.scorer.match(TEXTS[1], TEXTS[0])
        self.assertTrue(0 <= result["score"] <= 100)
        self.assertIn(result["verdict"], {"strong", "moderate", "weak"})
        self.assertEqual(result["missingSkills"], ["Excel"])
        self.assertEqual(result["model_used"], "hirelabs-llm")

    def test_save_and_load_round_trip(self):
        from hirelabs_llm.score import Scorer

        with tempfile.TemporaryDirectory() as folder:
            torch.save({"config": self.model.config.to_dict(), "state_dict": self.model.state_dict()},
                       os.path.join(folder, "model.pt"))
            self.scorer.tok.save(os.path.join(folder, "tokenizer.json"))
            loaded = Scorer.load(folder)
        self.assertAlmostEqual(loaded.pmi(TEXTS[1], [TEXTS[0]])[0], self.scorer.pmi(TEXTS[1], [TEXTS[0]])[0], places=4)

    def test_generation_stops_and_decodes(self):
        text = self.scorer.write_resume(TEXTS[1], max_new_tokens=5)
        self.assertIsInstance(text, str)


@unittest.skipIf(torch is None, "torch is not installed")
class Sampler(unittest.TestCase):
    def test_sequences_are_well_formed_and_pairs_share_a_role(self):
        import json

        from hirelabs_llm.corpus import Corpus, SequenceSampler
        from hirelabs_llm.tokenizer import BPETokenizer

        with tempfile.TemporaryDirectory() as root:
            for kind, docs in (("resumes", {"r1": TEXTS[0], "r2": TEXTS[2]}), ("jds", {"j1": TEXTS[1]})):
                os.makedirs(os.path.join(root, "raw", kind))
                for name, text in docs.items():
                    Path(root, "raw", kind, f"{name}.txt").write_text(text)
            Path(root, "splits.json").write_text(json.dumps({"r1": "train", "r2": "train"}))
            corpus = Corpus(root, "train")
            self.assertEqual(corpus.job_roles["j1"], "Data Analyst")
            tok = BPETokenizer.train(corpus.texts_for_tokenizer() * 3, vocab_size=300)
            sampler = SequenceSampler(corpus, tok, block_size=48, seed=1)
            start = {tok.token("<|job|>"), tok.token("<|resume|>")}
            for _ in range(200):
                seq = sampler.sample()
                self.assertIn(seq[0], start)
                self.assertLessEqual(len(seq), 49)
                if seq[0] == tok.token("<|job|>") and tok.token("<|resume|>") in seq:
                    # The only same-role resume for the Data Analyst job is r1, never the engineer.
                    self.assertNotIn("Docker", tok.decode(seq))
            inputs, targets = sampler.batch(8)
            self.assertEqual({len(row) for row in inputs}, {len(targets[0])})


class TextHelpers(unittest.TestCase):
    def test_job_role_prefers_known_roles_over_stripping_levels(self):
        from hirelabs_llm.corpus import job_role

        self.assertEqual(job_role("Junior Accountant\nWe are hiring", ["Junior Accountant"]), "Junior Accountant")
        self.assertEqual(job_role("Senior Junior Accountant\n...", ["Junior Accountant"]), "Junior Accountant")
        self.assertEqual(job_role("Lead Data Analyst\n...", []), "Data Analyst")

    def test_drop_title_removes_role_lines_only(self):
        from hirelabs_llm.corpus import drop_title

        blind = drop_title(TEXTS[0])
        self.assertNotIn("Data Analyst", blind)
        self.assertIn("Skills: SQL", blind)

    @unittest.skipIf(torch is None, "torch is not installed")
    def test_missing_skills_without_a_requirements_line_is_empty(self):
        from hirelabs_llm.score import missing_skills, verdict_for

        self.assertEqual(missing_skills("We need a great analyst", "SQL"), [])
        self.assertEqual([verdict_for(s) for s in (90, 75, 74, 50, 49)], ["strong", "strong", "moderate", "moderate", "weak"])


if __name__ == "__main__":
    unittest.main()
