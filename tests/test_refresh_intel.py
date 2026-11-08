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
