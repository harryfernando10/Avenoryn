import os
import shutil
import unittest
from io import BytesIO
from urllib.error import URLError
from unittest.mock import patch

from fastapi.testclient import TestClient

import main


class OCRTests(unittest.TestCase):
    def test_extracts_text_based_pdf_without_ocr(self):
        with patch.object(main, "extract_text", return_value=("Invoice text", "pdf-text")) as extractor:
            with patch.object(main, "_provider_suggestion", return_value=main.Suggestion(kind="receipt", name="Item")):
                result = main.process_document(b"pdf", "application/pdf")
        self.assertEqual(result.extractedText, "Invoice text")
        self.assertEqual(result.textSource, "pdf-text")
        extractor.assert_called_once()

    def test_image_ocr_path_with_mocked_engine(self):
        from PIL import Image
        import pytesseract
        image = Image.new("RGB", (3, 3), "white")
        encoded = BytesIO()
        image.save(encoded, format="PNG")
        with patch.object(pytesseract, "image_to_string", return_value="image words"):
            text, source = main.extract_text(encoded.getvalue(), "image/png")
        self.assertEqual((text, source), ("image words", "ocr"))

    def test_missing_tesseract_returns_clear_unavailable_state(self):
        from PIL import Image
        import pytesseract
        image = Image.new("RGB", (3, 3), "white")
        encoded = BytesIO()
        image.save(encoded, format="PNG")
        with patch.dict(os.environ, {"TESSERACT_CMD": ""}):
            with patch.object(pytesseract.pytesseract, "tesseract_cmd", "definitely-missing-tesseract.exe"):
                with self.assertRaises(main.ServiceError) as error:
                    main.extract_text(encoded.getvalue(), "image/png")
        self.assertEqual(error.exception.code, "OCR_UNAVAILABLE")

    def test_text_pdf_is_extracted_without_ocr_and_scanned_pdf_uses_ocr(self):
        import fitz
        import pytesseract
        text_pdf = fitz.open()
        text_pdf.new_page().insert_text((72, 72), "Synthetic document words")
        text, source = main.extract_text(text_pdf.tobytes(), "application/pdf")
        self.assertIn("Synthetic document words", text)
        self.assertEqual(source, "pdf-text")

        scanned = fitz.open()
        scanned.new_page()
        with patch.object(pytesseract, "image_to_string", return_value="scan words"):
            scanned_text, scanned_source = main.extract_text(scanned.tobytes(), "application/pdf")
        self.assertEqual((scanned_text, scanned_source), ("scan words", "ocr"))

    @unittest.skipUnless(os.environ.get("TESSERACT_CMD") or shutil.which("tesseract"), "real Tesseract executable is unavailable")
    def test_real_tesseract_extracts_synthetic_image_and_scanned_pdf(self):
        import fitz
        from PIL import Image, ImageDraw, ImageFont
        import pytesseract

        if os.environ.get("TESSERACT_CMD"):
            pytesseract.pytesseract.tesseract_cmd = os.environ["TESSERACT_CMD"]
        image = Image.new("RGB", (1800, 360), "white")
        draw = ImageDraw.Draw(image)
        font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 112)
        marker = "AVENORYN SCAN 58317"
        draw.text((60, 90), marker, fill="black", font=font)
        encoded = BytesIO()
        image.save(encoded, format="PNG")

        with patch.dict(os.environ, {"AI_PROVIDER": "none", "AI_API_KEY": "", "AI_MODEL": ""}):
            image_result = main.process_document(encoded.getvalue(), "image/png")
            self.assertIn("58317", image_result.extractedText)
            self.assertEqual(image_result.textSource, "ocr")
            self.assertIsNone(image_result.suggestion)
            self.assertFalse(image_result.externalProviderUsed)

            pdf = fitz.open()
            page = pdf.new_page(width=900, height=180)
            page.insert_image(page.rect, stream=encoded.getvalue())
            pdf_result = main.process_document(pdf.tobytes(), "application/pdf")
            self.assertIn("58317", pdf_result.extractedText)
            self.assertEqual(pdf_result.textSource, "ocr")
            self.assertIsNone(pdf_result.suggestion)

            blank = Image.new("RGB", (900, 300), "white")
            blank_bytes = BytesIO()
            blank.save(blank_bytes, format="PNG")
            with self.assertRaises(main.ServiceError) as error:
                main.process_document(blank_bytes.getvalue(), "image/png")
            self.assertEqual(error.exception.code, "NO_EXTRACTABLE_TEXT")

    def test_ocr_failure_is_reported(self):
        from PIL import Image
        import pytesseract
        image = Image.new("RGB", (3, 3), "white")
        encoded = BytesIO()
        image.save(encoded, format="PNG")
        with patch.object(pytesseract, "image_to_string", side_effect=RuntimeError("OCR failure")):
            with self.assertRaises(main.ServiceError) as error:
                main.extract_text(encoded.getvalue(), "image/png")
        self.assertEqual(error.exception.code, "OCR_FAILED")

    def test_unsupported_and_corrupt_pdf_are_reported(self):
        with self.assertRaises(main.ServiceError) as unsupported:
            main.extract_text(b"data", "application/zip")
        self.assertEqual(unsupported.exception.code, "UNSUPPORTED_FILE")
        with self.assertRaises(main.ServiceError) as corrupt:
            main.extract_text(b"not a pdf", "application/pdf")
        self.assertEqual(corrupt.exception.code, "UNSUPPORTED_FILE")

    def test_empty_text_is_not_presented_as_ai_success(self):
        with patch.object(main, "extract_text", return_value=("", "ocr")):
            with self.assertRaises(main.ServiceError) as error:
                main.process_document(b"image", "image/png")
        self.assertEqual(error.exception.code, "NO_EXTRACTABLE_TEXT")


