#!/usr/bin/env python3
"""Build a public, read-only NEXUS snapshot from defensive threat-intelligence feeds.

No probes, scans, exploit attempts, or requests are sent to observed hosts.
Only the SANS ISC and CISA public data services are queried.
"""
from __future__ import annotations

import ipaddress
import json
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "current.json"
USER_AGENT = (
    "NEXUS-Global-Cyber-Observatory/1.0 "
    "(read-only defensive research; https://github.com/thiandominguez100-stack/hackeomasivo)"
)
DASHBOARD_SCHEMA = 1

# Approximate country centroids, used only to place country-level aggregates.
# Coordinates are not IP geolocation and never identify a person, device, or building.
COUNTRIES = {
    "US": ("United States", -98.5, 39.8), "CA": ("Canada", -106.3, 56.1),
    "MX": ("Mexico", -102.5, 23.6), "BR": ("Brazil", -51.9, -10.8),
    "AR": ("Argentina", -64.2, -35.4), "CL": ("Chile", -71.5, -35.7),
    "CO": ("Colombia", -72.9, 4.6), "PE": ("Peru", -75.0, -9.2),
    "GB": ("United Kingdom", -3.4, 55.4), "IE": ("Ireland", -8.0, 53.2),
    "FR": ("France", 2.2, 46.2), "DE": ("Germany", 10.4, 51.1),
    "NL": ("Netherlands", 5.3, 52.1), "BE": ("Belgium", 4.7, 50.5),
    "ES": ("Spain", -3.7, 40.2), "PT": ("Portugal", -8.0, 39.6),
    "IT": ("Italy", 12.6, 42.8), "CH": ("Switzerland", 8.2, 46.8),
    "AT": ("Austria", 14.1, 47.6), "PL": ("Poland", 19.1, 52.0),
    "CZ": ("Czechia", 15.5, 49.8), "BG": ("Bulgaria", 25.3, 42.7),
    "RO": ("Romania", 24.9, 45.8), "UA": ("Ukraine", 31.2, 48.4),
    "SE": ("Sweden", 15.0, 62.0), "NO": ("Norway", 8.5, 61.0),
    "FI": ("Finland", 26.0, 64.0), "DK": ("Denmark", 9.5, 56.1),
    "RU": ("Russia", 100.0, 60.0), "TR": ("Türkiye", 35.2, 39.0),
    "IL": ("Israel", 34.9, 31.0), "SA": ("Saudi Arabia", 45.1, 23.9),
    "AE": ("United Arab Emirates", 54.0, 24.2), "EG": ("Egypt", 30.8, 26.8),
    "ZA": ("South Africa", 24.0, -29.0), "NG": ("Nigeria", 8.7, 9.1),
    "KE": ("Kenya", 37.9, 0.5), "MA": ("Morocco", -7.1, 31.8),
    "IN": ("India", 78.9, 22.8), "PK": ("Pakistan", 69.3, 30.4),
    "BD": ("Bangladesh", 90.3, 23.7), "CN": ("China", 104.2, 35.9),
    "JP": ("Japan", 138.0, 37.5), "KR": ("South Korea", 127.8, 36.4),
    "TW": ("Taiwan", 120.9, 23.7), "HK": ("Hong Kong", 114.2, 22.3),
    "SG": ("Singapore", 103.8, 1.35), "ID": ("Indonesia", 117.3, -2.5),
    "MY": ("Malaysia", 102.0, 4.2), "TH": ("Thailand", 101.0, 15.0),
    "VN": ("Vietnam", 108.3, 14.1), "PH": ("Philippines", 122.9, 11.8),
    "AU": ("Australia", 134.5, -25.7), "NZ": ("New Zealand", 172.0, -41.0),
    "IS": ("Iceland", -19.0, 65.0), "LU": ("Luxembourg", 6.1, 49.8),
    "GR": ("Greece", 22.9, 39.1), "HR": ("Croatia", 16.4, 45.1),
    "RS": ("Serbia", 20.8, 44.0), "SK": ("Slovakia", 19.5, 48.7),
    "HU": ("Hungary", 19.5, 47.2), "LT": ("Lithuania", 23.9, 55.2),
    "LV": ("Latvia", 24.6, 56.9), "EE": ("Estonia", 25.5, 58.7),
    "KZ": ("Kazakhstan", 67.3, 48.0), "IR": ("Iran", 53.7, 32.4),
    "IQ": ("Iraq", 43.7, 33.2), "QA": ("Qatar", 51.2, 25.3),
    "KW": ("Kuwait", 47.5, 29.3), "TN": ("Tunisia", 9.5, 34.0),
    "GH": ("Ghana", -1.0, 7.9), "ET": ("Ethiopia", 40.5, 9.1),
}

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

