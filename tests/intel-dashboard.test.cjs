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
  assert.match(html, /BUILD 4.1/);
  assert.match(html, /DShield/);
  assert.match(html, /CISA/);
  assert.doesNotMatch(html, /simulation\.js/);
  assert.doesNotMatch(html, /SIMULATION ENGINE|GLOBAL ROUTE ENGINE|RUTAS SINTÉTICAS/);
});

test("research and advisory items are source-linked and contain no raw IP fields", () => {
  const rows = snapshot.feeds.reports?.items || [];
  assert.ok(Array.isArray(rows));
  for (const row of rows) {
    assert.ok(["sansDiary", "cisaAdvisories"].includes(row.sourceKey));
    assert.ok(typeof row.title === "string" && row.title.length > 0);
    const url = new URL(row.url);
    assert.equal(url.protocol, "https:");
    assert.ok(url.hostname === "isc.sans.edu" || url.hostname === "cisa.gov" || url.hostname.endsWith(".cisa.gov"));
    assert.ok(!("ip" in row));
    assert.ok(!("description" in row));
  }
});
