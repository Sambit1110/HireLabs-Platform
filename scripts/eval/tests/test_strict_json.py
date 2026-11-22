import unittest

from scripts.eval.strict_json import StrictJSONError, loads_strict


class StrictJSONTests(unittest.TestCase):
    def test_rejects_duplicate_properties_and_non_finite_constants(self):
        for source in ('{"x":1,"x":2}', '{"x":NaN}', '{"x":Infinity}'):
            with self.subTest(source=source), self.assertRaises(StrictJSONError):
                loads_strict(source)

    def test_accepts_standard_json(self):
        self.assertEqual(loads_strict('{"x":[1,true,null]}'), {"x": [1, True, None]})
