# NEXUS 5.0 Evidence & Incident Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Remove misleading local interpretation of country-level map bubbles and add a transparent, filterable register of documented cyber incidents.

**Architecture:** Keep automatically refreshed telemetry in data/current.json. Store separately curated incident records in data/incidents.json, validate and filter them through a small browser/CommonJS-compatible pure module, and render them in the static dashboard. Hide country aggregates as the view reaches local zoom so an approximate centroid cannot resemble a local incident marker.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Node built-in test runner, Python unittest, GitHub Pages, GitHub Actions.

**Spec:** docs/superpowers/specs/2026-11-08-nexus-5-evidence-intelligence-design.md

## Global Constraints

- Read-only public information only; no probes, scans, exploitation, or active network operations.
- Never publish raw IP addresses, exact device/victim/attacker coordinates, IOCs, or route data.
- Country/network aggregates are not incident locations; local map views must not show country bubbles.
- Incident status is time-bound to the cited source date; never infer that an old status is current.
- Only HTTPS source links whose host matches an explicit record allowlist are rendered.
- No Firebase or new secrets; GitHub Pages and static JSON remain the deployment model.
- Do not convert telemetry, CVEs, advisories, or headlines into incident records without independent verification.
- Do not merge to main or publish a live release without explicit final approval.

## Review Focus

- Malformed or missing record fields must be rejected rather than crash the Incident Explorer.
- URLs using HTTP, deceptive suffix hosts, or an unlisted domain must never be rendered as trusted sources.
- Empty searches, unmatched filters, accented text, and mixed-case text must behave predictably.
- Unknown incident dates or impact ratings must stay visibly unknown, not be inferred.
- Deep map zoom, city exploration, and 3D building inspection must not leave a national aggregate looking like a local incident.

---

### Task 1: Incident data model and pure validation/filtering module

**Files:**
- Create: incidents.js
- Create: data/incidents.json
- Create: tests/incidents.test.cjs
- Modify: .github/workflows/test.yml (run tests on feature-branch pushes as well as PRs to main)

**Interfaces:**
- Produces global/browser NexusIncidentData and CommonJS exports: validateIncident, normalizeIncidents, filterIncidents, summarizeIncidents.
- Incident dates use ISO YYYY-MM-DD; unknown event dates are null. Each record includes sourceHost and sourceUrl; URLs must be HTTPS and match the declared host or its subdomain.

- [ ] **Step 1: Write failing tests** for schema acceptance/rejection, host validation, sorting, case/accent-insensitive search, filters, and summary counts.
- [ ] **Step 2: Run the Node tests and verify the intended failures.**
- [ ] **Step 3: Add the separate curation file** with three sourced examples from NEMA, U.S. Courts, and KWCH, preserving uncertainty and status-as-of dates.
- [ ] **Step 4: Implement the pure module** with closed enums, strict date/URL checks, and safe normalization.
- [ ] **Step 5: Run the Node tests again** and require all incident tests to pass.
- [ ] **Step 6: Commit the task** with a focused message.

### Task 2: Map precision safeguards

**Files:**
- Modify: app.js
- Modify: index.html
- Modify: styles.css
- Modify: tests/intel-dashboard.test.cjs

**Interfaces:**
- DShield features keep country-centroid coordinates but use zoom-dependent opacity/visibility for the map layers.
- Popups and UI text explicitly identify country/network-registration aggregate and approximate centroid.
- No incident record creates a map feature in this release.

- [ ] **Step 1: Add failing dashboard tests** for national-centroid language, scale warning, and marker fade/hide behavior.
- [ ] **Step 2: Run the dashboard tests and verify they fail for the missing safeguards.**
- [ ] **Step 3: Apply zoom-dependent fading to both glow and point layers** before local zoom and clearly label city jump as cartography exploration only.
- [ ] **Step 4: Update map annotations, popup disclaimers, and methodology** so country aggregates cannot be read as exact incident coordinates.
- [ ] **Step 5: Run dashboard tests and syntax check** and require them to pass.
- [ ] **Step 6: Commit the task.**

### Task 3: Incident Explorer interface

**Files:**
- Modify: index.html
- Modify: app.js
- Modify: styles.css
- Modify: sw.js
- Modify: tests/intel-dashboard.test.cjs

**Interfaces:**
- Load data/incidents.json independently of the hourly telemetry snapshot.
- Render only records returned by NexusIncidentData.normalizeIncidents.
- Search and filters call NexusIncidentData.filterIncidents; counters call NexusIncidentData.summarizeIncidents.

- [ ] **Step 1: Add failing static UI tests** for the explorer controls, source links, labels, independent JSON fetch, and cache entry.
- [ ] **Step 2: Run dashboard tests and verify the expected failures.**
- [ ] **Step 3: Add the Incident Explorer section** with search, category, country, status, verification filters, counters, no-results state, and source-attributed cards.
- [ ] **Step 4: Add an accessible renderer and resilient fetch**; invalid/empty data must show a clear empty state and must not affect telemetry/map loading.
- [ ] **Step 5: Update the service-worker shell version and cache** for the new module and incident registry.
- [ ] **Step 6: Run dashboard tests and syntax checks** and commit.

### Task 4: Documentation, versioning, and full verification

**Files:**
- Modify: README.md
- Modify: index.html
- Modify: app.js
- Modify: styles.css
- Modify: sw.js
- Modify: manifest.webmanifest only if a displayed app version exists.

- [ ] **Step 1: Update the README** with data separation, source/verification policy, geography precision, update cadence, and known limitations.
- [ ] **Step 2: Set user-visible release labels and asset cache versions to 5.0 / v13.**
- [ ] **Step 3: Run all project checks:** Node dashboard/incident tests, Python bytecode compilation, Python unittest discovery, and JavaScript syntax checks.
- [ ] **Step 4: Review every incident record against its cited page and verify no exact local coordinates, raw IPs, or operational indicators were introduced.**
- [ ] **Step 5: Create a pull request for review; do not merge to main until the user approves the live release.**
