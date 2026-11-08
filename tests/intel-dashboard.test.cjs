const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const snapshot = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/current.json"), "utf8"));

test("public snapshot has a supported schema and feed containers", () => {
  assert.equal(snapshot.schemaVersion, 1);
  assert.ok(snapshot.feeds && typeof snapshot.feeds === "object");
  assert.ok("dshield" in snapshot.feeds);
  assert.ok("cisaKev" in snapshot.feeds);
});

test("country aggregates contain finite country-level coordinates", () => {
  const rows = snapshot.feeds.dshield?.countryAggregates || [];
  assert.ok(Array.isArray(rows));
  for (const row of rows) {
    assert.equal(typeof row.countryCode, "string");
    assert.equal(row.countryCode.length, 2);
    assert.ok(Number.isFinite(row.longitude));
    assert.ok(Number.isFinite(row.latitude));
    assert.ok(row.longitude >= -180 && row.longitude <= 180);
    assert.ok(row.latitude >= -90 && row.latitude <= 90);
    assert.ok(!("ip" in row), "raw source IPs must not be published");
  }
});

test("CISA records use CVE identifiers and public NVD references", () => {
  const rows = snapshot.feeds.cisaKev?.recent || [];
  assert.ok(Array.isArray(rows));
  for (const row of rows) {
    assert.match(row.cveId, /^CVE-\d{4}-\d+$/);
    assert.match(row.nvdUrl, /^https:\/\/nvd\.nist\.gov\/vuln\/detail\/CVE-/);
  }
});

test("no generated simulation events or fake route fields are present", () => {
  assert.ok(!("simulation" in snapshot));
  assert.ok(!("routes" in (snapshot.feeds.dshield || {})));
  assert.ok(!("fakeEvents" in snapshot));
});

test("published page is an observatory and does not load the old simulator", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.match(html, /BUILD 4.3/);
  assert.match(html, /DShield/);
  assert.match(html, /CISA/);
  assert.doesNotMatch(html, /simulation\.js/);
  assert.doesNotMatch(html, /SIMULATION ENGINE|GLOBAL ROUTE ENGINE|RUTAS SINTÉTICAS/);
});

test("research and advisory items are source-linked and contain no raw IP fields", () => {
  const rows = snapshot.feeds.reports?.items || [];
  assert.ok(Array.isArray(rows));
  for (const row of rows) {
    assert.ok(["sansDiary", "cisaAdvisories", "ukNcsc", "certEu", "canadaCyber", "acscAustralia", "certSe", "certUa"].includes(row.sourceKey));
    assert.ok(typeof row.title === "string" && row.title.length > 0);
    const allowedHosts = {
      sansDiary: "isc.sans.edu",
      cisaAdvisories: "cisa.gov",
      ukNcsc: "ncsc.gov.uk",
      certEu: "cert.europa.eu",
      canadaCyber: "cyber.gc.ca",
      acscAustralia: "cyber.gov.au",
      certSe: "cert.se",
      certUa: "cert.gov.ua"
    };
    const url = new URL(row.url);
    assert.equal(url.protocol, "https:");
    const allowedHost = allowedHosts[row.sourceKey];
    assert.ok(url.hostname === allowedHost || url.hostname.endsWith("." + allowedHost));
    assert.ok(!("ip" in row));
    assert.ok(!("description" in row));
  }
});

test("reports feed tracks the expanded eight-source allowlist", () => {
  const states = snapshot.feeds.reports?.sourceStates || {};
  const known = ["sansDiary", "cisaAdvisories", "ukNcsc", "certEu", "canadaCyber", "acscAustralia", "certSe", "certUa"];
  for (const key of Object.keys(states)) assert.ok(known.includes(key));
  assert.ok(known.includes("ukNcsc"));
  assert.ok(known.includes("certEu"));
  assert.ok(known.includes("canadaCyber"));
});

test("interface includes the eight-source health list", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  assert.match(html, /BUILD 4\.3/);
  assert.match(html, /reportSourcesHealth/);
  assert.match(app, /acscAustralia/);
  assert.match(app, /certUa/);
});

test("country markers declare their aggregate centroid scope and fade before local zoom", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  assert.match(html, /CENTROIDES NACIONALES/);
  assert.match(html, /EXPLORAR CARTOGRAFÍA/);
  assert.match(app, /COUNTRY_MARKER_HIDE_ZOOM/);
  const zoomOpacityLayers = app.match(/"circle-opacity":\s*\["interpolate",\s*\["linear"\],\s*\["zoom"\]/g) || [];
  assert.ok(zoomOpacityLayers.length >= 2, "both country marker layers must fade with map zoom");
  assert.match(app, /Centroide nacional aproximado/);
});

test("Incident Explorer has filters, independent data loading, and offline cache support", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  const sw = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");
  for (const id of ["incidentSearch", "incidentCategory", "incidentCountry", "incidentStatus", "incidentVerification", "incidentList", "incidentTotal"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /incidents\.js\?v=13/);
  assert.match(app, /data\/incidents\.json/);
  assert.match(app, /NexusIncidentData\.filterIncidents/);
  assert.match(sw, /data\/incidents\.json/);
  assert.match(sw, /incidents\.js\?v=13/);
});