class ContractAndProviderTests(unittest.TestCase):
    def test_rejects_malformed_ai_output(self):
        with self.assertRaises(Exception):
            main.Suggestion.model_validate({"kind": "receipt", "amount": "abc", "extra": "untrusted"})

    def test_no_provider_keeps_local_extraction_available_without_suggestions(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "none", "AI_API_KEY": "", "AI_MODEL": ""}):
            with patch.object(main, "extract_text", return_value=("synthetic local text", "pdf-text")):
                result = main.process_document(b"pdf", "application/pdf")
        self.assertEqual(result.extractedText, "synthetic local text")
        self.assertIsNone(result.suggestion)
        self.assertFalse(result.externalProviderUsed)
        self.assertIn("AI_PROVIDER", result.suggestionError)

    def test_provider_connection_failure_is_reported(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "openai_compatible", "AI_API_KEY": "test-only", "AI_MODEL": "mock-model"}):
            with patch("main.urllib.request.urlopen", side_effect=URLError("offline")):
                with self.assertRaises(main.ServiceError) as error:
                    main._provider_suggestion("synthetic text")
        self.assertEqual(error.exception.code, "AI_PROVIDER_FAILED")

    def test_service_token_enforcement(self):
        client = TestClient(main.app)
        with patch.dict(os.environ, {"AI_SERVICE_TOKEN": "local-test-token", "AI_PROVIDER": "none"}):
            self.assertEqual(client.post("/v1/process", content=b"%PDF-test", headers={"Content-Type": "application/pdf"}).status_code, 401)
            response = client.post("/v1/process", content=b"%PDF-test", headers={"Content-Type": "application/pdf", "Authorization": "Bearer local-test-token"})
        self.assertEqual(response.status_code, 422)

    def test_readiness_requires_service_token_configuration(self):
        client = TestClient(main.app)
        with patch.dict(os.environ, {"AI_SERVICE_TOKEN": ""}):
            self.assertEqual(client.get("/health").status_code, 200)
            self.assertEqual(client.get("/ready").status_code, 503)
        with patch.dict(os.environ, {"AI_SERVICE_TOKEN": "local-test-token"}):
            self.assertEqual(client.get("/ready").status_code, 200)


if __name__ == "__main__":
    unittest.main()
