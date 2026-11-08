import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import refresh_intel


class CountryCentroidTests(unittest.TestCase):
    def test_known_country_has_approximate_coordinates(self):
        country = refresh_intel.country_info("AR")
        self.assertIsNotNone(country)
        self.assertEqual(country[0], "Argentina")
        self.assertTrue(-180 <= country[1] <= 180)
        self.assertTrue(-90 <= country[2] <= 90)

    def test_invalid_or_unknown_country_is_not_plotted(self):
        self.assertIsNone(refresh_intel.country_info(""))
        self.assertIsNone(refresh_intel.country_info("ZZ"))
        self.assertIsNone(refresh_intel.country_info("ARG"))


if __name__ == "__main__":
    unittest.main()

 
class RssParsingTests(unittest.TestCase):
    def test_rss_parser_keeps_titles_dates_and_official_source_links(self):
        sample = """<?xml version="1.0"?>
        <rss version="2.0"><channel><item>
          <title><![CDATA[Observed security advisory]]></title>
          <link>https://isc.sans.edu/diary/rss/12345</link>
          <pubDate>Sun, 08 Nov 2026 15:44:33 GMT</pubDate>
          <description><![CDATA[Details not copied into the public dashboard.]]></description>
        </item></channel></rss>"""
        rows = refresh_intel.parse_rss_items(
            sample, "sansDiary", "SANS ISC", "Diario", "isc.sans.edu", 8
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["title"], "Observed security advisory")
        self.assertTrue(rows[0]["publishedAt"].endswith("Z"))
        self.assertNotIn("description", rows[0])
        self.assertEqual(rows[0]["sourceKey"], "sansDiary")

    def test_rss_parser_rejects_non_https_and_untrusted_links(self):
        sample = """<rss><channel>
        <item><title>Untrusted</title><link>https://example.invalid/item</link><pubDate>Sun, 08 Nov 2026 15:44:33 GMT</pubDate></item>
        <item><title>Insecure</title><link>http://isc.sans.edu/diary/1</link><pubDate>Sun, 08 Nov 2026 15:44:33 GMT</pubDate></item>
        </channel></rss>"""
        rows = refresh_intel.parse_rss_items(
            sample, "sansDiary", "SANS ISC", "Diario", "isc.sans.edu", 8
        )
        self.assertEqual(rows, [])