def iso_now() -> str:
    return utc_now().replace(microsecond=0).isoformat().replace("+00:00", "Z")

def fetch_json(url: str):
    request = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        },
        method="GET",
    )
    with urlopen(request, timeout=35) as response:
        raw = response.read()
    return json.loads(raw.decode("utf-8"))

def read_previous() -> dict:
    try:
        return json.loads(OUT.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}

def country_info(code: str):
    code = (code or "").strip().upper()
    if len(code) != 2 or not code.isalpha():
        return None
    return COUNTRIES.get(code)

def fetch_dshield() -> dict:
    today = utc_now().date()
    start = today - timedelta(days=29)
    base = "https://isc.sans.edu/api"
    daily = fetch_json(f"{base}/dailysummary/{start.isoformat()}/{today.isoformat()}?json")
    sources = fetch_json(f"{base}/sources/attacks/20?json")
    infocon_data = fetch_json(f"{base}/infocon?json")

    if not isinstance(daily, list):
        raise ValueError("DShield daily summary returned an unexpected format")
    if not isinstance(sources, list):
        raise ValueError("DShield source summary returned an unexpected format")

    clean_daily = []
    for row in daily:
        if not isinstance(row, dict) or not row.get("date"):
            continue
        clean_daily.append({
            "date": str(row.get("date")),
            "reports": max(0, int(row.get("records") or row.get("reports") or 0)),
            "sources": max(0, int(row.get("sources") or 0)),
            "targets": max(0, int(row.get("targets") or 0)),
        })

    # Resolve only a small, bounded set of observed source records to their
    # registered network country. Raw IP addresses are never written to the
    # public snapshot.
    enriched = []
    for item in sources[:20]:
        if not isinstance(item, dict):
            continue
        source_ip = str(item.get("ip") or "").strip()
        try:
            ipaddress.ip_address(source_ip)
        except ValueError:
            continue

        try:
            details = fetch_json(f"{base}/ip/{source_ip}?json")
            ip_details = details.get("ip", {}) if isinstance(details, dict) else {}
            country_code = str(
                ip_details.get("ascountry") or ip_details.get("country") or ""
            ).upper()
            location = country_info(country_code)
        except (HTTPError, URLError, TimeoutError, ValueError, OSError):
            country_code, location = "", None
        # Keep the public collector within a conservative request pace.
        time.sleep(0.18)

        enriched.append({
            "countryCode": country_code if location else None,
            "countryName": location[0] if location else "País no disponible",
            "reports": max(0, int(item.get("count") or 0)),
            "uniqueTargets": max(0, int(item.get("attacks") or 0)),
            "firstSeen": str(item.get("firstseen") or ""),
            "lastSeen": str(item.get("lastseen") or ""),
        })

    grouped = defaultdict(lambda: {"sourceRecords": 0, "reports": 0, "latestSeen": ""})
    for row in enriched:
        code = row.get("countryCode")
        if not code:
            continue
        bucket = grouped[code]
        bucket["sourceRecords"] += 1
        bucket["reports"] += row["reports"]
        bucket["latestSeen"] = max(bucket["latestSeen"], row["lastSeen"])

    country_aggregates = []
    for code, values in grouped.items():
        location = country_info(code)
        if not location:
            continue
        country_aggregates.append({
            "countryCode": code,
            "countryName": location[0],
            "longitude": location[1],
            "latitude": location[2],
            "sourceRecords": values["sourceRecords"],
            "reports": values["reports"],
            "latestSeen": values["latestSeen"],
        })
    country_aggregates.sort(key=lambda row: row["reports"], reverse=True)

    infocon = str((infocon_data or {}).get("status", "unknown")).lower()
    if infocon not in {"green", "yellow", "orange", "red"}:
        infocon = "unknown"

    latest_day = clean_daily[-1] if clean_daily else {"date": None, "reports": 0, "sources": 0, "targets": 0}
    return {
        "status": "ok",
        "lastSuccessfulAt": iso_now(),
        "sourceUrl": "https://isc.sans.edu/data/",
        "apiUrl": "https://isc.sans.edu/api/",
        "infocon": infocon,
        "latestDay": latest_day,
        "dailyHistory": clean_daily[-30:],
        "topObservedSources": enriched[:15],
        "countryAggregates": country_aggregates,
        "countryCoverage": "Top 20 source records only; country is the registered ASN/network country, not a person's location.",
        "description": "Aggregated reports collected by DShield sensors. They are observations, not a complete count of all Internet attacks.",
    }

