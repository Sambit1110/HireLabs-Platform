"""Run: python3 -m unittest discover -s scripts/python/tests -t scripts/python  (needs torch)"""
import importlib.util
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

try:
    import torch
except ImportError:
    torch = None

TEXTS = ["Data Analyst\nSkills: SQL, Python, Tableau", "Backend Engineer\nSkills: Docker, Go, REST APIs",
         "Senior Data Analyst\nRequired skills: SQL, Excel"]


@unittest.skipIf(torch is None, "torch is not installed")
class ScratchEncoder(unittest.TestCase):
    def test_saves_loads_and_returns_384d_unit_vectors(self):
        from hirelabs_llm.encoder import Encoder, EncoderConfig, ScratchMatcher, is_scratch_matcher, save
        from hirelabs_llm.tokenizer import BPETokenizer

        torch.manual_seed(0)
        tok = BPETokenizer.train(TEXTS * 5, vocab_size=300)
        model = Encoder(EncoderConfig(vocab_size=tok.vocab_size, n_layer=1, n_head=2, n_embd=32))
        with tempfile.TemporaryDirectory() as folder:
            save(model, tok, folder)
            self.assertTrue(is_scratch_matcher(folder))
            matcher = ScratchMatcher.load(folder)
        vectors = matcher.encode(TEXTS, normalize_embeddings=True)
        self.assertEqual(tuple(vectors.shape), (3, 384))
        self.assertEqual(matcher.get_sentence_embedding_dimension(), 384)
        self.assertTrue(torch.allclose(vectors.norm(dim=1), torch.ones(3), atol=1e-5))

    def test_padding_does_not_change_a_vector(self):
        from hirelabs_llm.encoder import Encoder, EncoderConfig, ScratchMatcher
        from hirelabs_llm.tokenizer import BPETokenizer

        torch.manual_seed(0)
        tok = BPETokenizer.train(TEXTS * 5, vocab_size=300)
        matcher = ScratchMatcher(Encoder(EncoderConfig(vocab_size=tok.vocab_size, n_layer=1, n_head=2, n_embd=32)), tok)
        together = matcher.encode([TEXTS[0], TEXTS[0] * 5])
        alone = matcher.encode([TEXTS[0]])
        self.assertTrue(torch.allclose(together[0], alone[0], atol=1e-5))

    def test_contrastive_loss_ignores_same_role_negatives(self):
        spec = importlib.util.spec_from_file_location("train_scratch_matcher", Path(__file__).resolve().parents[1] / "train_scratch_matcher.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        jobs = torch.nn.functional.normalize(torch.eye(3), dim=1)
        resumes = jobs.clone()
        resumes[1] = jobs[0]  # job 1's positive looks like job 0's
        with_same_role = module.info_nce(jobs, resumes, ["a", "a", "b"], 0.1)
        all_distinct = module.info_nce(jobs, resumes, ["a", "c", "b"], 0.1)
        self.assertLess(with_same_role.item(), all_distinct.item())


class ImportExternal(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        path = Path(__file__).resolve().parents[2] / "dataset" / "import_external.py"
        spec = importlib.util.spec_from_file_location("import_external", path)
        cls.module = importlib.util.module_from_spec(spec)
        try:
            spec.loader.exec_module(cls.module)
        except ImportError:  # pandas missing
            cls.module = None

    def setUp(self):
        if self.module is None:
            self.skipTest("pandas is not installed")

    def test_repairs_mojibake_and_keeps_line_breaks(self):
        self.assertEqual(self.module.fix_text("Skills\r\nâ¢ Python   and SQL\r\n\r\nâ¢ Docker"), "Skills\n• Python and SQL\n• Docker")

    def test_maps_job_titles_to_resume_categories(self):
        cases = {"Senior Java Engineer": "Java Developer", "JavaScript Developer": None, "QA Analyst": "Testing",
                 "Automation Test Engineer": "Automation Testing", "Data Scientist": "Data Science",
                 "Retail Sales Associate": "Sales", "Bank Teller": None, "Project Manager": "PMO"}
        for title, category in cases.items():
            self.assertEqual(self.module.category_for(title), category, title)


if __name__ == "__main__":
    unittest.main()
