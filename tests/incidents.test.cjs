const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateIncident,
  normalizeIncidents,
  filterIncidents,
  summarizeIncidents
} = require("../incidents.js");

const baseIncident = {
  id: "US-NE-LINCOLN-NORTH-PLATTE-2026",
  title: "Incidente de ciberseguridad en Lincoln County y North Platte",
  organization: "Lincoln County y ciudad de North Platte",
  countryCode: "US",
  countryName: "Estados Unidos",
  region: "Nebraska",
  geographyPrecision: "county",
  eventStart: null,
  eventEnd: null,
  disclosedAt: "2026-10-09",
  category: "cyber-incident",
  status: "investigating",
  statusAsOf: "2026-10-09",
  impactLevel: "unassessed",
  impactNote: "La fuente no publica una evaluación de impacto ni una fecha exacta de inicio.",
  verificationLevel: "official",
  summary: "La autoridad estatal informó una emergencia tras un incidente que afectó a dos jurisdicciones.",
  sourceName: "Nebraska Emergency Management Agency",
  sourceHost: "nema.nebraska.gov",
  sourceUrl: "https://nema.nebraska.gov/articles.php?nid=419"
};

test("validateIncident accepts a complete, source-attributed record", () => {
  assert.equal(validateIncident(baseIncident), true);
});

test("validateIncident rejects HTTP, lookalike hosts, and host mismatches", () => {
  assert.equal(validateIncident({ ...baseIncident, sourceUrl: "http://nema.nebraska.gov/item" }), false);
  assert.equal(validateIncident({ ...baseIncident, sourceUrl: "https://nema.nebraska.gov.attacker.invalid/item" }), false);
  assert.equal(validateIncident({ ...baseIncident, sourceHost: "example.org" }), false);
});

test("validateIncident accepts a genuine subdomain of the declared source host", () => {
  assert.equal(validateIncident({
    ...baseIncident,
    sourceHost: "uscourts.gov",
    sourceUrl: "https://ksb.uscourts.gov/bnc-service-disruption"
  }), true);
});

test("validateIncident rejects unknown enums and invalid calendar dates", () => {
  assert.equal(validateIncident({ ...baseIncident, impactLevel: "catastrophic" }), false);
  assert.equal(validateIncident({ ...baseIncident, disclosedAt: "2026-02-30" }), false);
  assert.equal(validateIncident({ ...baseIncident, geographyPrecision: "street" }), false);
});

test("normalizeIncidents rejects wrong schema, removes invalid rows, and sorts newest first", () => {
  assert.deepEqual(normalizeIncidents({ schemaVersion: 2, items: [baseIncident] }), []);
  const older = { ...baseIncident, id: "US-KS-ELLIS-2026", disclosedAt: "2026-09-18" };
  const result = normalizeIncidents({ schemaVersion: 1, items: [older, baseIncident, { ...baseIncident, sourceUrl: "javascript:alert(1)" }] });
  assert.deepEqual(result.map((item) => item.id), [baseIncident.id, older.id]);
});

test("filterIncidents searches case- and accent-insensitively", () => {
  const rows = [
    baseIncident,
    { ...baseIncident, id: "US-KS-ELLIS-2026", title: "Ransomware en Ellis County", region: "Kansas", sourceName: "KWCH News", disclosedAt: "2026-09-18", category: "ransomware" }
  ];
  assert.equal(filterIncidents(rows, { query: "NÉBRASKA" }).length, 1);
  assert.equal(filterIncidents(rows, { query: "ciberseguridad" }).length, 1);
});

test("filterIncidents applies country, category, status, and verification filters together", () => {
  const rows = [
    baseIncident,
    { ...baseIncident, id: "US-KS-ELLIS-2026", title: "Ransomware en Ellis County", region: "Kansas", disclosedAt: "2026-09-18", category: "ransomware", verificationLevel: "media-attributed", status: "unknown" },
    { ...baseIncident, id: "US-NATIONAL-BNC-2026", title: "Interrupción nacional de BNC", region: "Nacional", geographyPrecision: "national", category: "service-disruption", status: "resolved" }
  ];
  const result = filterIncidents(rows, {
    countryCode: "US",
    category: "ransomware",
    status: "unknown",
    verificationLevel: "media-attributed"
  });
  assert.deepEqual(result.map((item) => item.id), ["US-KS-ELLIS-2026"]);
});

test("summarizeIncidents reports totals by status and verification", () => {
  const rows = [
    baseIncident,
    { ...baseIncident, id: "US-KS-ELLIS-2026", verificationLevel: "media-attributed", status: "unknown" },
    { ...baseIncident, id: "US-NATIONAL-BNC-2026", status: "resolved" }
  ];
  assert.deepEqual(summarizeIncidents(rows), {
    total: 3,
    investigating: 1,
    resolved: 1,
    unknown: 1,
    official: 2,
    mediaAttributed: 1
  });
});

test("incident registry file contains only validated records and source references", () => {
  const registry = require("../data/incidents.json");
  const normalized = normalizeIncidents(registry);
  assert.ok(normalized.length >= 3);
  assert.equal(normalized.length, registry.items.length);
  for (const item of normalized) {
    assert.ok(item.sourceUrl.startsWith("https://"));
    assert.equal("latitude" in item, false);
    assert.equal("longitude" in item, false);
    assert.equal("ip" in item, false);
  }
});
