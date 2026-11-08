# NEXUS 5.0 — Evidence & Incident Intelligence

## Intent

Evolve NEXUS from a public-data observatory into a more interpretable defensive intelligence workspace. The first release must eliminate false geographic precision in the map and introduce a small, transparent, curated historical incident register.

## Goals

- Make it visually explicit that DShield map bubbles are country/network-registration aggregates placed at approximate country centroids.
- Prevent country aggregates from appearing to identify a local street, building, person, device, victim, or attacker when the map is zoomed in.
- Add a searchable and filterable incident explorer backed by a separate static JSON file.
- Include only incidents supported by a public primary authority or a reputable publication explicitly attributing its account to named public officials/organizations.
- Show event date separately from disclosure/update dates; show status only as of the source's stated date.
- Record verification level, geographic precision, confidence limitations, and source link for each incident.
- Preserve GitHub Pages, GitHub Actions, static hosting, read-only collection, and no-Firebase operation.

## Non-goals

- No live attack tracking, source/target pinpointing, exact victim coordinates, IP display, route drawing, scanning, probing, exploit reproduction, or network action.
- No automatic conversion of sensor observations, CVEs, advisories, headlines, or social posts into incidents.
- No claim that a curated registry is exhaustive or real-time.
- No speculative attribution, severity, or incident status.

## Data and trust model

The existing data/current.json remains the hourly-generated telemetry/advisory snapshot. A new data/incidents.json is a separately maintained, versioned public register. A record must have a stable ID, title, affected organization, country/region, date semantics, category, status and status-as-of date, impact assessment (or explicitly unassessed), verification level, geographic precision, concise neutral summary, and one or more HTTPS source references. Source hosts must be validated against the record's declared allowlist host. Records contain no raw IPs, coordinates, IOCs, malware samples, or operational detail.

Initial examples:
- Lincoln County and North Platte, Nebraska: NEMA's October 9, 2026 official emergency notice; incident type and exact occurrence time remain unspecified, so preserve those as unknown.
- Bankruptcy Noticing Center, nationwide United States: U.S. Courts notice and restoration update; disruption began October 9 and services were reported restored October 27, 2026. Use national scope, not a point.
- Ellis County, Kansas: September 17, 2026 ransomware report published by KWCH and attributed to county officials; mark media-attributed rather than authority-confirmed in the register.

## Geography rules

- DShield country bubbles remain only on the low-zoom/world view and fade out before local zoom levels. Their popups must say the country centroid is illustrative and is not the location of an incident.
- Incident records carry a geography precision label (national, state, county, city, or unknown), but no incident point is drawn in this release. Do not derive coordinates from address/place text.
- The local city-exploration control remains a cartography/building exploration tool, not an incident locator.

## Interface

- Version the dashboard as NEXUS 5.0.
- Add an Incident Explorer section with counts, free-text search, and category, country, status, and verification filters.
- Cards show organization, title, category, geographic scope/precision, incident date (or unknown), disclosure date, impact assessment (or unassessed), status as of its source date, verification label, and source links.
- Clearly state that the registry is curated, incomplete, not real-time, and that statuses may have changed after the last cited update.

## Approaches considered

1. Merge curated incidents into data/current.json: rejected because the hourly collector could overwrite curator-managed data and mix telemetry with verified incident records.
2. Store incident records in a separate static data/incidents.json: selected because it cleanly separates automatically collected observations from human-verified incident metadata, requires no backend, and is easy to review.
3. Plot incident coordinates from named towns/roads: rejected because source text does not reliably support exact coordinates and doing so would recreate the false-precision problem.

## Acceptance criteria

- Country markers are hidden/faded at local zoom and the UI persistently explains their national aggregate/centroid meaning.
- No country-centroid marker can be mistaken for a local incident location when zooming to streets/buildings.
- Incident JSON validates against explicit required fields and an HTTPS source-host allowlist.
- Invalid incident records are rejected; filtering/searching is deterministic and robust to accented/case variants.
- The interface accurately differentiates authority-confirmed and media-attributed records, and incident date from disclosure/status dates.
- No incident-specific map markers or exact local coordinates are added.
- Automated Node/Python tests, syntax checks, and GitHub Actions succeed.