def fetch_cisa() -> dict:
    url = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
    catalog = fetch_json(url)
    if not isinstance(catalog, dict) or not isinstance(catalog.get("vulnerabilities"), list):
        raise ValueError("CISA KEV feed returned an unexpected format")

    rows = catalog["vulnerabilities"]
    recent = sorted(
        (row for row in rows if isinstance(row, dict)),
        key=lambda row: str(row.get("dateAdded") or ""),
        reverse=True,
    )[:12]
    clean_recent = []
    for row in recent:
        cve = str(row.get("cveID") or "")
        if not cve.startswith("CVE-"):
            continue
        clean_recent.append({
            "cveId": cve,
            "vendor": str(row.get("vendorProject") or "Unknown"),
            "product": str(row.get("product") or "Not specified"),
            "name": str(row.get("vulnerabilityName") or cve),
            "dateAdded": str(row.get("dateAdded") or ""),
            "description": str(row.get("shortDescription") or "")[:520],
            "ransomwareUse": str(row.get("knownRansomwareCampaignUse") or "Unknown"),
            "nvdUrl": f"https://nvd.nist.gov/vuln/detail/{cve}",
        })

    return {
        "status": "ok",
        "lastSuccessfulAt": iso_now(),
        "sourceUrl": "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
        "catalogVersion": str(catalog.get("catalogVersion") or ""),
        "dateReleased": str(catalog.get("dateReleased") or ""),
        "totalVulnerabilities": max(0, int(catalog.get("count") or len(rows))),
        "recent": clean_recent,
        "description": "CISA catalogue of vulnerabilities known to have been exploited. It is not a live incident feed.",
    }

def preserve_or_error(previous: dict, key: str, error: Exception) -> dict:
    old = ((previous.get("feeds") or {}).get(key) or {}).copy()
    if old and old.get("status") in {"ok", "stale"}:
        old["status"] = "stale"
        old["lastErrorAt"] = iso_now()
        old["lastError"] = type(error).__name__
        return old
    return {
        "status": "error",
        "lastAttemptAt": iso_now(),
        "lastError": type(error).__name__,
    }

def main() -> None:
    previous = read_previous()
    feeds = {}

    try:
        feeds["dshield"] = fetch_dshield()
    except Exception as error:  # Keep the dashboard useful if an upstream is down.
        print(f"DShield refresh failed: {type(error).__name__}")
        feeds["dshield"] = preserve_or_error(previous, "dshield", error)

    try:
        feeds["cisaKev"] = fetch_cisa()
    except Exception as error:
        print(f"CISA refresh failed: {type(error).__name__}")
        feeds["cisaKev"] = preserve_or_error(previous, "cisaKev", error)

    ok_count = sum(1 for value in feeds.values() if value.get("status") == "ok")
    stale_count = sum(1 for value in feeds.values() if value.get("status") == "stale")
    output = {
        "schemaVersion": DASHBOARD_SCHEMA,
        "generatedAt": iso_now(),
        "refreshIntervalMinutes": 60,
        "overallStatus": "online" if ok_count == 2 else ("degraded" if ok_count or stale_count else "offline"),
        "feeds": feeds,
        "methodology": {
            "dshield": "Sensor-submitted network observations. Reports are not equivalent to confirmed criminal attacks; source classification may include scanners and benign research activity.",
            "country": "Country circles use the registered country of the network/ASN and an approximate country centroid. They do not locate people, devices, or victims.",
            "cisaKev": "Known-exploited vulnerability catalogue. A vulnerability entry does not mean a new attack happened at its publication time.",
            "limits": "This public dashboard is not exhaustive and does not provide packet-level or second-by-second global visibility.",
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Snapshot written: {ok_count} live feeds, {stale_count} stale feeds.")

if __name__ == "__main__":
    main()
