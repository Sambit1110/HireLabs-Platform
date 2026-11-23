import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402

TOKEN = "p" * 40


def make_pdf(lines):
    escaped_lines = [
        line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        for line in lines
    ]
    stream = "\n".join(
        [
            "BT",
            "/F1 12 Tf",
            "14 TL",
            "72 720 Td",
            *[
                f"{'T* ' if index else ''}({line}) Tj"
                for index, line in enumerate(escaped_lines)
            ],
            "ET",
        ]
    )
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        f"<< /Length {len(stream.encode('latin1'))} >>\nstream\n{stream}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    ]

    body = "%PDF-1.4\n"
    offsets = []
    for index, obj in enumerate(objects, 1):
        offsets.append(len(body.encode("latin1")))
        body += f"{index} 0 obj\n{obj}\nendobj\n"

    xref_offset = len(body.encode("latin1"))
    body += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n"
    body += "".join(f"{offset:010d} 00000 n \n" for offset in offsets)
    body += (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF\n"
    )
    return body.encode("latin1")


class PdfPlumberEndpoint(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(
            os.environ,
            {"MODEL_PLACEHOLDERS": "true", "MODEL_API_TOKEN": TOKEN},
            clear=True,
        )
        self.environment.start()
        self.client = TestClient(main.app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.environment.stop()

    def post_pdf(self, content):
        return self.client.post(
            "/extract-pdf",
            content=content,
            headers={
                "Authorization": f"Bearer {TOKEN}",
                "Content-Type": "application/pdf",
            },
        )

    def test_extracts_text_from_a_pdf(self):
        response = self.post_pdf(
            make_pdf(["Alex Morgan", "Data Engineer", "Python and SQL experience."])
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("Alex Morgan", response.json()["text"])
        self.assertIn("Data Engineer", response.json()["text"])
        self.assertIn("Python and SQL experience.", response.json()["text"])

    def test_requires_authentication(self):
        response = self.client.post(
            "/extract-pdf",
            content=make_pdf(["Alex Morgan"]),
            headers={"Content-Type": "application/pdf"},
        )

        self.assertEqual(response.status_code, 401)

    def test_rejects_non_pdf_and_oversized_bodies(self):
        invalid = self.post_pdf(b"not a PDF")
        oversized = self.post_pdf(b"%PDF-" + b"x" * (5 * 1024 * 1024))

        self.assertEqual(invalid.status_code, 422)
        self.assertEqual(oversized.status_code, 413)


if __name__ == "__main__":
    unittest.main()
